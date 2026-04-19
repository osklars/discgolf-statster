import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;
let _dbFile: string | null = null;

export async function openSkillDb(dbFile: string): Promise<SQLite.SQLiteDatabase> {
  if (_db && _dbFile === dbFile) return _db;

  if (_db) {
    await _db.closeAsync();
    _db = null;
  }

  _db = await SQLite.openDatabaseAsync(dbFile);
  _dbFile = dbFile;

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS params (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      config     TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forms (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS form_params (
      form_id    TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      param_id   TEXT NOT NULL REFERENCES params(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (form_id, param_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      label      TEXT,
      started_at INTEGER NOT NULL,
      ended_at   INTEGER
    );

    CREATE TABLE IF NOT EXISTS entries (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      form_id    TEXT NOT NULL,
      data       TEXT NOT NULL,
      logged_at  INTEGER NOT NULL
    );
  `);

  return _db;
}

export function getActiveSkillDb(): SQLite.SQLiteDatabase | null {
  return _db;
}
