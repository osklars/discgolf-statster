import * as SQLite from 'expo-sqlite';
import { INTEREST_DB_SCHEMA } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;
let _dbFile: string | null = null;

export async function openInterestDb(dbFile: string): Promise<SQLite.SQLiteDatabase> {
  if (_db && _dbFile === dbFile) return _db;

  if (_db) {
    await _db.closeAsync();
    _db = null;
  }

  _db = await SQLite.openDatabaseAsync(dbFile);
  _dbFile = dbFile;
  await _db.execAsync(INTEREST_DB_SCHEMA);
  try { await _db.execAsync('ALTER TABLE session ADD COLUMN name TEXT'); } catch {}
  try { await _db.execAsync('ALTER TABLE scalar_parameter ADD COLUMN archived_at TEXT'); } catch {}
  try { await _db.execAsync('ALTER TABLE named_parameter ADD COLUMN archived_at TEXT'); } catch {}
  try { await _db.execAsync('ALTER TABLE form ADD COLUMN archived_at TEXT'); } catch {}

  return _db;
}

export function getInterestDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('No interest DB open — call openInterestDb first');
  return _db;
}
