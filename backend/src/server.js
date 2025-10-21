const path = require('path');
const fs = require('fs');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');
const formbody = require('@fastify/formbody');
const websocket = require('@fastify/websocket');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const chatRoutes    = require('./routes/chat');
const matchesRoutes = require('./routes/matches');
const tournamentsRoutes = require('./routes/tournaments');


const { db } = require('./db');
const { error } = require('console');

const certsDir = path.join(__dirname, '..', 'certs');
const httpsOptions = {
  key: fs.readFileSync(path.join(certsDir, 'server.key')),
  cert: fs.readFileSync(path.join(certsDir, 'server.crt'))
};

const app = Fastify({ 
  https: httpsOptions, 
  logger: process.env.NODE_ENV !== 'production',
  trustProxy: true
});

app.register(cors, { 
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://localhost:1234'], 
  credentials: true 
});
app.register(formbody);
app.register(multipart);
app.register(cookie);
app.register(session, {
	cookieName: 'sessionId',
	secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
	cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
});
app.register(websocket);

// Decorar Fastify con la base de datos
app.decorate('db', db);

app.get('/api/config', async (req, reply) => {
  return { googleClientId: process.env.GOOGLE_CLIENT_ID || '' };
});

// Registrar las rutas de Google Auth
app.register(require("./routes/auth_google"), { prefix: "/api" });
// Comentamos auth_google_code ya que requiere CLIENT_SECRET
// app.register(require("./routes/auth_google_code"), { prefix: "/api" });


app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
  cacheControl: false,
  maxAge: '0',
  etag: false,
  lastModified: false,
});

const uploadsDir = path.join('/app', 'data', 'uploads');
const defaultAvatarPath = path.join(uploadsDir, 'default-avatar.png');
fs.mkdirSync(uploadsDir, { recursive: true });
app.get('/uploads/*', async (req, reply)=>{
  const p = req.params['*'];
  const file = path.join(uploadsDir, p);
  reply.header('Cache-Control', 'no-store');

  if (fs.existsSync(file))
    return reply.send(fs.createReadStream(file));
  if (fs.existsSync(defaultAvatarPath))
    return reply.send(fs.createReadStream(defaultAvatarPath));
  return reply.redirect('/default-avatar.png');
});

const socketsByUser = new Map(); // userId -> Set<WebSocket>

app.decorate('websocketPush', (userId, payload) => {
  const set = socketsByUser.get(Number(userId));
  if (!set) return;
  for (const sock of set) {
      try { 
        sock.send(JSON.stringify(payload)); 
      } catch (err) {
        app.log.warn('Failed to send WebSocket message:', err.message);
      }
  }
});

// Endpoint WS autenticado por sesión
app.get('/ws/chat', { websocket: true }, (connection, req) => {
  const uid = req.session.uid; // <- autenticado vía cookie de sesión
  if (!uid) { 
    try { 
      connection.socket.close(); 
    } catch (err) {
      app.log.warn('Failed to close unauthorized WebSocket:', err.message);
    }
    return; 
  }

  // Registrar
  const set = socketsByUser.get(uid) || new Set();
  set.add(connection.socket);
  socketsByUser.set(uid, set);

  // Presencia simple
  connection.socket.send(JSON.stringify({ type: 'hello', userId: uid }));

  connection.socket.on('message', (buf) => {
    let msg = {};
    try { msg = JSON.parse(String(buf)); } catch { return; }

    if (msg.type === 'send') {
      const { to, body, kind, cid } = msg;
      if (!to || (!body && kind !== 'invite')) return;

      const other = Number(to);
      // Valida amistad/bloqueos como en la API HTTP
      const isFriends = !!require('./db').db.prepare(`
        SELECT 1 FROM friends
        WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
          AND status = 'accepted'
      `).get(uid, other, other, uid);
      const blockedMeToOther = !!require('./db').db.prepare(`SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).get(uid, other);
      const blockedOtherToMe = !!require('./db').db.prepare(`SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).get(other, uid);
      if (!isFriends || blockedMeToOther || blockedOtherToMe) return;

      const k = kind === 'invite' ? 'invite' : 'text';

      const finalMeta = (k === 'invite')
        ? JSON.stringify(meta || { game: 'pong', status: 'pending' })
        : null;
      const finalBody = k === 'invite' ? (body || '🎮 ¡Te reto a jugar a Pong!') : body;
      
      const info = require('./db').db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, body, kind, meta)
        VALUES (?, ?, ?, ?, ?)
      `).run(uid, other, finalBody, k, finalMeta);
      const saved = require('./db').db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);

      // Eco al emisor con el cid para reconciliar
      try { connection.socket.send(JSON.stringify({ type: k === 'invite' ? 'invite' : 'message', message: saved, cid })); } catch {}
      // Push al destinatario (sin cid)
      app.websocketPush(other, { type: k === 'invite' ? 'invite' : 'message', message: saved });

      if (msg.type === 'accept_invite') {
        try {
          const { messageId } = msg;
          const uid_guest = req.session.uid;

          const originalMsg = require('./db').db.prepare(
            "SELECT * FROM messages WHERE id = ? AND receiver_id = ? AND kind = 'invite'"
          ).get(messageId, uid_guest);

          if (!originalMsg) {
            app.log.warn(`Invalid invite accept attemp by ${uid_guest} for msg ${messageId}`);
            return;
          }

          const oldMeta = JSON.parse(originalMsg.meta || '{}');
          if (oldMeta.status !== 'pending') return;

          const newMeta = JSON.stringify({ ...oldMeta, status: 'accepted' });
          require('./db').db.prepare(
            "UPDATE messages SET meta = ? WHERE id = ?"
          ).run(newMeta, messageId);

          const updateMsg = require('./db').db.prepare(
            "SELECT * FROM messages WHERE id = ?"
          ).get(messageId);

          const uid_host = updateMsg.sender_id;

          app.websocketPush(uid_host, { type: 'invite_update', message: updateMsg });
          app.websocketPush(uid_guest, { type: 'invite_update', message: updateMsg });
        } catch(err) {
          app.log.error(err, 'Error processing accept_invite');
        }
      }
    }
  });

  connection.socket.on('close', () => {
    const s = socketsByUser.get(uid);
    if (s) { s.delete(connection.socket); if (s.size === 0) socketsByUser.delete(uid); }
  });
});

app.register(authRoutes);
app.register(usersRoutes);
app.register(friendsRoutes);
app.register(chatRoutes);
app.register(matchesRoutes);
app.register(tournamentsRoutes);

const indexPath = path.join(__dirname, '..', 'public', 'index.html');

app.get('/', async (req, reply) => {
  if (req.session?.uid) {
    return reply.redirect('/home');
  }
  return reply.type('text/html').send(fs.readFileSync(indexPath));
});

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith('/api')) {
    return reply.code(404).send({ error: 'Not found' });
  }
  reply.type('text/html').send(fs.readFileSync(indexPath));
})

const PORT = 1234;
app.listen({ port: PORT, host: '0.0.0.0' }, (err, address)=>{
  if(err){ app.log.error(err); process.exit(1); }
  console.log('Servidor en', address);
});
