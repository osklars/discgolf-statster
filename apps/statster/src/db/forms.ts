import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';
import type { Exercise, ExerciseGrid2D, ExerciseStatSlot } from './types';

function uid(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type ExerciseRow = { id: string; name: string; sort_order: number; created_at: string };
type SlotRow = { form_id: string; param_id: string; param_type: string; sort_order: number; clear_after_submit: number };
type Grid2DRow = {
  id: string; form_id: string; name: string;
  axis_x_id: string; axis_y_id: string; sort_order: number; clear_after_submit: number;
};

function toExercise(r: ExerciseRow): Exercise {
  return { id: r.id, name: r.name, sortOrder: r.sort_order, createdAt: r.created_at };
}

function toSlot(r: SlotRow): ExerciseStatSlot {
  return {
    exerciseId: r.form_id,
    statId: r.param_id,
    statType: r.param_type as 'scalar' | 'named',
    sortOrder: r.sort_order,
    clearAfterSubmit: r.clear_after_submit !== 0,
  };
}

function toGrid2D(r: Grid2DRow): ExerciseGrid2D {
  return {
    id: r.id, exerciseId: r.form_id, name: r.name,
    axisXId: r.axis_x_id, axisYId: r.axis_y_id, sortOrder: r.sort_order,
    clearAfterSubmit: r.clear_after_submit !== 0,
  };
}

export async function getExercises(): Promise<Exercise[]> {
  const rows = await getInterestDb().getAllAsync<ExerciseRow>(
    'SELECT * FROM form WHERE archived_at IS NULL ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(toExercise);
}

export async function getArchivedExercises(): Promise<Exercise[]> {
  const rows = await getInterestDb().getAllAsync<ExerciseRow>(
    'SELECT * FROM form WHERE archived_at IS NOT NULL ORDER BY name ASC',
  );
  return rows.map(toExercise);
}

export async function archiveExercise(id: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE form SET archived_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

export async function restoreExercise(id: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE form SET archived_at = NULL WHERE id = ?', [id]);
}

export async function upsertExercise(
  input: Omit<Exercise, 'createdAt'> & { id?: string },
): Promise<Exercise> {
  const db = getInterestDb();
  const exercise: Exercise = { ...input, id: input.id ?? uid(), createdAt: now() };
  await db.runAsync(
    `INSERT INTO form (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order`,
    [exercise.id, exercise.name, exercise.sortOrder, exercise.createdAt],
  );
  return exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  await getInterestDb().runAsync('DELETE FROM form WHERE id = ?', [id]);
}

export async function getExerciseStats(exerciseId: string): Promise<ExerciseStatSlot[]> {
  const rows = await getInterestDb().getAllAsync<SlotRow>(
    'SELECT * FROM form_param WHERE form_id = ? ORDER BY sort_order ASC',
    [exerciseId],
  );
  return rows.map(toSlot);
}

export async function getExerciseGrid2Ds(exerciseId: string): Promise<ExerciseGrid2D[]> {
  const rows = await getInterestDb().getAllAsync<Grid2DRow>(
    'SELECT * FROM form_grid2d WHERE form_id = ? ORDER BY sort_order ASC',
    [exerciseId],
  );
  return rows.map(toGrid2D);
}

export type LayoutEntry =
  | { type: 'scalar'; statId: string; sortOrder: number; clearAfterSubmit?: boolean }
  | { type: 'named'; statId: string; sortOrder: number; clearAfterSubmit?: boolean }
  | { type: 'grid2d'; id: string; name: string; axisXId: string; axisYId: string; sortOrder: number; clearAfterSubmit?: boolean };

export async function saveExerciseLayout(exerciseId: string, entries: LayoutEntry[]): Promise<void> {
  const db = getInterestDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM form_param WHERE form_id = ?', [exerciseId]);
    await db.runAsync('DELETE FROM form_grid2d WHERE form_id = ?', [exerciseId]);
    for (const e of entries) {
      const cas = e.clearAfterSubmit !== false ? 1 : 0;
      if (e.type === 'scalar' || e.type === 'named') {
        await db.runAsync(
          'INSERT INTO form_param (form_id, param_id, param_type, sort_order, clear_after_submit) VALUES (?, ?, ?, ?, ?)',
          [exerciseId, e.statId, e.type, e.sortOrder, cas],
        );
      } else {
        await db.runAsync(
          `INSERT INTO form_grid2d (id, form_id, name, axis_x_id, axis_y_id, sort_order, clear_after_submit)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [e.id, exerciseId, e.name, e.axisXId, e.axisYId, e.sortOrder, cas],
        );
      }
    }
  });
}
