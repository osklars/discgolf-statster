import { useCallback, useState } from 'react';
import type { EntryFormState, Param, ParamValue, Grid2DParam } from '../types';

const GRID2D_SEP = '·';

function isGrid2D(p: Param): p is Grid2DParam {
  return p.type === 'grid2d';
}

export function useEntryForm(
  beforeParams: Param[],
  afterParams: Param[],
): EntryFormState & {
  toggleExpanded: (id: string) => void;
  setValue: (id: string, value: ParamValue) => void;
  clearValue: (id: string) => void;
  formatValue: (param: Param, raw: ParamValue | undefined) => string;
  setActiveTab: (tab: 'before' | 'after') => void;
} {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set([...beforeParams.map((p) => p.id), ...afterParams.map((p) => p.id)]),
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

        // For grid2d params also write the individual axis values
        const params = [...beforeParams, ...afterParams];
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
    [beforeParams, afterParams],
  );

  const clearValue = useCallback(
    (id: string) => {
      setValues((prev) => {
        const next = { ...prev };
        delete next[id];

        const params = [...beforeParams, ...afterParams];
        const param = params.find((p) => p.id === id);
        if (param && isGrid2D(param)) {
          delete next[param.axisX.id];
          delete next[param.axisY.id];
        }
        return next;
      });
    },
    [beforeParams, afterParams],
  );

  const formatValue = useCallback(
    (param: Param, raw: ParamValue | undefined): string => {
      if (raw === undefined || raw === '') return '';

      switch (param.type) {
        case 'scalar': {
          const n = parseFloat(raw);
          if (isNaN(n)) return raw;
          if (param.displayFormat === 'hyzer') {
            return n === 0 ? 'flat' : n > 0 ? `${n}a` : `${Math.abs(n)}h`;
          }
          if (param.displayFormat === 'nose') {
            return n === 0 ? '—' : n > 0 ? `${n}↑` : `${Math.abs(n)}↓`;
          }
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
          const xVal = formatValue(param.axisX, parts[0]);
          const yVal = formatValue(param.axisY, parts[1]);
          return `${xVal} × ${yVal}`;
        }
      }
    },
    [],
  );

  return {
    activeTab,
    expandedIds,
    values,
    beforeParams,
    afterParams,
    toggleExpanded,
    setValue,
    clearValue,
    formatValue,
    setActiveTab,
  };
}
