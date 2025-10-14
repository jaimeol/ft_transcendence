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

      // Permitir atribuir el match a otro usuario (p.ej. jugador 2)
      const as_user_id = Number(req.body?.as_user_id) || null;
      const actorId = as_user_id || uid;

      // Determinar el juego (pong o tictactoe)
      const game = mode === 'ai' ? 'pong' : (req.body?.game === 'tictactoe' ? 'tictactoe' : 'pong');
      
      // Campos comunes
      const duration_ms = req.body?.duration_ms != null ? i(req.body.duration_ms, null) : null;

      // Metadatos para distinguir subpartidos del 2v2
      const from = req.body?.from || null;        // 'pong2v2' | null
      const subgame = req.body?.subgame || null;  // 'vertical' | 'horizontal' | null

      if (mode === 'ai') {
        const score_user = i(req.body?.score_user);
        const score_ai   = i(req.body?.score_ai);
        const level      = req.body?.level ?? null;

        const winner_id = (score_user > score_ai) ? actorId : 0;

        const details = JSON.stringify({
          mode: 'ai',
          from, subgame, level, 
          score: { user: score_user, ai: score_ai },
          duration_ms
        });

        // Usamos la inserción simple sin is_draw para compatibilidad
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

        let winner_id = null;
        let is_draw = false;
        let detailsObj = {
          mode: 'pvp',
          from, subgame,
          game,
          duration_ms,
          players: { left_id: actorId, right_id: opponent_id }
        };

        if (game === 'pong') {
          const score_left = i(req.body?.score_left, 0);
          const score_right = i(req.body?.score_right, 0);
          if (score_left === score_right) {
            return reply.code(400).send({ error: 'Tie not allowed in pong' });
          }
          winner_id = (score_left > score_right) ? actorId : opponent_id;
          detailsObj.score = { left: score_left, right: score_right }; 
        } else {
          // Esta es la parte clave para TicTacToe que funcionaba antes
          is_draw = req.body?.is_draw === true;
          const winner_from_body = (typeof req.body?.winner_id === 'number') ? req.body.winner_id : null;

          if (is_draw) {
            winner_id = null;
            detailsObj.is_draw = true;
          } else if (winner_from_body != null) {
            if (winner_from_body !== actorId && winner_from_body !== opponent_id) {
              return reply.code(400).send({ error: 'Invalid winner_id for this match' });
            }
            winner_id = winner_from_body;
            detailsObj.is_draw = false;
          } else {
            return reply.code(400).send({ error: "TicTacToe requires winner_id or is_draw=true"});
          }

          // Guardar tablero final y combo ganador si están disponibles
          if (req.body?.final_board) {
            detailsObj.final_board = req.body.final_board;
          }
          if (req.body?.winning_combo) {
            detailsObj.winning_combo = req.body.winning_combo;
          }
        }

        const details = JSON.stringify(detailsObj);

        // Volvemos a la inserción original sin el campo is_draw explícito
        const info = db.prepare(`
          INSERT INTO matches (game, player1_id, player2_id, winner_id, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(game, actorId, opponent_id, winner_id, details);

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
