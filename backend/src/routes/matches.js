// backend/src/routes/matches.js
const { db } = require('../db');

async function routes(fastify) {
  // Crea una partida
  fastify.post('/api/matches', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const { opponentId, mode, leftScore, rightScore, side } = req.body || {};
    // opponentId opcional: si no llega, lo tratamos como IA/local
    const p1 = Number(uid);
    const p2 = Number(opponentId ?? 0); // 0 = IA / local

    // Determinar ganador según los puntos y el lado del jugador
    // Por defecto el jugador humano usa el lado "left" en tu Pong.
    const userSide = side === 'right' ? 'right' : 'left';
    let winner_id = null;
    if (typeof leftScore === 'number' && typeof rightScore === 'number' && leftScore !== rightScore) {
      const leftWon = leftScore > rightScore;
      winner_id = leftWon
        ? (userSide === 'left' ? p1 : p2)
        : (userSide === 'right' ? p1 : p2);
    } // si empate → winner_id = null

    const details = JSON.stringify({ mode: mode || 'local', leftScore, rightScore, userSide });

    const info = db.prepare(`
      INSERT INTO matches (player1_id, player2_id, winner_id, details)
      VALUES (?, ?, ?, ?)
    `).run(p1, p2, winner_id, details);

    const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(info.lastInsertRowid);
    return { match };
  });
}

module.exports = routes;
