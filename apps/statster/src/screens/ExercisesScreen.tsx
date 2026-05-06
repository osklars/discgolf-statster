import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { RowItem } from '../components/ui/RowItem';
import { loadExerciseDefs } from '../db/mappers';
import { deleteExercise, getArchivedExercises, archiveExercise, restoreExercise } from '../db/forms';
import {
  getArchivedNumberStats, getArchivedChoiceStats,
  restoreNumberStat, restoreChoiceStat,
  deleteNumberStat, deleteChoiceStat,
} from '../db/parameters';
import { queryStatUsageCounts } from '../db/queries';
import { randomUUID } from 'expo-crypto';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercises'>;

type ExerciseRow = { id: string; name: string; statCount: number };
type ArchivedExerciseRow = { id: string; name: string };
type StatRow = { id: string; name: string; type: 'scalar' | 'named'; usageCount: number };

export function ExercisesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [archivedExercises, setArchivedExercises] = useState<ArchivedExerciseRow[]>([]);
  const [numberStats, setNumberStats] = useState<StatRow[]>([]);
  const [choiceStats, setChoiceStats] = useState<StatRow[]>([]);
  const [archivedStats, setArchivedStats] = useState<StatRow[]>([]);
  const [archivedStatsExpanded, setArchivedStatsExpanded] = useState(false);
  const [archivedExercisesExpanded, setArchivedExercisesExpanded] = useState(false);

  const load = useCallback(async () => {
    const [{ exercises: rawExercises, statLibrary }, usageCounts, archivedNumber, archivedChoice, rawArchivedExercises] =
      await Promise.all([
        loadExerciseDefs(),
        queryStatUsageCounts(),
        getArchivedNumberStats(),
        getArchivedChoiceStats(),
        getArchivedExercises(),
      ]);

    setExercises(rawExercises.map((e) => ({ id: e.id, name: e.name, statCount: e.params.length })));
    setArchivedExercises(rawArchivedExercises.map((e) => ({ id: e.id, name: e.name })));
    setNumberStats(
      statLibrary
        .filter((p) => p.type !== 'named')
        .map((p) => ({ id: p.id, name: p.name, type: 'scalar' as const, usageCount: usageCounts[p.id] ?? 0 })),
    );
    setChoiceStats(
      statLibrary
        .filter((p) => p.type === 'named')
        .map((p) => ({ id: p.id, name: p.name, type: 'named' as const, usageCount: usageCounts[p.id] ?? 0 })),
    );
    setArchivedStats([
      ...archivedNumber.map((s) => ({ id: s.id, name: s.name, type: 'scalar' as const, usageCount: usageCounts[s.id] ?? 0 })),
      ...archivedChoice.map((n) => ({ id: n.id, name: n.name, type: 'named' as const, usageCount: usageCounts[n.id] ?? 0 })),
    ]);
  }, []);

  useEffect(() => { load().catch(console.error); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load().catch(console.error)), [navigation, load]);

  const handleNewExercise = useCallback(() => {
    navigation.navigate('ExerciseEditor', { exerciseId: randomUUID(), isNew: true, sortOrder: exercises.length });
  }, [exercises.length, navigation]);

  const handleArchiveExercise = useCallback(async (id: string) => {
    await archiveExercise(id);
    load();
  }, [load]);

  const handleRestoreExercise = useCallback(async (id: string) => {
    await restoreExercise(id);
    load();
  }, [load]);

  const handleDeleteArchivedExercise = useCallback((id: string, name: string) => {
    Alert.alert(
      'Delete exercise',
      `Permanently delete "${name}"?\n\nEntries are not affected but this cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExercise(id); load(); } },
      ],
    );
  }, [load]);

  const handleRestoreStat = useCallback(async (p: StatRow) => {
    if (p.type === 'scalar') await restoreNumberStat(p.id);
    else await restoreChoiceStat(p.id);
    load();
  }, [load]);

  const handleDeleteStat = useCallback((p: StatRow) => {
    const warning = p.usageCount > 0
      ? `This will permanently delete "${p.name}" and all ${p.usageCount} of its datapoints. This cannot be undone.`
      : `Permanently delete "${p.name}"? This cannot be undone.`;
    Alert.alert('Delete stat', warning, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete permanently',
        style: 'destructive',
        onPress: async () => {
          if (p.type === 'scalar') await deleteNumberStat(p.id);
          else await deleteChoiceStat(p.id);
          load();
        },
      },
    ]);
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Exercises & Stats" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
      {/* ── Exercises ── */}
      <SectionHeader label="Exercises" onNew={handleNewExercise} />
      <View style={styles.card}>
        {exercises.length === 0 ? (
          <Text style={styles.empty}>No exercises yet.</Text>
        ) : (
          exercises.map((exercise, i) => (
            <RowItem
              key={exercise.id}
              title={exercise.name}
              meta={`${exercise.statCount} ${exercise.statCount === 1 ? 'stat' : 'stats'}`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('ExerciseEditor', { exerciseId: exercise.id })}
            />
          ))
        )}
      </View>

      {/* ── Archived exercises ── */}
      {archivedExercises.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setArchivedExercisesExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>ARCHIVED EXERCISES ({archivedExercises.length})</Text>
            <Feather name={archivedExercisesExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>
          {archivedExercisesExpanded && (
            <View style={styles.card}>
              {archivedExercises.map((e, i) => (
                <RowItem
                  key={e.id}
                  title={e.name}
                  bordered={i > 0}
                  dimmed
                  onRestore={() => handleRestoreExercise(e.id)}
                  onDelete={() => handleDeleteArchivedExercise(e.id, e.name)}
                />
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Choice stats ── */}
      <SectionHeader label="Choice stats" onNew={() => navigation.navigate('StatEditor', { statType: 'named', initialName: 'New Stat' })} />
      <View style={styles.card}>
        {choiceStats.length === 0 ? (
          <Text style={styles.empty}>No choice stats yet.</Text>
        ) : (
          choiceStats.map((p, i) => (
            <RowItem
              key={p.id}
              title={p.name}
              meta={p.usageCount === 1 ? '1 entry' : `${p.usageCount} entries`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('StatEditor', { statType: 'named', statId: p.id })}
            />
          ))
        )}
      </View>

      {/* ── Number stats ── */}
      <SectionHeader label="Number stats" onNew={() => navigation.navigate('StatEditor', { statType: 'scalar', initialName: 'New Stat' })} />
      <View style={styles.card}>
        {numberStats.length === 0 ? (
          <Text style={styles.empty}>No number stats yet.</Text>
        ) : (
          numberStats.map((p, i) => (
            <RowItem
              key={p.id}
              title={p.name}
              meta={p.usageCount === 1 ? '1 entry' : `${p.usageCount} entries`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('StatEditor', { statType: 'scalar', statId: p.id })}
            />
          ))
        )}
      </View>

      {/* ── Archived stats ── */}
      {archivedStats.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setArchivedStatsExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>ARCHIVED STATS ({archivedStats.length})</Text>
            <Feather name={archivedStatsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>
          {archivedStatsExpanded && (
            <View style={styles.card}>
              {archivedStats.map((p, i) => (
                <RowItem
                  key={p.id}
                  title={p.name}
                  meta={`${p.type} · ${p.usageCount} entries`}
                  bordered={i > 0}
                  dimmed
                  onRestore={() => handleRestoreStat(p)}
                  onDelete={() => handleDeleteStat(p)}
                />
              ))}
            </View>
          )}
        </>
      )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label, onNew }: { label: string; onNew: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      <TouchableOpacity onPress={onNew} style={styles.sectionBtn}>
        <Feather name="plus" size={15} color={Colors.primary} />
        <Text style={styles.sectionBtnText}>New</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionBtnText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  collapsibleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  empty: {
    ...Typography.label, color: Colors.textDisabled,
    paddingVertical: Spacing.lg, textAlign: 'center', paddingHorizontal: Spacing.lg,
  },
});
