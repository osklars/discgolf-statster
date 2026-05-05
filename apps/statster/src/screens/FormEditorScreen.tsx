import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
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
import { getForms, getFormParams, saveFormLayout, upsertForm, archiveForm } from '../db/forms';
import { getScalarParameters, getNamedParameters } from '../db/parameters';

type Props = NativeStackScreenProps<RootStackParamList, 'FormEditor'>;

type EditParam = {
  paramId: string;
  paramType: 'scalar' | 'named';
  name: string;
  clearAfterSubmit: boolean;
};

type LibParam = { id: string; name: string; paramType: 'scalar' | 'named' };

export function FormEditorScreen({ route, navigation }: Props) {
  const { formId, isNew, sortOrder: initialSortOrder } = route.params;
  const insets = useSafeAreaInsets();
  const [formName, setFormName] = useState(isNew ? 'New Form' : '');
  const formSortOrderRef = useRef(initialSortOrder ?? 0);
  const [params, setParams] = useState<EditParam[]>([]);
  const paramsRef = useRef<EditParam[]>([]);
  paramsRef.current = params;
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addCandidates, setAddCandidates] = useState<LibParam[]>([]);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragFromIdx = useRef<number | null>(null);
  const dragToIdxRef = useRef<number | null>(null);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dragToIdx, setDragToIdx] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const rowOffsets = useRef<number[]>([]);
  const rowHeights = useRef<number[]>([]);

  const persistRef = useRef<(updated: EditParam[]) => Promise<void>>(async () => {});

  // One PanResponder per item slot — recreated only when count changes
  const panResponders = useMemo(() =>
    params.map((_, idx) => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragAnim.setValue(0);
        dragFromIdx.current = idx;
        dragToIdxRef.current = idx;
        setActiveIdx(idx);
        setDragToIdx(idx);
        setScrollEnabled(false);
      },
      onPanResponderMove: (_, g) => {
        dragAnim.setValue(g.dy);
        const fromY = (rowOffsets.current[idx] ?? 0) + (rowHeights.current[idx] ?? 0) / 2;
        const targetY = fromY + g.dy;
        let best = idx;
        let bestDist = Infinity;
        for (let i = 0; i < paramsRef.current.length; i++) {
          const midY = (rowOffsets.current[i] ?? 0) + (rowHeights.current[i] ?? 0) / 2;
          const dist = Math.abs(targetY - midY);
          if (dist < bestDist) { bestDist = dist; best = i; }
        }
        if (best !== dragToIdxRef.current) {
          dragToIdxRef.current = best;
          setDragToIdx(best);
        }
      },
      onPanResponderRelease: () => {
        const from = dragFromIdx.current;
        const to = dragToIdxRef.current;
        dragAnim.setValue(0);
        dragFromIdx.current = null;
        dragToIdxRef.current = null;
        setActiveIdx(null);
        setDragToIdx(null);
        setScrollEnabled(true);
        if (from !== null && to !== null && from !== to) {
          setParams((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            persistRef.current(next).catch(console.error);
            return next;
          });
        }
      },
      onPanResponderTerminate: () => {
        dragAnim.setValue(0);
        dragFromIdx.current = null;
        dragToIdxRef.current = null;
        setActiveIdx(null);
        setDragToIdx(null);
        setScrollEnabled(true);
      },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.length],
  );

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [formList, formParams, scalars, named] = await Promise.all([
      isNew ? Promise.resolve([]) : getForms(),
      isNew ? Promise.resolve([]) : getFormParams(formId),
      getScalarParameters(),
      getNamedParameters(),
    ]);

    if (!isNew) {
      const form = (formList as Awaited<ReturnType<typeof getForms>>).find((f) => f.id === formId);
      if (form) {
        setFormName(form.name);
        formSortOrderRef.current = form.sortOrder;
      }
      const scalarMap = new Map(scalars.map((s) => [s.id, s.name]));
      const namedMap = new Map(named.map((n) => [n.id, n.name]));
      const editParams: EditParam[] = [...(formParams as Awaited<ReturnType<typeof getFormParams>>)]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((fp) => ({
          paramId: fp.paramId,
          paramType: fp.paramType,
          name: fp.paramType === 'scalar' ? (scalarMap.get(fp.paramId) ?? '?') : (namedMap.get(fp.paramId) ?? '?'),
          clearAfterSubmit: fp.clearAfterSubmit,
        }));
      setParams(editParams);
    }

    const addedIds = new Set(
      isNew
        ? paramsRef.current.map((p) => p.paramId)
        : (formParams as Awaited<ReturnType<typeof getFormParams>>).map((fp) => fp.paramId),
    );
    setAddCandidates([
      ...scalars.filter((s) => !addedIds.has(s.id)).map((s) => ({ id: s.id, name: s.name, paramType: 'scalar' as const })),
      ...named.filter((n) => !addedIds.has(n.id)).map((n) => ({ id: n.id, name: n.name, paramType: 'named' as const })),
    ]);
  }, [formId, isNew]);

  useEffect(() => { load().catch(console.error); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load().catch(console.error)), [navigation, load]);

  const persist = useCallback(async (updated: EditParam[]) => {
    if (isNew) return;
    await saveFormLayout(
      formId,
      updated.map((p, i) => ({ type: p.paramType, paramId: p.paramId, sortOrder: i, clearAfterSubmit: p.clearAfterSubmit })),
    );
  }, [formId, isNew]);

  // Keep persistRef current so PanResponder release can call it
  persistRef.current = persist;

  const handleRename = useCallback(() => {
    Alert.prompt('Rename form', undefined, async (name) => {
      if (!name?.trim()) return;
      setFormName(name.trim());
      if (!isNew) await upsertForm({ id: formId, name: name.trim(), sortOrder: formSortOrderRef.current });
    }, 'plain-text', formName);
  }, [formId, isNew, formName]);

  const handleArchive = useCallback(async () => {
    await archiveForm(formId);
    navigation.goBack();
  }, [formId, navigation]);

  const handleSave = useCallback(async () => {
    await upsertForm({ id: formId, name: formName.trim() || 'New Form', sortOrder: formSortOrderRef.current });
    await saveFormLayout(
      formId,
      params.map((p, i) => ({ type: p.paramType, paramId: p.paramId, sortOrder: i, clearAfterSubmit: p.clearAfterSubmit })),
    );
    navigation.goBack();
  }, [formId, formName, params, navigation]);

  const handleRemove = useCallback(async (paramId: string) => {
    const next = params.filter((p) => p.paramId !== paramId);
    setParams(next);
    await persist(next);
  }, [params, persist]);

  const handleToggleSticky = useCallback(async (paramId: string) => {
    const next = params.map((p) =>
      p.paramId === paramId ? { ...p, clearAfterSubmit: !p.clearAfterSubmit } : p,
    );
    setParams(next);
    await persist(next);
  }, [params, persist]);

  const handleAddExisting = useCallback(async (lib: LibParam) => {
    setAddSheetOpen(false);
    const next = [...params, { paramId: lib.id, paramType: lib.paramType, name: lib.name, clearAfterSubmit: true }];
    setParams(next);
    await persist(next);
  }, [params, persist]);

  // ── Row shift helper ────────────────────────────────────────────────────────
  function rowShift(idx: number): number {
    if (activeIdx === null || dragToIdx === null || idx === activeIdx) return 0;
    const h = rowHeights.current[activeIdx] ?? 0;
    if (activeIdx < dragToIdx && idx > activeIdx && idx <= dragToIdx) return -h;
    if (activeIdx > dragToIdx && idx < activeIdx && idx >= dragToIdx) return h;
    return 0;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={formName || 'New Form'}
        onBack={() => navigation.goBack()}
        onTitlePress={handleRename}
        rightIcon={!isNew ? 'archive' : undefined}
        onRightPress={!isNew ? handleArchive : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (isNew ? 80 : Spacing.xl) }]}
        scrollEnabled={scrollEnabled}
      >
        <View style={styles.card}>
          {params.length === 0 ? (
            <Text style={styles.empty}>No params yet.</Text>
          ) : (
            params.map((param, idx) => {
              const isActive = idx === activeIdx;
              const shift = rowShift(idx);
              const rowContent = (
                <>
                  {/* Drag handle */}
                  <View
                    style={styles.dragHandle}
                    {...panResponders[idx]?.panHandlers}
                  >
                    <Feather name="menu" size={16} color={Colors.textDisabled} />
                  </View>

                  {/* Name + type */}
                  <TouchableOpacity
                    style={styles.paramBody}
                    onPress={() => navigation.navigate('ParamEditor', { paramType: param.paramType, paramId: param.paramId })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.paramName}>{param.name}</Text>
                    <Text style={styles.paramType}>{param.paramType === 'scalar' ? 'scalar' : 'named'}</Text>
                  </TouchableOpacity>

                  {/* Sticky toggle */}
                  <TouchableOpacity
                    onPress={() => handleToggleSticky(param.paramId)}
                    style={[styles.stickyBadge, !param.clearAfterSubmit && styles.stickyBadgeOn]}
                  >
                    <Text style={[styles.stickyLabel, !param.clearAfterSubmit && styles.stickyLabelOn]}>
                      sticky
                    </Text>
                  </TouchableOpacity>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => handleRemove(param.paramId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </>
              );

              if (isActive) {
                return (
                  <Animated.View
                    key={param.paramId}
                    style={[
                      styles.paramRow,
                      idx > 0 && styles.paramRowBorder,
                      styles.paramRowActive,
                      { transform: [{ translateY: dragAnim }] },
                    ]}
                    onLayout={(e) => {
                      rowOffsets.current[idx] = e.nativeEvent.layout.y;
                      rowHeights.current[idx] = e.nativeEvent.layout.height;
                    }}
                  >
                    {rowContent}
                  </Animated.View>
                );
              }

              return (
                <View
                  key={param.paramId}
                  style={[
                    styles.paramRow,
                    idx > 0 && styles.paramRowBorder,
                    shift !== 0 && { transform: [{ translateY: shift }] },
                  ]}
                  onLayout={(e) => {
                    rowOffsets.current[idx] = e.nativeEvent.layout.y;
                    rowHeights.current[idx] = e.nativeEvent.layout.height;
                  }}
                >
                  {rowContent}
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setAddSheetOpen(true)} activeOpacity={0.7}>
          <Feather name="plus" size={15} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add param</Text>
        </TouchableOpacity>
      </ScrollView>

      {isNew && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={addSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSheetOpen(false)}
      >
        <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={() => setAddSheetOpen(false)} />
        <View style={sheet.panel}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Add param</Text>
          <ScrollView contentContainerStyle={sheet.list}>
            <TouchableOpacity
              style={sheet.row}
              onPress={() => {
                setAddSheetOpen(false);
                navigation.navigate('ParamEditor', {
                  paramType: 'scalar',
                  initialName: 'New Parameter',
                  addToFormId: isNew ? undefined : formId,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[sheet.rowLabel, { color: Colors.primary }]}>+ New scalar param</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={sheet.row}
              onPress={() => {
                setAddSheetOpen(false);
                navigation.navigate('ParamEditor', {
                  paramType: 'named',
                  initialName: 'New Parameter',
                  addToFormId: isNew ? undefined : formId,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[sheet.rowLabel, { color: Colors.primary }]}>+ New named param</Text>
            </TouchableOpacity>

            {addCandidates.length > 0 && (
              <>
                <View style={sheet.divider} />
                {addCandidates.map((lib) => (
                  <TouchableOpacity
                    key={lib.id}
                    style={sheet.row}
                    onPress={() => handleAddExisting(lib)}
                    activeOpacity={0.7}
                  >
                    <Text style={sheet.rowLabel}>{lib.name}</Text>
                    <Text style={sheet.rowType}>{lib.paramType}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  paramRowBorder: { borderTopWidth: hairline, borderTopColor: Colors.separator },
  paramRowActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    opacity: 0.95,
    zIndex: 10,
  },
  dragHandle: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  paramBody: { flex: 1, gap: 1 },
  paramName: { ...Typography.body, color: Colors.text },
  paramType: { ...Typography.labelSm, color: Colors.textMuted },
  stickyBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: hairline, borderColor: Colors.separator,
  },
  stickyBadgeOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryBorder },
  stickyLabel: { ...Typography.labelSm, color: Colors.textDisabled },
  stickyLabelOn: { color: Colors.primary, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  addBtnText: { ...Typography.label, color: Colors.primary },
  empty: {
    ...Typography.label, color: Colors.textDisabled,
    paddingVertical: Spacing.lg, textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: Spacing.sm, paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.separator, alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: { ...Typography.title, color: Colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
  },
  rowLabel: { ...Typography.body, color: Colors.text },
  rowType: { ...Typography.labelSm, color: Colors.textMuted, textTransform: 'uppercase' },
  divider: { height: hairline, backgroundColor: Colors.separator, marginVertical: Spacing.sm },
});
