const path = require('path');
const fs = require('fs');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');
const formbody = require('@fastify/formbody');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
require('./db');

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

app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
});

const uploadsDir = path.join('/app', 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.get('/uploads/*', async (req, reply)=>{
  const p = req.params['*'];
  const file = path.join(uploadsDir, p);
  if(!fs.existsSync(file)) return reply.code(404).send();
  return reply.send(fs.createReadStream(file));
});

app.register(authRoutes);
app.register(usersRoutes);
app.register(friendsRoutes);

const PORT = 1234;
app.listen({ port: PORT, host: '0.0.0.0' }, (err, address)=>{
  if(err){ app.log.error(err); process.exit(1); }
  console.log('Servidor en', address);
});
