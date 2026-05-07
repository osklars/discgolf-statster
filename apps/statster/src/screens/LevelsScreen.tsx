import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useInterest } from '../contexts/InterestContext';
import { getLevels, deleteLevel } from '../db/levels';
import type { LevelFilter } from '../db/levels';
import { getExercises } from '../db/forms';
import { queryEntries, queryEntryCountByExercise } from '../db/queries';
import { computeLevel } from '../utils/levels';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

type DisplayLevel = {
  id: string;
  name: string;
  kind: 'exercise' | 'custom';
  entryCount: number;
  level: number;
  progress: number;
  toNext: number;
  isMax: boolean;
  filters: LevelFilter[];
};

function LevelCard({
  item, accentColor, onDelete,
}: {
  item: DisplayLevel;
  accentColor: string;
  onDelete?: () => void;
}) {
  return (
    <View style={card.root}>
      <View style={card.header}>
        <Text style={card.name} numberOfLines={1}>{item.name}</Text>
        {item.kind === 'custom' && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={13} color={Colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[card.levelNum, { color: accentColor }]}>{item.level}</Text>

      <View style={card.barTrack}>
        <View style={[card.barFill, { width: `${Math.round(item.progress * 100)}%`, backgroundColor: accentColor }]} />
      </View>

      <Text style={card.sub}>
        {item.entryCount} entries
        {item.isMax ? ' · Max level' : ` · ${item.toNext} to level ${item.level + 1}`}
      </Text>
    </View>
  );
}

const card = StyleSheet.create({
  root: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600', flex: 1 },
  levelNum: { fontSize: 36, fontWeight: '800', lineHeight: 40 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.separator, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  sub: { ...Typography.labelSm, color: Colors.textDisabled },
});

export function LevelsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeInterest } = useInterest();
  const accentColor = activeInterest.color;

  const [loading, setLoading] = useState(true);
  const [overallCount, setOverallCount] = useState(0);
  const [overallInfo, setOverallInfo] = useState({ level: 1, progress: 0, toNext: 25, isMax: false });
  const [displayLevels, setDisplayLevels] = useState<DisplayLevel[]>([]);

  const load = useCallback(async () => {
    const [allEntries, exercises, exerciseCounts, customLevels] = await Promise.all([
      queryEntries({}),
      getExercises(),
      queryEntryCountByExercise(),
      getLevels(),
    ]);

    const overall = allEntries.length;
    setOverallCount(overall);
    setOverallInfo(computeLevel(overall));

    const customWithCounts = await Promise.all(
      customLevels.map(async (lv) => {
        const entries = await queryEntries({
          choiceFilters: lv.filters.map((f) => ({ statId: f.statId, optionIds: [f.optionId] })),
        });
        return { ...lv, entryCount: entries.length };
      }),
    );

    const exerciseLevels: DisplayLevel[] = exercises
      .filter((e) => (exerciseCounts[e.id] ?? 0) > 0)
      .map((e) => {
        const count = exerciseCounts[e.id];
        return { id: e.id, name: e.name, kind: 'exercise' as const, entryCount: count, filters: [], ...computeLevel(count) };
      });

    const customDisplay: DisplayLevel[] = customWithCounts.map((lv) => ({
      id: lv.id, name: lv.name, kind: 'custom' as const,
      entryCount: lv.entryCount, filters: lv.filters,
      ...computeLevel(lv.entryCount),
    }));

    const sorted = [...exerciseLevels, ...customDisplay].sort((a, b) => a.toNext - b.toNext);
    setDisplayLevels(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(console.error); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load().catch(console.error)), [navigation, load]);

  const handleDelete = useCallback((lv: DisplayLevel) => {
    Alert.alert('Delete level', `Remove "${lv.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteLevel(lv.id); load(); },
      },
    ]);
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Levels" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={accentColor} style={{ flex: 1 }} />
      </View>
    );
  }

  // Pair items into rows of 2 for the grid
  const pairs: (DisplayLevel | null)[][] = [];
  for (let i = 0; i < displayLevels.length; i += 2) {
    pairs.push([displayLevels[i], displayLevels[i + 1] ?? null]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Levels" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall — full width big card */}
        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>OVERALL</Text>
          <Text style={[styles.overallNum, { color: accentColor }]}>{overallCount}</Text>
          <View style={styles.overallBarTrack}>
            <View style={[styles.overallBarFill, { width: `${Math.round(overallInfo.progress * 100)}%`, backgroundColor: accentColor }]} />
          </View>
          <Text style={styles.overallSub}>
            Level {overallInfo.level}
            {overallInfo.isMax ? ' · Max level' : ` · ${overallInfo.toNext} to level ${overallInfo.level + 1}`}
          </Text>
        </View>

        {/* 2-column grid */}
        <View style={styles.grid}>
          {pairs.map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {pair.map((item, colIdx) =>
                item ? (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cell}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (item.kind === 'exercise') {
                        navigation.navigate('StatDetail', { exerciseId: item.id, exerciseName: item.name });
                      } else {
                        navigation.navigate('StatDetail', { filters: item.filters });
                      }
                    }}
                  >
                    <LevelCard item={item} accentColor={accentColor} onDelete={item.kind === 'custom' ? () => handleDelete(item) : undefined} />
                  </TouchableOpacity>
                ) : (
                  <View key={`empty-${colIdx}`} style={styles.cell} />
                ),
              )}
            </View>
          ))}

          {/* Ghost "Add level" card — always last */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('StatDetail', {})}
            >
              <View style={styles.addCard}>
                <Feather name="plus" size={22} color={Colors.textDisabled} />
                <Text style={styles.addCardText}>Add level</Text>
                <Text style={styles.addCardSub}>Filter in Stats view,{'\n'}then save</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.cell} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  // Overall card
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  overallLabel: {
    ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  overallNum: { fontSize: 64, fontWeight: '800', lineHeight: 68 },
  overallBarTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.separator, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 3 },
  overallSub: { ...Typography.labelSm, color: Colors.textMuted },
  // Grid
  grid: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  cell: { flex: 1 },
  // Ghost add card
  addCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.separator,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
    minHeight: 130,
  },
  addCardText: { ...Typography.label, color: Colors.textDisabled, fontWeight: '600' },
  addCardSub: { ...Typography.labelSm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 16 },
});
