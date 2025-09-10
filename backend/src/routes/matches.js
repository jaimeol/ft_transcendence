// backend/src/routes/matches.js
const { db } = require('../db');

function i(n, def = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : def;
}

async function routes(fastify) {
  try {
  // Crea una partida (IA o PVP). Una sola fila con player1_id y player2_id
  fastify.post('/api/matches', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const { mode } = req.body || {};
    if (!mode) return reply.code(400).send({ error: 'Missing mode' });


    const game = mode === 'ai' ? 'pong' : (req.body?.game === 'tictactoe' ? 'tictactoe' : 'pong');
    // Campos comunes
    const duration_ms = req.body?.duration_ms != null ? i(req.body.duration_ms, null) : null;

    if (mode === 'ai') {
      const score_user = i(req.body?.score_user);
      const score_ai   = i(req.body?.score_ai);
      const level      = req.body?.level ?? null;

      const winner_id = (score_user > score_ai) ? uid : 0;

      const details = JSON.stringify({
        mode: 'ai',
        level,
        score: { user: score_user, ai: score_ai },
        duration_ms
      });

      const info = db.prepare(`
        INSERT INTO matches (game, player1_id, player2_id, winner_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run('pong', uid  , 0, winner_id, details);

      const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid);
      return reply.send({ match: row });
    }

    if (mode === 'pvp') {
      const opponent_id = i(req.body?.opponent_id, null);
      if (!opponent_id) return reply.code(400).send({ error: 'Missing opponent_id' });
      if (opponent_id === uid) return reply.code(400).send({ error: 'Opponent must be different from current user' });

      let winner_id = null;
      let detailsObj = {
        mode: 'pvp',
        game,
        duration_ms,
        players: { left_id: uid, right_id: opponent_id }
      };

      if (game === 'pong') {
        const score_left = i(req.body?.score_left, 0);
        const score_right = i(req.body?.score_right, 0);
        if (score_left === score_right) {
          return reply.code(400).send({ error: 'Tie not allowed in pong' });
        }
        winner_id = (score_left > score_right) ? uid : opponent_id;
        detailsObj.score = { left: score_left, right: score_right }; 
      } else {
        const is_draw = req.body?.is_draw === true;
        const winner_from_body = (typeof req.body?.winner_id === 'number') ? req.body.winner_id : null;

        if (is_draw) {
          winner_id = null;
          detailsObj.is_draw = true;
        } else if (winner_from_body != null) {
          if (winner_from_body !== uid && winner_from_body !== opponent_id) {
            return reply.code(400).send({ error: 'Invalid winner_id for this match' });
          }
          winner_id = winner_from_body;
          detailsObj.is_draw = false;
        } else {
          return reply.code(400).send({ error: "TicTacToe requires winner_id or is_draw=true"});
        }
      }



      const details = JSON.stringify(detailsObj);

      const info = db.prepare(`
        INSERT INTO matches (game, player1_id, player2_id, winner_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(game, uid, opponent_id, winner_id, details);

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
