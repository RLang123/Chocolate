CREATE TABLE rank_runs (
 id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 mission_ids TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 mistakes INTEGER NOT NULL DEFAULT 0,
 score INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','complete','expired')),
 started_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 finished_at INTEGER,
 UNIQUE(player_id,day)
);
CREATE INDEX idx_rank_runs_day_score ON rank_runs(day,status,score);
ALTER TABLE attempts ADD COLUMN rank_run_id TEXT REFERENCES rank_runs(id);
CREATE UNIQUE INDEX idx_rank_attempt_round ON attempts(rank_run_id,mission_id) WHERE rank_run_id IS NOT NULL;
CREATE TABLE lab_records (
 attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
 record_id INTEGER NOT NULL,
 owner TEXT NOT NULL,
 content TEXT NOT NULL,
 PRIMARY KEY(attempt_id,record_id)
);
CREATE TABLE lab_evidence (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
 step INTEGER NOT NULL,
 request TEXT NOT NULL,
 patch TEXT NOT NULL,
 valid INTEGER NOT NULL CHECK(valid IN (0,1)),
 created_at INTEGER NOT NULL
);
CREATE INDEX idx_lab_evidence_attempt ON lab_evidence(attempt_id,step);
CREATE TABLE lab_login_events (
 evidence_id TEXT NOT NULL REFERENCES lab_evidence(id) ON DELETE CASCADE,
 sequence INTEGER NOT NULL,
 status INTEGER NOT NULL,
 PRIMARY KEY(evidence_id,sequence)
);
UPDATE sessions SET expires_at=MIN(expires_at,CAST(strftime('%s','now') AS INTEGER)*1000+2592000000);
