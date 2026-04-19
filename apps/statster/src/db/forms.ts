import { getSkillDb } from './skillDb';
import type { Form, FormParam } from './types';

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type FormRow = { id: string; name: string; sort_order: number; created_at: string };
type FormParamRow = { form_id: string; param_id: string; param_type: string; sort_order: number };

function toForm(r: FormRow): Form {
  return { id: r.id, name: r.name, sortOrder: r.sort_order, createdAt: r.created_at };
}

function toFormParam(r: FormParamRow): FormParam {
  return {
    formId: r.form_id,
    paramId: r.param_id,
    paramType: r.param_type as 'scalar' | 'named',
    sortOrder: r.sort_order,
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

export async function setFormParams(formId: string, params: Omit<FormParam, 'formId'>[]): Promise<void> {
  const db = getSkillDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM form_param WHERE form_id = ?', [formId]);
    for (const p of params) {
      await db.runAsync(
        'INSERT INTO form_param (form_id, param_id, param_type, sort_order) VALUES (?, ?, ?, ?)',
        [formId, p.paramId, p.paramType, p.sortOrder],
      );
    }
  });
}
