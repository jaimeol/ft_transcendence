PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  birthdate TEXT,
  avatar_path TEXT DEFAULT '/uploads/default-avatar.png',
  google_linked INTEGER DEFAULT 0,
  google_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  addressee_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','blocked')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(requester_id, addressee_id)
);
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL CHECK(game IN ('pong', 'tictactoe')),
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  winner_id INTEGER,
  played_at TEXT DEFAULT (datetime('now')),
  details TEXT
);

-- Mensajes directos
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  body        TEXT,
  kind        TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','invite','system')),
  meta        TEXT, -- JSON opcional (por ejemplo, datos de invitación)
  created_at  TEXT DEFAULT (datetime('now')),
  read_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_pair_time
ON messages(sender_id, receiver_id, created_at);

-- Bloqueos unidireccionales
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL,
  blocked_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Notificaciones (p.ej. torneo)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  max_players INTEGER NOT NULL,
  is_public INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'registration' CHECK(status IN ('registration','active','completed','finished')),
  creator_id INTEGER NOT NULL,
  winner_id INTEGER,
  current_round INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  alias TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tournament_id, user_id),
  UNIQUE(tournament_id, alias),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  winner_id INTEGER,
  score_player1 INTEGER DEFAULT 0,
  score_player2 INTEGER DEFAULT 0,
  played_at TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES tournament_participants(id),
  FOREIGN KEY (player2_id) REFERENCES tournament_participants(id),
  FOREIGN KEY (winner_id) REFERENCES tournament_participants(id)
);