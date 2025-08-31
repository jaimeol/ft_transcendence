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
const { db } = require('./db');

const certsDir = path.join(__dirname, '..', 'certs');
const httpsOptions = {
  key: fs.readFileSync(path.join(certsDir, 'server.key')),
  cert: fs.readFileSync(path.join(certsDir, 'server.crt'))
};

const app = Fastify({ https: httpsOptions, logger: true });

app.register(cors, { origin: true, credentials: true });
app.register(formbody);
app.register(multipart);
app.register(cookie);
app.register(session, {
	cookieName: 'sessionId',
	secret: '12345678901234567890123456789012', //esto quiza lo meta en un .env
	cookie: { httpOnly: true, sameSite: 'lax', secure: false }
});
app.register(websocket);

// Decorar Fastify con la base de datos
app.decorate('db', db);

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
    try { sock.send(JSON.stringify(payload)); } catch {}
  }
});

// Endpoint WS autenticado por sesión
app.get('/ws/chat', { websocket: true }, (connection, req) => {
  const uid = req.session.uid; // <- autenticado vía cookie de sesión
  if (!uid) { try { connection.socket.close(); } catch {} ; return; }

  // Registrar
  const set = socketsByUser.get(uid) || new Set();
  set.add(connection.socket);
  socketsByUser.set(uid, set);

  // Presencia simple
  connection.socket.send(JSON.stringify({ type: 'hello', userId: uid }));

  connection.socket.on('message', (buf) => {
    let msg = {};
    try { msg = JSON.parse(String(buf)); } catch { return; }

    // Mensajes enviados por WS (text / invite)
    if (msg.type === 'send') {
      const { to, body } = msg;
      if (!to || (!body && msg.kind !== 'invite')) return;
      // Persistir
      const k = msg.kind === 'invite' ? 'invite' : 'text';
      const meta = k === 'invite' ? JSON.stringify({ game: 'pong' }) : null;
      const info = require('./db').db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, body, kind, meta)
        VALUES (?, ?, ?, ?, ?)
      `).run(uid, Number(to), body ?? null, k, meta);
      const saved = require('./db').db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);

      // Eco al propio cliente
      try { connection.socket.send(JSON.stringify({ type: 'message', message: saved })); } catch {}
      // Push al destinatario
      app.websocketPush(Number(to), { type: k === 'invite' ? 'invite' : 'message', message: saved });
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

const PORT = 1234;
app.listen({ port: PORT, host: '0.0.0.0' }, (err, address)=>{
  if(err){ app.log.error(err); process.exit(1); }
  console.log('Servidor en', address);
});
