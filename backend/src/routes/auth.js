const bcrypt = require('bcrypt');
const { db } = require('../db');

function toUserSafe(row){
  return {
    id: row.id, email: row.email, display_name: row.display_name,
    first_name: row.first_name, last_name: row.last_name, birthdate: row.birthdate,
    avatar_path: row.avatar_path, created_at: row.created_at, updated_at: row.updated_at
  };
}

async function routes(fastify){
  fastify.post('/api/auth/register', async (req, reply)=>{
    const { email, password, display_name, first_name, last_name, birthdate } = req.body || {};
    if(!email || !password || !display_name) return reply.code(400).send({ error: 'Missing fields' });
    if(typeof password !== 'string' || password.length < 8) return reply.code(400).send({ error: 'Weak password' });
    const hash = await bcrypt.hash(password, 10);
    try {
      const info = db.prepare(`INSERT INTO users (email, password_hash, display_name, first_name, last_name, birthdate)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(email, hash, display_name, first_name ?? null, last_name ?? null, birthdate ?? null);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      req.session.uid = user.id;
      return { user: toUserSafe(user) };
    } catch (e) {
      if(e.code === 'SQLITE_CONSTRAINT_UNIQUE') return reply.code(409).send({ error: 'Email or display name already in use' });
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  fastify.post('/api/auth/login', async (req, reply)=>{
    const { email, password } = req.body || {};
    if(!email || !password) {
      return reply.code(400).send({ error: 'Missing credentials' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if(!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    
    // Verificar que el usuario tenga contraseña configurada
    if(!user.password_hash) {
      return reply.code(401).send({ error: 'This account was created with Google. Please use Google Sign In.' });
    }
    
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    
    req.session.uid = user.id;
    return { user: toUserSafe(user) };
  });

  fastify.post('/api/auth/logout', async (req, reply)=>{
    req.session.uid = null;
    reply.clearCookie('sessionId');
    return { ok: true };
  });

  fastify.get('/api/auth/me', async (req, reply)=>{
    const uid = req.session.uid;
    if(!uid) return reply.code(401).send({ user: null });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    return { user: toUserSafe(user) };
  });

  fastify.post('/api/auth/login-second', async (req, reply) => {
  try {
    const me = req.session.uid;
    if (!me) return reply.code(401).send({ error: 'Unauthorized' });

    const { email, password } = req.body || {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'Missing credentials' });
    }

    const user = db.prepare(`
      SELECT id, email, password_hash, display_name
      FROM users
      WHERE email = ?
    `).get(email);

    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

    if (!user.password_hash) {
      return reply.code(401).send({ error: 'This account was created with Google. Please use Google Sign In.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    if (user.id === me) {
      return reply.code(400).send({ error: 'Second player must be a different user' });
    }

    return reply.send({ id: user.id, displayname: user.display_name, email: user.email });
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: 'Server error' });
  }
});
}

module.exports = routes;
