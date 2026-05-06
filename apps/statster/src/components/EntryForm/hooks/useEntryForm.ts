import { useCallback, useState } from 'react';
import type { EntryFormState, Grid2DStatDef, StatDef, StatValue } from '../types';

const GRID2D_SEP = '·';

function isGrid2D(p: StatDef): p is Grid2DStatDef {
  return p.type === 'grid2d';
}

export function useEntryForm(stats: StatDef[], initialValues?: Record<string, StatValue>): EntryFormState & {
  toggleExpanded: (id: string) => void;
  setValue: (id: string, value: StatValue) => void;
  clearValue: (id: string) => void;
  clearAll: () => void;
  clearSubmitted: () => void;
  formatValue: (stat: StatDef, raw: StatValue | undefined) => string;
} {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(stats.map((p) => p.id)),
  );
  const [values, setValues] = useState<Record<string, StatValue>>(initialValues ?? {});

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setValue = useCallback(
    (id: string, value: StatValue) => {
      setValues((prev) => {
        const next = { ...prev, [id]: value };
        const stat = stats.find((p) => p.id === id);
        if (stat && isGrid2D(stat)) {
          const parts = value.split(GRID2D_SEP);
          if (parts.length === 2) {
            next[stat.axisX.id] = parts[0];
            next[stat.axisY.id] = parts[1];
          }
        }
        return next;
      });
    },
    [stats],
  );

  const clearValue = useCallback(
    (id: string) => {
      setValues((prev) => {
        const next = { ...prev };
        delete next[id];
        const stat = stats.find((p) => p.id === id);
        if (stat && isGrid2D(stat)) {
          delete next[stat.axisX.id];
          delete next[stat.axisY.id];
        }
        return next;
      });
    },
    [stats],
  );

  const formatValue = useCallback(
    (stat: StatDef, raw: StatValue | undefined): string => {
      if (raw === undefined || raw === '') return '';
      switch (stat.type) {
        case 'scalar': {
          const n = parseFloat(raw);
          if (isNaN(n)) return raw;
          const formatted = Number.isInteger(n) ? String(n) : n.toFixed(1);
          return stat.unit ? `${formatted}${stat.unit}` : formatted;
        }
        case 'named': {
          const opt = stat.options.find((o) => o.id === raw);
          return opt ? opt.label : raw;
        }
        case 'grid2d': {
          const parts = raw.split(GRID2D_SEP);
          if (parts.length !== 2) return raw;
          return `${formatValue(stat.axisX, parts[0])} × ${formatValue(stat.axisY, parts[1])}`;
        }
      }
    },
    [],
  );

  const clearAll = useCallback(() => setValues({}), []);

  const clearSubmitted = useCallback(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const stat of stats) {
        if (stat.clearAfterSubmit === false) continue;
        delete next[stat.id];
        if (stat.type === 'grid2d') {
          delete next[stat.axisX.id];
          delete next[stat.axisY.id];
        }
      }
      return next;
    });
  }, [stats]);

  return { expandedIds, values, stats, toggleExpanded, setValue, clearValue, clearAll, clearSubmitted, formatValue };
}
