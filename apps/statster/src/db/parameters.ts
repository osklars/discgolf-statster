import { randomUUID } from 'expo-crypto';
import { getSkillDb } from './skillDb';
import type {
  NamedOption,
  NamedParameter,
  ScalarParameter,
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
  created_at: string;
};

type NamedRow = { id: string; name: string; created_at: string };

type OptionRow = {
  id: string; parameter_id: string; label: string;
  sort_order: number; archived_at: string | null;
};

function toScalar(r: ScalarRow): ScalarParameter {
  return {
    id: r.id, name: r.name, min: r.min, max: r.max, step: r.step,
    majorStep: r.major_step, unit: r.unit, lblMin: r.lbl_min,
    lblMax: r.lbl_max, createdAt: r.created_at,
  };
}

function toNamed(r: NamedRow): NamedParameter {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

function toOption(r: OptionRow): NamedOption {
  return {
    id: r.id, parameterId: r.parameter_id, label: r.label,
    sortOrder: r.sort_order, archivedAt: r.archived_at,
  };
}

// ─── Scalar parameters ────────────────────────────────────────────────────────

export async function upsertScalarParameter(
  input: Omit<ScalarParameter, 'createdAt'> & { id?: string },
): Promise<ScalarParameter> {
  const db = getSkillDb();
  const param: ScalarParameter = {
    ...input,
    id: input.id ?? uid(),
    createdAt: now(),
  };
  await db.runAsync(
    `INSERT INTO scalar_parameter
       (id, name, min, max, step, major_step, unit, lbl_min, lbl_max, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, min=excluded.min, max=excluded.max,
       step=excluded.step, major_step=excluded.major_step,
       unit=excluded.unit, lbl_min=excluded.lbl_min, lbl_max=excluded.lbl_max`,
    [param.id, param.name, param.min, param.max, param.step,
     param.majorStep, param.unit ?? null, param.lblMin, param.lblMax, param.createdAt],
  );
  return param;
}

export async function getScalarParameters(): Promise<ScalarParameter[]> {
  const rows = await getSkillDb().getAllAsync<ScalarRow>(
    'SELECT * FROM scalar_parameter ORDER BY name ASC',
  );
  return rows.map(toScalar);
}

export async function deleteScalarParameter(id: string): Promise<void> {
  await getSkillDb().runAsync('DELETE FROM scalar_parameter WHERE id = ?', [id]);
}

// ─── Named parameters ─────────────────────────────────────────────────────────

export async function upsertNamedParameter(
  input: Omit<NamedParameter, 'createdAt'> & { id?: string },
): Promise<NamedParameter> {
  const db = getSkillDb();
  const param: NamedParameter = { ...input, id: input.id ?? uid(), createdAt: now() };
  await db.runAsync(
    `INSERT INTO named_parameter (id, name, created_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name`,
    [param.id, param.name, param.createdAt],
  );
  return param;
}

export async function getNamedParameters(): Promise<NamedParameter[]> {
  const rows = await getSkillDb().getAllAsync<NamedRow>(
    'SELECT * FROM named_parameter ORDER BY name ASC',
  );
  return rows.map(toNamed);
}

export async function deleteNamedParameter(id: string): Promise<void> {
  await getSkillDb().runAsync('DELETE FROM named_parameter WHERE id = ?', [id]);
}

// ─── Named options ────────────────────────────────────────────────────────────

export async function upsertNamedOption(
  input: Omit<NamedOption, 'archivedAt'> & { id?: string },
): Promise<NamedOption> {
  const db = getSkillDb();
  const option: NamedOption = { ...input, id: input.id ?? uid(), archivedAt: null };
  await db.runAsync(
    `INSERT INTO named_option (id, parameter_id, label, sort_order, archived_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       label=excluded.label, sort_order=excluded.sort_order`,
    [option.id, option.parameterId, option.label, option.sortOrder],
  );
  return option;
}

export async function getNamedOptions(parameterId: string): Promise<NamedOption[]> {
  const rows = await getSkillDb().getAllAsync<OptionRow>(
    'SELECT * FROM named_option WHERE parameter_id = ? ORDER BY sort_order ASC',
    [parameterId],
  );
  return rows.map(toOption);
}

export async function archiveNamedOption(id: string): Promise<void> {
  await getSkillDb().runAsync(
    'UPDATE named_option SET archived_at = ? WHERE id = ?',
    [now(), id],
  );
}

export async function getAllNamedOptions(): Promise<NamedOption[]> {
  const rows = await getSkillDb().getAllAsync<OptionRow>(
    'SELECT * FROM named_option ORDER BY parameter_id, sort_order ASC',
  );
  return rows.map(toOption);
}
