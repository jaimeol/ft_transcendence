const { db } = require('../db');

async function routes(fastify){
  fastify.post('/api/friends/:userId', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const { userId } = req.params;
    if(+userId === +uid) return reply.code(400).send({ error: 'Cannot friend yourself' });
    try{
      db.prepare('INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, "pending")').run(uid, userId);
      return { ok: true };
    }catch(e){
      return reply.code(409).send({ error: 'Already requested or friends' });
    }
  });

  fastify.post('/api/friends/:userId/accept', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const { userId } = req.params;
    const res = db.prepare('UPDATE friends SET status = "accepted" WHERE requester_id = ? AND addressee_id = ?').run(userId, uid);
    if(res.changes === 0) return reply.code(404).send({ error: 'Request not found' });
    return { ok: true };
  });

  fastify.get('/api/friends', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ error: 'Unauthorized' });
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
