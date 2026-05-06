import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import {
  getNumberStats, getChoiceStats, getChoiceOptions,
  upsertNumberStat, upsertChoiceStat, upsertChoiceOption, archiveChoiceOption, deleteChoiceOption,
  archiveNumberStat, archiveChoiceStat,
} from '../db/parameters';
import { queryChoiceOptionUsageCounts } from '../db/queries';
import { getExerciseStats, saveExerciseLayout } from '../db/forms';
import { randomUUID } from 'expo-crypto';

type Props = NativeStackScreenProps<RootStackParamList, 'StatEditor'>;

type OptionEntry = { id: string; label: string; toArchive: boolean; isNew: boolean };
type OptionCount = Record<string, number>;

export function StatEditorScreen({ route, navigation }: Props) {
  const { statType, statId, addToExerciseId, initialName } = route.params;
  const insets = useSafeAreaInsets();
  const isNew = !statId;
  const savedStatId = useRef(statId ?? randomUUID());

  // Shared
  const [name, setName] = useState(initialName ?? '');

  // Number stat fields
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('100');
  const [step, setStep] = useState('1');
  const [majorStep, setMajorStep] = useState('10');
  const [unit, setUnit] = useState('');
  const [lblMin, setLblMin] = useState('');
  const [lblMax, setLblMax] = useState('');
  const [target, setTarget] = useState('');

  // Choice options
  const [options, setOptions] = useState<OptionEntry[]>([]);
  const [optionCounts, setOptionCounts] = useState<OptionCount>({});
  const [archivedOptionsExpanded, setArchivedOptionsExpanded] = useState(false);

  const handleArchive = useCallback(async () => {
    if (!statId) return;
    if (statType === 'scalar') await archiveNumberStat(statId);
    else await archiveChoiceStat(statId);
    navigation.goBack();
  }, [statId, statType, navigation]);

  const handleRename = useCallback(() => {
    Alert.prompt(
      isNew ? 'Name this stat' : 'Rename stat',
      undefined,
      (input) => {
        if (!input?.trim()) return;
        setName(input.trim());
      },
      'plain-text',
      name,
    );
  }, [isNew, name]);

  useEffect(() => {
    if (!statId) return;
    if (statType === 'scalar') {
      getNumberStats().then((stats) => {
        const s = stats.find((x) => x.id === statId);
        if (!s) return;
        setName(s.name);
        setMin(String(s.min));
        setMax(String(s.max));
        setStep(String(s.step));
        setMajorStep(String(s.majorStep));
        setUnit(s.unit ?? '');
        setLblMin(s.lblMin);
        setLblMax(s.lblMax);
        setTarget(s.target !== null ? String(s.target) : '');
      }).catch(console.error);
    } else {
      getChoiceStats().then((stats) => {
        const n = stats.find((x) => x.id === statId);
        if (n) setName(n.name);
      }).catch(console.error);
      Promise.all([getChoiceOptions(statId), queryChoiceOptionUsageCounts()]).then(([opts, counts]) => {
        setOptions(opts.map((o) => ({ id: o.id, label: o.label, toArchive: o.archivedAt !== null, isNew: false })));
        setOptionCounts(counts);
      }).catch(console.error);
    }
  }, [statId, statType]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }

    const id = savedStatId.current;

    if (statType === 'scalar') {
      const minN = parseFloat(min);
      const maxN = parseFloat(max);
      const stepN = parseFloat(step);
      const majorN = parseFloat(majorStep);

      if ([minN, maxN, stepN, majorN].some(isNaN)) {
        Alert.alert('Invalid', 'All numeric fields are required.');
        return;
      }
      if (minN >= maxN) {
        Alert.alert('Invalid', 'Min must be less than max.');
        return;
      }
      if (stepN <= 0 || majorN <= 0) {
        Alert.alert('Invalid', 'Step must be greater than 0.');
        return;
      }

      const targetN = target.trim() ? parseFloat(target.trim()) : null;
      if (target.trim() && isNaN(targetN!)) {
        Alert.alert('Invalid', 'Target must be a number.');
        return;
      }

      await upsertNumberStat({
        id,
        name: name.trim(),
        min: minN, max: maxN, step: stepN, majorStep: majorN,
        unit: unit.trim() || null,
        lblMin: lblMin.trim() || String(minN),
        lblMax: lblMax.trim() || String(maxN),
        target: targetN,
      });
    } else {
      await upsertChoiceStat({ id, name: name.trim() });

      let sortOrder = 0;
      for (const o of options) {
        if (o.toArchive) {
          if (!o.isNew) await archiveChoiceOption(o.id);
          continue;
        }
        await upsertChoiceOption({ id: o.id, statId: id, label: o.label, sortOrder: sortOrder++ });
      }
    }

    if (addToExerciseId) {
      const current = await getExerciseStats(addToExerciseId);
      await saveExerciseLayout(addToExerciseId, [
        ...current.map((s) => ({ type: s.statType, statId: s.statId, sortOrder: s.sortOrder, clearAfterSubmit: s.clearAfterSubmit })),
        { type: statType, statId: id, sortOrder: current.length, clearAfterSubmit: true },
      ]);
    }

    navigation.goBack();
  }, [name, statType, min, max, step, majorStep, unit, lblMin, lblMax, options, addToExerciseId, navigation]);

  const handleAddOption = useCallback(() => {
    Alert.prompt('New option', 'Enter a label', (label) => {
      if (!label?.trim()) return;
      setOptions((prev) => [...prev, { id: randomUUID(), label: label.trim(), toArchive: false, isNew: true }]);
    }, 'plain-text');
  }, []);

  const handleRenameOption = useCallback((idx: number) => {
    Alert.prompt('Rename option', undefined, (label) => {
      if (!label?.trim()) return;
      setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, label: label.trim() } : o));
    }, 'plain-text', options[idx]?.label);
  }, [options]);

  const handleRemoveOption = useCallback((idx: number) => {
    const opt = options[idx];
    if (opt.isNew) {
      setOptions((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, toArchive: true } : o));
    }
  }, [options]);

  const handleRestoreOption = useCallback((idx: number) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, toArchive: false } : o));
  }, []);

  const handleDeleteArchivedOption = useCallback((idx: number) => {
    const opt = options[idx];
    const count = optionCounts[opt.id] ?? 0;
    const msg = count > 0
      ? `Permanently delete "${opt.label}"? It has ${count} recorded ${count === 1 ? 'entry' : 'entries'} that will lose this label.`
      : `Permanently delete "${opt.label}"? This cannot be undone.`;
    Alert.alert('Delete option', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChoiceOption(opt.id);
          setOptions((prev) => prev.filter((_, i) => i !== idx));
        },
      },
    ]);
  }, [options, optionCounts]);

  const headerTitle = name.trim() || (statType === 'scalar' ? 'New Number Stat' : 'New Choice Stat');

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={headerTitle}
        onBack={() => navigation.goBack()}
        onTitlePress={handleRename}
        rightIcon={!isNew ? 'archive' : undefined}
        onRightPress={!isNew ? handleArchive : undefined}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        keyboardShouldPersistTaps="handled"
      >
        {statType === 'scalar' ? (
          <>
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Min</Text>
                <TextInput style={styles.input} value={min} onChangeText={setMin} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Max</Text>
                <TextInput style={styles.input} value={max} onChangeText={setMax} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Target</Text>
                <TextInput
                  style={styles.input}
                  value={target}
                  onChangeText={setTarget}
                  keyboardType="decimal-pad"
                  placeholder="opt."
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Step</Text>
                <TextInput style={styles.input} value={step} onChangeText={setStep} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Major step</Text>
                <TextInput style={styles.input} value={majorStep} onChangeText={setMajorStep} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Unit (optional)</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g. m, ft, kg"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Label min</Text>
                <TextInput
                  style={styles.input}
                  value={lblMin}
                  onChangeText={setLblMin}
                  placeholder={min || '0'}
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.fieldLabel}>Label max</Text>
                <TextInput
                  style={styles.input}
                  value={lblMax}
                  onChangeText={setLblMax}
                  placeholder={max || '100'}
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </View>
          </>
        ) : (
          <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Options</Text>
            <View style={styles.optionsCard}>
              {options
                .map((opt, idx) => ({ opt, idx }))
                .filter(({ opt }) => !opt.toArchive)
                .map(({ opt, idx }, i) =>
                  (
                  <View key={opt.id} style={[styles.optRow, i > 0 && styles.optRowBorder]}>
                    <TouchableOpacity style={styles.optLabelBtn} onPress={() => handleRenameOption(idx)} activeOpacity={0.7}>
                      <Text style={styles.optLabelText}>{opt.label}</Text>
                    </TouchableOpacity>
                    {!opt.isNew && (optionCounts[opt.id] ?? 0) > 0 && (
                      <Text style={styles.optCount}>{optionCounts[opt.id]}</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveOption(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="archive" size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ),
              )}
              <TouchableOpacity style={styles.addOptBtn} onPress={handleAddOption} activeOpacity={0.7}>
                <Feather name="plus" size={14} color={Colors.primary} />
                <Text style={styles.addOptText}>Add option</Text>
              </TouchableOpacity>
            </View>
          </View>

          {options.some((o) => o.toArchive && !o.isNew) && (
            <View style={styles.fieldGroup}>
              <TouchableOpacity
                style={styles.archivedOptHeader}
                onPress={() => setArchivedOptionsExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.fieldLabel}>
                  ARCHIVED ({options.filter((o) => o.toArchive && !o.isNew).length})
                </Text>
                <Feather name={archivedOptionsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              {archivedOptionsExpanded && (
                <View style={styles.optionsCard}>
                  {options
                    .map((opt, idx) => ({ opt, idx }))
                    .filter(({ opt }) => opt.toArchive && !opt.isNew)
                    .map(({ opt, idx }, i) => (
                      <View key={opt.id} style={[styles.optRow, i > 0 && styles.optRowBorder]}>
                        <Text style={[styles.optLabelText, styles.optArchivedText]}>{opt.label}</Text>
                        {(optionCounts[opt.id] ?? 0) > 0 && (
                          <Text style={styles.optCount}>{optionCounts[opt.id]}</Text>
                        )}
                        <TouchableOpacity
                          onPress={() => handleRestoreOption(idx)}
                          style={styles.restoreOptBtn}
                        >
                          <Text style={styles.restoreOptText}>Restore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteArchivedOption(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="trash-2" size={14} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  flex1: { flex: 1 },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  row2: { flexDirection: 'row', gap: Spacing.md },
  // Choice options
  archivedOptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionsCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  optRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  optRowBorder: { borderTopWidth: hairline, borderTopColor: Colors.separator },
  optLabelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  optLabelText: { ...Typography.body, color: Colors.text },
  addOptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderTopWidth: hairline, borderTopColor: Colors.separator,
  },
  addOptText: { ...Typography.label, color: Colors.primary },
  optCount: { ...Typography.labelSm, color: Colors.textDisabled },
  optArchivedText: { color: Colors.textDisabled, flex: 1 },
  restoreOptBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: hairline, borderColor: Colors.separator,
  },
  restoreOptText: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' as const },
  // Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },
});
