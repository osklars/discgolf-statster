import { getSkillDb } from './skillDb';
import type { Entry, EntryQueryFilters } from './types';

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

/**
 * Returns entries matching ALL provided filters.
 * Each scalar filter adds an INNER JOIN that requires the entry to have a
 * scalar_datapoint for that parameter within the given range.
 * Each named filter adds an INNER JOIN that requires the entry to have a
 * named_datapoint for that parameter matching one of the given option IDs.
 */
export async function queryEntries(filters: EntryQueryFilters): Promise<Entry[]> {
  const { scalarFilters = [], namedFilters = [], sessionId } = filters;

  let joins = '';
  const params: (string | number)[] = [];
  let joinIdx = 0;

  for (const sf of scalarFilters) {
    const alias = `sdp${joinIdx++}`;
    joins += ` INNER JOIN scalar_datapoint ${alias} ON ${alias}.entry_id = e.id
               AND ${alias}.parameter_id = ?`;
    params.push(sf.parameterId);
    if (sf.min !== undefined) { joins += ` AND ${alias}.value >= ?`; params.push(sf.min); }
    if (sf.max !== undefined) { joins += ` AND ${alias}.value <= ?`; params.push(sf.max); }
  }

  for (const nf of namedFilters) {
    const alias = `ndp${joinIdx++}`;
    const placeholders = nf.optionIds.map(() => '?').join(', ');
    joins += ` INNER JOIN named_datapoint ${alias} ON ${alias}.entry_id = e.id
               AND ${alias}.parameter_id = ?
               AND ${alias}.option_id IN (${placeholders})`;
    params.push(nf.parameterId, ...nf.optionIds);
  }

  let where = '';
  if (sessionId) {
    where = 'WHERE e.session_id = ?';
    params.push(sessionId);
  }

  const sql = `SELECT DISTINCT e.*
               FROM entry e${joins}
               ${where}
               ORDER BY e.session_id, e.entry_number`;

  const rows = await getSkillDb().getAllAsync<EntryRow>(sql, params);
  return rows.map(toEntry);
}

// ── Rich entries ──────────────────────────────────────────────────────────────

export type RichEntryScalar = { parameterId: string; paramName: string; value: number; unit: string | null };
export type RichEntryNamed  = { parameterId: string; paramName: string; optionId: string; optionLabel: string };

export type RichEntry = {
  id: string;
  formId: string;
  loggedAt: string;
  scalars: RichEntryScalar[];
  named: RichEntryNamed[];
};

type ScalarDpRow = { entry_id: string; parameter_id: string; param_name: string; value: number; unit: string | null };
type NamedDpRow  = { entry_id: string; parameter_id: string; param_name: string; option_id: string; option_label: string };

/**
 * Returns all entries matching the filters, with their full datapoints attached.
 * Callers pass the RichEntry[] down to child components which reduce locally —
 * no per-component DB fetches needed.
 */
export async function queryRichEntries(filters: EntryQueryFilters): Promise<RichEntry[]> {
  const entries = await queryEntries(filters);
  if (entries.length === 0) return [];

  const db = getSkillDb();
  const ids = entries.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(', ');

  const [scalarRows, namedRows] = await Promise.all([
    db.getAllAsync<ScalarDpRow>(
      `SELECT sd.entry_id, sd.parameter_id, sp.name AS param_name, sd.value, sp.unit
       FROM scalar_datapoint sd
       JOIN scalar_parameter sp ON sp.id = sd.parameter_id
       WHERE sd.entry_id IN (${placeholders})`,
      ids,
    ),
    db.getAllAsync<NamedDpRow>(
      `SELECT nd.entry_id, nd.parameter_id, np.name AS param_name,
              nd.option_id, no.label AS option_label
       FROM named_datapoint nd
       JOIN named_parameter np ON np.id = nd.parameter_id
       JOIN named_option no ON no.id = nd.option_id
       WHERE nd.entry_id IN (${placeholders})`,
      ids,
    ),
  ]);

  const scalarsByEntry = new Map<string, RichEntryScalar[]>();
  for (const r of scalarRows) {
    const list = scalarsByEntry.get(r.entry_id) ?? [];
    list.push({ parameterId: r.parameter_id, paramName: r.param_name, value: r.value, unit: r.unit });
    scalarsByEntry.set(r.entry_id, list);
  }

  const namedByEntry = new Map<string, RichEntryNamed[]>();
  for (const r of namedRows) {
    const list = namedByEntry.get(r.entry_id) ?? [];
    list.push({ parameterId: r.parameter_id, paramName: r.param_name, optionId: r.option_id, optionLabel: r.option_label });
    namedByEntry.set(r.entry_id, list);
  }

  return entries.map((e) => ({
    id: e.id,
    formId: e.formId,
    loggedAt: e.loggedAt,
    scalars: scalarsByEntry.get(e.id) ?? [],
    named: namedByEntry.get(e.id) ?? [],
  }));
}

// ── Param usage counts ────────────────────────────────────────────────────────

export async function queryParamUsageCounts(): Promise<Record<string, number>> {
  const db = getSkillDb();
  const [scalarRows, namedRows] = await Promise.all([
    db.getAllAsync<{ parameter_id: string; count: number }>(
      'SELECT parameter_id, COUNT(*) AS count FROM scalar_datapoint GROUP BY parameter_id',
    ),
    db.getAllAsync<{ parameter_id: string; count: number }>(
      'SELECT parameter_id, COUNT(*) AS count FROM named_datapoint GROUP BY parameter_id',
    ),
  ]);
  const result: Record<string, number> = {};
  for (const r of [...scalarRows, ...namedRows]) {
    result[r.parameter_id] = (result[r.parameter_id] ?? 0) + r.count;
  }
  return result;
}

// ── Option usage counts ───────────────────────────────────────────────────────

export async function queryOptionUsageCounts(): Promise<Record<string, number>> {
  const rows = await getSkillDb().getAllAsync<{ option_id: string; count: number }>(
    'SELECT option_id, COUNT(*) AS count FROM named_datapoint GROUP BY option_id',
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.option_id] = r.count;
  return result;
}

// ── Option recency ────────────────────────────────────────────────────────────

type RecentOptionRow = { parameter_id: string; option_id: string; session_id: string };

export async function queryRecentNamedOptions(): Promise<
  { parameterId: string; optionId: string; sessionId: string }[]
> {
  const rows = await getSkillDb().getAllAsync<RecentOptionRow>(
    `SELECT nd.parameter_id, nd.option_id, e.session_id
     FROM named_datapoint nd
     JOIN entry e ON e.id = nd.entry_id
     ORDER BY e.logged_at DESC`,
  );
  return rows.map((r) => ({
    parameterId: r.parameter_id,
    optionId: r.option_id,
    sessionId: r.session_id,
  }));
}
