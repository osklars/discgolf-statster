import { randomUUID } from 'expo-crypto';
import { getInterestDb } from './interestDb';
import type { Session, SessionSummary } from './types';

function uid(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type SessionRow = { id: string; started_at: string; finished_at: string | null; notes: string | null; name: string | null };

function toSession(r: SessionRow): Session {
  return { id: r.id, startedAt: r.started_at, finishedAt: r.finished_at, notes: r.notes, name: r.name };
}

export async function startSession(name?: string, notes?: string): Promise<Session> {
  const session: Session = {
    id: uid(),
    startedAt: now(),
    finishedAt: null,
    notes: notes ?? null,
    name: name ?? null,
  };
  await getInterestDb().runAsync(
    'INSERT INTO session (id, started_at, finished_at, notes, name) VALUES (?, ?, NULL, ?, ?)',
    [session.id, session.startedAt, session.notes, session.name],
  );
  return session;
}

export async function renameSession(sessionId: string, name: string): Promise<void> {
  await getInterestDb().runAsync('UPDATE session SET name = ? WHERE id = ?', [name.trim() || null, sessionId]);
}

export async function getSession(id: string): Promise<Session | null> {
  const row = await getInterestDb().getFirstAsync<SessionRow>(
    'SELECT * FROM session WHERE id = ?', [id],
  );
  return row ? toSession(row) : null;
}

export async function getSessionNames(
  ids: string[],
): Promise<Record<string, { name: string | null; startedAt: string }>> {
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await getInterestDb().getAllAsync<{ id: string; name: string | null; started_at: string }>(
    `SELECT id, name, started_at FROM session WHERE id IN (${placeholders})`,
    ids,
  );
  const result: Record<string, { name: string | null; startedAt: string }> = {};
  for (const r of rows) result[r.id] = { name: r.name, startedAt: r.started_at };
  return result;
}

export async function getSessionsWithEntryCounts(): Promise<SessionSummary[]> {
  const rows = await getInterestDb().getAllAsync<{ id: string; started_at: string; entry_count: number; name: string | null }>(
    `SELECT s.id, s.started_at, s.name, COUNT(e.id) AS entry_count
     FROM session s
     LEFT JOIN entry e ON e.session_id = s.id
     GROUP BY s.id
     ORDER BY s.started_at DESC`,
  );
  return rows.map(r => ({ id: r.id, startedAt: r.started_at, entryCount: r.entry_count, name: r.name }));
}
