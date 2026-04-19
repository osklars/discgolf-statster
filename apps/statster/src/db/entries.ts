import { getSkillDb } from './skillDb';
import type { Entry } from './types';

function uid(): string {
  return crypto.randomUUID();
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
    id: r.id, sessionId: r.session_id, formId: r.form_id,
    entryNumber: r.entry_number, loggedAt: r.logged_at,
  };
}

export async function createEntry(
  sessionId: string,
  formId: string,
  entryNumber: number,
): Promise<Entry> {
  const entry: Entry = { id: uid(), sessionId, formId, entryNumber, loggedAt: now() };
  await getSkillDb().runAsync(
    'INSERT INTO entry (id, session_id, form_id, entry_number, logged_at) VALUES (?, ?, ?, ?, ?)',
    [entry.id, entry.sessionId, entry.formId, entry.entryNumber, entry.loggedAt],
  );
  return entry;
}

export async function getEntriesForSession(sessionId: string): Promise<Entry[]> {
  const rows = await getSkillDb().getAllAsync<EntryRow>(
    'SELECT * FROM entry WHERE session_id = ? ORDER BY entry_number ASC',
    [sessionId],
  );
  return rows.map(toEntry);
}

export async function deleteEntry(id: string): Promise<void> {
  await getSkillDb().runAsync('DELETE FROM entry WHERE id = ?', [id]);
}
