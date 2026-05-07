import { getInterestDb } from './interestDb';
import type { Entry, EntryQueryFilters } from './types';

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

/**
 * Returns entries matching ALL provided filters.
 * Each number filter adds an INNER JOIN that requires the entry to have a
 * scalar_datapoint for that stat within the given range.
 * Each choice filter adds an INNER JOIN that requires the entry to have a
 * named_datapoint for that stat matching one of the given option IDs.
 */
export async function queryEntries(filters: EntryQueryFilters): Promise<Entry[]> {
  const { numberFilters = [], choiceFilters = [], sessionId } = filters;

  let joins = '';
  const params: (string | number)[] = [];
  let joinIdx = 0;

  for (const nf of numberFilters) {
    const alias = `sdp${joinIdx++}`;
    joins += ` INNER JOIN scalar_datapoint ${alias} ON ${alias}.entry_id = e.id
               AND ${alias}.parameter_id = ?`;
    params.push(nf.statId);
    if (nf.min !== undefined) { joins += ` AND ${alias}.value >= ?`; params.push(nf.min); }
    if (nf.max !== undefined) { joins += ` AND ${alias}.value <= ?`; params.push(nf.max); }
  }

  for (const cf of choiceFilters) {
    const alias = `ndp${joinIdx++}`;
    const placeholders = cf.optionIds.map(() => '?').join(', ');
    joins += ` INNER JOIN named_datapoint ${alias} ON ${alias}.entry_id = e.id
               AND ${alias}.parameter_id = ?
               AND ${alias}.option_id IN (${placeholders})`;
    params.push(cf.statId, ...cf.optionIds);
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

  const rows = await getInterestDb().getAllAsync<EntryRow>(sql, params);
  return rows.map(toEntry);
}

// ── Rich entries ──────────────────────────────────────────────────────────────

export type RichEntryNumber = { statId: string; statName: string; value: number; unit: string | null };
export type RichEntryChoice = { statId: string; statName: string; optionId: string; optionLabel: string };

export type RichEntry = {
  id: string;
  exerciseId: string;
  loggedAt: string;
  scalars: RichEntryNumber[];
  named: RichEntryChoice[];
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

  const db = getInterestDb();
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

  const scalarsByEntry = new Map<string, RichEntryNumber[]>();
  for (const r of scalarRows) {
    const list = scalarsByEntry.get(r.entry_id) ?? [];
    list.push({ statId: r.parameter_id, statName: r.param_name, value: r.value, unit: r.unit });
    scalarsByEntry.set(r.entry_id, list);
  }

  const namedByEntry = new Map<string, RichEntryChoice[]>();
  for (const r of namedRows) {
    const list = namedByEntry.get(r.entry_id) ?? [];
    list.push({ statId: r.parameter_id, statName: r.param_name, optionId: r.option_id, optionLabel: r.option_label });
    namedByEntry.set(r.entry_id, list);
  }

  return entries.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    loggedAt: e.loggedAt,
    scalars: scalarsByEntry.get(e.id) ?? [],
    named: namedByEntry.get(e.id) ?? [],
  }));
}

// ── Entry counts per exercise ─────────────────────────────────────────────────

export async function queryEntryCountByExercise(): Promise<Record<string, number>> {
  const rows = await getInterestDb().getAllAsync<{ form_id: string; count: number }>(
    'SELECT form_id, COUNT(*) AS count FROM entry GROUP BY form_id',
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.form_id] = r.count;
  return result;
}

// ── Stat usage counts ─────────────────────────────────────────────────────────

export async function queryStatUsageCounts(): Promise<Record<string, number>> {
  const db = getInterestDb();
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

// ── Choice option usage counts ────────────────────────────────────────────────

export async function queryChoiceOptionUsageCounts(): Promise<Record<string, number>> {
  const rows = await getInterestDb().getAllAsync<{ option_id: string; count: number }>(
    'SELECT option_id, COUNT(*) AS count FROM named_datapoint GROUP BY option_id',
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.option_id] = r.count;
  return result;
}

// ── Choice option recency ─────────────────────────────────────────────────────

type RecentOptionRow = { parameter_id: string; option_id: string; session_id: string };

export async function queryRecentChoiceOptions(): Promise<
  { statId: string; optionId: string; sessionId: string }[]
> {
  const rows = await getInterestDb().getAllAsync<RecentOptionRow>(
    `SELECT nd.parameter_id, nd.option_id, e.session_id
     FROM named_datapoint nd
     JOIN entry e ON e.id = nd.entry_id
     ORDER BY e.logged_at DESC`,
  );
  return rows.map((r) => ({
    statId: r.parameter_id,
    optionId: r.option_id,
    sessionId: r.session_id,
  }));
}
