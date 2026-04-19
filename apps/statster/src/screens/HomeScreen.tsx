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
import { MOCK_STATS } from './mockData';
import type { SessionSummary } from '../db/types';
import { getSessionsWithEntryCounts } from '../db/sessions';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SE', { month: 'short', day: 'numeric' });
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { flex: progress }]} />
      <View style={{ flex: 1 - progress }} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { activeSkill } = useSkill();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const overall = MOCK_STATS[0];
  const recentLevelUps = MOCK_STATS.filter((s) => s.recentLevelUp !== null && s.name !== 'Overall');

  const loadSessions = useCallback(() => {
    getSessionsWithEntryCounts().then(setSessions).catch(console.error);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    return navigation.addListener('focus', loadSessions);
  }, [navigation, loadSessions]);

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
        {/* Stats summary card */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.navigate('StatDetail')}
          style={styles.statsCard}
        >
          <Text style={styles.sectionLabel}>OVERALL LEVEL</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelNumber}>{overall.level}</Text>
            <View style={styles.levelMeta}>
              <ProgressBar progress={overall.progress} />
              <Text style={styles.levelSubtext}>
                {Math.round(overall.progress * 100)}% to level {overall.level + 1}
              </Text>
            </View>
          </View>

          {recentLevelUps.length > 0 && (
            <View style={styles.levelUpRow}>
              <Text style={styles.levelUpLabel}>Recent level-ups  </Text>
              {recentLevelUps.map((s) => (
                <View key={s.name} style={styles.levelUpChip}>
                  <Text style={styles.levelUpChipText}>
                    ↑ {s.name} {s.level}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.statsGrid}>
            {MOCK_STATS.slice(1).map((stat) => (
              <View key={stat.name} style={styles.statItem}>
                <Text style={styles.statName}>{stat.name}</Text>
                <Text style={styles.statLevel}>{stat.level}</Text>
                <ProgressBar progress={stat.progress} />
              </View>
            ))}
          </View>
        </TouchableOpacity>

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
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  skillEmoji: {
    fontSize: 20,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chevron: {
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  statsCard: {
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
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  levelNumber: {
    fontSize: 52,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 56,
  },
  levelMeta: {
    flex: 1,
    gap: Spacing.xs,
  },
  levelSubtext: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  levelUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelUpLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  levelUpChip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  levelUpChipText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  statItem: {
    width: '45%',
    gap: 4,
  },
  statName: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  statLevel: {
    ...Typography.title,
    color: Colors.text,
  },
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
  sessionCardLeft: {
    flex: 1,
    gap: 2,
  },
  sessionCourse: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  sessionMeta: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  sessionDate: {
    ...Typography.label,
    color: Colors.textMuted,
  },
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
  newSessionText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
