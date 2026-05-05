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
import { createEntry, deleteEntry, updateEntryFormId } from '../db/entries';
import { insertDatapoints, deleteDatapointsForEntry } from '../db/datapoints';
import { upsertNamedOption } from '../db/parameters';
import { loadFormDefinitions } from '../db/mappers';
import { queryRichEntries, queryRecentNamedOptions } from '../db/queries';
import { randomUUID } from 'expo-crypto';
import { FittingPills, type PillItem } from '../components/session/FittingPills';
import { ParamRow, type ParamRowDef } from '../components/session/ParamRow';
import { EntryCard, type FeedEntry } from '../components/session/EntryCard';

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedSession'>;

type FormDef = {
  id: string;
  name: string;
  params: ParamRowDef[];
};

// ── Add-param sheet ───────────────────────────────────────────────────────────

function AddParamSheet({
  visible,
  candidates,
  onAdd,
  onClose,
}: {
  visible: boolean;
  candidates: ParamRowDef[];
  onAdd: (param: ParamRowDef) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={aps.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={aps.panel}>
        <View style={aps.handle} />
        <Text style={aps.title}>Add param for this entry</Text>
        {candidates.length === 0 ? (
          <Text style={aps.empty}>All params are already in this form.</Text>
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

function firstUnsetId(params: ParamRowDef[], vals: Record<string, string>): string | null {
  return params.find((p) => !vals[p.id])?.id ?? null;
}

function computeRecentOptions(
  rows: { parameterId: string; optionId: string; sessionId: string }[],
  currentSessionId: string | null,
): Record<string, string[]> {
  const sessionSeen: Record<string, Set<string>> = {};
  const sessionOrder: Record<string, string[]> = {};
  const globalSeen: Record<string, Set<string>> = {};
  const globalOrder: Record<string, string[]> = {};

  for (const { parameterId: pid, optionId: oid, sessionId: sid } of rows) {
    if (currentSessionId && sid === currentSessionId) {
      if (!sessionSeen[pid]) { sessionSeen[pid] = new Set(); sessionOrder[pid] = []; }
      if (!sessionSeen[pid].has(oid)) { sessionSeen[pid].add(oid); sessionOrder[pid].push(oid); }
    }
    if (!globalSeen[pid]) { globalSeen[pid] = new Set(); globalOrder[pid] = []; }
    if (!globalSeen[pid].has(oid)) { globalSeen[pid].add(oid); globalOrder[pid].push(oid); }
  }

  const result: Record<string, string[]> = {};
  const allParamIds = new Set([...Object.keys(sessionOrder), ...Object.keys(globalOrder)]);
  for (const pid of allParamIds) {
    const session = sessionOrder[pid] ?? [];
    const sessionSet = sessionSeen[pid] ?? new Set<string>();
    result[pid] = [...session, ...(globalOrder[pid] ?? []).filter((id) => !sessionSet.has(id))];
  }
  return result;
}

function withRecentOptions(params: ParamRowDef[], recentOptions: Record<string, string[]>): ParamRowDef[] {
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
//
// Self-contained state for one entry form card. Manages values, form/option pill
// ordering, and expanded param — the component only calls high-level actions.

function useEntryDraft(forms: FormDef[], dbRecentOptions: Record<string, string[]>) {
  const [formId, setFormId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [expandedParamId, setExpandedParamId] = useState<string | null>(null);
  const [oneOffParams, setOneOffParams] = useState<ParamRowDef[]>([]);
  // form pill ordering, local to this draft
  const [formOrder, setFormOrder] = useState<string[]>([]);
  // live option ordering overrides on top of dbRecentOptions
  const [localOptionOrders, setLocalOptionOrders] = useState<Record<string, string[]>>({});

  const activeForm = useMemo(
    () => forms.find((f) => f.id === formId) ?? null,
    [forms, formId],
  );

  const allParams = useMemo(
    () => [...(activeForm?.params ?? []), ...oneOffParams],
    [activeForm, oneOffParams],
  );

  // Merge DB historical order with live selections (live wins, placed first)
  const effectiveOptions = useMemo(() => {
    const merged: Record<string, string[]> = { ...dbRecentOptions };
    for (const [pid, liveOrder] of Object.entries(localOptionOrders)) {
      const base = dbRecentOptions[pid] ?? [];
      merged[pid] = [...liveOrder, ...base.filter((id) => !liveOrder.includes(id))];
    }
    return merged;
  }, [dbRecentOptions, localOptionOrders]);

  const formPills = useMemo((): PillItem[] => {
    const order = formOrder.length > 0 ? formOrder : forms.map((f) => f.id);
    return order
      .map((id) => forms.find((f) => f.id === id))
      .filter((f): f is FormDef => f != null)
      .map((f) => ({ id: f.id, label: f.name }));
  }, [forms, formOrder]);

  const displayParams = useMemo(
    () => withRecentOptions(allParams, effectiveOptions),
    [allParams, effectiveOptions],
  );

  // ── User-facing actions ───────────────────────────────────────────────────

  // User taps a form pill: clears values bag, updates pill order, advances expanded.
  const switchForm = useCallback((newFormId: string) => {
    setFormId(newFormId);
    setOneOffParams([]);
    setFormOrder((prev) => [newFormId, ...prev.filter((id) => id !== newFormId)]);
    const incoming = forms.find((f) => f.id === newFormId);
    setExpandedParamId(firstUnsetId(incoming?.params ?? [], values));
  }, [forms, values]);

  // User selects a named option pill: sets value, bubbles option to top, advances expanded.
  const selectOption = useCallback((paramId: string, optionId: string) => {
    const nextValues = { ...values, [paramId]: optionId };
    setValues(nextValues);
    setLocalOptionOrders((prev) => ({
      ...prev,
      [paramId]: [optionId, ...(prev[paramId] ?? []).filter((id) => id !== optionId)],
    }));
    setExpandedParamId(allParams.find((p) => !nextValues[p.id])?.id ?? null);
  }, [values, allParams]);

  // User changes a scalar value: sets value, advances expanded.
  const setValue = useCallback((paramId: string, value: string) => {
    const nextValues = { ...values, [paramId]: value };
    setValues(nextValues);
    setExpandedParamId(allParams.find((p) => !nextValues[p.id])?.id ?? null);
  }, [values, allParams]);

  const toggleExpanded = useCallback((paramId: string) => {
    setExpandedParamId((prev) => (prev === paramId ? null : paramId));
  }, []);

  const addOneOff = useCallback((param: ParamRowDef) => {
    setOneOffParams((prev) => [...prev, { ...param, oneOff: true }]);
    setExpandedParamId(param.id);
  }, []);

  const removeOneOff = useCallback((paramId: string) => {
    setOneOffParams((prev) => prev.filter((p) => p.id !== paramId));
    setValues((prev) => { const next = { ...prev }; delete next[paramId]; return next; });
    setExpandedParamId((prev) => (prev === paramId ? null : prev));
  }, []);

  // Called after logging: clears clearAfterSubmit values, resets expanded.
  const clearSubmitted = useCallback(() => {
    const next = { ...values };
    for (const param of allParams) {
      if (param.clearAfterSubmit) delete next[param.id];
    }
    setValues(next);
    setOneOffParams([]);
    setExpandedParamId(firstUnsetId(activeForm?.params ?? [], next));
  }, [values, allParams, activeForm]);

  // ── Lifecycle / init (all stable — only call stable React setters) ─────────

  // Called by loadForms: sets initial form without touching values bag.
  const initForm = useCallback((newFormId: string, expandedId: string | null) => {
    setFormId(newFormId);
    setFormOrder((prev) => [newFormId, ...prev.filter((id) => id !== newFormId)]);
    setExpandedParamId(expandedId);
  }, []);

  // Called by startEditing: loads a complete entry's data into this draft.
  // Sets form, all values, option ordering from named params, clears expanded.
  const loadEntry = useCallback((
    newFormId: string,
    named: Record<string, string>,
    scalars: Record<string, string>,
  ) => {
    setFormId(newFormId);
    setFormOrder((prev) => [newFormId, ...prev.filter((id) => id !== newFormId)]);
    setValues({ ...scalars, ...named });
    setLocalOptionOrders(
      Object.fromEntries(Object.entries(named).map(([pid, oid]) => [pid, [oid]])),
    );
    setExpandedParamId(null);
    setOneOffParams([]);
  }, []);

  // Called by cancelEditing: wipes all state.
  const reset = useCallback(() => {
    setFormId(null);
    setValues({});
    setExpandedParamId(null);
    setOneOffParams([]);
    setLocalOptionOrders({});
  }, []);

  // Escape hatch for handleAddOption: patches options list on one-off params
  // after a new option is created (forms state is updated separately via setForms).
  const patchOneOffParams = useCallback((fn: (prev: ParamRowDef[]) => ParamRowDef[]) => {
    setOneOffParams(fn);
  }, []);

  return {
    formId, values, expandedParamId, activeForm, allParams, formPills, displayParams,
    switchForm, selectOption, setValue, toggleExpanded,
    addOneOff, removeOneOff, clearSubmitted,
    initForm, loadEntry, reset, patchOneOffParams,
    setFormOrder, // stable setter — needed by loadForms to seed/extend form ordering
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

  // ── Form / library state ────────────────────────────────────────────────────
  const hasInitiallyLoaded = useRef(false);
  const pendingNewFormIdRef = useRef<string | null>(null);
  const [forms, setForms] = useState<FormDef[]>([]);
  const [allParamLibrary, setAllParamLibrary] = useState<ParamRowDef[]>([]);
  const [dbRecentOptions, setDbRecentOptions] = useState<Record<string, string[]>>({});

  // ── Draft and edit state ────────────────────────────────────────────────────
  const draft = useEntryDraft(forms, dbRecentOptions);
  const editDraft = useEntryDraft(forms, dbRecentOptions);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [addParamTarget, setAddParamTarget] = useState<'draft' | 'edit' | null>(null);

  // ── Load forms ──────────────────────────────────────────────────────────────
  // Destructure stable methods/setters so loadForms can use them without
  // depending on the full draft object (which changes every render).
  const { initForm: initDraftForm, setFormOrder: setDraftFormOrder } = draft;
  const { setFormOrder: setEditFormOrder } = editDraft;

  const loadForms = useCallback(async (autoSelectId?: string) => {
    const [{ forms: rawForms, paramLibrary }, optionRows] = await Promise.all([
      loadFormDefinitions(),
      queryRecentNamedOptions(),
    ]);
    const formDefs: FormDef[] = rawForms.map((f) => ({
      id: f.id,
      name: f.name,
      params: f.params
        .filter((p) => p.type !== 'grid2d')
        .map((p): ParamRowDef => {
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
    setForms(formDefs);

    // Append any newly-created form IDs to both ordering lists (preserves existing order).
    const ids = formDefs.map((f) => f.id);
    setDraftFormOrder((prev) => {
      const existing = new Set(prev);
      return [...prev, ...ids.filter((id) => !existing.has(id))];
    });
    setEditFormOrder((prev) => {
      const existing = new Set(prev);
      return [...prev, ...ids.filter((id) => !existing.has(id))];
    });

    if (autoSelectId) {
      const form = formDefs.find((f) => f.id === autoSelectId);
      if (form) initDraftForm(autoSelectId, firstUnsetId(form.params, {}));
    } else if (!hasInitiallyLoaded.current && formDefs.length > 0) {
      initDraftForm(formDefs[0].id, firstUnsetId(formDefs[0].params, {}));
    }
    hasInitiallyLoaded.current = true;

    const library: ParamRowDef[] = paramLibrary.map((p): ParamRowDef => {
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
    setAllParamLibrary(library);
    setDbRecentOptions(computeRecentOptions(optionRows, existingSessionId ?? null));
  }, [existingSessionId, initDraftForm, setDraftFormOrder, setEditFormOrder]);

  useEffect(() => { loadForms().catch(console.error); }, [loadForms]);

  useEffect(() => navigation.addListener('focus', () => {
    const autoSelectId = pendingNewFormIdRef.current ?? undefined;
    pendingNewFormIdRef.current = null;
    loadForms(autoSelectId).catch(console.error);
  }), [navigation, loadForms]);

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
        formId: e.formId,
        formName: e.formId,
        entryNumber: idx + 1,
        loggedAt: e.loggedAt,
        scalars: e.scalars.map((s) => ({ name: s.paramName, parameterId: s.parameterId, value: s.value, unit: s.unit })),
        named: e.named.map((n) => ({ name: n.paramName, parameterId: n.parameterId, label: n.optionLabel, optionId: n.optionId })),
      }));
      setFeed(items);
    }).catch(console.error);
  }, [existingSessionId]);

  useEffect(() => {
    if (forms.length === 0 || feed.length === 0) return;
    setFeed((prev) => prev.map((item) => ({
      ...item,
      formName: forms.find((f) => f.id === item.formId)?.name ?? item.formId,
    })));
  }, [forms]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const editingEntry = useMemo(
    () => feed.find((e) => e.id === editingEntryId) ?? null,
    [feed, editingEntryId],
  );

  const addParamCandidates = useMemo(() => {
    const targetParams = addParamTarget === 'edit' ? editDraft.allParams : draft.allParams;
    const currentIds = new Set(targetParams.map((p) => p.id));
    return allParamLibrary.filter((p) => !currentIds.has(p.id));
  }, [allParamLibrary, draft.allParams, editDraft.allParams, addParamTarget]);

  // ── Add new named option ────────────────────────────────────────────────────
  const handleAddOption = useCallback((param: ParamRowDef) => {
    if (param.type !== 'named') return;
    const isEditing = editingEntryId !== null;
    Alert.prompt(
      'New option',
      `Add a new option to "${param.name}"`,
      async (label) => {
        if (!label?.trim()) return;
        const newOption = await upsertNamedOption({
          id: randomUUID(),
          parameterId: param.id,
          label: label.trim(),
          sortOrder: param.options.length,
        });
        const appendOption = (p: ParamRowDef): ParamRowDef => {
          if (p.type !== 'named' || p.id !== param.id) return p;
          return { ...p, options: [...p.options, { id: newOption.id, label: newOption.label }] };
        };
        // Update the options list in all form definitions and any one-off copies
        setForms((prev) => prev.map((f) => ({ ...f, params: f.params.map(appendOption) })));
        if (isEditing) {
          editDraft.selectOption(param.id, newOption.id);
          editDraft.patchOneOffParams((prev) => prev.map(appendOption));
        } else {
          draft.selectOption(param.id, newOption.id);
          draft.patchOneOffParams((prev) => prev.map(appendOption));
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
    for (const n of entry.named) named[n.parameterId] = n.optionId;
    for (const s of entry.scalars) scalars[s.parameterId] = String(s.value);
    loadEditEntry(entry.formId, named, scalars);
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
    if (!editingEntryId || !editDraft.activeForm || !editingEntry || !editDraft.formId) return;

    const scalarsToInsert: { parameterId: string; value: number }[] = [];
    const namedToInsert: { parameterId: string; optionId: string }[] = [];

    for (const param of editDraft.allParams) {
      const val = editDraft.values[param.id];
      if (!val) continue;
      if (param.type === 'named') {
        namedToInsert.push({ parameterId: param.id, optionId: val });
      } else {
        const n = parseFloat(val);
        if (!isNaN(n)) scalarsToInsert.push({ parameterId: param.id, value: n });
      }
    }

    if (editDraft.formId !== editingEntry.formId) {
      await updateEntryFormId(editingEntryId, editDraft.formId);
    }
    await deleteDatapointsForEntry(editingEntryId);
    await insertDatapoints(editingEntryId, scalarsToInsert, namedToInsert);

    const updatedItem: FeedEntry = {
      ...editingEntry,
      formId: editDraft.formId,
      formName: editDraft.activeForm.name,
      scalars: scalarsToInsert.map((s) => {
        const param = editDraft.allParams.find((p) => p.id === s.parameterId);
        return {
          name: param?.name ?? '',
          parameterId: s.parameterId,
          value: s.value,
          unit: param?.type !== 'named' ? (param?.unit ?? null) : null,
        };
      }),
      named: namedToInsert.map((n) => {
        const param = editDraft.allParams.find((p) => p.id === n.parameterId);
        const opt = param?.type === 'named' ? param.options.find((o) => o.id === n.optionId) : undefined;
        return {
          name: param?.name ?? '',
          parameterId: n.parameterId,
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
    if (!draft.formId) return;

    if (!sessionIdRef.current) {
      const session = await startSession(sessionName ?? undefined);
      sessionIdRef.current = session.id;
    }

    const entryNumber = feed.length + 1;
    const entry = await createEntry(sessionIdRef.current, draft.formId, entryNumber);

    const scalarsToInsert: { parameterId: string; value: number }[] = [];
    const namedToInsert: { parameterId: string; optionId: string }[] = [];

    for (const param of draft.allParams) {
      const val = draft.values[param.id];
      if (!val) continue;
      if (param.type === 'named') {
        namedToInsert.push({ parameterId: param.id, optionId: val });
      } else {
        const n = parseFloat(val);
        if (!isNaN(n)) scalarsToInsert.push({ parameterId: param.id, value: n });
      }
    }

    await insertDatapoints(entry.id, scalarsToInsert, namedToInsert);

    const feedItem: FeedEntry = {
      id: entry.id,
      formId: draft.formId,
      formName: draft.activeForm?.name ?? '',
      entryNumber,
      loggedAt: entry.loggedAt,
      scalars: scalarsToInsert.map((s) => {
        const param = draft.allParams.find((p) => p.id === s.parameterId);
        return {
          name: param?.name ?? '',
          parameterId: s.parameterId,
          value: s.value,
          unit: param?.type !== 'named' ? (param?.unit ?? null) : null,
        };
      }),
      named: namedToInsert.map((n) => {
        const param = draft.allParams.find((p) => p.id === n.parameterId);
        const opt = param?.type === 'named' ? param.options.find((o) => o.id === n.optionId) : undefined;
        return {
          name: param?.name ?? '',
          parameterId: n.parameterId,
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
                  <Text style={styles.expandedFormName} numberOfLines={1}>{editDraft.activeForm?.name ?? entry.formName}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteEntryBtn}
                  onPress={() => handleDeleteEntry(entry.id, entry.entryNumber)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteEntryBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {forms.length > 0 && (
                <View style={styles.formSelector}>
                  <FittingPills
                    items={editDraft.formPills}
                    selectedId={editDraft.formId ?? undefined}
                    onSelect={(formId) => editDraft.switchForm(formId)}
                    onAdd={() => {
                      const newFormId = randomUUID();
                      pendingNewFormIdRef.current = newFormId;
                      navigation.navigate('FormEditor', { formId: newFormId, isNew: true, sortOrder: forms.length });
                    }}
                    addLabel="＋"
                  />
                </View>
              )}
              {editDraft.displayParams.map((param) => (
                <ParamRow
                  key={param.id}
                  param={param}
                  value={editDraft.values[param.id]}
                  expanded={editDraft.expandedParamId === param.id}
                  onToggle={() => editDraft.toggleExpanded(param.id)}
                  onChange={(val) => param.type === 'named'
                    ? editDraft.selectOption(param.id, val)
                    : editDraft.setValue(param.id, val)
                  }
                  onAddOption={() => handleAddOption(param)}
                  onRemove={param.oneOff ? () => editDraft.removeOneOff(param.id) : undefined}
                />
              ))}
              <TouchableOpacity
                style={styles.addParamBtn}
                onPress={() => setAddParamTarget('edit')}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={Colors.primary} />
                <Text style={styles.addParamLabel}>Add param for this entry</Text>
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
            {forms.length > 0 && (
              <View style={styles.formSelector}>
                <FittingPills
                  items={draft.formPills}
                  selectedId={draft.formId ?? undefined}
                  onSelect={(formId) => draft.switchForm(formId)}
                  onAdd={() => {
                    const newFormId = randomUUID();
                    pendingNewFormIdRef.current = newFormId;
                    navigation.navigate('FormEditor', { formId: newFormId, isNew: true, sortOrder: forms.length });
                  }}
                  addLabel="＋"
                />
              </View>
            )}
            {draft.displayParams.map((param) => (
              <ParamRow
                key={param.id}
                param={param}
                value={draft.values[param.id]}
                expanded={draft.expandedParamId === param.id}
                onToggle={() => draft.toggleExpanded(param.id)}
                onChange={(val) => param.type === 'named'
                  ? draft.selectOption(param.id, val)
                  : draft.setValue(param.id, val)
                }
                onAddOption={() => handleAddOption(param)}
                onRemove={param.oneOff ? () => draft.removeOneOff(param.id) : undefined}
              />
            ))}
            <TouchableOpacity
              style={styles.addParamBtn}
              onPress={() => setAddParamTarget('draft')}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color={Colors.primary} />
              <Text style={styles.addParamLabel}>Add param for this entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLog} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>
                Log{draft.activeForm ? ` ${draft.activeForm.name}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AddParamSheet
        visible={addParamTarget !== null}
        candidates={addParamCandidates}
        onAdd={(param) => {
          if (addParamTarget === 'edit') {
            editDraft.addOneOff(param);
          } else {
            draft.addOneOff(param);
          }
          setAddParamTarget(null);
        }}
        onClose={() => setAddParamTarget(null)}
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
  expandedFormName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  deleteEntryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  deleteEntryBtnText: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' as const },

  formSelector: {
    paddingVertical: Spacing.sm,
  },

  addParamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  addParamLabel: { ...Typography.labelSm, color: Colors.primary },

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
