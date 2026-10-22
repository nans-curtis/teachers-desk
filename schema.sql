-- Schema recovered from Cloudflare D1. No user records are included.
PRAGMA foreign_keys = ON;

CREATE TABLE audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 revision INTEGER NOT NULL,
 at TEXT NOT NULL,
 email TEXT NOT NULL,
 changes TEXT NOT NULL CHECK(json_valid(changes))
);

CREATE TABLE meta (
 id INTEGER PRIMARY KEY CHECK(id=1),
 revision INTEGER NOT NULL DEFAULT 0,
 token TEXT NOT NULL DEFAULT ''
);

CREATE TABLE notion_import_runs (
 id TEXT PRIMARY KEY,
 imported_at TEXT NOT NULL,
 owner TEXT NOT NULL,
 summary TEXT NOT NULL CHECK(json_valid(summary)),
 expected_revision INTEGER NOT NULL,
 published_revision INTEGER
);

CREATE TABLE notion_source_rows (
 source_id TEXT NOT NULL,
 row_url TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(source_id,row_url)
);

CREATE TABLE notion_sources (
 source_id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 schema_json TEXT NOT NULL
);

CREATE TABLE notion_staging (
 import_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 id TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(import_id,kind,id)
);

CREATE TABLE records (
 kind TEXT NOT NULL,
 id TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 PRIMARY KEY(kind,id)
);

CREATE INDEX records_kind ON records(kind);

-- Initialize revision tracking in a new, empty database.
INSERT OR IGNORE INTO meta (id, revision, token) VALUES (1, 0, '');
