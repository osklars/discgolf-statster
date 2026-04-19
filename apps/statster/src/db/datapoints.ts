import { randomUUID } from 'expo-crypto';
import { getSkillDb } from './skillDb';
import type { DatapointsForEntry, NamedDatapoint, ScalarDatapoint } from './types';

function uid(): string {
  return randomUUID();
}

type ScalarRow = { id: string; entry_id: string; parameter_id: string; value: number };
type NamedRow  = { id: string; entry_id: string; parameter_id: string; option_id: string };

function toScalar(r: ScalarRow): ScalarDatapoint {
  return { id: r.id, entryId: r.entry_id, parameterId: r.parameter_id, value: r.value };
}

function toNamed(r: NamedRow): NamedDatapoint {
  return { id: r.id, entryId: r.entry_id, parameterId: r.parameter_id, optionId: r.option_id };
}

export type InsertScalarInput = { parameterId: string; value: number };
export type InsertNamedInput  = { parameterId: string; optionId: string };

export async function insertDatapoints(
  entryId: string,
  scalars: InsertScalarInput[],
  named: InsertNamedInput[],
): Promise<DatapointsForEntry> {
  const db = getSkillDb();
  const insertedScalars: ScalarDatapoint[] = [];
  const insertedNamed: NamedDatapoint[] = [];

  await db.withTransactionAsync(async () => {
    for (const s of scalars) {
      const id = uid();
      await db.runAsync(
        'INSERT INTO scalar_datapoint (id, entry_id, parameter_id, value) VALUES (?, ?, ?, ?)',
        [id, entryId, s.parameterId, s.value],
      );
      insertedScalars.push({ id, entryId, parameterId: s.parameterId, value: s.value });
    }
    for (const n of named) {
      const id = uid();
      await db.runAsync(
        'INSERT INTO named_datapoint (id, entry_id, parameter_id, option_id) VALUES (?, ?, ?, ?)',
        [id, entryId, n.parameterId, n.optionId],
      );
      insertedNamed.push({ id, entryId, parameterId: n.parameterId, optionId: n.optionId });
    }
  });

  return { scalars: insertedScalars, named: insertedNamed };
}

export async function getDatapointsForEntry(entryId: string): Promise<DatapointsForEntry> {
  const db = getSkillDb();
  const [scalars, named] = await Promise.all([
    db.getAllAsync<ScalarRow>(
      'SELECT * FROM scalar_datapoint WHERE entry_id = ?', [entryId],
    ),
    db.getAllAsync<NamedRow>(
      'SELECT * FROM named_datapoint WHERE entry_id = ?', [entryId],
    ),
  ]);
  return { scalars: scalars.map(toScalar), named: named.map(toNamed) };
}
