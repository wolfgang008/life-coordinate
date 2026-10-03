CREATE TABLE IF NOT EXISTS personal_models (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 answer_version TEXT NOT NULL,
 answers_json TEXT NOT NULL,
 model_json TEXT NOT NULL,
 followup_json TEXT,
 confirmed INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS personal_models_owner ON personal_models(session_id,expires_at);
CREATE TABLE IF NOT EXISTS atlas_jobs (
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 fingerprint TEXT NOT NULL,
 request_id TEXT NOT NULL,
 status TEXT NOT NULL,
 result_json TEXT,
 expires_at INTEGER NOT NULL,
 PRIMARY KEY(session_id,fingerprint)
);
CREATE UNIQUE INDEX IF NOT EXISTS atlas_running_job ON atlas_jobs(session_id) WHERE status='running';
