import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, MIN_HIT, Radius, Spacing, Typography, hairline } from '../constants/theme';
import type { DatapointsForEntry, Entry, Session } from '../db/types';
import { getSession, renameSession } from '../db/sessions';
import { getEntriesForSession } from '../db/entries';
import { getDatapointsForEntry } from '../db/datapoints';
import { getAllNamedOptions, getNamedParameters, getScalarParameters } from '../db/parameters';
import { computeXpForEntries } from '../db/xp';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SE', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

type ParamLookups = {
  scalarNames: Map<string, string>;
  namedNames: Map<string, string>;
  optionLabels: Map<string, string>;
};

type EntryWithDatapoints = { entry: Entry; datapoints: DatapointsForEntry; xp: number };

function EntryCard({
  ewdp, index, lookups,
}: {
  ewdp: EntryWithDatapoints;
  index: number;
  lookups: ParamLookups;
}) {
  const { entry, datapoints, xp } = ewdp;
  const chips: { label: string; value: string }[] = [
    ...datapoints.named.map((n) => ({
      label: lookups.namedNames.get(n.parameterId) ?? n.parameterId,
      value: lookups.optionLabels.get(n.optionId) ?? n.optionId,
    })),
    ...datapoints.scalars.map((s) => ({
      label: lookups.scalarNames.get(s.parameterId) ?? s.parameterId,
      value: String(Number.isInteger(s.value) ? s.value : s.value.toFixed(1)),
    })),
  ];

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryIndex}>
          <Text style={styles.entryIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.entryFormName}>{entry.formId}</Text>
        <Text style={styles.entryXp}>{xp} XP</Text>
      </View>
      <View style={styles.entryFields}>
        {chips.map((c, i) => (
          <View key={i} style={styles.fieldChip}>
            <Text style={styles.fieldLabel}>{c.label}</Text>
            <Text style={styles.fieldValue}>{c.value}</Text>
          </View>
        ))}
        {chips.length === 0 && (
          <Text style={styles.noDataLabel}>No data recorded</Text>
        )}
      </View>
    </View>
  );
}

export function SessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [entriesWithData, setEntriesWithData] = useState<EntryWithDatapoints[]>([]);
  const [lookups, setLookups] = useState<ParamLookups>({
    scalarNames: new Map(),
    namedNames: new Map(),
    optionLabels: new Map(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, entries, scalars, named, options] = await Promise.all([
        getSession(sessionId),
        getEntriesForSession(sessionId),
        getScalarParameters(),
        getNamedParameters(),
        getAllNamedOptions(),
      ]);

      const [ewdps, xpResults] = await Promise.all([
        Promise.all(entries.map(async (entry) => ({
          entry,
          datapoints: await getDatapointsForEntry(entry.id),
          xp: 0,
        }))),
        computeXpForEntries(entries.map((e) => e.id)),
      ]);

      const xpMap = new Map(xpResults.map((r) => [r.entryId, r.xp]));
      const ewdpsWithXp = ewdps.map((e) => ({ ...e, xp: xpMap.get(e.entry.id) ?? 40 }));

      setSession(s);
      setEntriesWithData(ewdpsWithXp);
      setLookups({
        scalarNames: new Map(scalars.map((p) => [p.id, p.name])),
        namedNames: new Map(named.map((p) => [p.id, p.name])),
        optionLabels: new Map(options.map((o) => [o.id, o.label])),
      });
      setLoading(false);
    }
    load().catch(console.error);
  }, [sessionId]);

  const handleRename = () => {
    if (!session) return;
    Alert.prompt(
      'Rename session',
      'Enter a name for this session',
      async (name) => {
        if (name === undefined) return;
        await renameSession(sessionId, name);
        setSession((s) => s ? { ...s, name: name.trim() || null } : s);
        navigation.setOptions({ title: name.trim() || 'Session' });
      },
      'plain-text',
      session.name ?? '',
    );
  };

  useEffect(() => {
    if (session) {
      navigation.setOptions({
        title: session.name ?? 'Session',
        headerRight: () => (
          <TouchableOpacity onPress={handleRename} activeOpacity={0.6} style={styles.renameBtn}>
            <Feather name="edit-2" size={16} color={Colors.primary} />
          </TouchableOpacity>
        ),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.name]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Session not found</Text>
      </View>
    );
  }

  const totalXp = entriesWithData.reduce((sum, e) => sum + e.xp, 0);

  const allScalars = entriesWithData.flatMap((e) => e.datapoints.scalars);
  const grades = allScalars.filter((s) => s.parameterId === 'grade').map((s) => s.value);
  const dists = allScalars.filter((s) => s.parameterId === 'distance').map((s) => s.value);
  const avgGrade = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
  const maxDist = dists.length ? Math.max(...dists) : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{entriesWithData.length}</Text>
            <Text style={styles.summaryLabel}>Throws</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalXp}</Text>
            <Text style={styles.summaryLabel}>Total XP</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{avgGrade !== null ? avgGrade.toFixed(1) : '—'}</Text>
            <Text style={styles.summaryLabel}>Avg grade</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{maxDist !== null ? `${maxDist}m` : '—'}</Text>
            <Text style={styles.summaryLabel}>Best dist</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {entriesWithData.map((ewdp, i) => (
          <EntryCard key={ewdp.entry.id} ewdp={ewdp} index={i} lookups={lookups} />
        ))}

        {entriesWithData.length === 0 && (
          <Text style={styles.emptyText}>No throws logged yet.</Text>
        )}
      </ScrollView>

      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SessionForm', { sessionId })}
        >
          <Text style={styles.continueBtnText}>Continue session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
  stickyBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  continueBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
  },
  continueBtnText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  renameBtn: { paddingLeft: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },
  sessionMeta: { gap: 2 },
  sessionDate: { ...Typography.label, color: Colors.textMuted },
  summaryRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  summaryLabel: { ...Typography.labelSm, color: Colors.textMuted },
  summarySep: { width: hairline, height: 36, backgroundColor: Colors.separator },
  divider: { height: hairline, backgroundColor: Colors.separator },
  entryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.sm,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entryIndex: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  entryIndexText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '700' },
  entryFormName: { ...Typography.label, color: Colors.textMuted, flex: 1 },
  entryXp: { ...Typography.labelSm, color: Colors.primary, fontWeight: '700' },
  entryFields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  fieldChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3,
    gap: 4, borderWidth: hairline, borderColor: Colors.separator,
  },
  fieldLabel: { ...Typography.labelSm, color: Colors.textMuted },
  fieldValue: { ...Typography.labelSm, color: Colors.text, fontWeight: '600' },
  noDataLabel: { ...Typography.labelSm, color: Colors.textMuted },
});
