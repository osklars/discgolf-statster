import { getSkillDb } from './skillDb';
import { queryEntries } from './queries';

// ── Level curve ───────────────────────────────────────────────────────────────
// Cumulative XP to reach level n: n*(n+1)/2 * 500
// XP gap between levels grows linearly: level 1 costs 500, level 2 costs 1000, etc.

export function levelThreshold(n: number): number {
  return (n * (n + 1) / 2) * 500;
}

export function xpToLevel(totalXp: number): {
  level: number;
  progress: number;
  xpInLevel: number;
  xpForNext: number;
} {
  let level = 0;
  while (levelThreshold(level + 1) <= totalXp) level++;
  const lo = levelThreshold(level);
  const hi = levelThreshold(level + 1);
  return {
    level,
    progress: hi === lo ? 1 : (totalXp - lo) / (hi - lo),
    xpInLevel: totalXp - lo,
    xpForNext: hi - totalXp,
  };
}

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

// ── Filtered XP total ─────────────────────────────────────────────────────────

export async function getXpWithFilters(
  namedFilters: { parameterId: string; optionId: string }[],
): Promise<{ totalXp: number; entryCount: number }> {
  const entries = await queryEntries({
    namedFilters: namedFilters.map((f) => ({ parameterId: f.parameterId, optionIds: [f.optionId] })),
  });
  if (entries.length === 0) return { totalXp: 0, entryCount: 0 };
  const xpResults = await computeXpForEntries(entries.map((e) => e.id));
  return {
    totalXp: xpResults.reduce((sum, r) => sum + r.xp, 0),
    entryCount: entries.length,
  };
}

// ── Per-entry XP ──────────────────────────────────────────────────────────────

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
