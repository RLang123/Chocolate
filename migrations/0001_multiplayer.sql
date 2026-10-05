CREATE TABLE players (
 id TEXT PRIMARY KEY,
 nickname TEXT NOT NULL,
 avatar INTEGER NOT NULL DEFAULT 0,
 recovery_hash TEXT NOT NULL UNIQUE,
 hearts INTEGER NOT NULL DEFAULT 5 CHECK (hearts BETWEEN 0 AND 5),
 created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_player ON sessions(player_id);
CREATE TABLE rooms (
 code TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES players(id),
 mission_id INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'lobby',
 starts_at INTEGER,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE room_members (
 room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 joined_at INTEGER NOT NULL,
 seen_at INTEGER NOT NULL,
 score INTEGER NOT NULL DEFAULT 0,
 finished_at INTEGER,
 PRIMARY KEY (room_code, player_id)
);
CREATE TABLE attempts (
 id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 mission_id INTEGER NOT NULL,
 room_code TEXT REFERENCES rooms(code) ON DELETE SET NULL,
 step INTEGER NOT NULL DEFAULT 0,
 seed INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'active',
 created_at INTEGER NOT NULL,
 last_step_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX idx_attempts_player_created ON attempts(player_id, created_at);
CREATE TABLE answers (
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 mission_id INTEGER NOT NULL,
 step INTEGER NOT NULL,
 PRIMARY KEY (player_id, day, mission_id, step)
);
CREATE TABLE completions (
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 mission_id INTEGER NOT NULL,
 day TEXT NOT NULL,
 xp INTEGER NOT NULL,
 gems INTEGER NOT NULL DEFAULT 5,
 created_at INTEGER NOT NULL,
 PRIMARY KEY (player_id, mission_id, day)
);
CREATE INDEX idx_completions_day ON completions(day, player_id);
CREATE TABLE quest_claims (
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 quest_id INTEGER NOT NULL,
 gems INTEGER NOT NULL,
 PRIMARY KEY (player_id, day, quest_id)
);
CREATE TABLE rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
