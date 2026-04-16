import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  MIN_HIT,
  Radius,
  Spacing,
  Typography,
  hairline,
} from '../../../constants/theme';

interface HoleContext {
  holeNumber: number;
  distanceM: number;
  par: number;
  throwNumber: number;
}

interface Props {
  activeTab: 'before' | 'after';
  holeContext: HoleContext;
  onAction: () => void;
}

export function StickyBar({ activeTab, holeContext, onAction }: Props) {
  const { holeNumber, distanceM, par, throwNumber } = holeContext;
  const label = activeTab === 'before' ? 'Throw →' : 'Log throw';

  return (
    <View style={styles.container}>
      <Text style={styles.holeInfo}>
        {`Hole ${holeNumber} · ${distanceM}m · par ${par} · throw ${throwNumber}`}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onAction}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonLabel}>{label}</Text>
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
  },
  holeInfo: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
