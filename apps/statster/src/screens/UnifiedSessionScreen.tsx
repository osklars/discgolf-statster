import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { getSession, renameSession, startSession } from '../db/sessions';
import { createEntry, deleteEntry, updateEntryExerciseId } from '../db/entries';
import { insertDatapoints, deleteDatapointsForEntry } from '../db/datapoints';
import { upsertChoiceOption } from '../db/parameters';
import { loadExerciseDefs } from '../db/mappers';
import { queryRichEntries, queryRecentChoiceOptions } from '../db/queries';
import { randomUUID } from 'expo-crypto';
import { FittingPills, type PillItem } from '../components/session/FittingPills';
import { StatRow, type StatRowDef } from '../components/session/StatRow';
import { EntryCard, type FeedEntry } from '../components/session/EntryCard';

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedSession'>;

type ExerciseDef = {
  id: string;
  name: string;
  params: StatRowDef[];
};

// ── Add-stat sheet ────────────────────────────────────────────────────────────

function AddStatSheet({
  visible,
  candidates,
  onAdd,
  onClose,
}: {
  visible: boolean;
  candidates: StatRowDef[];
  onAdd: (stat: StatRowDef) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={aps.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={aps.panel}>
        <View style={aps.handle} />
        <Text style={aps.title}>Add stat for this entry</Text>
        {candidates.length === 0 ? (
          <Text style={aps.empty}>All stats are already in this exercise.</Text>
        ) : (
          <ScrollView contentContainerStyle={aps.list}>
            {candidates.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={aps.row}
                onPress={() => { onAdd(p); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={aps.rowLabel}>{p.name}</Text>
                <Text style={aps.rowType}>{p.type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const aps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: Spacing.sm, paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: { ...Typography.title, color: Colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  empty: { ...Typography.label, color: Colors.textMuted, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
  },
  rowLabel: { ...Typography.body, color: Colors.text },
  rowType: { ...Typography.labelSm, color: Colors.textMuted, textTransform: 'uppercase' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function firstUnsetId(params: StatRowDef[], vals: Record<string, string>): string | null {
  return params.find((p) => !vals[p.id])?.id ?? null;
}

function computeRecentOptions(
  rows: { statId: string; optionId: string; sessionId: string }[],
  currentSessionId: string | null,
): Record<string, string[]> {
  const sessionSeen: Record<string, Set<string>> = {};
  const sessionOrder: Record<string, string[]> = {};
  const globalSeen: Record<string, Set<string>> = {};
  const globalOrder: Record<string, string[]> = {};

  for (const { statId: pid, optionId: oid, sessionId: sid } of rows) {
    if (currentSessionId && sid === currentSessionId) {
      if (!sessionSeen[pid]) { sessionSeen[pid] = new Set(); sessionOrder[pid] = []; }
      if (!sessionSeen[pid].has(oid)) { sessionSeen[pid].add(oid); sessionOrder[pid].push(oid); }
    }
    if (!globalSeen[pid]) { globalSeen[pid] = new Set(); globalOrder[pid] = []; }
    if (!globalSeen[pid].has(oid)) { globalSeen[pid].add(oid); globalOrder[pid].push(oid); }
  }

  const result: Record<string, string[]> = {};
  const allStatIds = new Set([...Object.keys(sessionOrder), ...Object.keys(globalOrder)]);
  for (const pid of allStatIds) {
    const session = sessionOrder[pid] ?? [];
    const sessionSet = sessionSeen[pid] ?? new Set<string>();
    result[pid] = [...session, ...(globalOrder[pid] ?? []).filter((id) => !sessionSet.has(id))];
  }
  return result;
}

function withRecentOptions(params: StatRowDef[], recentOptions: Record<string, string[]>): StatRowDef[] {
  return params.map((p) => {
    if (p.type !== 'named') return p;
    const order = recentOptions[p.id];
    if (!order?.length) return p;
    const sorted = [
      ...order.map((id) => p.options.find((o) => o.id === id)).filter((o): o is { id: string; label: string } => o != null),
      ...p.options.filter((o) => !order.includes(o.id)),
    ];
    return { ...p, options: sorted };
  });
}

// ── useEntryDraft ─────────────────────────────────────────────────────────────

function useEntryDraft(exercises: ExerciseDef[], dbRecentOptions: Record<string, string[]>) {
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [oneOffStats, setOneOffStats] = useState<StatRowDef[]>([]);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [localOptionOrders, setLocalOptionOrders] = useState<Record<string, string[]>>({});

  const activeExercise = useMemo(
    () => exercises.find((e) => e.id === exerciseId) ?? null,
    [exercises, exerciseId],
  );

  const allStats = useMemo(
    () => [...(activeExercise?.params ?? []), ...oneOffStats],
    [activeExercise, oneOffStats],
  );

  const effectiveOptions = useMemo(() => {
    const merged: Record<string, string[]> = { ...dbRecentOptions };
    for (const [pid, liveOrder] of Object.entries(localOptionOrders)) {
      const base = dbRecentOptions[pid] ?? [];
      merged[pid] = [...liveOrder, ...base.filter((id) => !liveOrder.includes(id))];
    }
    return merged;
  }, [dbRecentOptions, localOptionOrders]);

  const exercisePills = useMemo((): PillItem[] => {
    const order = exerciseOrder.length > 0 ? exerciseOrder : exercises.map((e) => e.id);
    return order
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is ExerciseDef => e != null)
      .map((e) => ({ id: e.id, label: e.name }));
  }, [exercises, exerciseOrder]);

  const displayStats = useMemo(
    () => withRecentOptions(allStats, effectiveOptions),
    [allStats, effectiveOptions],
  );

  // ── User-facing actions ───────────────────────────────────────────────────

  const switchExercise = useCallback((newExerciseId: string) => {
    setExerciseId(newExerciseId);
    setOneOffStats([]);
    setExerciseOrder((prev) => [newExerciseId, ...prev.filter((id) => id !== newExerciseId)]);
    const incoming = exercises.find((e) => e.id === newExerciseId);
    setExpandedStatId(firstUnsetId(incoming?.params ?? [], values));
  }, [exercises, values]);

  const selectOption = useCallback((statId: string, optionId: string) => {
    const nextValues = { ...values, [statId]: optionId };
    setValues(nextValues);
    setLocalOptionOrders((prev) => ({
      ...prev,
      [statId]: [optionId, ...(prev[statId] ?? []).filter((id) => id !== optionId)],
    }));
    setExpandedStatId(allStats.find((p) => !nextValues[p.id])?.id ?? null);
  }, [values, allStats]);

  const setValue = useCallback((statId: string, value: string) => {
    const nextValues = { ...values, [statId]: value };
    setValues(nextValues);
    setExpandedStatId(allStats.find((p) => !nextValues[p.id])?.id ?? null);
  }, [values, allStats]);

  const toggleExpanded = useCallback((statId: string) => {
    setExpandedStatId((prev) => (prev === statId ? null : statId));
  }, []);

  const addOneOff = useCallback((stat: StatRowDef) => {
    setOneOffStats((prev) => [...prev, { ...stat, oneOff: true }]);
    setExpandedStatId(stat.id);
  }, []);

  const removeOneOff = useCallback((statId: string) => {
    setOneOffStats((prev) => prev.filter((p) => p.id !== statId));
    setValues((prev) => { const next = { ...prev }; delete next[statId]; return next; });
    setExpandedStatId((prev) => (prev === statId ? null : prev));
  }, []);

  const clearSubmitted = useCallback(() => {
    const next = { ...values };
    for (const stat of allStats) {
      if (stat.clearAfterSubmit) delete next[stat.id];
    }
    setValues(next);
    setOneOffStats([]);
    setExpandedStatId(firstUnsetId(activeExercise?.params ?? [], next));
  }, [values, allStats, activeExercise]);

  const initExercise = useCallback((newExerciseId: string, expandedId: string | null) => {
    setExerciseId(newExerciseId);
    setExerciseOrder((prev) => [newExerciseId, ...prev.filter((id) => id !== newExerciseId)]);
    setExpandedStatId(expandedId);
  }, []);

  const loadEntry = useCallback((
    newExerciseId: string,
    named: Record<string, string>,
    scalars: Record<string, string>,
  ) => {
    setExerciseId(newExerciseId);
    setExerciseOrder((prev) => [newExerciseId, ...prev.filter((id) => id !== newExerciseId)]);
    setValues({ ...scalars, ...named });
    setLocalOptionOrders(
      Object.fromEntries(Object.entries(named).map(([sid, oid]) => [sid, [oid]])),
    );
    setExpandedStatId(null);
    setOneOffStats([]);
  }, []);

  const reset = useCallback(() => {
    setExerciseId(null);
    setValues({});
    setExpandedStatId(null);
    setOneOffStats([]);
    setLocalOptionOrders({});
  }, []);

  const patchOneOffStats = useCallback((fn: (prev: StatRowDef[]) => StatRowDef[]) => {
    setOneOffStats(fn);
  }, []);

  return {
    exerciseId, values, expandedStatId, activeExercise, allStats, exercisePills, displayStats,
    switchExercise, selectOption, setValue, toggleExpanded,
    addOneOff, removeOneOff, clearSubmitted,
    initExercise, loadEntry, reset, patchOneOffStats,
    setExerciseOrder,
  };
}

// ── UnifiedSessionScreen ──────────────────────────────────────────────────────

export function UnifiedSessionScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const existingSessionId = route.params?.sessionId;

  // ── Session state ───────────────────────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(existingSessionId ?? null);
  const [sessionName, setSessionName] = useState<string | null>(existingSessionId ? null : 'New Session');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const feedScrollRef = useRef<ScrollView>(null);

  // ── Exercise / library state ────────────────────────────────────────────────
  const hasInitiallyLoaded = useRef(false);
  const pendingNewExerciseIdRef = useRef<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseDef[]>([]);
  const [allStatLibrary, setAllStatLibrary] = useState<StatRowDef[]>([]);
  const [dbRecentOptions, setDbRecentOptions] = useState<Record<string, string[]>>({});

  // ── Draft and edit state ────────────────────────────────────────────────────
  const draft = useEntryDraft(exercises, dbRecentOptions);
  const editDraft = useEntryDraft(exercises, dbRecentOptions);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [addStatTarget, setAddStatTarget] = useState<'draft' | 'edit' | null>(null);

  // ── Load exercises ──────────────────────────────────────────────────────────
  const { initExercise: initDraftExercise, setExerciseOrder: setDraftExerciseOrder } = draft;
  const { setExerciseOrder: setEditExerciseOrder } = editDraft;

  const loadExercises = useCallback(async (autoSelectId?: string) => {
    const [{ exercises: rawExercises, statLibrary }, optionRows] = await Promise.all([
      loadExerciseDefs(),
      queryRecentChoiceOptions(),
    ]);
    const exerciseDefs: ExerciseDef[] = rawExercises.map((e) => ({
      id: e.id,
      name: e.name,
      params: e.params
        .filter((p) => p.type !== 'grid2d')
        .map((p): StatRowDef => {
          if (p.type === 'named') {
            return {
              type: 'named', id: p.id, name: p.name,
              options: p.options.map((o) => ({ id: o.id, label: o.label })),
              clearAfterSubmit: p.clearAfterSubmit ?? false,
            };
          }
          return {
            type: p.type, id: p.id, name: p.name,
            min: p.min, max: p.max, step: p.step,
            majorStep: p.majorStep, lblMin: p.lblMin, lblMax: p.lblMax,
            unit: p.unit ?? null,
            clearAfterSubmit: p.clearAfterSubmit ?? false,
          };
        }),
    }));
    setExercises(exerciseDefs);

    const ids = exerciseDefs.map((e) => e.id);
    setDraftExerciseOrder((prev) => {
      const existing = new Set(prev);
      return [...prev, ...ids.filter((id) => !existing.has(id))];
    });
    setEditExerciseOrder((prev) => {
      const existing = new Set(prev);
      return [...prev, ...ids.filter((id) => !existing.has(id))];
    });

    if (autoSelectId) {
      const exercise = exerciseDefs.find((e) => e.id === autoSelectId);
      if (exercise) initDraftExercise(autoSelectId, firstUnsetId(exercise.params, {}));
    } else if (!hasInitiallyLoaded.current && exerciseDefs.length > 0) {
      initDraftExercise(exerciseDefs[0].id, firstUnsetId(exerciseDefs[0].params, {}));
    }
    hasInitiallyLoaded.current = true;

    const library: StatRowDef[] = statLibrary.map((p): StatRowDef => {
      if (p.type === 'named') {
        return {
          type: 'named', id: p.id, name: p.name,
          options: p.options.map((o) => ({ id: o.id, label: o.label })),
          clearAfterSubmit: true,
        };
      }
      return {
        type: p.type, id: p.id, name: p.name,
        min: p.min, max: p.max, step: p.step,
        majorStep: p.majorStep, lblMin: p.lblMin, lblMax: p.lblMax,
        unit: p.unit ?? null,
        clearAfterSubmit: true,
      };
    });
    setAllStatLibrary(library);
    setDbRecentOptions(computeRecentOptions(optionRows, existingSessionId ?? null));
  }, [existingSessionId, initDraftExercise, setDraftExerciseOrder, setEditExerciseOrder]);

  useEffect(() => { loadExercises().catch(console.error); }, [loadExercises]);

  useEffect(() => navigation.addListener('focus', () => {
    const autoSelectId = pendingNewExerciseIdRef.current ?? undefined;
    pendingNewExerciseIdRef.current = null;
    loadExercises(autoSelectId).catch(console.error);
  }), [navigation, loadExercises]);

  // ── Load existing session ───────────────────────────────────────────────────
  useEffect(() => {
    if (!existingSessionId) return;
    Promise.all([
      getSession(existingSessionId),
      queryRichEntries({ sessionId: existingSessionId }),
    ]).then(([session, richEntries]) => {
      setSessionName(session?.name ?? null);
      const items: FeedEntry[] = richEntries.map((e, idx) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseId,
        entryNumber: idx + 1,
        loggedAt: e.loggedAt,
        scalars: e.scalars.map((s) => ({ name: s.statName, statId: s.statId, value: s.value, unit: s.unit })),
        named: e.named.map((n) => ({ name: n.statName, statId: n.statId, label: n.optionLabel, optionId: n.optionId })),
      }));
      setFeed(items);
    }).catch(console.error);
  }, [existingSessionId]);

  useEffect(() => {
    if (exercises.length === 0 || feed.length === 0) return;
    setFeed((prev) => prev.map((item) => ({
      ...item,
      exerciseName: exercises.find((e) => e.id === item.exerciseId)?.name ?? item.exerciseId,
    })));
  }, [exercises]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const editingEntry = useMemo(
    () => feed.find((e) => e.id === editingEntryId) ?? null,
    [feed, editingEntryId],
  );

  const addStatCandidates = useMemo(() => {
    const targetStats = addStatTarget === 'edit' ? editDraft.allStats : draft.allStats;
    const currentIds = new Set(targetStats.map((p) => p.id));
    return allStatLibrary.filter((p) => !currentIds.has(p.id));
  }, [allStatLibrary, draft.allStats, editDraft.allStats, addStatTarget]);

  // ── Add new choice option ────────────────────────────────────────────────────
  const handleAddOption = useCallback((stat: StatRowDef) => {
    if (stat.type !== 'named') return;
    const isEditing = editingEntryId !== null;
    Alert.prompt(
      'New option',
      `Add a new option to "${stat.name}"`,
      async (label) => {
        if (!label?.trim()) return;
        const newOption = await upsertChoiceOption({
          id: randomUUID(),
          statId: stat.id,
          label: label.trim(),
          sortOrder: stat.options.length,
        });
        const appendOption = (p: StatRowDef): StatRowDef => {
          if (p.type !== 'named' || p.id !== stat.id) return p;
          return { ...p, options: [...p.options, { id: newOption.id, label: newOption.label }] };
        };
        setExercises((prev) => prev.map((e) => ({ ...e, params: e.params.map(appendOption) })));
        if (isEditing) {
          editDraft.selectOption(stat.id, newOption.id);
          editDraft.patchOneOffStats((prev) => prev.map(appendOption));
        } else {
          draft.selectOption(stat.id, newOption.id);
          draft.patchOneOffStats((prev) => prev.map(appendOption));
        }
      },
      'plain-text',
    );
  }, [editingEntryId, draft, editDraft]);

  // ── Rename session ──────────────────────────────────────────────────────────
  const handleRename = useCallback(() => {
    Alert.prompt(
      'Rename session',
      undefined,
      async (name) => {
        if (!name?.trim() && !sessionIdRef.current) return;
        const trimmed = name?.trim() ?? null;
        setSessionName(trimmed);
        if (sessionIdRef.current) await renameSession(sessionIdRef.current, trimmed ?? '');
      },
      'plain-text',
      sessionName ?? '',
    );
  }, [sessionName]);

  // ── Edit an existing entry ──────────────────────────────────────────────────
  const { loadEntry: loadEditEntry, reset: resetEditDraft } = editDraft;

  const startEditing = useCallback((entry: FeedEntry) => {
    const named: Record<string, string> = {};
    const scalars: Record<string, string> = {};
    for (const n of entry.named) named[n.statId] = n.optionId;
    for (const s of entry.scalars) scalars[s.statId] = String(s.value);
    loadEditEntry(entry.exerciseId, named, scalars);
    setEditingEntryId(entry.id);
  }, [loadEditEntry]);

  const cancelEditing = useCallback(() => {
    setEditingEntryId(null);
    resetEditDraft();
  }, [resetEditDraft]);

  const handleDeleteEntry = useCallback((entryId: string, entryNumber: number) => {
    Alert.alert(
      'Delete entry',
      `Delete entry #${entryNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entryId);
            cancelEditing();
            setFeed((prev) => {
              const filtered = prev.filter((e) => e.id !== entryId);
              return filtered.map((e, idx) => ({ ...e, entryNumber: idx + 1 }));
            });
          },
        },
      ],
    );
  }, [cancelEditing]);

  const handleUpdate = useCallback(async () => {
    if (!editingEntryId || !editDraft.activeExercise || !editingEntry || !editDraft.exerciseId) return;

    const scalarsToInsert: { statId: string; value: number }[] = [];
    const namedToInsert: { statId: string; optionId: string }[] = [];

    for (const stat of editDraft.allStats) {
      const val = editDraft.values[stat.id];
      if (!val) continue;
      if (stat.type === 'named') {
        namedToInsert.push({ statId: stat.id, optionId: val });
      } else {
        const n = parseFloat(val);
        if (!isNaN(n)) scalarsToInsert.push({ statId: stat.id, value: n });
      }
    }

    if (editDraft.exerciseId !== editingEntry.exerciseId) {
      await updateEntryExerciseId(editingEntryId, editDraft.exerciseId);
    }
    await deleteDatapointsForEntry(editingEntryId);
    await insertDatapoints(editingEntryId, scalarsToInsert, namedToInsert);

    const updatedItem: FeedEntry = {
      ...editingEntry,
      exerciseId: editDraft.exerciseId,
      exerciseName: editDraft.activeExercise.name,
      scalars: scalarsToInsert.map((s) => {
        const stat = editDraft.allStats.find((p) => p.id === s.statId);
        return {
          name: stat?.name ?? '',
          statId: s.statId,
          value: s.value,
          unit: stat?.type !== 'named' ? (stat?.unit ?? null) : null,
        };
      }),
      named: namedToInsert.map((n) => {
        const stat = editDraft.allStats.find((p) => p.id === n.statId);
        const opt = stat?.type === 'named' ? stat.options.find((o) => o.id === n.optionId) : undefined;
        return {
          name: stat?.name ?? '',
          statId: n.statId,
          label: opt?.label ?? '',
          optionId: n.optionId,
        };
      }),
    };

    setFeed((prev) => prev.map((e) => (e.id === editingEntryId ? updatedItem : e)));
    cancelEditing();
  }, [editingEntryId, editingEntry, editDraft, cancelEditing]);

  // ── Log new entry ───────────────────────────────────────────────────────────
  const handleLog = useCallback(async () => {
    if (!draft.exerciseId) return;

    if (!sessionIdRef.current) {
      const session = await startSession(sessionName ?? undefined);
      sessionIdRef.current = session.id;
    }

    const entryNumber = feed.length + 1;
    const entry = await createEntry(sessionIdRef.current, draft.exerciseId, entryNumber);

    const scalarsToInsert: { statId: string; value: number }[] = [];
    const namedToInsert: { statId: string; optionId: string }[] = [];

    for (const stat of draft.allStats) {
      const val = draft.values[stat.id];
      if (!val) continue;
      if (stat.type === 'named') {
        namedToInsert.push({ statId: stat.id, optionId: val });
      } else {
        const n = parseFloat(val);
        if (!isNaN(n)) scalarsToInsert.push({ statId: stat.id, value: n });
      }
    }

    await insertDatapoints(entry.id, scalarsToInsert, namedToInsert);

    const feedItem: FeedEntry = {
      id: entry.id,
      exerciseId: draft.exerciseId,
      exerciseName: draft.activeExercise?.name ?? '',
      entryNumber,
      loggedAt: entry.loggedAt,
      scalars: scalarsToInsert.map((s) => {
        const stat = draft.allStats.find((p) => p.id === s.statId);
        return {
          name: stat?.name ?? '',
          statId: s.statId,
          value: s.value,
          unit: stat?.type !== 'named' ? (stat?.unit ?? null) : null,
        };
      }),
      named: namedToInsert.map((n) => {
        const stat = draft.allStats.find((p) => p.id === n.statId);
        const opt = stat?.type === 'named' ? stat.options.find((o) => o.id === n.optionId) : undefined;
        return {
          name: stat?.name ?? '',
          statId: n.statId,
          label: opt?.label ?? '',
          optionId: n.optionId,
        };
      }),
    };

    setFeed((prev) => [...prev, feedItem]);
    setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 50);

    draft.clearSubmitted();
  }, [draft, feed.length, sessionName]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={sessionName ?? 'New Session'}
        onBack={() => navigation.goBack()}
        onTitlePress={handleRename}
        rightElement={<Text style={styles.statLabel}>{feed.length} entries</Text>}
      />

      <ScrollView
        ref={feedScrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {feed.length === 0 && (
          <Text style={styles.emptyFeed}>Your entries will appear here</Text>
        )}

        {feed.map((entry) =>
          editingEntryId === entry.id ? (
            // ── Expanded edit card ───────────────────────────────────────────
            <View key={entry.id} style={styles.expandedCard}>
              <View style={styles.expandedHeader}>
                <TouchableOpacity style={styles.expandedHeaderTitle} onPress={cancelEditing} activeOpacity={0.6}>
                  <Text style={styles.expandedNum}>#{entry.entryNumber}</Text>
                  <Text style={styles.expandedExerciseName} numberOfLines={1}>{editDraft.activeExercise?.name ?? entry.exerciseName}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteEntryBtn}
                  onPress={() => handleDeleteEntry(entry.id, entry.entryNumber)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteEntryBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {exercises.length > 0 && (
                <View style={styles.exerciseSelector}>
                  <FittingPills
                    items={editDraft.exercisePills}
                    selectedId={editDraft.exerciseId ?? undefined}
                    onSelect={(exerciseId) => editDraft.switchExercise(exerciseId)}
                    onAdd={() => {
                      const newExerciseId = randomUUID();
                      pendingNewExerciseIdRef.current = newExerciseId;
                      navigation.navigate('ExerciseEditor', { exerciseId: newExerciseId, isNew: true, sortOrder: exercises.length });
                    }}
                    addLabel="＋"
                  />
                </View>
              )}
              {editDraft.displayStats.map((stat) => (
                <StatRow
                  key={stat.id}
                  param={stat}
                  value={editDraft.values[stat.id]}
                  expanded={editDraft.expandedStatId === stat.id}
                  onToggle={() => editDraft.toggleExpanded(stat.id)}
                  onChange={(val) => stat.type === 'named'
                    ? editDraft.selectOption(stat.id, val)
                    : editDraft.setValue(stat.id, val)
                  }
                  onAddOption={() => handleAddOption(stat)}
                  onRemove={stat.oneOff ? () => editDraft.removeOneOff(stat.id) : undefined}
                />
              ))}
              <TouchableOpacity
                style={styles.addStatBtn}
                onPress={() => setAddStatTarget('edit')}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={Colors.primary} />
                <Text style={styles.addStatLabel}>Add stat for this entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleUpdate} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>Update #{entry.entryNumber}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Collapsed entry card ─────────────────────────────────────────
            <EntryCard key={entry.id} entry={entry} onPress={() => startEditing(entry)} />
          ),
        )}

        {/* Draft card or collapsed stub */}
        {editingEntryId !== null ? (
          // ── Collapsed draft stub — tap to cancel edit ──────────────────────
          <TouchableOpacity style={styles.draftStub} onPress={cancelEditing} activeOpacity={0.7}>
            <Feather name="plus" size={14} color={Colors.textMuted} />
            <Text style={styles.draftStubText}>New entry</Text>
            <Feather name="chevron-down" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : (
          // ── Expanded draft card ────────────────────────────────────────────
          <View style={styles.expandedCard}>
            {exercises.length > 0 && (
              <View style={styles.exerciseSelector}>
                <FittingPills
                  items={draft.exercisePills}
                  selectedId={draft.exerciseId ?? undefined}
                  onSelect={(exerciseId) => draft.switchExercise(exerciseId)}
                  onAdd={() => {
                    const newExerciseId = randomUUID();
                    pendingNewExerciseIdRef.current = newExerciseId;
                    navigation.navigate('ExerciseEditor', { exerciseId: newExerciseId, isNew: true, sortOrder: exercises.length });
                  }}
                  addLabel="＋"
                />
              </View>
            )}
            {draft.displayStats.map((stat) => (
              <StatRow
                key={stat.id}
                param={stat}
                value={draft.values[stat.id]}
                expanded={draft.expandedStatId === stat.id}
                onToggle={() => draft.toggleExpanded(stat.id)}
                onChange={(val) => stat.type === 'named'
                  ? draft.selectOption(stat.id, val)
                  : draft.setValue(stat.id, val)
                }
                onAddOption={() => handleAddOption(stat)}
                onRemove={stat.oneOff ? () => draft.removeOneOff(stat.id) : undefined}
              />
            ))}
            <TouchableOpacity
              style={styles.addStatBtn}
              onPress={() => setAddStatTarget('draft')}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color={Colors.primary} />
              <Text style={styles.addStatLabel}>Add stat for this entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLog} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>
                Log{draft.activeExercise ? ` ${draft.activeExercise.name}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AddStatSheet
        visible={addStatTarget !== null}
        candidates={addStatCandidates}
        onAdd={(stat) => {
          if (addStatTarget === 'edit') {
            editDraft.addOneOff(stat);
          } else {
            draft.addOneOff(stat);
          }
          setAddStatTarget(null);
        }}
        onClose={() => setAddStatTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  statLabel: { ...Typography.labelSm, color: Colors.textMuted },

  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },

  emptyFeed: {
    ...Typography.label,
    color: Colors.textDisabled,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  expandedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
    marginBottom: Spacing.xs,
  },
  expandedHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedNum: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' },
  expandedExerciseName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  deleteEntryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  deleteEntryBtnText: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' as const },

  exerciseSelector: {
    paddingVertical: Spacing.sm,
  },

  addStatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  addStatLabel: { ...Typography.labelSm, color: Colors.primary },

  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  actionBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },

  draftStub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  draftStubText: { ...Typography.label, color: Colors.textMuted },
});
