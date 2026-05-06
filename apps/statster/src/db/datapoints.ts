import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';
import type { DatapointsForEntry, ChoiceDatapoint, NumberDatapoint } from './types';

function uid(): string {
  return randomUUID();
}

type ScalarRow = { id: string; entry_id: string; parameter_id: string; value: number };
type NamedRow  = { id: string; entry_id: string; parameter_id: string; option_id: string };

function toNumberDatapoint(r: ScalarRow): NumberDatapoint {
  return { id: r.id, entryId: r.entry_id, statId: r.parameter_id, value: r.value };
}

function toChoiceDatapoint(r: NamedRow): ChoiceDatapoint {
  return { id: r.id, entryId: r.entry_id, statId: r.parameter_id, optionId: r.option_id };
}

export type InsertNumberInput = { statId: string; value: number };
export type InsertChoiceInput = { statId: string; optionId: string };

export async function insertDatapoints(
  entryId: string,
  scalars: InsertNumberInput[],
  named: InsertChoiceInput[],
): Promise<DatapointsForEntry> {
  const db = getInterestDb();
  const insertedScalars: NumberDatapoint[] = [];
  const insertedNamed: ChoiceDatapoint[] = [];

  await db.withTransactionAsync(async () => {
    for (const s of scalars) {
      const id = uid();
      await db.runAsync(
        'INSERT INTO scalar_datapoint (id, entry_id, parameter_id, value) VALUES (?, ?, ?, ?)',
        [id, entryId, s.statId, s.value],
      );
      insertedScalars.push({ id, entryId, statId: s.statId, value: s.value });
    }
    for (const n of named) {
      const id = uid();
      await db.runAsync(
        'INSERT INTO named_datapoint (id, entry_id, parameter_id, option_id) VALUES (?, ?, ?, ?)',
        [id, entryId, n.statId, n.optionId],
      );
      insertedNamed.push({ id, entryId, statId: n.statId, optionId: n.optionId });
    }
  });

  return { scalars: insertedScalars, named: insertedNamed };
}

export async function deleteDatapointsForEntry(entryId: string): Promise<void> {
  const db = getInterestDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM scalar_datapoint WHERE entry_id = ?', [entryId]);
    await db.runAsync('DELETE FROM named_datapoint WHERE entry_id = ?', [entryId]);
  });
}

export async function getDatapointsForEntry(entryId: string): Promise<DatapointsForEntry> {
  const db = getInterestDb();
  const [scalars, named] = await Promise.all([
    db.getAllAsync<ScalarRow>(
      'SELECT * FROM scalar_datapoint WHERE entry_id = ?', [entryId],
    ),
    db.getAllAsync<NamedRow>(
      'SELECT * FROM named_datapoint WHERE entry_id = ?', [entryId],
    ),
  ]);
  return { scalars: scalars.map(toNumberDatapoint), named: named.map(toChoiceDatapoint) };
}
