export const LEVEL_THRESHOLDS = [0, 25, 75, 150, 300, 500, 1000, 2000, 5000, 10000];

export type LevelInfo = {
  level: number;
  progress: number; // 0–1
  toNext: number;   // entries needed to reach next level
  isMax: boolean;
};

export function computeLevel(entryCount: number): LevelInfo {
  const last = LEVEL_THRESHOLDS.length - 1;
  if (entryCount >= LEVEL_THRESHOLDS[last]) {
    return { level: last + 1, progress: 1, toNext: 0, isMax: true };
  }
  let i = 0;
  while (i < last - 1 && entryCount >= LEVEL_THRESHOLDS[i + 1]) i++;
  const current = LEVEL_THRESHOLDS[i];
  const next = LEVEL_THRESHOLDS[i + 1];
  return {
    level: i + 1,
    progress: (entryCount - current) / (next - current),
    toNext: next - entryCount,
    isMax: false,
  };
}
