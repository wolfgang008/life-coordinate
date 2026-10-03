PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('live','demo')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plans_by_session ON plans(session_id, created_at DESC);
CREATE TABLE IF NOT EXISTS actions (
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  completed_json TEXT NOT NULL DEFAULT '[]',
  notes_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(plan_id, route_id)
);
CREATE TABLE IF NOT EXISTS usage_windows (
  scope TEXT NOT NULL,
  bucket TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(scope,bucket)
);
