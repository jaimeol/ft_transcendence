const sqlite = require('sqlite').verbose();
const DB_PATH = 'app/data/dev.sqlite';

const db = new sqlite.Database(DB_PATH, (err) => {
	if (err) {
		console.log('Error al conectar con SQLite: ', err.message);
	} else {
		console.log('Conectado a la base de datos de desarrollo');
	}
});

const initdb = () => {
	db.exec(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY, 
		username TEXT NOT NULL UNIQUE, 
		display_name TEXT, 
		avatar_url TEXT
		) 
	`, (err) => {
		if (err) {
			console.log('Error al crear la tabla "users":', err);
		} else {
			console.log('Tabla "users" lista para usar.');
		}
	});
};

module.exports = {db, initdb};