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
import { useInterest } from '../contexts/InterestContext';
import { InterestSwitcherSheet } from '../components/InterestSwitcher/InterestSwitcherSheet';
import type { SessionSummary } from '../db/types';
import { getSessionsWithEntryCounts } from '../db/sessions';
import { getLevels } from '../db/levels';
import type { LevelFilter } from '../db/levels';
import { getExercises } from '../db/forms';
import { queryEntries, queryEntryCountByExercise } from '../db/queries';
import { computeLevel } from '../utils/levels';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SE', { month: 'short', day: 'numeric' });
}

function LevelCard({
  name, kind, level, progress, toNext, isMax, accentColor,
}: {
  name: string; kind: 'overall' | 'exercise' | 'custom';
  level: number; progress: number; toNext: number; isMax: boolean;
  accentColor: string;
}) {
  return (
    <View style={card.root}>
      <View style={card.top}>
        <Text style={card.name} numberOfLines={1}>{name}</Text>
        {kind === 'custom' && (
          <Feather name="star" size={11} color={accentColor} />
        )}
      </View>
      <Text style={[card.levelNum, { color: accentColor }]}>{level}</Text>
      <View style={card.barTrack}>
        <View style={[card.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accentColor }]} />
      </View>
      <Text style={card.sub}>
        {isMax ? 'Max level' : `${toNext} to level ${level + 1}`}
      </Text>
    </View>
  );
}

const card = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600', flex: 1 },
  levelNum: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.separator, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  sub: { ...Typography.labelSm, color: Colors.textDisabled },
});

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeInterest, addInterest } = useInterest();
  const accentColor = activeInterest.color;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [overallCount, setOverallCount] = useState<number | null>(null);
  const [overallLevel, setOverallLevel] = useState({ level: 1, progress: 0, toNext: 25, isMax: false });
  const [displayLevels, setDisplayLevels] = useState<DisplayLevel[]>([]);

  const loadData = useCallback(async () => {
    const [allEntries, exercises, exerciseCounts, customLevels, sessionList] = await Promise.all([
      queryEntries({}),
      getExercises(),
      queryEntryCountByExercise(),
      getLevels(),
      getSessionsWithEntryCounts(),
    ]);

    const overall = allEntries.length;
    setOverallCount(overall);
    setOverallLevel(computeLevel(overall));

    // Custom level entry counts
    const customWithCounts = await Promise.all(
      customLevels.map(async (lv) => {
        const entries = await queryEntries({
          choiceFilters: lv.filters.map((f) => ({ statId: f.statId, optionIds: [f.optionId] })),
        });
        return { ...lv, entryCount: entries.length };
      }),
    );

    // Exercise auto-levels (only exercises with ≥1 entry)
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
    setSessions(sessionList);
  }, []);

  useEffect(() => { loadData().catch(console.error); }, [loadData]);
  useEffect(() => navigation.addListener('focus', () => loadData().catch(console.error)), [navigation, loadData]);

  const top4 = displayLevels.slice(0, 4);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.interestButton} onPress={() => setSwitcherOpen(true)} activeOpacity={0.7}>
          <Text style={styles.interestEmoji}>{activeInterest.emoji}</Text>
          <Text style={[styles.appTitle, { color: accentColor }]}>{activeInterest.name}</Text>
          <Feather name="chevron-down" size={18} color={accentColor} style={styles.chevron} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Exercises')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="settings" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <InterestSwitcherSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onAddInterest={() => {
          setSwitcherOpen(false);
          Alert.prompt('New interest', 'Enter a name (e.g. "Guitar", "Gym")', async (name) => {
            if (!name?.trim()) return;
            await addInterest({ name: name.trim(), emoji: '🏆', color: '#0C447C' });
          }, 'plain-text');
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall card — full width, bigger */}
        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate('Levels')}>
          <View style={styles.overallCard}>
            <Text style={styles.sectionLabel}>OVERALL</Text>
            <Text style={[styles.overallNum, { color: accentColor }]}>
              {overallCount !== null ? overallCount : '—'}
            </Text>
            <View style={styles.overallBarTrack}>
              <View style={[styles.overallBarFill, { width: `${Math.round(overallLevel.progress * 100)}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={styles.overallSub}>
              Level {overallLevel.level}
              {overallLevel.isMax ? ' · Max level' : ` · ${overallLevel.toNext} to level ${overallLevel.level + 1}`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Level cards grid */}
        {(top4.length > 0 || true) && (
          <TouchableOpacity activeOpacity={1} onPress={() => navigation.navigate('Levels')}>
            <View style={styles.grid}>
              {top4.map((lv) => (
                <TouchableOpacity
                  key={lv.id}
                  style={styles.gridCell}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('Levels')}
                >
                  <LevelCard
                    name={lv.name}
                    kind={lv.kind}
                    level={lv.level}
                    progress={lv.progress}
                    toNext={lv.toNext}
                    isMax={lv.isMax}
                    accentColor={accentColor}
                  />
                </TouchableOpacity>
              ))}

              {/* Ghost "Add level" card */}
              <TouchableOpacity
                style={styles.gridCell}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('StatDetail', {})}
              >
                <View style={styles.addCard}>
                  <Feather name="plus" size={20} color={Colors.textDisabled} />
                  <Text style={styles.addCardText}>Add level</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Sessions */}
        <Text style={styles.sectionTitle}>Recent sessions</Text>

        {sessions.length === 0 && (
          <Text style={styles.emptyLabel}>No sessions yet. Start one below!</Text>
        )}

        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            activeOpacity={0.7}
            style={styles.sessionCard}
            onPress={() => navigation.navigate('UnifiedSession', { sessionId: session.id })}
          >
            <View style={styles.sessionCardLeft}>
              <Text style={styles.sessionName}>{session.name ?? 'Session'}</Text>
              <Text style={styles.sessionMeta}>
                {session.entryCount} {session.entryCount === 1 ? 'throw' : 'throws'}
              </Text>
            </View>
            <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity
          style={[styles.newSessionBtn, { backgroundColor: accentColor }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('UnifiedSession')}
        >
          <Text style={styles.newSessionText}>+ New session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  interestButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start' },
  interestEmoji: { fontSize: 20 },
  appTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  chevron: { marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  sectionLabel: {
    ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  // Overall card
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  overallNum: { fontSize: 56, fontWeight: '800', lineHeight: 60 },
  overallBarTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.separator, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 3 },
  overallSub: { ...Typography.labelSm, color: Colors.textMuted },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridCell: { width: '47%' },
  addCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.separator,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    minHeight: 110,
  },
  addCardText: { ...Typography.labelSm, color: Colors.textDisabled, fontWeight: '600' },
  // Sessions
  sectionTitle: { ...Typography.title, color: Colors.text, marginTop: Spacing.sm },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg,
  },
  sessionCardLeft: { flex: 1, gap: 2 },
  sessionName: { ...Typography.body, fontWeight: '600', color: Colors.text },
  sessionMeta: { ...Typography.labelSm, color: Colors.textMuted },
  sessionDate: { ...Typography.label, color: Colors.textMuted },
  emptyLabel: { ...Typography.label, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
  // Footer
  stickyBar: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    borderTopWidth: hairline, borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  newSessionBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  newSessionText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});
