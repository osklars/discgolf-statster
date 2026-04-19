import { useCallback, useState } from 'react';
import type { EntryFormState, Grid2DParam, Param, ParamValue } from '../types';

const GRID2D_SEP = '·';

function isGrid2D(p: Param): p is Grid2DParam {
  return p.type === 'grid2d';
}

export function useEntryForm(params: Param[]): EntryFormState & {
  toggleExpanded: (id: string) => void;
  setValue: (id: string, value: ParamValue) => void;
  clearValue: (id: string) => void;
  clearAll: () => void;
  formatValue: (param: Param, raw: ParamValue | undefined) => string;
} {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(params.map((p) => p.id)),
  );
  const [values, setValues] = useState<Record<string, ParamValue>>({});

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
    (id: string, value: ParamValue) => {
      setValues((prev) => {
        const next = { ...prev, [id]: value };
        const param = params.find((p) => p.id === id);
        if (param && isGrid2D(param)) {
          const parts = value.split(GRID2D_SEP);
          if (parts.length === 2) {
            next[param.axisX.id] = parts[0];
            next[param.axisY.id] = parts[1];
          }
        }
        return next;
      });
    },
    [params],
  );

  const clearValue = useCallback(
    (id: string) => {
      setValues((prev) => {
        const next = { ...prev };
        delete next[id];
        const param = params.find((p) => p.id === id);
        if (param && isGrid2D(param)) {
          delete next[param.axisX.id];
          delete next[param.axisY.id];
        }
        return next;
      });
    },
    [params],
  );

  const formatValue = useCallback(
    (param: Param, raw: ParamValue | undefined): string => {
      if (raw === undefined || raw === '') return '';
      switch (param.type) {
        case 'scalar': {
          const n = parseFloat(raw);
          if (isNaN(n)) return raw;
          const formatted = Number.isInteger(n) ? String(n) : n.toFixed(1);
          return param.unit ? `${formatted}${param.unit}` : formatted;
        }
        case 'named': {
          const opt = param.options.find((o) => o.id === raw);
          return opt ? opt.label : raw;
        }
        case 'grid2d': {
          const parts = raw.split(GRID2D_SEP);
          if (parts.length !== 2) return raw;
          return `${formatValue(param.axisX, parts[0])} × ${formatValue(param.axisY, parts[1])}`;
        }
      }
    },
    [],
  );

  const clearAll = useCallback(() => setValues({}), []);

  return { expandedIds, values, params, toggleExpanded, setValue, clearValue, clearAll, formatValue };
}
