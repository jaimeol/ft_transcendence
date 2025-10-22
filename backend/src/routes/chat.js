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

    const systemPeer = {
      id: 0,
      display_name: 'Marvin',
      avatar_path: '/uploads/Marvin.png'
    };

    const rows = db.prepare(`
      SELECT u.id, display_name, u.avatar_path
      FROM users u
      WHERE u.id IN (
        SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END
        FROM friends
        WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
      )
      ORDER BY u.display_name
    `).all(uid, uid, uid);

    return { peers: [systemPeer, ...rows]};
  });

  // Historial con un usuario (paginable por fecha ascendente)
  fastify.get('/api/chat/history/:userId', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
    const before = req.query.before ? String(req.query.before) : null;
    
    if (other !== 0){
      if (!isFriends(uid, other)) return reply.code(403).send({ error: 'Not friends' });
      if (blocked(uid, other) || blocked(other, uid)) return reply.code(403).send({ error: 'Blocked' });
    }

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

  // Enviar notificación como mensaje del sistema (con soporte para traducción)
  fastify.post('/api/chat/notify', async (req, reply) => {
    const { to, i18n, params } = req.body || {};
    const other = Number(to);

    if (!other || !i18n) return reply.code(400).send({ error: 'Missing fields' });

    // Inserta el mensaje como un mensaje del sistema
    const meta = JSON.stringify({ i18n, params });
    const info = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, body, kind, meta)
      VALUES (?, ?, ?, 'system', ?)
    `).run(0, other, null, meta); // `body` es null porque usamos `i18n` para el texto
    const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);

    // Empuja el mensaje al destinatario si está conectado
    fastify.websocketPush?.(other, { type: 'system', message: msg });

    return { message: msg };
  });

  fastify.post('/api/chat/accept-invite/:messageId', async (req, reply) => {
    const uid_guest = req.session.uid;
    const messageId = Number(req.params.messageId);

    if (!uid_guest || !messageId) {
      return reply.code(400).send({ error: 'Bad Request' });
    }

    try {
      // 1. Validar que el invitado es el destinatario de este mensaje
      const originalMsg = db.prepare(
        "SELECT * FROM messages WHERE id = ? AND receiver_id = ? AND kind = 'invite'"
      ).get(messageId, uid_guest);

      if (!originalMsg) {
        return reply.code(404).send({ error: 'Invitation not found or not for you' });
      }

      const oldMeta = JSON.parse(originalMsg.meta || '{}');
      if (oldMeta.status !== 'pending') {
         // Ya aceptada o estado inválido, devolvemos el mensaje actual
         return { message: originalMsg };
      }

      // 2. Actualizar el estado de la invitación
      const newMeta = JSON.stringify({ ...oldMeta, status: 'accepted' });
      db.prepare(
        "UPDATE messages SET meta = ? WHERE id = ?"
      ).run(newMeta, messageId);

      // 3. Obtener y devolver el mensaje actualizado
      const updatedMsg = db.prepare(
        "SELECT * FROM messages WHERE id = ?"
      ).get(messageId);

      // 4. IMPORTANTE: Intentar notificar al Host vía WebSocket si está conectado
      const uid_host = updatedMsg.sender_id;
      fastify.websocketPush?.(uid_host, { type: 'invite_update', message: updatedMsg });
      // También notificamos al guest por si acaso tiene WS pero falló el envío original
      fastify.websocketPush?.(uid_guest, { type: 'invite_update', message: updatedMsg });


      return { message: updatedMsg }; // Devolver el mensaje actualizado

    } catch (err) {
      fastify.log.error(err, 'Error processing POST /api/chat/accept-invite');
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  // Marcar una invitación como jugada (solo el host puede hacerlo)
  fastify.post('/api/chat/mark-played/:messageId', async (req, reply) => {
    const uid_host = req.session.uid; // El usuario que hace la petición (debe ser el host)
    const messageId = Number(req.params.messageId);

    if (!uid_host || !messageId) {
      return reply.code(400).send({ error: 'Bad Request' });
    }

    try {
      // 1. Validar que el mensaje existe, es una invitación, y el usuario es el sender_id (host)
      const originalMsg = db.prepare(
        "SELECT * FROM messages WHERE id = ? AND sender_id = ? AND kind = 'invite'"
      ).get(messageId, uid_host);

      if (!originalMsg) {
        return reply.code(404).send({ error: 'Invitation not found or you are not the host' });
      }

      // 2. Parsear meta y añadir/actualizar la bandera 'played'
      const oldMeta = JSON.parse(originalMsg.meta || '{}');
      // Solo marcamos como 'played' si ya estaba 'accepted' para evitar estados raros
      if (oldMeta.status !== 'accepted') {
         return reply.code(400).send({ error: 'Invite not accepted yet'});
      }
      
      // Si ya estaba marcada como 'played', no hacemos nada más
      if (oldMeta.played === true) {
          return { message: originalMsg }; // Devolvemos el mensaje tal cual
      }

      const newMeta = JSON.stringify({ ...oldMeta, played: true });

      // 3. Actualizar la base de datos
      db.prepare(
        "UPDATE messages SET meta = ? WHERE id = ?"
      ).run(newMeta, messageId);

      // 4. Obtener y devolver el mensaje actualizado
      const updatedMsg = db.prepare(
        "SELECT * FROM messages WHERE id = ?"
      ).get(messageId);

      // 5. Opcional: Notificar a ambos usuarios (host y guest) vía WebSocket que el estado cambió
      // Esto es útil si ambos tienen el chat abierto, para que el botón se actualice en tiempo real.
      const uid_guest = updatedMsg.receiver_id;
      fastify.websocketPush?.(uid_host, { type: 'invite_update', message: updatedMsg });
      fastify.websocketPush?.(uid_guest, { type: 'invite_update', message: updatedMsg });

      return { message: updatedMsg };

    } catch (err) {
      fastify.log.error(err, 'Error processing POST /api/chat/mark-played');
      return reply.code(500).send({ error: 'Failed to mark invitation as played' });
    }
  });
}

module.exports = routes;
