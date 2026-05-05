import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Colors, Spacing, Typography, hairline } from '../../constants/theme';

interface Props {
  title: string;
  onBack: () => void;
  onTitlePress?: () => void;
  rightIcon?: ComponentProps<typeof Feather>['name'];
  onRightPress?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, onTitlePress, rightIcon, onRightPress, rightElement }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="chevron-left" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {onTitlePress ? (
        <TouchableOpacity style={styles.titleBtn} onPress={onTitlePress} activeOpacity={0.7}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.title, styles.titleStatic]} numberOfLines={1}>{title}</Text>
      )}

      <View style={styles.rightSlot}>
        {rightElement ?? (
          rightIcon != null && onRightPress != null ? (
            <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name={rightIcon} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
    gap: Spacing.lg,
  },
  backBtn: { padding: Spacing.sm },
  titleBtn: { flex: 1 },
  titleStatic: { flex: 1 },
  title: { ...Typography.title, color: Colors.text, flexShrink: 1 },
  rightSlot: { minWidth: 34, alignItems: 'flex-end', paddingHorizontal: Spacing.lg },
});
