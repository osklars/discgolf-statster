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
import type { Level } from '../db/levels';
import { queryEntries } from '../db/queries';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type TrackedItem = Level & { entryCount: number };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SE', { month: 'short', day: 'numeric' });
}


export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeInterest, addInterest } = useInterest();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [overallCount, setOverallCount] = useState<number | null>(null);
  const [tracked, setTracked] = useState<TrackedItem[]>([]);

  const loadData = useCallback(async () => {
    const [allEntries, levels, sessionList] = await Promise.all([
      queryEntries({}),
      getLevels(),
      getSessionsWithEntryCounts(),
    ]);

    const top4 = levels.slice(0, 4);
    const counts = await Promise.all(
      top4.map((level) =>
        queryEntries({
          choiceFilters: level.filters.map((f) => ({ statId: f.statId, optionIds: [f.optionId] })),
        }).then((entries) => entries.length),
      ),
    );

    setOverallCount(allEntries.length);
    setTracked(top4.map((level, i) => ({ ...level, entryCount: counts[i] })));
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
          style={styles.interestButton}
          onPress={() => setSwitcherOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.interestEmoji}>{activeInterest.emoji}</Text>
          <Text style={[styles.appTitle, { color: activeInterest.color }]}>{activeInterest.name}</Text>
          <Feather name="chevron-down" size={18} color={activeInterest.color} style={styles.chevron} />
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
          Alert.prompt(
            'New interest',
            'Enter a name (e.g. "Guitar", "Gym")',
            async (name) => {
              if (!name?.trim()) return;
              await addInterest({ name: name.trim(), emoji: '🏆', color: '#0C447C' });
            },
            'plain-text',
          );
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall — always shown */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.overallCard}
          onPress={() => navigation.navigate('StatDetail', { filters: [] })}
        >
          <Text style={styles.sectionLabel}>OVERALL</Text>
          <Text style={styles.overallCount}>
            {overallCount !== null ? overallCount : '—'}
          </Text>
          <Text style={styles.levelSubtext}>total entries</Text>
        </TouchableOpacity>

        {/* Tracked levels */}
        <View style={styles.trackedCard}>
          <View style={styles.trackedHeader}>
            <Text style={styles.sectionLabel}>TRACKED</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Levels')}
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
                  <Text style={styles.trackedLevel}>{item.entryCount}</Text>
                  <Text style={styles.levelSubtext}>entries</Text>
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
            onPress={() => navigation.navigate('UnifiedSession', { sessionId: session.id })}
          >
            <View style={styles.sessionCardLeft}>
              <Text style={styles.sessionCourse}>{session.name ?? 'Session'}</Text>
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
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  interestEmoji: { fontSize: 20 },
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
  overallCount: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 56,
  },
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
