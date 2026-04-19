import { randomUUID } from 'expo-crypto';
import { getSkillDb } from './skillDb';

export type SavedLevelFilter = {
  parameterId: string;
  paramName: string;
  optionId: string;
  optionLabel: string;
};

export type SavedLevel = {
  id: string;
  name: string;
  filters: SavedLevelFilter[];
  sortOrder: number;
};

type SavedLevelRow = {
  id: string;
  name: string;
  filters: string;
  sort_order: number;
};

function fromRow(row: SavedLevelRow): SavedLevel {
  return {
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters) as SavedLevelFilter[],
    sortOrder: row.sort_order,
  };
}

export async function getSavedLevels(): Promise<SavedLevel[]> {
  const db = getSkillDb();
  const rows = await db.getAllAsync<SavedLevelRow>(
    'SELECT * FROM saved_level ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(fromRow);
}

export async function insertSavedLevel(
  name: string,
  filters: SavedLevelFilter[],
): Promise<SavedLevel> {
  const db = getSkillDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM saved_level',
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO saved_level (id, name, filters, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, JSON.stringify(filters), sortOrder, now],
  );
  return { id, name, filters, sortOrder };
}

export async function deleteSavedLevel(id: string): Promise<void> {
  const db = getSkillDb();
  await db.runAsync('DELETE FROM saved_level WHERE id = ?', [id]);
}

export async function reorderSavedLevels(ids: string[]): Promise<void> {
  const db = getSkillDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync('UPDATE saved_level SET sort_order = ? WHERE id = ?', [i, ids[i]]);
    }
  });
}
