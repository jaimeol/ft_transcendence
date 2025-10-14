// backend/src/routes/matches.js
const { db } = require('../db');

function i(n, def = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : def;
}

async function routes(fastify) {
  try {
    fastify.post('/api/matches', async (req, reply) => {
      const uid = req.session.uid;
      if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

      const { mode } = req.body || {};
      if (!mode) return reply.code(400).send({ error: 'Missing mode' });

      // Permitir atribuir el match a otro usuario (p.ej. jugador 2)
      const as_user_id = Number(req.body?.as_user_id) || null;
      const actorId = as_user_id || uid;

      const duration_ms = req.body?.duration_ms != null ? i(req.body.duration_ms, null) : null;

      // Metadatos para distinguir subpartidos del 2v2
      const from = req.body?.from || null;        // 'pong2v2' | null
      const subgame = req.body?.subgame || null;  // 'vertical' | 'horizontal' | null

      if (mode === 'ai') {
        const score_user = i(req.body?.score_user, null);
        const score_ai   = i(req.body?.score_ai, null);
        if (score_user == null || score_ai == null) {
          return reply.code(400).send({ error: 'Missing score_user/score_ai' });
        }
        const level = req.body?.level ?? null;

        const winner_id = (score_user > score_ai) ? actorId : 0;
        const details = JSON.stringify({
          mode: 'ai',
          from, subgame, level, duration_ms,
          score: { user: score_user, ai: score_ai }
        });

        const info = db.prepare(`
          INSERT INTO matches (game, player1_id, player2_id, winner_id, details)
          VALUES (?, ?, ?, ?, ?)
        `).run('pong', actorId, 0, winner_id, details);

        const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
        return reply.send({ match: row });
      }

      if (mode === 'pvp') {
        const opponent_id = i(req.body?.opponent_id, null);
        if (!opponent_id) return reply.code(400).send({ error: 'Missing opponent_id' });
        if (opponent_id === actorId) {
          return reply.code(400).send({ error: 'Opponent must be different from current user' });
        }

        const score_left = i(req.body?.score_left, null);
        const score_right = i(req.body?.score_right, null);
        if (score_left == null || score_right == null) {
          return reply.code(400).send({ error: 'Missing score_left/score_right' });
        }
        if (score_left === score_right) {
          return reply.code(400).send({ error: 'Tie not allowed in pong' });
        }

        const winner_id = (score_left > score_right) ? actorId : opponent_id;
        const details = JSON.stringify({
          mode: 'pvp',
          from, subgame, duration_ms,
          players: { left_id: actorId, right_id: opponent_id },
          score: { left: score_left, right: score_right }
        });

        const info = db.prepare(`
          INSERT INTO matches (game, player1_id, player2_id, winner_id, details)
          VALUES (?, ?, ?, ?, ?)
        `).run('pong', actorId, opponent_id, winner_id, details);

        const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
        return reply.send({ match: row });
      }

      return reply.code(400).send({ error: 'Unknown mode' });
    });
  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({ error: String(err?.message || err)});
  }
}

module.exports = routes;
