PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  birthdate TEXT,
  avatar_path TEXT DEFAULT '/uploads/default-avatar.png',
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
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  winner_id INTEGER,
  played_at TEXT DEFAULT (datetime('now')),
  details TEXT
);
