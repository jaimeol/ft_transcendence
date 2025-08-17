// backend/server.js
const path = require('path');
const fs = require('fs');
const fastify = require('fastify');
const fastifyStatic = require('@fastify/static');


const certsDir = path.join(__dirname, '..', 'certs');
const httpsOptions = {
	key: fs.readFileSync(path.join(certsDir, 'server.key')),
	cert: fs.readFileSync(path.join(certsDir, 'server.crt'))
};

const server = fastify({
	https: httpsOptions,
	logger: true
});


server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
});

server.listen({ port: 1234, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		server.log.error(err);
		process.exit(1);
	}
	console.log(`Servidor en: ${address}`);
});
