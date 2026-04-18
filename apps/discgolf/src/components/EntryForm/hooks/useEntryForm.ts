import { useCallback, useState } from 'react';
import type { EntryFormState, Param, ParamValue } from '../types';

export function useEntryForm(params: Param[]): EntryFormState & {
  toggleExpanded: (id: string) => void;
  setValue: (id: string, value: ParamValue) => void;
  clearValue: (id: string) => void;
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

  const setValue = useCallback((id: string, value: ParamValue) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const clearValue = useCallback((id: string) => {
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

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
      }
    },
    [],
  );

  return { expandedIds, values, params, toggleExpanded, setValue, clearValue, formatValue };
}
