import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { MOCK_SESSIONS, type Entry } from './mockData';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

const KEY_FIELDS = ['disc', 'hand', 'exec', 'throw_dist'];
const FIELD_LABELS: Record<string, string> = {
  disc: 'Disc',
  hand: 'Hand',
  exec: 'Exec',
  throw_dist: 'Dist',
};

function EntryCard({ entry, index }: { entry: Entry; index: number }) {
  const chips = KEY_FIELDS.filter((k) => entry.values[k] !== undefined);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryIndex}>
          <Text style={styles.entryIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.entryFormName}>{entry.formName}</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.entryFields}>
        {chips.map((k) => (
          <View key={k} style={styles.fieldChip}>
            <Text style={styles.fieldLabel}>{FIELD_LABELS[k] ?? k}</Text>
            <Text style={styles.fieldValue}>{entry.values[k]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SessionScreen({ route }: Props) {
  const session = MOCK_SESSIONS.find((s) => s.id === route.params.sessionId);

  if (!session) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Session not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sessionMeta}>
        <Text style={styles.courseName}>{session.courseName}</Text>
        <Text style={styles.sessionDate}>{session.date}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{session.entries.length}</Text>
          <Text style={styles.summaryLabel}>Throws</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          {(() => {
            const execs = session.entries
              .map((e) => parseFloat(e.values['exec'] ?? ''))
              .filter((n) => !isNaN(n));
            const avg = execs.length ? execs.reduce((a, b) => a + b, 0) / execs.length : null;
            return (
              <>
                <Text style={styles.summaryValue}>{avg !== null ? avg.toFixed(1) : '—'}</Text>
                <Text style={styles.summaryLabel}>Avg exec</Text>
              </>
            );
          })()}
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          {(() => {
            const dists = session.entries
              .map((e) => parseFloat(e.values['throw_dist'] ?? ''))
              .filter((n) => !isNaN(n));
            const max = dists.length ? Math.max(...dists) : null;
            return (
              <>
                <Text style={styles.summaryValue}>{max !== null ? `${max}m` : '—'}</Text>
                <Text style={styles.summaryLabel}>Best dist</Text>
              </>
            );
          })()}
        </View>
      </View>

      <View style={styles.divider} />

      {session.entries.map((entry, i) => (
        <EntryCard key={entry.id} entry={entry} index={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  sessionMeta: {
    gap: 2,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  sessionDate: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  summarySep: {
    width: hairline,
    height: 36,
    backgroundColor: Colors.separator,
  },
  divider: {
    height: hairline,
    backgroundColor: Colors.separator,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIndexText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  entryFormName: {
    ...Typography.label,
    color: Colors.textMuted,
    flex: 1,
  },
  editLink: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
  entryFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  fieldLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  fieldValue: {
    ...Typography.labelSm,
    color: Colors.text,
    fontWeight: '600',
  },
});
