import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';

export type LevelFilter = {
  statId: string;
  statName: string;
  optionId: string;
  optionLabel: string;
};

export type Level = {
  id: string;
  name: string;
  filters: LevelFilter[];
  sortOrder: number;
};

type LevelRow = {
  id: string;
  name: string;
  filters: string;
  sort_order: number;
};

function fromRow(row: LevelRow): Level {
  return {
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters) as LevelFilter[],
    sortOrder: row.sort_order,
  };
}

export async function getLevels(): Promise<Level[]> {
  const db = getInterestDb();
  const rows = await db.getAllAsync<LevelRow>(
    'SELECT * FROM saved_level ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(fromRow);
}

export async function insertLevel(
  name: string,
  filters: LevelFilter[],
): Promise<Level> {
  const db = getInterestDb();
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

export async function deleteLevel(id: string): Promise<void> {
  const db = getInterestDb();
  await db.runAsync('DELETE FROM saved_level WHERE id = ?', [id]);
}

export async function reorderLevels(ids: string[]): Promise<void> {
  const db = getInterestDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync('UPDATE saved_level SET sort_order = ? WHERE id = ?', [i, ids[i]]);
    }
  });
}
