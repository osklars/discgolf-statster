import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  Radius,
  Spacing,
  Typography,
  hairline,
} from '../../../../constants/theme';

interface Disc {
  id: string;
  label: string;
  subLabel: string;
}

interface Props {
  discs: Disc[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

export function DiscPicker({ discs, selectedId, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {discs.map((disc) => {
        const selected = disc.id === selectedId;
        return (
          <TouchableOpacity
            key={disc.id}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onSelect(disc.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {disc.label}
            </Text>
            <Text style={[styles.subLabel, selected && styles.subLabelSelected]} numberOfLines={1}>
              {disc.subLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    width: '22%',
    flexGrow: 1,
    borderWidth: hairline,
    borderColor: Colors.separator,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    backgroundColor: Colors.background,
    minHeight: 52,
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  label: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.primary,
  },
  subLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  subLabelSelected: {
    color: Colors.primaryBorder,
  },
});
