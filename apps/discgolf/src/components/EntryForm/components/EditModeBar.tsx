import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, MIN_HIT, Radius, Spacing, Typography, hairline } from '../../../constants/theme';

interface Props {
  onSaveAsNew: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export function EditModeBar({ onSaveAsNew, onOverwrite, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelLabel}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onSaveAsNew} activeOpacity={0.7}>
        <Text style={styles.secondaryLabel}>Save as new</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryBtn} onPress={onOverwrite} activeOpacity={0.8}>
        <Text style={styles.primaryLabel}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
  },
  cancelLabel: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  secondaryBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  secondaryLabel: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryLabel: {
    ...Typography.body,
    color: Colors.background,
    fontWeight: '600',
  },
});
