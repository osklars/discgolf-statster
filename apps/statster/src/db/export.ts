import { getSkillDb } from './skillDb';
import type { Session } from './types';

export type ExportedParameter =
  | { id: string; name: string; type: 'scalar'; value: number; unit: string | null }
  | { id: string; name: string; type: 'named'; value: string; option_id: string };

export type ExportedEntry = {
  id: string;
  entry_number: number;
  logged_at: string;
  form: string;
  parameters: ExportedParameter[];
};

export type ExportedSession = {
  version: 1;
  id: string;
  name: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  entries: ExportedEntry[];
};

type SessionRow = { id: string; name: string | null; started_at: string; finished_at: string | null; notes: string | null };
type EntryRow = { id: string; entry_number: number; logged_at: string; form_id: string };
type ScalarJoinRow = { entry_id: string; parameter_id: string; param_name: string; unit: string | null; value: number };
type NamedJoinRow = { entry_id: string; parameter_id: string; param_name: string; option_id: string; option_label: string };

export async function exportSession(sessionId: string): Promise<ExportedSession | null> {
  const db = getSkillDb();

  const sessionRow = await db.getFirstAsync<SessionRow>(
    'SELECT id, name, started_at, finished_at, notes FROM session WHERE id = ?',
    [sessionId],
  );
  if (!sessionRow) return null;

  const entryRows = await db.getAllAsync<EntryRow>(
    'SELECT id, entry_number, logged_at, form_id FROM entry WHERE session_id = ? ORDER BY entry_number ASC',
    [sessionId],
  );

  const [scalarRows, namedRows] = await Promise.all([
    db.getAllAsync<ScalarJoinRow>(
      `SELECT sd.entry_id, sd.parameter_id, sp.name AS param_name, sp.unit, sd.value
       FROM scalar_datapoint sd
       JOIN scalar_parameter sp ON sp.id = sd.parameter_id
       WHERE sd.entry_id IN (SELECT id FROM entry WHERE session_id = ?)`,
      [sessionId],
    ),
    db.getAllAsync<NamedJoinRow>(
      `SELECT nd.entry_id, nd.parameter_id, np.name AS param_name, nd.option_id, no.label AS option_label
       FROM named_datapoint nd
       JOIN named_parameter np ON np.id = nd.parameter_id
       JOIN named_option no ON no.id = nd.option_id
       WHERE nd.entry_id IN (SELECT id FROM entry WHERE session_id = ?)`,
      [sessionId],
    ),
  ]);

  const scalarsByEntry = new Map<string, ScalarJoinRow[]>();
  for (const row of scalarRows) {
    const list = scalarsByEntry.get(row.entry_id) ?? [];
    list.push(row);
    scalarsByEntry.set(row.entry_id, list);
  }

  const namedByEntry = new Map<string, NamedJoinRow[]>();
  for (const row of namedRows) {
    const list = namedByEntry.get(row.entry_id) ?? [];
    list.push(row);
    namedByEntry.set(row.entry_id, list);
  }

  const entries: ExportedEntry[] = entryRows.map((e) => {
    const named: ExportedParameter[] = (namedByEntry.get(e.id) ?? []).map((r) => ({
      id: r.parameter_id,
      name: r.param_name,
      type: 'named',
      value: r.option_label,
      option_id: r.option_id,
    }));
    const scalars: ExportedParameter[] = (scalarsByEntry.get(e.id) ?? []).map((r) => ({
      id: r.parameter_id,
      name: r.param_name,
      type: 'scalar',
      value: r.value,
      unit: r.unit,
    }));
    return {
      id: e.id,
      entry_number: e.entry_number,
      logged_at: e.logged_at,
      form: e.form_id,
      parameters: [...named, ...scalars],
    };
  });

  return {
    version: 1,
    id: sessionRow.id,
    name: sessionRow.name,
    started_at: sessionRow.started_at,
    finished_at: sessionRow.finished_at,
    notes: sessionRow.notes,
    entries,
  };
}
