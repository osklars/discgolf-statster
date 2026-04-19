import { getSkillDb } from './skillDb';

export const BASE_XP = 40;

type QualityRow = {
  entry_id: string;
  value: number;
  min: number;
  max: number;
  target: number;
};

function qualityWeight(value: number, min: number, max: number, target: number): number {
  const maxDist = Math.max(target - min, max - target);
  if (maxDist === 0) return 2;
  return 2 - 1.5 * (Math.abs(value - target) / maxDist);
}

export async function computeXpForEntries(
  entryIds: string[],
): Promise<{ entryId: string; xp: number }[]> {
  if (entryIds.length === 0) return [];

  const placeholders = entryIds.map(() => '?').join(', ');
  const rows = await getSkillDb().getAllAsync<QualityRow>(
    `SELECT sd.entry_id, sd.value, sp.min, sp.max, sp.target
     FROM scalar_datapoint sd
     JOIN scalar_parameter sp ON sp.id = sd.parameter_id
     WHERE sp.target IS NOT NULL
       AND sd.entry_id IN (${placeholders})`,
    entryIds,
  );

  // Group quality datapoints by entry and multiply weights
  const weightsByEntry = new Map<string, number>();
  for (const row of rows) {
    const w = qualityWeight(row.value, row.min, row.max, row.target);
    weightsByEntry.set(row.entry_id, (weightsByEntry.get(row.entry_id) ?? 1) * w);
  }

  return entryIds.map((id) => ({
    entryId: id,
    xp: Math.round(BASE_XP * (weightsByEntry.get(id) ?? 1)),
  }));
}
