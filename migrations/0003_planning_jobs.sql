CREATE TABLE IF NOT EXISTS planning_jobs (
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 request_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
 result_plan_id TEXT,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 PRIMARY KEY(session_id, request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_running_job_per_session ON planning_jobs(session_id) WHERE status='running';
CREATE INDEX IF NOT EXISTS planning_jobs_expiry ON planning_jobs(expires_at);
