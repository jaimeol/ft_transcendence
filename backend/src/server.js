// backend/server.js
const path = require('path');
const fastify = require('fastify')({ logger: true });
const fastifyStatic = require('@fastify/static');

// Sirve todos los archivos de frontend/public
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/public'),
  prefix: '/', // Accede a todo directamente desde la raíz
});

fastify.listen({ port: 1234 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Servidor en: ${address}`);
});
