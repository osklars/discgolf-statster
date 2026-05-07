import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';

// Runtime shape — names always resolved fresh from DB, never stale.
export type LevelFilter = {
  statId: string;
  statName: string;
  optionId: string;
  optionLabel: string;
};

// Persisted shape — IDs only.
type StoredFilter = { statId: string; optionId: string };

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

export async function getLevels(): Promise<Level[]> {
  const db = getInterestDb();
  const rows = await db.getAllAsync<LevelRow>(
    'SELECT * FROM saved_level ORDER BY sort_order ASC, created_at ASC',
  );

  if (rows.length === 0) return [];

  const allStored: StoredFilter[][] = rows.map((r) => {
    const raw = JSON.parse(r.filters) as Array<{ statId: string; optionId: string }>;
    return raw.map((f) => ({ statId: f.statId, optionId: f.optionId }));
  });

  const statIds = [...new Set(allStored.flat().map((f) => f.statId))];
  const optionIds = [...new Set(allStored.flat().map((f) => f.optionId))];

  if (statIds.length === 0) {
    return rows.map((row) => ({ id: row.id, name: row.name, filters: [], sortOrder: row.sort_order }));
  }

  const pStats = statIds.map(() => '?').join(',');
  const pOptions = optionIds.map(() => '?').join(',');

  const [statRows, optionRows] = await Promise.all([
    db.getAllAsync<{ id: string; name: string }>(
      `SELECT id, name FROM named_parameter WHERE id IN (${pStats})`, statIds,
    ),
    db.getAllAsync<{ id: string; label: string }>(
      `SELECT id, label FROM named_option WHERE id IN (${pOptions})`, optionIds,
    ),
  ]);

  const statNames: Record<string, string> = {};
  for (const s of statRows) statNames[s.id] = s.name;
  const optionLabels: Record<string, string> = {};
  for (const o of optionRows) optionLabels[o.id] = o.label;

  return rows.map((row, i) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    filters: allStored[i]
      .filter((f) => f.statId in statNames && f.optionId in optionLabels)
      .map((f) => ({
        statId: f.statId,
        statName: statNames[f.statId],
        optionId: f.optionId,
        optionLabel: optionLabels[f.optionId],
      })),
  }));
}

export async function insertLevel(
  name: string,
  filters: Array<{ statId: string; optionId: string }>,
): Promise<string> {
  const db = getInterestDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM saved_level',
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  const stored: StoredFilter[] = filters.map((f) => ({ statId: f.statId, optionId: f.optionId }));
  await db.runAsync(
    'INSERT INTO saved_level (id, name, filters, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, JSON.stringify(stored), sortOrder, now],
  );
  return id;
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
