import { useCallback, useState } from 'react';
import type { FormDefinition, Grid2DParam, Param, ScalarParam } from '../types';

function uid(): string {
  return `p_${Math.random().toString(36).slice(2, 9)}`;
}

export type CombinePending = { sourceId: string } | null;

export function useEditForm(initial: FormDefinition) {
  const [draft, setDraft] = useState<Param[]>(initial.params);
  const [settingsTarget, setSettingsTarget] = useState<Param | 'new' | null>(null);
  const [combinePending, setCombinePending] = useState<CombinePending>(null);

  const moveUp = useCallback((id: string) => {
    setDraft((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setDraft((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const removeParam = useCallback((id: string) => {
    setDraft((prev) => prev.filter((p) => p.id !== id));
    setCombinePending((prev) => (prev?.sourceId === id ? null : prev));
  }, []);

  const saveParam = useCallback((param: Param) => {
    setDraft((prev) => {
      const idx = prev.findIndex((p) => p.id === param.id);
      if (idx === -1) return [...prev, param];
      const next = [...prev];
      next[idx] = param;
      return next;
    });
    setSettingsTarget(null);
  }, []);

  const startCombine = useCallback((id: string) => {
    setCombinePending((prev) => (prev?.sourceId === id ? null : { sourceId: id }));
  }, []);

  // sourceAsX: if true, the pending source becomes axisX and the target becomes axisY
  const commitCombine = useCallback((sourceId: string, targetId: string, sourceAsX: boolean) => {
    setCombinePending(null);
    setDraft((prev) => {
      const src = prev.find((p) => p.id === sourceId);
      const tgt = prev.find((p) => p.id === targetId);
      if (!src || !tgt || src.type !== 'scalar' || tgt.type !== 'scalar') return prev;
      const axisX = (sourceAsX ? src : tgt) as ScalarParam;
      const axisY = (sourceAsX ? tgt : src) as ScalarParam;
      const grid: Grid2DParam = {
        id: uid(),
        name: `${axisX.name} × ${axisY.name}`,
        type: 'grid2d',
        axisX,
        axisY,
      };
      const xIdx = prev.findIndex((p) => p.id === axisX.id);
      const yIdx = prev.findIndex((p) => p.id === axisY.id);
      const insertIdx = Math.min(xIdx, yIdx);
      const filtered = prev.filter((p) => p.id !== src.id && p.id !== tgt.id);
      filtered.splice(insertIdx, 0, grid);
      return filtered;
    });
  }, []);

  const splitGrid2D = useCallback((id: string) => {
    setDraft((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const param = prev[idx];
      if (param.type !== 'grid2d') return prev;
      const next = [...prev];
      next.splice(idx, 1, param.axisX, param.axisY);
      return next;
    });
  }, []);

  const openSettings = useCallback((param: Param) => {
    setCombinePending(null);
    setSettingsTarget(param);
  }, []);

  const openAddNew = useCallback(() => {
    setCombinePending(null);
    setSettingsTarget('new');
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsTarget(null);
  }, []);

  const toggleStickyParam = useCallback((id: string) => {
    setDraft((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, clearAfterSubmit: p.clearAfterSubmit === false ? true : false } : p,
      ),
    );
  }, []);

  const reorderTo = useCallback((id: string, toIndex: number) => {
    setDraft((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === id);
      if (fromIdx === -1 || toIndex === fromIdx || toIndex === fromIdx + 1) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < toIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, item);
      return next;
    });
  }, []);

  const newParamTemplate = (): ScalarParam => ({
    id: uid(),
    name: '',
    type: 'scalar',
    min: 0,
    max: 10,
    step: 1,
    majorStep: 1,
    lblMin: '',
    lblMax: '',
  });

  return {
    draft,
    settingsTarget,
    combinePending,
    moveUp,
    moveDown,
    removeParam,
    saveParam,
    toggleStickyParam,
    startCombine,
    commitCombine,
    splitGrid2D,
    reorderTo,
    openSettings,
    openAddNew,
    closeSettings,
    newParamTemplate,
  };
}
