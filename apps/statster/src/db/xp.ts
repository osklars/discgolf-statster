import { getSkillDb } from './skillDb';
import { queryEntries } from './queries';

export type QualityAverage = {
  paramId: string;
  name: string;
  avgValue: number;
  target: number;
  min: number;
  max: number;
};

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

// ── Combined level + quality summary ─────────────────────────────────────────

export type LevelSummary = {
  totalXp: number;
  entryCount: number;
  level: number;
  progress: number;
  xpInLevel: number;
  xpForNext: number;
  qualityAverages: QualityAverage[];
};

type AvgRow = {
  param_id: string;
  name: string;
  avg_value: number;
  target: number;
  min: number;
  max: number;
};

export async function getLevelSummary(
  namedFilters: { parameterId: string; optionId: string }[],
): Promise<LevelSummary> {
  const entries = await queryEntries({
    namedFilters: namedFilters.map((f) => ({ parameterId: f.parameterId, optionIds: [f.optionId] })),
  });

  if (entries.length === 0) {
    return { totalXp: 0, entryCount: 0, ...xpToLevel(0), qualityAverages: [] };
  }

  const entryIds = entries.map((e) => e.id);
  const placeholders = entryIds.map(() => '?').join(', ');

  const [xpResults, avgRows] = await Promise.all([
    computeXpForEntries(entryIds),
    getSkillDb().getAllAsync<AvgRow>(
      `SELECT sp.id AS param_id, sp.name, AVG(sd.value) AS avg_value,
              sp.target, sp.min, sp.max
       FROM scalar_datapoint sd
       JOIN scalar_parameter sp ON sp.id = sd.parameter_id
       WHERE sp.target IS NOT NULL
         AND sd.entry_id IN (${placeholders})
       GROUP BY sp.id, sp.name, sp.target, sp.min, sp.max
       ORDER BY sp.name`,
      entryIds,
    ),
  ]);

  const totalXp = xpResults.reduce((sum, r) => sum + r.xp, 0);
  return {
    totalXp,
    entryCount: entries.length,
    ...xpToLevel(totalXp),
    qualityAverages: avgRows.map((r) => ({
      paramId: r.param_id,
      name: r.name,
      avgValue: r.avg_value,
      target: r.target,
      min: r.min,
      max: r.max,
    })),
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
