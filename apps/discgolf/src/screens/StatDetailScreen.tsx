import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { MOCK_STATS } from './mockData';

type Props = NativeStackScreenProps<RootStackParamList, 'StatDetail'>;

function ProgressBar({ progress, height = 6 }: { progress: number; height?: number }) {
  return (
    <View style={[bar.track, { height, borderRadius: height / 2 }]}>
      <View style={[bar.fill, { flex: progress }]} />
      <View style={{ flex: 1 - progress }} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: Colors.primary,
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StatDetailScreen(_props: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {MOCK_STATS.map((stat, i) => (
        <View key={stat.name} style={[styles.card, i === 0 && styles.cardFirst]}>
          <View style={styles.cardHeader}>
            <Text style={styles.statName}>{stat.name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv {stat.level}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <ProgressBar progress={stat.progress} height={8} />
            <Text style={styles.progressLabel}>
              {Math.round(stat.progress * 100)}% to level {stat.level + 1}
            </Text>
          </View>

          {stat.recentLevelUp && (
            <View style={styles.levelUpRow}>
              <Text style={styles.levelUpText}>↑ Leveled up {stat.recentLevelUp}</Text>
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.placeholderChart}>
            <Text style={styles.placeholderText}>Chart coming soon</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardFirst: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statName: {
    ...Typography.title,
    color: Colors.text,
  },
  levelBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  levelBadgeText: {
    ...Typography.labelSm,
    color: '#fff',
    fontWeight: '700',
  },
  progressRow: {
    gap: Spacing.xs,
  },
  progressLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  levelUpRow: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  levelUpText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '600',
  },
  separator: {
    height: hairline,
    backgroundColor: Colors.separator,
  },
  placeholderChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...Typography.label,
    color: Colors.textDisabled,
  },
});
