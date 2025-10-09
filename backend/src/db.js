const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join('/app','data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

try {
  db.exec(`CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
    END;`);
} catch {}

try {
  // Crear índice único para google_id (solo cuando no es NULL)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;`);
  
  // Índices adicionales para performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);`);
} catch {}

module.exports = { db };
