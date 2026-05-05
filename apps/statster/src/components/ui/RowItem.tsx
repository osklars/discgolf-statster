import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';

interface Props {
  title: string;
  meta?: string;
  dimmed?: boolean;
  count?: number;
  showChevron?: boolean;
  onPress?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  bordered?: boolean;
}

export function RowItem({
  title, meta, dimmed, count, showChevron,
  onPress, onRestore, onDelete, bordered,
}: Props) {
  const inner = (
    <>
      <View style={styles.body}>
        <Text style={[styles.title, dimmed && styles.dimmedTitle]} numberOfLines={1}>{title}</Text>
        {meta != null && <Text style={styles.meta}>{meta}</Text>}
      </View>

      {count != null && count > 0 && (
        <Text style={styles.count}>{count}</Text>
      )}

      {onRestore != null && (
        <TouchableOpacity onPress={onRestore} style={styles.restoreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      )}

      {onDelete != null && (
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={15} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {showChevron === true && (
        <Feather name="chevron-right" size={16} color={Colors.textDisabled} />
      )}
    </>
  );

  const rowStyle = [styles.row, bordered === true && styles.bordered];

  if (onPress != null) {
    return (
      <TouchableOpacity style={rowStyle} onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={rowStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  bordered: { borderTopWidth: hairline, borderTopColor: Colors.separator },
  body: { flex: 1, gap: 1 },
  title: { ...Typography.body, color: Colors.text },
  dimmedTitle: { color: Colors.textDisabled },
  meta: { ...Typography.labelSm, color: Colors.textMuted },
  count: { ...Typography.labelSm, color: Colors.textDisabled },
  restoreBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  restoreText: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' as const },
});
