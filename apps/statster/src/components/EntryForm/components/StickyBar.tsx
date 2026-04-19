import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, MIN_HIT, Radius, Spacing, Typography, hairline } from '../../../constants/theme';

interface Props {
  entryCount: number;
  onAction: () => void;
}

export function StickyBar({ entryCount, onAction }: Props) {
  return (
    <View style={styles.container}>
      {entryCount > 0 && (
        <Text style={styles.countLabel}>{entryCount} logged this session</Text>
      )}
      <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
        <Text style={styles.buttonLabel}>Log throw</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  countLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
    paddingVertical: Spacing.md,
  },
  buttonLabel: {
    ...Typography.body,
    color: Colors.background,
    fontWeight: '600',
  },
});
