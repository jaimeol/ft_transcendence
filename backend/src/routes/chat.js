// backend/src/routes/chat.js
const { db } = require('../db');

function isFriends(a, b){
  const row = db.prepare(`
    SELECT 1
    FROM friends
    WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
      AND status = 'accepted'
  `).get(a, b, b, a);
  return !!row;
}
function blocked(a, b){
  const row = db.prepare(`SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).get(a, b);
  return !!row;
}

async function routes (fastify) {
  // Lista de amigos (para el panel de chat)
  fastify.get('/api/chat/peers', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = db.prepare(`
      SELECT u.id, u.display_name, u.avatar_path
      FROM users u
      WHERE u.id IN (
        SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END
        FROM friends
        WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
      )
      ORDER BY u.display_name
    `).all(uid, uid, uid);
    return { peers: rows };
  });

  // Historial con un usuario (paginable por fecha ascendente)
  fastify.get('/api/chat/history/:userId', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
    const before = req.query.before ? String(req.query.before) : null;

    if (!isFriends(uid, other)) return reply.code(403).send({ error: 'Not friends' });
    if (blocked(uid, other) || blocked(other, uid)) return reply.code(403).send({ error: 'Blocked' });

    const base = `
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `;
    const rows = before
      ? db.prepare(base + ` AND created_at < ? ORDER BY created_at DESC LIMIT ?`).all(uid, other, other, uid, before, limit)
      : db.prepare(base + ` ORDER BY created_at DESC LIMIT ?`).all(uid, other, other, uid, limit);

    return { messages: rows.reverse() };
  });

  // Envío offline (fallback si el WS no estuviera)
  // **CAMBIO**: ahora aceptamos `cid` y lo devolvemos para reconciliar en el cliente
  fastify.post('/api/chat/send', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const { to, body, cid } = req.body || {};
    const other = Number(to);

    if (!other || !body) return reply.code(400).send({ error: 'Missing fields' });
    if (!isFriends(uid, other)) return reply.code(403).send({ error: 'Not friends' });
    if (blocked(uid, other) || blocked(other, uid)) return reply.code(403).send({ error: 'Blocked' });

    const info = db.prepare(`INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)`)
      .run(uid, other, String(body).slice(0, 2000));
    const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);

    // Empujar en vivo si el destinatario está conectado
    fastify.websocketPush?.(other, { type: 'message', message: msg });

    // Devolvemos también el cid para reconciliar la burbuja optimista
    return { message: msg, cid };
  });

  // Bloquear / Desbloquear
  fastify.post('/api/chat/block/:userId', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    try {
      db.prepare(`INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`).run(uid, other);
      return { ok: true };
    } catch { return reply.code(500).send({ error: 'Block failed' }); }
  });

  fastify.delete('/api/chat/block/:userId', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    db.prepare(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).run(uid, other);
    return { ok: true };
  });

  fastify.get('/api/chat/blocked', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = db.prepare(`SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?`).all(uid);
    return { blocked: rows.map(r => r.id) };
  });

  // Invitación a Pong (mensaje especial)
  fastify.post('/api/chat/invite', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const { to } = req.body || {};
    const other = Number(to);
    if (!isFriends(uid, other)) return reply.code(403).send({ error: 'Not friends' });
    if (blocked(uid, other) || blocked(other, uid)) return reply.code(403).send({ error: 'Blocked' });

    const meta = JSON.stringify({ game: 'pong' });
    const info = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, kind, meta, body)
      VALUES (?, ?, 'invite', ?, '¡Te invito a jugar a Pong!')
    `).run(uid, other, meta);
    const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);

    fastify.websocketPush?.(other, { type: 'invite', message: msg });
    return { message: msg };
  });

  // ENDPOINT para que el módulo de torneos notifique el siguiente partido
  fastify.post('/api/tournament/notify-next', async (req, reply) => {
    // esperado: { userId, payload: { startsAt, opponentName, ... } }
    const uid = req.session.uid; // opcional: forzar que lo use un admin si quieres
    const { userId, payload } = req.body || {};
    const other = Number(userId);
    const info = db.prepare(`
      INSERT INTO notifications (user_id, type, payload)
      VALUES (?, 'tournament.next', ?)
    `).run(other, JSON.stringify(payload || {}));
    const notif = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(info.lastInsertRowid);

    fastify.websocketPush?.(other, { type: 'tournament.next', notification: notif });
    return { notification: notif };
  });

  // Leer notificaciones (para pintar badge si el WS no estaba)
  fastify.get('/api/notifications', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY created_at DESC`).all(uid);
    return { notifications: rows };
  });
}

module.exports = routes;
