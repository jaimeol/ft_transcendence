const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { error } = require('console');


function toUserSafe(row){
  return {
    id: row.id, email: row.email, display_name: row.display_name,
    first_name: row.first_name, last_name: row.last_name, birthdate: row.birthdate,
    avatar_path: row.avatar_path, created_at: row.created_at, updated_at: row.updated_at,
    google_linked: row.google_linked || 0, has_password: !!row.password_hash
  };
}

async function routes(fastify){
  // GET /api/users/me - Obtener información del usuario autenticado
  fastify.get('/api/users/me', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    return toUserSafe(user);
  });

  fastify.put('/api/users/me', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const { email, display_name, first_name, last_name, birthdate } = req.body || {};

    try{
      db.prepare(`UPDATE users
        SET email        = COALESCE(?, email),
            display_name = COALESCE(?, display_name),
            first_name   = COALESCE(?, first_name),
            last_name    = COALESCE(?, last_name),
            birthdate    = COALESCE(?, birthdate)
        WHERE id = ?`)
        .run(email ?? null, display_name ?? null, first_name ?? null, last_name ?? null, birthdate ?? null, uid);
    }catch(e){
      if(e.code === 'SQLITE_CONSTRAINT_UNIQUE')
        return reply.code(409).send({ error: 'Email o nombre público ya en uso' });
      return reply.code(500).send({ error: 'Update failed' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    return { user: toUserSafe(user) };
  });

  fastify.post('/api/users/me/avatar', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const parts = req.parts();
    for await (const part of parts){
      if(part.type === 'file' && part.fieldname === 'avatar'){
        const filename = `u${uid}-${Date.now()}-${part.filename}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const dest = path.join('/app/data/uploads', filename);
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        await fs.promises.writeFile(dest, await part.toBuffer());
        db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(`/uploads/${filename}`, uid);
      }
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    return { user: toUserSafe(user) };
  });

  fastify.get('/api/users/:id', async (req, reply)=>{
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if(!user) return reply.code(404).send({ error: 'Not found' });
    const wins = db.prepare('SELECT COUNT(*) as c FROM matches WHERE winner_id = ?').get(id).c;
    const total = db.prepare('SELECT COUNT(*) as c FROM matches WHERE player1_id = ? OR player2_id = ?').get(id, id).c;
    const losses = Math.max(0, total - wins);
    return { user: toUserSafe(user), stats: { wins, losses } };
  });

  fastify.get('/api/users/search', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });
    const q = String(req.query.q || '').trim();
    if (!q) return { users: [] };
    const like = `%${q}%`;
    const rows = db.prepare(`
      SELECT id, display_name, avatar_path
      FROM users
      WHERE (display_name LIKE ? OR email LIKE ?)
        AND id != ?
      ORDER BY display_name
      LIMIT 20
      `).all(like, like, uid);
    return { users: rows};
  });

    fastify.get('/api/users/me/matches', async (req, reply) => {
    const uid = req.session.uid;
    if (!uid) return reply.code(401).send({ error: 'Unauthorized' });

    const rows = db.prepare(`
      SELECT id, player1_id, player2_id, winner_id, played_at, details
      FROM matches
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY datetime(played_at) DESC
      LIMIT 100
    `).all(uid, uid);

    return { matches: rows };
  });
}

module.exports = routes;
