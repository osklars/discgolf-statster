import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';

export type FeedEntry = {
  id: string;
  formId: string;
  formName: string;
  entryNumber: number;
  loggedAt: string;
  scalars: { name: string; parameterId: string; value: number; unit: string | null }[];
  named: { name: string; parameterId: string; label: string; optionId: string }[];
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function scalarChip(name: string, value: number, unit: string | null): string {
  if (unit) return `${value}${unit}`;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('');
  return `${initials}${value}`;
}

export function EntryCard({ entry, onPress }: { entry: FeedEntry; onPress: () => void }) {
  const chips = [
    ...entry.named.map((n) => n.label),
    ...entry.scalars.map((s) => scalarChip(s.name, s.value, s.unit)),
  ];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.number}>#{entry.entryNumber}</Text>
        <Text style={styles.formName} numberOfLines={1}>{entry.formName}</Text>
        <Text style={styles.time}>{formatTime(entry.loggedAt)}</Text>
      </View>
      {chips.length > 0 && (
        <Text style={styles.summary} numberOfLines={1}>{chips.join(' · ')}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  number: { ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600' },
  formName: { ...Typography.label, color: Colors.text, fontWeight: '600', flex: 1 },
  time: { ...Typography.labelSm, color: Colors.textDisabled },
  summary: { ...Typography.labelSm, color: Colors.textMuted },
});
