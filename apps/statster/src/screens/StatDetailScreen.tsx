import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { Colors, MIN_HIT, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { getNamedParameters, getAllNamedOptions } from '../db/parameters';
import { getXpWithFilters, xpToLevel, levelThreshold } from '../db/xp';

type Props = NativeStackScreenProps<RootStackParamList, 'StatDetail'>;

type FilterChip = {
  parameterId: string;
  paramName: string;
  optionId: string;
  optionLabel: string;
};

type NamedParamOption = { id: string; label: string };
type NamedParamGroup = { id: string; name: string; options: NamedParamOption[] };

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { flex: clamped }]} />
      <View style={{ flex: 1 - clamped }} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  fill: { backgroundColor: Colors.primary, borderRadius: 4 },
});

export function StatDetailScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [paramGroups, setParamGroups] = useState<NamedParamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Load named param options for the picker once
  useEffect(() => {
    async function loadParams() {
      const [params, options] = await Promise.all([getNamedParameters(), getAllNamedOptions()]);
      const groups: NamedParamGroup[] = params
        .map((p) => ({
          id: p.id,
          name: p.name,
          options: options
            .filter((o) => o.parameterId === p.id && o.archivedAt === null)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((o) => ({ id: o.id, label: o.label })),
        }))
        .filter((g) => g.options.length > 0);
      setParamGroups(groups);
    }
    loadParams().catch(console.error);
  }, []);

  // Re-query XP whenever filters change
  const reloadXp = useCallback(async (activeFilters: FilterChip[]) => {
    setLoading(true);
    const result = await getXpWithFilters(
      activeFilters.map((f) => ({ parameterId: f.parameterId, optionId: f.optionId })),
    );
    setTotalXp(result.totalXp);
    setEntryCount(result.entryCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadXp(filters);
  }, [filters, reloadXp]);

  const addFilter = (chip: FilterChip) => {
    setFilters((prev) => {
      // Replace existing filter for same param
      const without = prev.filter((f) => f.parameterId !== chip.parameterId);
      return [...without, chip];
    });
    setPickerVisible(false);
  };

  const removeFilter = (parameterId: string) => {
    setFilters((prev) => prev.filter((f) => f.parameterId !== parameterId));
  };

  const levelInfo = xpToLevel(totalXp);

  // Which params are already filtered (to show as active in picker)
  const activeParamIds = new Set(filters.map((f) => f.parameterId));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        <View style={styles.scopeLabel}>
          <Text style={styles.scopeLabelText}>
            {filters.length === 0 ? 'Overall' : filters.map((f) => f.optionLabel).join(' + ')}
          </Text>
        </View>

        {filters.map((f) => (
          <View key={f.parameterId} style={styles.chip}>
            <Text style={styles.chipText}>{f.paramName}: {f.optionLabel}</Text>
            <TouchableOpacity onPress={() => removeFilter(f.parameterId)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Feather name="x" size={12} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addChip} onPress={() => setPickerVisible(true)}>
          <Feather name="plus" size={14} color={Colors.textMuted} />
          <Text style={styles.addChipText}>Filter</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Level card */}
        <View style={styles.levelCard}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Text style={styles.levelLabel}>LEVEL</Text>
              <Text style={styles.levelNumber}>{levelInfo.level}</Text>

              <ProgressBar progress={levelInfo.progress} />

              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{levelInfo.xpInLevel} XP</Text>
                <Text style={styles.xpMuted}>{levelInfo.xpForNext} XP to level {levelInfo.level + 1}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalXp}</Text>
                  <Text style={styles.statLabel}>Total XP</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{entryCount}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {entryCount > 0 ? Math.round(totalXp / entryCount) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Avg XP</Text>
                </View>
              </View>

              {/* Level thresholds hint */}
              <View style={styles.thresholdRow}>
                {[1, 2, 3, 5, 10].map((n) => (
                  <View key={n} style={styles.thresholdItem}>
                    <Text style={[styles.thresholdLevel, levelInfo.level >= n && styles.thresholdLevelReached]}>
                      Lv {n}
                    </Text>
                    <Text style={styles.thresholdXp}>{(levelThreshold(n) / 1000).toFixed(1)}k</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Add filter picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add filter</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {paramGroups.map((group) => (
              <View key={group.id} style={styles.paramGroup}>
                <Text style={styles.paramGroupName}>{group.name}</Text>
                <View style={styles.optionList}>
                  {group.options.map((opt) => {
                    const isActive = filters.some(
                      (f) => f.parameterId === group.id && f.optionId === opt.id,
                    );
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionRow, isActive && styles.optionRowActive]}
                        onPress={() =>
                          addFilter({
                            parameterId: group.id,
                            paramName: group.name,
                            optionId: opt.id,
                            optionLabel: opt.label,
                          })
                        }
                      >
                        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                          {opt.label}
                        </Text>
                        {isActive && <Feather name="check" size={14} color={Colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {paramGroups.length === 0 && (
              <Text style={styles.emptyText}>No named parameters found. Log some throws first.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  chipScroll: { flexGrow: 0, borderBottomWidth: hairline, borderBottomColor: Colors.separator },
  chipContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
  },
  scopeLabel: { marginRight: Spacing.xs },
  scopeLabelText: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  chipText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  addChipText: { ...Typography.labelSm, color: Colors.textMuted },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
  levelCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 180,
    justifyContent: 'center',
  },
  levelLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  levelNumber: { fontSize: 72, fontWeight: '800', color: Colors.primary, lineHeight: 80 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpText: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  xpMuted: { ...Typography.labelSm, color: Colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    paddingTop: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...Typography.title, color: Colors.text },
  statLabel: { ...Typography.labelSm, color: Colors.textMuted },
  statDivider: { width: hairline, alignSelf: 'stretch', backgroundColor: Colors.separator },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    paddingTop: Spacing.sm,
  },
  thresholdItem: { alignItems: 'center', gap: 2 },
  thresholdLevel: { ...Typography.labelSm, color: Colors.textDisabled, fontWeight: '600' },
  thresholdLevelReached: { color: Colors.primary },
  thresholdXp: { ...Typography.labelSm, color: Colors.textDisabled, fontSize: 10 },
  // Modal
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  modalTitle: { ...Typography.title, color: Colors.text },
  modalContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xl },
  paramGroup: { gap: Spacing.sm },
  paramGroupName: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionList: { gap: 2 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    minHeight: MIN_HIT,
  },
  optionRowActive: { backgroundColor: Colors.primaryLight },
  optionLabel: { ...Typography.body, color: Colors.text },
  optionLabelActive: { color: Colors.primary, fontWeight: '600' },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', paddingTop: Spacing.xl },
});
