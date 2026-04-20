import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, MIN_HIT, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { getNamedParameters, getAllNamedOptions } from '../db/parameters';
import { getLevelSummary, xpToLevel, levelThreshold } from '../db/xp';
import type { QualityAverage } from '../db/xp';
import { insertSavedLevel } from '../db/savedLevels';
import type { SavedLevelFilter } from '../db/savedLevels';

type Props = NativeStackScreenProps<RootStackParamList, 'StatDetail'>;

type FilterChip = SavedLevelFilter;

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

export function StatDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const initialFilters = route.params?.filters ?? [];
  const [filters, setFilters] = useState<FilterChip[]>(initialFilters);
  const [totalXp, setTotalXp] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [qualityAverages, setQualityAverages] = useState<QualityAverage[]>([]);
  const [paramGroups, setParamGroups] = useState<NamedParamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            const defaultName =
              filters.length === 0
                ? 'Overall'
                : filters.map((f) => f.optionLabel).join(' + ');
            setSaveName(defaultName);
            setSaveVisible(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bookmark" size={20} color={Colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, filters]);

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

  const reload = useCallback(async (activeFilters: FilterChip[]) => {
    setLoading(true);
    const result = await getLevelSummary(
      activeFilters.map((f) => ({ parameterId: f.parameterId, optionId: f.optionId })),
    );
    setTotalXp(result.totalXp);
    setEntryCount(result.entryCount);
    setQualityAverages(result.qualityAverages);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload(filters);
  }, [filters, reload]);

  const addFilter = (chip: FilterChip) => {
    setFilters((prev) => {
      const without = prev.filter((f) => f.parameterId !== chip.parameterId);
      return [...without, chip];
    });
    setPickerVisible(false);
  };

  const removeFilter = (parameterId: string) => {
    setFilters((prev) => prev.filter((f) => f.parameterId !== parameterId));
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    await insertSavedLevel(saveName.trim(), filters);
    setSaving(false);
    setSaveVisible(false);
  };

  const levelInfo = xpToLevel(totalXp);

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

        {/* Quality averages card */}
        {!loading && qualityAverages.length > 0 && (
          <View style={styles.qualityCard}>
            <Text style={styles.qualityTitle}>QUALITY AVERAGES</Text>
            {qualityAverages.map((qa) => {
              const isMaxTarget = qa.target === qa.max || qa.target === qa.min;
              const displayValue = isMaxTarget
                ? `${qa.avgValue.toFixed(1)} / ${qa.target}`
                : `${qa.avgValue >= 0 ? '+' : ''}${qa.avgValue.toFixed(1)}`;
              const delta = qa.avgValue - qa.target;
              const maxDist = Math.max(qa.target - qa.min, qa.max - qa.target);
              const weight = maxDist === 0 ? 2 : 2 - 1.5 * (Math.abs(delta) / maxDist);
              const quality = (weight - 0.5) / 1.5;
              const qualityColor =
                quality >= 0.75 ? Colors.primary : quality >= 0.45 ? '#F59E0B' : '#EF4444';
              const barFill = Math.min(1, Math.max(0, (qa.avgValue - qa.min) / (qa.max - qa.min)));
              return (
                <View key={qa.paramId} style={styles.qualityRow}>
                  <Text style={styles.qualityName}>{qa.name}</Text>
                  <View style={styles.qualityBarWrap}>
                    <View style={styles.qualityBarTrack}>
                      <View style={[styles.qualityBarFill, { flex: barFill, backgroundColor: qualityColor }]} />
                      <View style={{ flex: 1 - barFill }} />
                    </View>
                  </View>
                  <Text style={[styles.qualityValue, { color: qualityColor }]}>{displayValue}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter picker modal */}
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

      {/* Save level modal */}
      <Modal
        visible={saveVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSaveVisible(false)}
      >
        <View style={styles.saveOverlay}>
          <View style={styles.saveSheet}>
            <Text style={styles.saveTitle}>Save level</Text>
            <Text style={styles.saveSubtitle}>
              {filters.length === 0 ? 'Overall (no filters)' : filters.map((f) => `${f.paramName}: ${f.optionLabel}`).join(', ')}
            </Text>
            <TextInput
              style={styles.saveInput}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="Name"
              placeholderTextColor={Colors.textDisabled}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.saveActions}>
              <TouchableOpacity style={styles.saveCancelBtn} onPress={() => setSaveVisible(false)}>
                <Text style={styles.saveCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveConfirmBtn, !saveName.trim() && styles.saveConfirmDisabled]}
                onPress={handleSave}
                disabled={!saveName.trim() || saving}
              >
                <Text style={styles.saveConfirmText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  // Filter picker modal
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
  // Save modal
  saveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  saveSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  saveTitle: { ...Typography.title, color: Colors.text },
  saveSubtitle: { ...Typography.labelSm, color: Colors.textMuted },
  saveInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  saveActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  saveCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  saveCancelText: { ...Typography.body, color: Colors.textMuted },
  saveConfirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  saveConfirmDisabled: { opacity: 0.4 },
  saveConfirmText: { ...Typography.body, color: '#fff', fontWeight: '700' },
  // Quality averages card
  qualityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  qualityTitle: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qualityName: { ...Typography.label, color: Colors.text, width: 110 },
  qualityBarWrap: { flex: 1 },
  qualityBarTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  qualityBarFill: { borderRadius: 3 },
  qualityValue: { ...Typography.label, fontWeight: '600', width: 64, textAlign: 'right' },
});
