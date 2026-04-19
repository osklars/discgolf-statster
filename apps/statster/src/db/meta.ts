import * as SQLite from 'expo-sqlite';
import type { Skill } from '../contexts/SkillContext';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('meta.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS skills (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      emoji      TEXT NOT NULL,
      color      TEXT NOT NULL,
      db_file    TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return _db;
}

type SkillRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  db_file: string;
};

function rowToSkill(row: SkillRow): Skill {
  return { id: row.id, name: row.name, emoji: row.emoji, color: row.color, dbFile: row.db_file };
}

export async function getAllSkills(): Promise<Skill[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SkillRow>(
    'SELECT * FROM skills ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(rowToSkill);
}

export async function insertSkill(skill: Skill): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO skills (id, name, emoji, color, db_file, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [skill.id, skill.name, skill.emoji, skill.color, skill.dbFile, Date.now()],
  );
}

export async function getActiveSkillId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = 'active_skill_id'",
  );
  return row?.value ?? null;
}

export async function setActiveSkillId(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_skill_id', ?)",
    [id],
  );
}
