import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { useInterest } from '../contexts/InterestContext';
import { getNumberStats, getChoiceStats, upsertNumberStat, upsertChoiceStat, upsertChoiceOption } from '../db/parameters';
import { upsertExercise, saveExerciseLayout } from '../db/forms';
import type { LayoutEntry } from '../db/forms';
import RAW_TEMPLATES from '../assets/exerciseTemplates.json';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScalarStat = {
  id: string; name: string; type: 'scalar';
  min: number; max: number; step: number; majorStep: number;
  unit: string | null; target: number | null; lblMin: string; lblMax: string;
};

type ChoiceStat = {
  id: string; name: string; type: 'named';
  options: { id: string; label: string }[];
};

type TemplateStat = ScalarStat | ChoiceStat;

type TemplateLayoutSlot = { statId: string; sortOrder: number; clearAfterSubmit: boolean };

type TemplateExercise = { id: string; name: string; layout: TemplateLayoutSlot[] };

type ExerciseTemplate = {
  id: string; name: string;
  stats: TemplateStat[];
  exercises: TemplateExercise[];
};

const TEMPLATES = RAW_TEMPLATES as ExerciseTemplate[];

// Flat stat lookup by ID across all templates
const STAT_LOOKUP: Record<string, TemplateStat> = {};
for (const t of TEMPLATES) {
  for (const s of t.stats) {
    STAT_LOOKUP[s.id] = s;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDone: () => void;
}

export function ImportExercisesScreen({ onDone }: Props) {
  const { activeInterest } = useInterest();
  const insets = useSafeAreaInsets();

  const [existingStatIds, setExistingStatIds] = useState<Set<string>>(new Set());
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [search, setSearch] = useState('');
  // exerciseId → Set<statId> of stats to include. Key absent = exercise not selected.
  const [selection, setSelection] = useState<Record<string, Set<string>>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    Promise.all([getNumberStats(), getChoiceStats()])
      .then(([numbers, choices]) => {
        setExistingStatIds(new Set([...numbers.map((s) => s.id), ...choices.map((s) => s.id)]));
        setLoadingExisting(false);
      })
      .catch(console.error);
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES
      .map((t) => ({ ...t, exercises: t.exercises.filter((e) => e.name.toLowerCase().includes(q)) }))
      .filter((t) => t.exercises.length > 0);
  }, [search]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const isExerciseSelected = (id: string) => id in selection;

  const isStatChecked = (exerciseId: string, statId: string): boolean => {
    if (existingStatIds.has(statId)) return true;
    return selection[exerciseId]?.has(statId) ?? false;
  };

  const exerciseCheckState = (exercise: TemplateExercise): 'all' | 'some' | 'none' => {
    if (!isExerciseSelected(exercise.id)) return 'none';
    const sel = selection[exercise.id];
    const newStats = exercise.layout.filter((s) => !existingStatIds.has(s.statId));
    if (newStats.length === 0) return 'all';
    const checkedNew = newStats.filter((s) => sel.has(s.statId)).length;
    if (checkedNew === 0) return 'none';
    return checkedNew === newStats.length ? 'all' : 'some';
  };

  const toggleExercise = (exercise: TemplateExercise) => {
    const id = exercise.id;
    if (isExerciseSelected(id)) {
      setSelection((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      const allIds = new Set(exercise.layout.map((s) => s.statId));
      setSelection((prev) => ({ ...prev, [id]: allIds }));
    }
  };

  const toggleStat = (exerciseId: string, statId: string) => {
    if (existingStatIds.has(statId)) return;
    if (!isExerciseSelected(exerciseId)) return;
    setSelection((prev) => {
      const current = new Set(prev[exerciseId]);
      if (current.has(statId)) current.delete(statId);
      else current.add(statId);
      return { ...prev, [exerciseId]: current };
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const selectedCount = Object.keys(selection).length;

  const handleImport = async () => {
    setImporting(true);
    try {
      // Collect unique new stats to upsert
      const newStatIds = new Set<string>();
      for (const statIds of Object.values(selection)) {
        for (const statId of statIds) {
          if (!existingStatIds.has(statId)) newStatIds.add(statId);
        }
      }

      for (const statId of newStatIds) {
        const stat = STAT_LOOKUP[statId];
        if (!stat) continue;
        if (stat.type === 'scalar') {
          await upsertNumberStat({
            id: stat.id, name: stat.name,
            min: stat.min, max: stat.max, step: stat.step, majorStep: stat.majorStep,
            unit: stat.unit, target: stat.target, lblMin: stat.lblMin, lblMax: stat.lblMax,
          });
        } else {
          await upsertChoiceStat({ id: stat.id, name: stat.name });
          for (let i = 0; i < stat.options.length; i++) {
            await upsertChoiceOption({ id: stat.options[i].id, statId: stat.id, label: stat.options[i].label, sortOrder: i });
          }
        }
      }

      let sortOrder = 0;
      for (const [exerciseId, selectedStatIds] of Object.entries(selection)) {
        let exerciseDef: TemplateExercise | undefined;
        for (const t of TEMPLATES) {
          exerciseDef = t.exercises.find((e) => e.id === exerciseId);
          if (exerciseDef) break;
        }
        if (!exerciseDef) continue;

        await upsertExercise({ id: exerciseId, name: exerciseDef.name, sortOrder: sortOrder++ });

        const layout: LayoutEntry[] = exerciseDef.layout
          .filter((slot) => selectedStatIds.has(slot.statId))
          .map((slot) => {
            const stat = STAT_LOOKUP[slot.statId];
            const type = stat?.type === 'named' ? 'named' : 'scalar';
            return { type, statId: slot.statId, sortOrder: slot.sortOrder, clearAfterSubmit: slot.clearAfterSubmit };
          });

        await saveExerciseLayout(exerciseId, layout);
      }

      onDone();
    } catch (err) {
      console.error('Import failed:', err);
      setImporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const accentColor = activeInterest?.color ?? Colors.primary;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Add exercises</Text>
          <Text style={styles.headerSub}>Choose what you want to track.</Text>
        </View>
        <TouchableOpacity onPress={onDone} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor={Colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loadingExisting ? (
        <ActivityIndicator style={styles.loader} color={accentColor} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredTemplates.map((template) => (
            <View key={template.id}>
              <Text style={styles.templateLabel}>{template.name.toUpperCase()}</Text>
              <View style={styles.card}>
                {template.exercises.map((exercise, i) => {
                  const checkState = exerciseCheckState(exercise);
                  const isExpanded = expanded.has(exercise.id);
                  const newStatCount = exercise.layout.filter((s) => !existingStatIds.has(s.statId)).length;
                  const existingCount = exercise.layout.length - newStatCount;

                  return (
                    <View key={exercise.id} style={[styles.exerciseBlock, i > 0 && styles.exerciseBorder]}>
                      {/* Exercise header row */}
                      <View style={styles.exerciseRow}>
                        <TouchableOpacity
                          style={[
                            styles.checkbox,
                            checkState === 'all' && { backgroundColor: accentColor, borderColor: accentColor },
                            checkState === 'some' && { backgroundColor: accentColor + '55', borderColor: accentColor },
                          ]}
                          onPress={() => toggleExercise(exercise)}
                          activeOpacity={0.7}
                        >
                          {checkState !== 'none' && (
                            <Feather name={checkState === 'all' ? 'check' : 'minus'} size={12} color="#fff" />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.exerciseLabel}
                          onPress={() => toggleExpanded(exercise.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>
                            {exercise.layout.length} stats
                            {existingCount > 0 ? ` · ${existingCount} already added` : ''}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => toggleExpanded(exercise.id)} style={styles.expandBtn} activeOpacity={0.7}>
                          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      {/* Stat rows */}
                      {isExpanded && exercise.layout.map((slot) => {
                        const stat = STAT_LOOKUP[slot.statId];
                        if (!stat) return null;
                        const exists = existingStatIds.has(slot.statId);
                        const checked = isStatChecked(exercise.id, slot.statId);
                        const canToggle = !exists && isExerciseSelected(exercise.id);

                        return (
                          <TouchableOpacity
                            key={slot.statId}
                            style={styles.statRow}
                            onPress={() => toggleStat(exercise.id, slot.statId)}
                            activeOpacity={canToggle ? 0.7 : 1}
                            disabled={!canToggle}
                          >
                            <View style={styles.statIndent} />
                            <View style={[
                              styles.checkbox,
                              styles.checkboxSm,
                              checked && exists && styles.checkboxExists,
                              checked && !exists && { backgroundColor: accentColor, borderColor: accentColor },
                            ]}>
                              {checked && <Feather name="check" size={10} color="#fff" />}
                            </View>
                            <Text style={[styles.statName, exists && styles.statNameExists]}>
                              {stat.name}
                            </Text>
                            <View style={[styles.typePill, exists && styles.typePillExists]}>
                              <Text style={[styles.typePillText, exists && styles.typePillTextExists]}>
                                {stat.type === 'named' ? 'choice' : 'number'}
                              </Text>
                            </View>
                            {exists && <Text style={styles.existsBadge}>exists</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {filteredTemplates.length === 0 && (
            <Text style={styles.emptyText}>No exercises match "{search}"</Text>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity
          style={[
            styles.importBtn,
            { backgroundColor: accentColor },
            (selectedCount === 0 || importing) && styles.importBtnDisabled,
          ]}
          onPress={handleImport}
          activeOpacity={0.8}
          disabled={selectedCount === 0 || importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.importBtnText}>
              {selectedCount === 0
                ? 'Select exercises to import'
                : `Import ${selectedCount} exercise${selectedCount !== 1 ? 's' : ''} →`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  headerTitle: { ...Typography.title, color: Colors.text, fontSize: 20, fontWeight: '700' },
  headerSub: { ...Typography.labelSm, color: Colors.textMuted, marginTop: 2 },
  skipBtn: { paddingLeft: Spacing.md, paddingVertical: Spacing.sm },
  skipText: { ...Typography.body, color: Colors.textMuted },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  templateLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  exerciseBlock: {},
  exerciseBorder: { borderTopWidth: hairline, borderTopColor: Colors.separator },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 52,
    gap: Spacing.sm,
  },
  exerciseLabel: { flex: 1, gap: 2 },
  exerciseName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  exerciseMeta: { ...Typography.labelSm, color: Colors.textMuted },
  expandBtn: { padding: Spacing.xs },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSm: { width: 18, height: 18, borderRadius: 4 },
  checkboxExists: { backgroundColor: Colors.textDisabled, borderColor: Colors.textDisabled },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.md,
    paddingVertical: 8,
    gap: Spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  statIndent: { width: Spacing.lg + Spacing.md },
  statName: { flex: 1, ...Typography.label, color: Colors.text },
  statNameExists: {
    color: Colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  typePill: {
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typePillExists: { backgroundColor: 'transparent' },
  typePillText: { ...Typography.labelSm, color: Colors.textMuted, fontSize: 11 },
  typePillTextExists: { color: Colors.textDisabled },
  existsBadge: {
    ...Typography.labelSm,
    color: Colors.textDisabled,
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  importBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  importBtnDisabled: { opacity: 0.4 },
  importBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});
