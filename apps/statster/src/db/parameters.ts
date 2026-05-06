import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';
import type {
  ChoiceOption,
  ChoiceStat,
  NumberStat,
} from './types';

function uid(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ─── Row shapes returned by SQLite ───────────────────────────────────────────

type ScalarRow = {
  id: string; name: string; min: number; max: number; step: number;
  major_step: number; unit: string | null; lbl_min: string; lbl_max: string;
  target: number | null; created_at: string;
};

type NamedRow = { id: string; name: string; created_at: string };

type OptionRow = {
  id: string; parameter_id: string; label: string;
  sort_order: number; archived_at: string | null;
};

function toNumberStat(r: ScalarRow): NumberStat {
  return {
    id: r.id, name: r.name, min: r.min, max: r.max, step: r.step,
    majorStep: r.major_step, unit: r.unit, lblMin: r.lbl_min,
    lblMax: r.lbl_max, target: r.target ?? null, createdAt: r.created_at,
  };
}

function toChoiceStat(r: NamedRow): ChoiceStat {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

function toChoiceOption(r: OptionRow): ChoiceOption {
  return {
    id: r.id, statId: r.parameter_id, label: r.label,
    sortOrder: r.sort_order, archivedAt: r.archived_at,
  };
}

// ─── Number stats ─────────────────────────────────────────────────────────────

export async function upsertNumberStat(
  input: Omit<NumberStat, 'createdAt'> & { id?: string },
): Promise<NumberStat> {
  const db = getInterestDb();
  const stat: NumberStat = {
    ...input,
    id: input.id ?? uid(),
    target: input.target ?? null,
    createdAt: now(),
  };
  await db.runAsync(
    `INSERT INTO scalar_parameter
       (id, name, min, max, step, major_step, unit, lbl_min, lbl_max, target, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, min=excluded.min, max=excluded.max,
       step=excluded.step, major_step=excluded.major_step,
       unit=excluded.unit, lbl_min=excluded.lbl_min, lbl_max=excluded.lbl_max,
       target=excluded.target`,
    [stat.id, stat.name, stat.min, stat.max, stat.step,
     stat.majorStep, stat.unit ?? null, stat.lblMin, stat.lblMax,
     stat.target, stat.createdAt],
  );
  return stat;
}

export async function getNumberStats(): Promise<NumberStat[]> {
  const rows = await getInterestDb().getAllAsync<ScalarRow>(
    'SELECT * FROM scalar_parameter WHERE archived_at IS NULL ORDER BY name ASC',
  );
  return rows.map(toNumberStat);
}

export async function getArchivedNumberStats(): Promise<NumberStat[]> {
  const rows = await getInterestDb().getAllAsync<ScalarRow>(
    'SELECT * FROM scalar_parameter WHERE archived_at IS NOT NULL ORDER BY name ASC',
  );
  return rows.map(toNumberStat);
}

export async function archiveNumberStat(id: string): Promise<void> {
  await getInterestDb().runAsync(
    'UPDATE scalar_parameter SET archived_at = ? WHERE id = ?',
    [new Date().toISOString(), id],
  );
}

export async function restoreNumberStat(id: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE scalar_parameter SET archived_at = NULL WHERE id = ?', [id]);
}

export async function deleteNumberStat(id: string): Promise<void> {
  await getInterestDb().runAsync('DELETE FROM scalar_parameter WHERE id = ?', [id]);
}

// ─── Choice stats ─────────────────────────────────────────────────────────────

export async function upsertChoiceStat(
  input: Omit<ChoiceStat, 'createdAt'> & { id?: string },
): Promise<ChoiceStat> {
  const db = getInterestDb();
  const stat: ChoiceStat = { ...input, id: input.id ?? uid(), createdAt: now() };
  await db.runAsync(
    `INSERT INTO named_parameter (id, name, created_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name`,
    [stat.id, stat.name, stat.createdAt],
  );
  return stat;
}

export async function getChoiceStats(): Promise<ChoiceStat[]> {
  const rows = await getInterestDb().getAllAsync<NamedRow>(
    'SELECT * FROM named_parameter WHERE archived_at IS NULL ORDER BY name ASC',
  );
  return rows.map(toChoiceStat);
}

export async function getArchivedChoiceStats(): Promise<ChoiceStat[]> {
  const rows = await getInterestDb().getAllAsync<NamedRow>(
    'SELECT * FROM named_parameter WHERE archived_at IS NOT NULL ORDER BY name ASC',
  );
  return rows.map(toChoiceStat);
}

export async function archiveChoiceStat(id: string): Promise<void> {
  await getInterestDb().runAsync(
    'UPDATE named_parameter SET archived_at = ? WHERE id = ?',
    [new Date().toISOString(), id],
  );
}

export async function restoreChoiceStat(id: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE named_parameter SET archived_at = NULL WHERE id = ?', [id]);
}

export async function deleteChoiceStat(id: string): Promise<void> {
  await getInterestDb().runAsync('DELETE FROM named_parameter WHERE id = ?', [id]);
}

// ─── Choice options ────────────────────────────────────────────────────────────

export async function upsertChoiceOption(
  input: Omit<ChoiceOption, 'archivedAt'> & { id?: string },
): Promise<ChoiceOption> {
  const db = getInterestDb();
  const option: ChoiceOption = { ...input, id: input.id ?? uid(), archivedAt: null };
  await db.runAsync(
    `INSERT INTO named_option (id, parameter_id, label, sort_order, archived_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       label=excluded.label, sort_order=excluded.sort_order, archived_at=NULL`,
    [option.id, option.statId, option.label, option.sortOrder],
  );
  return option;
}

export async function getChoiceOptions(statId: string): Promise<ChoiceOption[]> {
  const rows = await getInterestDb().getAllAsync<OptionRow>(
    'SELECT * FROM named_option WHERE parameter_id = ? ORDER BY sort_order ASC',
    [statId],
  );
  return rows.map(toChoiceOption);
}

export async function deleteChoiceOption(id: string): Promise<void> {
  await getInterestDb().runAsync('DELETE FROM named_option WHERE id = ?', [id]);
}

export async function archiveChoiceOption(id: string): Promise<void> {
  await getInterestDb().runAsync(
    'UPDATE named_option SET archived_at = ? WHERE id = ?',
    [now(), id],
  );
}

export async function getAllChoiceOptions(): Promise<ChoiceOption[]> {
  const rows = await getInterestDb().getAllAsync<OptionRow>(
    'SELECT * FROM named_option ORDER BY parameter_id, sort_order ASC',
  );
  return rows.map(toChoiceOption);
}
