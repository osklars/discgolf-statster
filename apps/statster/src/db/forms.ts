import { randomUUID } from 'expo-crypto';
import { getSkillDb } from './skillDb';
import type { Form, FormGrid2D, FormParam } from './types';

function uid(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type FormRow = { id: string; name: string; sort_order: number; created_at: string };
type FormParamRow = { form_id: string; param_id: string; param_type: string; sort_order: number; clear_after_submit: number };
type Grid2DRow = {
  id: string; form_id: string; name: string;
  axis_x_id: string; axis_y_id: string; sort_order: number; clear_after_submit: number;
};

function toForm(r: FormRow): Form {
  return { id: r.id, name: r.name, sortOrder: r.sort_order, createdAt: r.created_at };
}

function toFormParam(r: FormParamRow): FormParam {
  return {
    formId: r.form_id,
    paramId: r.param_id,
    paramType: r.param_type as 'scalar' | 'named',
    sortOrder: r.sort_order,
    clearAfterSubmit: r.clear_after_submit !== 0,
  };
}

function toGrid2D(r: Grid2DRow): FormGrid2D {
  return {
    id: r.id, formId: r.form_id, name: r.name,
    axisXId: r.axis_x_id, axisYId: r.axis_y_id, sortOrder: r.sort_order,
    clearAfterSubmit: r.clear_after_submit !== 0,
  };
}

export async function getForms(): Promise<Form[]> {
  const rows = await getSkillDb().getAllAsync<FormRow>(
    'SELECT * FROM form ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(toForm);
}

export async function upsertForm(
  input: Omit<Form, 'createdAt'> & { id?: string },
): Promise<Form> {
  const db = getSkillDb();
  const form: Form = { ...input, id: input.id ?? uid(), createdAt: now() };
  await db.runAsync(
    `INSERT INTO form (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order`,
    [form.id, form.name, form.sortOrder, form.createdAt],
  );
  return form;
}

export async function deleteForm(id: string): Promise<void> {
  await getSkillDb().runAsync('DELETE FROM form WHERE id = ?', [id]);
}

export async function getFormParams(formId: string): Promise<FormParam[]> {
  const rows = await getSkillDb().getAllAsync<FormParamRow>(
    'SELECT * FROM form_param WHERE form_id = ? ORDER BY sort_order ASC',
    [formId],
  );
  return rows.map(toFormParam);
}

export async function getFormGrid2Ds(formId: string): Promise<FormGrid2D[]> {
  const rows = await getSkillDb().getAllAsync<Grid2DRow>(
    'SELECT * FROM form_grid2d WHERE form_id = ? ORDER BY sort_order ASC',
    [formId],
  );
  return rows.map(toGrid2D);
}

export type LayoutEntry =
  | { type: 'scalar'; paramId: string; sortOrder: number; clearAfterSubmit?: boolean }
  | { type: 'named'; paramId: string; sortOrder: number; clearAfterSubmit?: boolean }
  | { type: 'grid2d'; id: string; name: string; axisXId: string; axisYId: string; sortOrder: number; clearAfterSubmit?: boolean };

export async function saveFormLayout(formId: string, entries: LayoutEntry[]): Promise<void> {
  const db = getSkillDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM form_param WHERE form_id = ?', [formId]);
    await db.runAsync('DELETE FROM form_grid2d WHERE form_id = ?', [formId]);
    for (const e of entries) {
      const cas = e.clearAfterSubmit !== false ? 1 : 0;
      if (e.type === 'scalar' || e.type === 'named') {
        await db.runAsync(
          'INSERT INTO form_param (form_id, param_id, param_type, sort_order, clear_after_submit) VALUES (?, ?, ?, ?, ?)',
          [formId, e.paramId, e.type, e.sortOrder, cas],
        );
      } else {
        await db.runAsync(
          `INSERT INTO form_grid2d (id, form_id, name, axis_x_id, axis_y_id, sort_order, clear_after_submit)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [e.id, formId, e.name, e.axisXId, e.axisYId, e.sortOrder, cas],
        );
      }
    }
  });
}
