import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, HIT_SLOP, Spacing, Typography, hairline } from '../../../constants/theme';
import type { CombinePending } from '../hooks/useEditForm';
import type { Param } from '../types';

interface Props {
  param: Param;
  isFirst: boolean;
  isLast: boolean;
  combinePending: CombinePending;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onOpenSettings: () => void;
  onStartCombine: () => void;
  // Called on the TARGET row; sourceAsX=true means pending source → X, this row → Y
  onCommitCombine: (sourceAsX: boolean) => void;
  onSplit: () => void;
}

const TYPE_LABELS: Record<Param['type'], string> = {
  scalar: 'scalar',
  named: 'named',
  grid2d: '2D',
};

export function EditParamRow({
  param,
  isFirst,
  isLast,
  combinePending,
  onMoveUp,
  onMoveDown,
  onRemove,
  onOpenSettings,
  onStartCombine,
  onCommitCombine,
  onSplit,
}: Props) {
  const isPendingSource = combinePending?.sourceId === param.id;
  const isCombineTarget =
    combinePending !== null &&
    combinePending.sourceId !== param.id &&
    param.type === 'scalar';

  return (
    <View style={styles.outer}>
      <View style={[styles.row, isPendingSource && styles.rowPending]}>
        {/* Reorder arrows */}
        <View style={styles.arrows}>
          <TouchableOpacity onPress={onMoveUp} disabled={isFirst} hitSlop={HIT_SLOP}>
            <Text style={[styles.arrow, isFirst && styles.arrowDisabled]}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown} disabled={isLast} hitSlop={HIT_SLOP}>
            <Text style={[styles.arrow, isLast && styles.arrowDisabled]}>↓</Text>
          </TouchableOpacity>
        </View>

        {/* Name + type badge */}
        <View style={styles.nameArea}>
          <Text style={styles.nameText} numberOfLines={1}>
            {param.name}
          </Text>
          <Text style={styles.typeBadge}>{TYPE_LABELS[param.type]}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {param.type === 'scalar' && (
            <TouchableOpacity
              onPress={onStartCombine}
              hitSlop={HIT_SLOP}
              style={[styles.actionBtn, isPendingSource && styles.actionBtnActive]}
            >
              <Text style={[styles.actionIcon, isPendingSource && styles.actionIconActive]}>⊕</Text>
            </TouchableOpacity>
          )}
          {param.type === 'grid2d' && (
            <TouchableOpacity onPress={onSplit} hitSlop={HIT_SLOP} style={styles.actionBtn}>
              <Text style={styles.actionIcon}>⊖</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onOpenSettings} hitSlop={HIT_SLOP} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} hitSlop={HIT_SLOP} style={styles.actionBtn}>
            <Text style={[styles.actionIcon, styles.removeIcon]}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Combine drop zones — shown below when this row is a valid target */}
      {isCombineTarget && (
        <View style={styles.combineZones}>
          <TouchableOpacity
            style={styles.combineZone}
            onPress={() => onCommitCombine(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.combineLabel}>← X-axis</Text>
          </TouchableOpacity>
          <View style={styles.combineDivider} />
          <TouchableOpacity
            style={styles.combineZone}
            onPress={() => onCommitCombine(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.combineLabel}>Y-axis →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.background,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    minHeight: 48,
  },
  rowPending: {
    backgroundColor: Colors.primaryLight,
  },
  arrows: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: Spacing.sm,
    gap: 2,
  },
  arrow: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  arrowDisabled: {
    color: Colors.textDisabled,
  },
  nameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  nameText: {
    ...Typography.body,
    color: Colors.text,
    flexShrink: 1,
  },
  typeBadge: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
  },
  actionIcon: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  actionIconActive: {
    color: Colors.primary,
  },
  removeIcon: {
    color: '#EF4444',
    fontSize: 20,
  },
  combineZones: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderTopWidth: hairline,
    borderTopColor: Colors.primaryBorder,
    height: 36,
  },
  combineZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combineDivider: {
    width: hairline,
    backgroundColor: Colors.primaryBorder,
    alignSelf: 'stretch',
  },
  combineLabel: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
});
