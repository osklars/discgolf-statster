import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getSavedLevels, deleteSavedLevel, reorderSavedLevels } from '../db/savedLevels';
import type { SavedLevel } from '../db/savedLevels';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedLevels'>;

export function SavedLevelsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [levels, setLevels] = useState<SavedLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getSavedLevels();
    setLevels(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const move = async (index: number, direction: 'up' | 'down') => {
    const next = [...levels];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setLevels(next);
    await reorderSavedLevels(next.map((l) => l.id));
  };

  const remove = async (id: string) => {
    const next = levels.filter((l) => l.id !== id);
    setLevels(next);
    await deleteSavedLevel(id);
    await reorderSavedLevels(next.map((l) => l.id));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + Spacing.lg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          The top 4 saved levels appear on the home screen. Reorder to choose which ones show.
        </Text>

        {levels.map((level, index) => (
          <TouchableOpacity
            key={level.id}
            activeOpacity={0.7}
            style={[styles.row, index === 0 && styles.rowFirst]}
            onPress={() =>
              navigation.navigate('StatDetail', { filters: level.filters })
            }
          >
            <View style={styles.rowIndex}>
              <Text style={[styles.rowIndexText, index < 4 && styles.rowIndexActive]}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{level.name}</Text>
              {level.filters.length > 0 ? (
                <View style={styles.filterTags}>
                  {level.filters.map((f) => (
                    <View key={f.parameterId} style={styles.filterTag}>
                      <Text style={styles.filterTagText}>{f.paramName}: {f.optionLabel}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.rowSubtext}>All entries</Text>
              )}
            </View>

            <View style={styles.rowActions}>
              <TouchableOpacity
                style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]}
                onPress={() => move(index, 'up')}
                disabled={index === 0}
              >
                <Feather name="chevron-up" size={18} color={index === 0 ? Colors.textDisabled : Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, index === levels.length - 1 && styles.iconBtnDisabled]}
                onPress={() => move(index, 'down')}
                disabled={index === levels.length - 1}
              >
                <Feather name="chevron-down" size={18} color={index === levels.length - 1 ? Colors.textDisabled : Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => remove(level.id)}>
                <Feather name="trash-2" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {levels.length === 0 && (
          <Text style={styles.emptyText}>
            No saved levels yet. Open Stats, set filters, and tap the bookmark icon to save a level.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
  hint: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    minHeight: MIN_HIT,
    gap: Spacing.sm,
  },
  rowFirst: {},
  rowIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIndexText: { ...Typography.labelSm, color: Colors.textDisabled, fontWeight: '700' },
  rowIndexActive: { color: Colors.primary },
  rowBody: { flex: 1, gap: 3 },
  rowName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  rowSubtext: { ...Typography.labelSm, color: Colors.textMuted },
  filterTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filterTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
  },
  filterTagText: { ...Typography.labelSm, color: Colors.primary, fontSize: 11 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: Spacing.xs, minWidth: 32, alignItems: 'center' },
  iconBtnDisabled: {},
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: Spacing.xl,
    lineHeight: 22,
  },
});
