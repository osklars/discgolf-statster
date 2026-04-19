import { getSkillDb } from './skillDb';
import type { Session, SessionSummary } from './types';

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

type SessionRow = { id: string; started_at: string; finished_at: string | null; notes: string | null };

function toSession(r: SessionRow): Session {
  return { id: r.id, startedAt: r.started_at, finishedAt: r.finished_at, notes: r.notes };
}

export async function startSession(notes?: string): Promise<Session> {
  const session: Session = {
    id: uid(),
    startedAt: now(),
    finishedAt: null,
    notes: notes ?? null,
  };
  await getSkillDb().runAsync(
    'INSERT INTO session (id, started_at, finished_at, notes) VALUES (?, ?, NULL, ?)',
    [session.id, session.startedAt, session.notes],
  );
  return session;
}

export async function finishSession(sessionId: string, notes?: string): Promise<Session> {
  const db = getSkillDb();
  await db.runAsync(
    `UPDATE session SET finished_at = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    [now(), notes ?? null, sessionId],
  );
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM session WHERE id = ?', [sessionId]);
  if (!row) throw new Error(`Session not found: ${sessionId}`);
  return toSession(row);
}

export async function getSessions(): Promise<Session[]> {
  const rows = await getSkillDb().getAllAsync<SessionRow>(
    'SELECT * FROM session ORDER BY started_at DESC',
  );
  return rows.map(toSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const row = await getSkillDb().getFirstAsync<SessionRow>(
    'SELECT * FROM session WHERE id = ?', [id],
  );
  return row ? toSession(row) : null;
}

export async function getSessionsWithEntryCounts(): Promise<SessionSummary[]> {
  const rows = await getSkillDb().getAllAsync<{ id: string; started_at: string; entry_count: number }>(
    `SELECT s.id, s.started_at, COUNT(e.id) AS entry_count
     FROM session s
     LEFT JOIN entry e ON e.session_id = s.id
     GROUP BY s.id
     ORDER BY s.started_at DESC`,
  );
  return rows.map(r => ({ id: r.id, startedAt: r.started_at, entryCount: r.entry_count }));
}
