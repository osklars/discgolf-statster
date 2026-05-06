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
import { getExercises, getExerciseStats, saveExerciseLayout, upsertExercise, archiveExercise } from '../db/forms';
import { getNumberStats, getChoiceStats } from '../db/parameters';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseEditor'>;

type EditStat = {
  statId: string;
  statType: 'scalar' | 'named';
  name: string;
  clearAfterSubmit: boolean;
};

type LibStat = { id: string; name: string; statType: 'scalar' | 'named' };

export function ExerciseEditorScreen({ route, navigation }: Props) {
  const { exerciseId, isNew, sortOrder: initialSortOrder } = route.params;
  const insets = useSafeAreaInsets();
  const [exerciseName, setExerciseName] = useState(isNew ? 'New Exercise' : '');
  const exerciseSortOrderRef = useRef(initialSortOrder ?? 0);
  const [stats, setStats] = useState<EditStat[]>([]);
  const statsRef = useRef<EditStat[]>([]);
  statsRef.current = stats;
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addCandidates, setAddCandidates] = useState<LibStat[]>([]);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragFromIdx = useRef<number | null>(null);
  const dragToIdxRef = useRef<number | null>(null);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dragToIdx, setDragToIdx] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const rowOffsets = useRef<number[]>([]);
  const rowHeights = useRef<number[]>([]);

  const persistRef = useRef<(updated: EditStat[]) => Promise<void>>(async () => {});

  // One PanResponder per item slot — recreated only when count changes
  const panResponders = useMemo(() =>
    stats.map((_, idx) => PanResponder.create({
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
        for (let i = 0; i < statsRef.current.length; i++) {
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
          setStats((prev) => {
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
    [stats.length],
  );

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [exerciseList, exerciseStats, numberStatsList, choiceStatsList] = await Promise.all([
      isNew ? Promise.resolve([]) : getExercises(),
      isNew ? Promise.resolve([]) : getExerciseStats(exerciseId),
      getNumberStats(),
      getChoiceStats(),
    ]);

    if (!isNew) {
      const exercise = (exerciseList as Awaited<ReturnType<typeof getExercises>>).find((e) => e.id === exerciseId);
      if (exercise) {
        setExerciseName(exercise.name);
        exerciseSortOrderRef.current = exercise.sortOrder;
      }
      const numberMap = new Map(numberStatsList.map((s) => [s.id, s.name]));
      const choiceMap = new Map(choiceStatsList.map((n) => [n.id, n.name]));
      const editStats: EditStat[] = [...(exerciseStats as Awaited<ReturnType<typeof getExerciseStats>>)]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((slot) => ({
          statId: slot.statId,
          statType: slot.statType,
          name: slot.statType === 'scalar' ? (numberMap.get(slot.statId) ?? '?') : (choiceMap.get(slot.statId) ?? '?'),
          clearAfterSubmit: slot.clearAfterSubmit,
        }));
      setStats(editStats);
    }

    const addedIds = new Set(
      isNew
        ? statsRef.current.map((s) => s.statId)
        : (exerciseStats as Awaited<ReturnType<typeof getExerciseStats>>).map((slot) => slot.statId),
    );
    setAddCandidates([
      ...numberStatsList.filter((s) => !addedIds.has(s.id)).map((s) => ({ id: s.id, name: s.name, statType: 'scalar' as const })),
      ...choiceStatsList.filter((n) => !addedIds.has(n.id)).map((n) => ({ id: n.id, name: n.name, statType: 'named' as const })),
    ]);
  }, [exerciseId, isNew]);

  useEffect(() => { load().catch(console.error); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load().catch(console.error)), [navigation, load]);

  const persist = useCallback(async (updated: EditStat[]) => {
    if (isNew) return;
    await saveExerciseLayout(
      exerciseId,
      updated.map((s, i) => ({ type: s.statType, statId: s.statId, sortOrder: i, clearAfterSubmit: s.clearAfterSubmit })),
    );
  }, [exerciseId, isNew]);

  persistRef.current = persist;

  const handleRename = useCallback(() => {
    Alert.prompt('Rename exercise', undefined, async (name) => {
      if (!name?.trim()) return;
      setExerciseName(name.trim());
      if (!isNew) await upsertExercise({ id: exerciseId, name: name.trim(), sortOrder: exerciseSortOrderRef.current });
    }, 'plain-text', exerciseName);
  }, [exerciseId, isNew, exerciseName]);

  const handleArchive = useCallback(async () => {
    await archiveExercise(exerciseId);
    navigation.goBack();
  }, [exerciseId, navigation]);

  const handleSave = useCallback(async () => {
    await upsertExercise({ id: exerciseId, name: exerciseName.trim() || 'New Exercise', sortOrder: exerciseSortOrderRef.current });
    await saveExerciseLayout(
      exerciseId,
      stats.map((s, i) => ({ type: s.statType, statId: s.statId, sortOrder: i, clearAfterSubmit: s.clearAfterSubmit })),
    );
    navigation.goBack();
  }, [exerciseId, exerciseName, stats, navigation]);

  const handleRemove = useCallback(async (statId: string) => {
    const next = stats.filter((s) => s.statId !== statId);
    setStats(next);
    await persist(next);
  }, [stats, persist]);

  const handleToggleSticky = useCallback(async (statId: string) => {
    const next = stats.map((s) =>
      s.statId === statId ? { ...s, clearAfterSubmit: !s.clearAfterSubmit } : s,
    );
    setStats(next);
    await persist(next);
  }, [stats, persist]);

  const handleAddExisting = useCallback(async (lib: LibStat) => {
    setAddSheetOpen(false);
    const next = [...stats, { statId: lib.id, statType: lib.statType, name: lib.name, clearAfterSubmit: true }];
    setStats(next);
    await persist(next);
  }, [stats, persist]);

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
        title={exerciseName || 'New Exercise'}
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
          {stats.length === 0 ? (
            <Text style={styles.empty}>No stats yet.</Text>
          ) : (
            stats.map((stat, idx) => {
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
                    style={styles.statBody}
                    onPress={() => navigation.navigate('StatEditor', { statType: stat.statType, statId: stat.statId })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.statName}>{stat.name}</Text>
                    <Text style={styles.statType}>{stat.statType === 'scalar' ? 'number' : 'choice'}</Text>
                  </TouchableOpacity>

                  {/* Sticky toggle */}
                  <TouchableOpacity
                    onPress={() => handleToggleSticky(stat.statId)}
                    style={[styles.stickyBadge, !stat.clearAfterSubmit && styles.stickyBadgeOn]}
                  >
                    <Text style={[styles.stickyLabel, !stat.clearAfterSubmit && styles.stickyLabelOn]}>
                      sticky
                    </Text>
                  </TouchableOpacity>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => handleRemove(stat.statId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </>
              );

              if (isActive) {
                return (
                  <Animated.View
                    key={stat.statId}
                    style={[
                      styles.statRow,
                      idx > 0 && styles.statRowBorder,
                      styles.statRowActive,
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
                  key={stat.statId}
                  style={[
                    styles.statRow,
                    idx > 0 && styles.statRowBorder,
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
          <Text style={styles.addBtnText}>Add stat</Text>
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
          <Text style={sheet.title}>Add stat</Text>
          <ScrollView contentContainerStyle={sheet.list}>
            <TouchableOpacity
              style={sheet.row}
              onPress={() => {
                setAddSheetOpen(false);
                navigation.navigate('StatEditor', {
                  statType: 'scalar',
                  initialName: 'New Stat',
                  addToExerciseId: isNew ? undefined : exerciseId,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[sheet.rowLabel, { color: Colors.primary }]}>+ New number stat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={sheet.row}
              onPress={() => {
                setAddSheetOpen(false);
                navigation.navigate('StatEditor', {
                  statType: 'named',
                  initialName: 'New Stat',
                  addToExerciseId: isNew ? undefined : exerciseId,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[sheet.rowLabel, { color: Colors.primary }]}>+ New choice stat</Text>
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
                    <Text style={sheet.rowType}>{lib.statType === 'scalar' ? 'number' : 'choice'}</Text>
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  statRowBorder: { borderTopWidth: hairline, borderTopColor: Colors.separator },
  statRowActive: {
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
  statBody: { flex: 1, gap: 1 },
  statName: { ...Typography.body, color: Colors.text },
  statType: { ...Typography.labelSm, color: Colors.textMuted },
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
