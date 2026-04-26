import * as SQLite from 'expo-sqlite';
import { SKILL_DB_SCHEMA } from './schema';

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
  await _db.execAsync(SKILL_DB_SCHEMA);
  try { await _db.execAsync('ALTER TABLE session ADD COLUMN name TEXT'); } catch {}

  return _db;
}

export function getSkillDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('No skill DB open — call openSkillDb first');
  return _db;
}
