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
