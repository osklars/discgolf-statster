import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  MIN_HIT,
  Radius,
  Spacing,
  Typography,
  hairline,
} from '../../../../constants/theme';

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

export function PillPicker({ options, selectedId, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const selected = opt.id === selectedId;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pill: {
    borderWidth: hairline,
    borderColor: Colors.separator,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: MIN_HIT,
    backgroundColor: Colors.background,
  },
  pillSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  label: {
    ...Typography.label,
    color: Colors.text,
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
