// backend/src/routes/friends.js
const { db } = require('../db');

function isFriends(a, b) {
  const row = db.prepare(`
    SELECT 1
    FROM friends
    WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
      AND status = 'accepted'
  `).get(a, b, b, a);
  return !!row;
}

async function routes(fastify) {
  // Crear solicitud (o auto-aceptar si hay inversa)
  fastify.post('/api/friends/:userId', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    if (other === uid) return reply.code(400).send({ error: 'Cannot friend yourself' });

    // Ya sois amigos
    if (isFriends(uid, other)) {
      return reply.code(409).send({ error: 'Already friends' });
    }

    // ¿Hay alguna relación existente en cualquier dirección?
    const rel = db.prepare(`
      SELECT id, requester_id, addressee_id, status
      FROM friends
      WHERE (requester_id = ? AND addressee_id = ?)
         OR (requester_id = ? AND addressee_id = ?)
      ORDER BY id DESC
      LIMIT 1
    `).get(uid, other, other, uid);

    if (rel) {
      // Yo ya la envié antes: no dupliques ni des error
      if (rel.requester_id === uid && rel.addressee_id === other && rel.status === 'pending') {
        return { ok: true, alreadyPending: true };
      }
      // El otro me la envió: auto-aceptar
      if (rel.requester_id === other && rel.addressee_id === uid && rel.status === 'pending') {
        db.prepare(`UPDATE friends SET status = 'accepted' WHERE id = ?`).run(rel.id);
        // Notificación en vivo
        fastify.websocketPush?.(other, { type: 'friend.accepted', userId: uid });
        fastify.websocketPush?.(uid,   { type: 'friend.accepted', userId: other });
        return { ok: true, accepted: true };
      }
      // Si estaba aceptada o bloqueada, no permitas duplicar
      if (rel.status === 'accepted') {
        return reply.code(409).send({ error: 'Already friends' });
      }
      if (rel.status === 'blocked') {
        return reply.code(403).send({ error: 'Blocked' });
      }
    }

    // Crear nueva pendiente
    db.prepare(`
      INSERT INTO friends (requester_id, addressee_id, status)
      VALUES (?, ?, 'pending')
    `).run(uid, other);

    // Empuja notificación al destinatario (si tiene WS abierto)
    const fromUser = db.prepare(`SELECT id, display_name, avatar_path FROM users WHERE id = ?`).get(uid);
    fastify.websocketPush?.(other, { type: 'friend.request', from: fromUser });

    return { ok: true, pending: true };
  });

  // Pendientes (tal como ya tenías)
  fastify.get('/api/friends/pending', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const incoming = db.prepare(`
      SELECT u.id, u.display_name, u.avatar_path
      FROM friends f
      JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = ? AND f.status = 'pending'
      ORDER BY u.display_name
    `).all(uid);

    const outgoing = db.prepare(`
      SELECT u.id, u.display_name, u.avatar_path
      FROM friends f
      JOIN users u ON u.id = f.addressee_id
      WHERE f.requester_id = ? AND f.status = 'pending'
      ORDER BY u.display_name
    `).all(uid);

    return { incoming, outgoing };
  });

  // Aceptar explícitamente (igual que antes)
  fastify.post('/api/friends/:userId/accept', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    const res = db.prepare(`
      UPDATE friends
      SET status = 'accepted'
      WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'
    `).run(other, uid);
    if (res.changes === 0) return reply.code(404).send({ error: 'Request not found' });

    fastify.websocketPush?.(other, { type: 'friend.accepted', userId: uid });
    fastify.websocketPush?.(uid,   { type: 'friend.accepted', userId: other });

    return { ok: true };
  });

  // Rechazar solicitud de amistad
  fastify.post('/api/friends/:userId/reject', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const other = Number(req.params.userId);
    const res = db.prepare(`
      DELETE FROM friends
      WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'
    `).run(other, uid);
    if (res.changes === 0) return reply.code(404).send({ error: 'Request not found' });

    return { ok: true };
  });

  // Listado de amigos (igual que antes)
  fastify.get('/api/friends', async (req, reply) => {
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
    `).all(uid, uid, uid);
    return { friends: rows.map(r => ({ ...r, online: false })) };
  });
}

module.exports = routes;
