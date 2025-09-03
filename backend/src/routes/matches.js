// backend/src/routes/matches.js
const { db } = require('../db');

function i(n, def = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : def;
}

async function routes(fastify) {
  // Crea una partida (IA o PVP). Una sola fila con player1_id y player2_id
  fastify.post('/api/matches', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const { mode } = req.body || {};
    if (!mode) return reply.code(400).send({ error: 'Missing mode' });

    // Campos comunes
    const duration_ms = req.body?.duration_ms != null ? i(req.body.duration_ms, null) : null;

    if (mode === 'ai') {
      const score_user = i(req.body?.score_user);
      const score_ai   = i(req.body?.score_ai);
      const level      = req.body?.level ?? null;

      let winner_id = null;
      if (score_user > score_ai) winner_id = uid;
      else if (score_ai > score_user) winner_id = 0; // 0 reservado para IA

      const details = JSON.stringify({
        mode: 'ai',
        level,
        score: { user: score_user, ai: score_ai },
        duration_ms
      });

      const info = db.prepare(`
        INSERT INTO matches (player1_id, player2_id, winner_id, details)
        VALUES (?, ?, ?, ?)
      `).run(uid, 0, winner_id, details);

      const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
      return reply.send({ match: row });
    }

    if (mode === 'pvp') {
      const opponent_id = i(req.body?.opponent_id, null);
      if (!opponent_id) return reply.code(400).send({ error: 'Missing opponent_id' });
      if (opponent_id === uid) return reply.code(400).send({ error: 'Opponent must be different from current user' });

      // Los marcadores del 1v1 local: izquierda = jugador logueado, derecha = segundo jugador
      const score_left  = i(req.body?.score_left);
      const score_right = i(req.body?.score_right);

      let winner_id = null;
      if (score_left > score_right) winner_id = uid;
      else if (score_right > score_left) winner_id = opponent_id;

      const details = JSON.stringify({
        mode: 'pvp',
        score: { left: score_left, right: score_right },
        players: { left_id: uid, right_id: opponent_id },
        duration_ms
      });

      const info = db.prepare(`
        INSERT INTO matches (player1_id, player2_id, winner_id, details)
        VALUES (?, ?, ?, ?)
      `).run(uid, opponent_id, winner_id, details);

      const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
      return reply.send({ match: row });
    }

    return reply.code(400).send({ error: 'Unknown mode' });
  });
}

module.exports = routes;
