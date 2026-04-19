export const SKILL_DB_SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS scalar_parameter (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    min        REAL NOT NULL,
    max        REAL NOT NULL,
    step       REAL NOT NULL,
    major_step REAL NOT NULL,
    unit       TEXT,
    lbl_min    TEXT NOT NULL,
    lbl_max    TEXT NOT NULL,
    target     REAL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS named_parameter (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS named_option (
    id           TEXT PRIMARY KEY,
    parameter_id TEXT NOT NULL REFERENCES named_parameter(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    archived_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS form (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_param (
    form_id             TEXT NOT NULL REFERENCES form(id) ON DELETE CASCADE,
    param_id            TEXT NOT NULL,
    param_type          TEXT NOT NULL,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    clear_after_submit  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (form_id, param_id)
  );

  CREATE TABLE IF NOT EXISTS form_grid2d (
    id                  TEXT PRIMARY KEY,
    form_id             TEXT NOT NULL REFERENCES form(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    axis_x_id           TEXT NOT NULL REFERENCES scalar_parameter(id) ON DELETE CASCADE,
    axis_y_id           TEXT NOT NULL REFERENCES scalar_parameter(id) ON DELETE CASCADE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    clear_after_submit  INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS seed_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_level (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    filters    TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id          TEXT PRIMARY KEY,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    notes       TEXT
  );

  CREATE TABLE IF NOT EXISTS entry (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    form_id      TEXT NOT NULL REFERENCES form(id),
    entry_number INTEGER NOT NULL,
    logged_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scalar_datapoint (
    id           TEXT PRIMARY KEY,
    entry_id     TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
    parameter_id TEXT NOT NULL REFERENCES scalar_parameter(id) ON DELETE CASCADE,
    value        REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS named_datapoint (
    id           TEXT PRIMARY KEY,
    entry_id     TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
    parameter_id TEXT NOT NULL REFERENCES named_parameter(id) ON DELETE CASCADE,
    option_id    TEXT NOT NULL REFERENCES named_option(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_entry_session        ON entry(session_id);
  CREATE INDEX IF NOT EXISTS idx_form_grid2d_form     ON form_grid2d(form_id);
  CREATE INDEX IF NOT EXISTS idx_scalar_dp_entry      ON scalar_datapoint(entry_id);
  CREATE INDEX IF NOT EXISTS idx_scalar_dp_param_val  ON scalar_datapoint(parameter_id, value);
  CREATE INDEX IF NOT EXISTS idx_named_dp_entry       ON named_datapoint(entry_id);
  CREATE INDEX IF NOT EXISTS idx_named_dp_param       ON named_datapoint(parameter_id);
  CREATE INDEX IF NOT EXISTS idx_named_dp_option      ON named_datapoint(option_id);
`;
