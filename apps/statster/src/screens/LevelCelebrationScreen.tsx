import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { useInterest } from '../contexts/InterestContext';
import { getLevels } from '../db/levels';
import { queryEntries, queryEntryCountByExercise } from '../db/queries';
import { computeLevel } from '../utils/levels';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelCelebration'>;

export function LevelCelebrationScreen({ navigation, route }: Props) {
  const { levelId, exerciseId, exerciseName: exerciseNameParam } = route.params;
  const insets = useSafeAreaInsets();
  const { activeInterest } = useInterest();
  const color = activeInterest?.color ?? Colors.primary;

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [filterChips, setFilterChips] = useState<string[]>([]);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [displayLevel, setDisplayLevel] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      if (levelId) {
        const levels = await getLevels();
        const found = levels.find((l) => l.id === levelId);
        if (!found) return;
        setDisplayName(found.name);
        setFilterChips(found.filters.map((f) => f.optionLabel));
        const entries = await queryEntries({
          choiceFilters: found.filters.map((f) => ({ statId: f.statId, optionIds: [f.optionId] })),
        });
        setEntryCount(entries.length);
      } else if (exerciseId) {
        setDisplayName(exerciseNameParam ?? '');
        const counts = await queryEntryCountByExercise();
        setEntryCount(counts[exerciseId] ?? 0);
      }
    }
    load().catch(console.error);
  }, [levelId, exerciseId, exerciseNameParam]);

  useEffect(() => {
    if (entryCount === null) return;
    const { level: targetLvl, progress } = computeLevel(entryCount);

    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();

    const countAnim = new Animated.Value(0);
    const listenerId = countAnim.addListener(({ value }) => setDisplayLevel(Math.round(value)));

    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(countAnim, {
          toValue: targetLvl,
          duration: Math.min(1000, Math.max(400, targetLvl * 180)),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      setDisplayLevel(targetLvl);
      countAnim.removeListener(listenerId);
    });

    return () => countAnim.removeAllListeners();
  }, [entryCount]);

  const computed = entryCount !== null ? computeLevel(entryCount) : null;

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
        {/* Glow rings */}
        <View style={[styles.glowOuter, { backgroundColor: color + '0B' }]}>
          <View style={[styles.glowMiddle, { backgroundColor: color + '14' }]}>
            <View style={[styles.glowInner, { backgroundColor: color + '1E' }]}>
              <Ionicons name="star" size={26} color={color} />
              <Text style={styles.levelLabel}>LEVEL</Text>
              <Text style={[styles.levelNumber, { color }]}>{displayLevel}</Text>
            </View>
          </View>
        </View>

        {/* Name */}
        {displayName && (
          <Text style={styles.levelName}>{displayName}</Text>
        )}

        {/* Filter chips */}
        {filterChips.length > 0 && (
          <View style={styles.chipRow}>
            {filterChips.map((label) => (
              <View key={label} style={[styles.chip, { backgroundColor: color + '18', borderColor: color + '38' }]}>
                <Text style={[styles.chipText, { color }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress */}
        {computed !== null && entryCount !== null && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: barWidth, backgroundColor: color }]} />
            </View>
            <Text style={styles.progressLabel}>
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              {computed.isMax
                ? ' · Max level!'
                : ` · ${computed.toNext} to level ${computed.level + 1}`}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnSecondaryText}>← Back to stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Levels')}
        >
          <Text style={styles.btnPrimaryText}>See all levels →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  glowOuter: { width: 248, height: 248, borderRadius: 124, alignItems: 'center', justifyContent: 'center' },
  glowMiddle: { width: 196, height: 196, borderRadius: 98, alignItems: 'center', justifyContent: 'center' },
  glowInner: { width: 152, height: 152, borderRadius: 76, alignItems: 'center', justifyContent: 'center', gap: 2 },
  levelLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
  },
  levelNumber: { fontSize: 72, fontWeight: '800', lineHeight: 80 },
  levelName: { ...Typography.title, color: Colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  chip: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1 },
  chipText: { ...Typography.labelSm, fontWeight: '600' },
  progressSection: { width: '100%', gap: Spacing.sm, paddingTop: Spacing.sm },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.separator, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { ...Typography.labelSm, color: Colors.textMuted, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  btn: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  btnSecondary: { backgroundColor: Colors.surface },
  btnSecondaryText: { ...Typography.body, color: Colors.text, fontWeight: '600' },
  btnPrimaryText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});
