import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { useSkill } from '../contexts/SkillContext';
import { SkillSwitcherSheet } from '../components/SkillSwitcher/SkillSwitcherSheet';
import type { SessionSummary } from '../db/types';
import { getSessionsWithEntryCounts } from '../db/sessions';
import { getSavedLevels } from '../db/savedLevels';
import type { SavedLevel } from '../db/savedLevels';
import { getLevelSummary } from '../db/xp';
import type { LevelSummary, QualityAverage } from '../db/xp';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type TrackedItem = SavedLevel & LevelSummary;

function formatQuality(q: QualityAverage): string {
  if (q.target === q.max || q.target === q.min) {
    return `${q.avgValue.toFixed(1)} / ${q.target}`;
  }
  const sign = q.avgValue >= 0 ? '+' : '';
  return `${sign}${q.avgValue.toFixed(1)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SE', { month: 'short', day: 'numeric' });
}

function ProgressBar({ progress, height = 4 }: { progress: number; height?: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[bar.track, { height }]}>
      <View style={[bar.fill, { flex: clamped }]} />
      <View style={{ flex: 1 - clamped }} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 2,
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  fill: { backgroundColor: Colors.primary, borderRadius: 2 },
});

function QualityRow({ averages }: { averages: QualityAverage[] }) {
  if (averages.length === 0) return null;
  return (
    <View style={q.row}>
      {averages.map((qa) => (
        <View key={qa.paramId} style={q.item}>
          <Text style={q.label}>{qa.name}</Text>
          <Text style={q.value}>{formatQuality(qa)}</Text>
        </View>
      ))}
    </View>
  );
}

const q = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  item: { gap: 1 },
  label: { ...Typography.labelSm, color: Colors.textMuted, fontSize: 10 },
  value: { ...Typography.labelSm, color: Colors.text, fontWeight: '600' },
});

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeSkill } = useSkill();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [overall, setOverall] = useState<LevelSummary | null>(null);
  const [tracked, setTracked] = useState<TrackedItem[]>([]);

  const loadData = useCallback(async () => {
    const [overallSummary, savedLevels, sessionList] = await Promise.all([
      getLevelSummary([]),
      getSavedLevels(),
      getSessionsWithEntryCounts(),
    ]);

    const top4 = savedLevels.slice(0, 4);
    const summaries = await Promise.all(
      top4.map((sl) =>
        getLevelSummary(sl.filters.map((f) => ({ parameterId: f.parameterId, optionId: f.optionId }))),
      ),
    );

    setOverall(overallSummary);
    setTracked(top4.map((sl, i) => ({ ...sl, ...summaries[i] })));
    setSessions(sessionList);
  }, []);

  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  useEffect(() => {
    return navigation.addListener('focus', () => loadData().catch(console.error));
  }, [navigation, loadData]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.skillButton}
          onPress={() => setSwitcherOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.skillEmoji}>{activeSkill.emoji}</Text>
          <Text style={[styles.appTitle, { color: activeSkill.color }]}>{activeSkill.name}</Text>
          <Feather name="chevron-down" size={18} color={activeSkill.color} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <SkillSwitcherSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onAddSkill={() => setSwitcherOpen(false)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall level — always shown */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.overallCard}
          onPress={() => navigation.navigate('StatDetail', { filters: [] })}
        >
          <Text style={styles.sectionLabel}>OVERALL LEVEL</Text>
          {overall && (
            <>
              <View style={styles.overallLevelRow}>
                <Text style={styles.overallLevelNumber}>{overall.level}</Text>
                <View style={styles.overallMeta}>
                  <ProgressBar progress={overall.progress} />
                  <Text style={styles.levelSubtext}>
                    {Math.round(overall.progress * 100)}% to level {overall.level + 1}
                  </Text>
                </View>
              </View>
              <QualityRow averages={overall.qualityAverages} />
            </>
          )}
        </TouchableOpacity>

        {/* Tracked levels */}
        <View style={styles.trackedCard}>
          <View style={styles.trackedHeader}>
            <Text style={styles.sectionLabel}>TRACKED</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SavedLevels')}
              style={styles.manageBtn}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {tracked.length === 0 ? (
            <Text style={styles.emptyTracked}>
              No tracked levels yet. Open Stats, set a filter, and tap the bookmark icon to save one.
            </Text>
          ) : (
            <View style={styles.trackedGrid}>
              {tracked.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  style={styles.trackedItem}
                  onPress={() => navigation.navigate('StatDetail', { filters: item.filters })}
                >
                  <Text style={styles.trackedName}>{item.name}</Text>
                  <Text style={styles.trackedLevel}>{item.level}</Text>
                  <ProgressBar progress={item.progress} />
                  <QualityRow averages={item.qualityAverages} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent sessions */}
        <Text style={styles.sectionTitle}>Recent sessions</Text>

        {sessions.length === 0 && (
          <Text style={styles.emptyLabel}>No sessions yet. Start one below!</Text>
        )}

        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            activeOpacity={0.7}
            style={styles.sessionCard}
            onPress={() => navigation.navigate('Session', { sessionId: session.id })}
          >
            <View style={styles.sessionCardLeft}>
              <Text style={styles.sessionCourse}>Session</Text>
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
          style={styles.newSessionBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SessionForm')}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  skillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  skillEmoji: { fontSize: 20 },
  appTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  chevron: { marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  // Overall card
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  overallLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  overallLevelNumber: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 56,
  },
  overallMeta: { flex: 1, gap: Spacing.xs },
  levelSubtext: { ...Typography.labelSm, color: Colors.textMuted },
  // Tracked card
  trackedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  trackedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  manageBtnText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  trackedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  trackedItem: {
    width: '45%',
    gap: 4,
  },
  trackedName: { ...Typography.labelSm, color: Colors.textMuted },
  trackedLevel: { ...Typography.title, color: Colors.text },
  emptyTracked: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
    lineHeight: 18,
  },
  // Sessions
  sectionTitle: {
    ...Typography.title,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  sessionCardLeft: { flex: 1, gap: 2 },
  sessionCourse: { ...Typography.body, fontWeight: '600', color: Colors.text },
  sessionMeta: { ...Typography.labelSm, color: Colors.textMuted },
  sessionDate: { ...Typography.label, color: Colors.textMuted },
  emptyLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  stickyBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  newSessionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  newSessionText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});
