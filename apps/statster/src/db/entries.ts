import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';
import type { Entry } from './types';

function uid(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type EntryRow = {
  id: string; session_id: string; form_id: string;
  entry_number: number; logged_at: string;
};

function toEntry(r: EntryRow): Entry {
  return {
    id: r.id, sessionId: r.session_id, exerciseId: r.form_id,
    entryNumber: r.entry_number, loggedAt: r.logged_at,
  };
}

export async function createEntry(
  sessionId: string,
  exerciseId: string,
  entryNumber: number,
): Promise<Entry> {
  const entry: Entry = { id: uid(), sessionId, exerciseId, entryNumber, loggedAt: now() };
  await getInterestDb().runAsync(
    'INSERT INTO entry (id, session_id, form_id, entry_number, logged_at) VALUES (?, ?, ?, ?, ?)',
    [entry.id, entry.sessionId, entry.exerciseId, entry.entryNumber, entry.loggedAt],
  );
  return entry;
}

export async function getEntriesForSession(sessionId: string): Promise<Entry[]> {
  const rows = await getInterestDb().getAllAsync<EntryRow>(
    'SELECT * FROM entry WHERE session_id = ? ORDER BY entry_number ASC',
    [sessionId],
  );
  return rows.map(toEntry);
}

export async function updateEntryExerciseId(id: string, exerciseId: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE entry SET form_id = ? WHERE id = ?', [exerciseId, id]);
}

export async function deleteEntry(id: string): Promise<void> {
  await getInterestDb().runAsync('DELETE FROM entry WHERE id = ?', [id]);
}
