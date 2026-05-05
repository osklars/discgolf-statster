import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { RowItem } from '../components/ui/RowItem';
import { loadFormDefinitions } from '../db/mappers';
import { deleteForm, getArchivedForms, archiveForm, restoreForm } from '../db/forms';
import {
  getArchivedScalarParameters, getArchivedNamedParameters,
  restoreScalarParameter, restoreNamedParameter,
  deleteScalarParameter, deleteNamedParameter,
} from '../db/parameters';
import { queryParamUsageCounts } from '../db/queries';
import { randomUUID } from 'expo-crypto';

type Props = NativeStackScreenProps<RootStackParamList, 'Forms'>;

type FormRow = { id: string; name: string; paramCount: number };
type ArchivedFormRow = { id: string; name: string };
type ParamRow = { id: string; name: string; type: 'scalar' | 'named'; usageCount: number };

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [archivedForms, setArchivedForms] = useState<ArchivedFormRow[]>([]);
  const [scalars, setScalars] = useState<ParamRow[]>([]);
  const [named, setNamed] = useState<ParamRow[]>([]);
  const [archived, setArchived] = useState<ParamRow[]>([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [archivedFormsExpanded, setArchivedFormsExpanded] = useState(false);

  const load = useCallback(async () => {
    const [{ forms: rawForms, paramLibrary }, usageCounts, archivedScalars, archivedNamed, rawArchivedForms] =
      await Promise.all([
        loadFormDefinitions(),
        queryParamUsageCounts(),
        getArchivedScalarParameters(),
        getArchivedNamedParameters(),
        getArchivedForms(),
      ]);

    setForms(rawForms.map((f) => ({ id: f.id, name: f.name, paramCount: f.params.length })));
    setArchivedForms(rawArchivedForms.map((f) => ({ id: f.id, name: f.name })));
    setScalars(
      paramLibrary
        .filter((p) => p.type !== 'named')
        .map((p) => ({ id: p.id, name: p.name, type: 'scalar' as const, usageCount: usageCounts[p.id] ?? 0 })),
    );
    setNamed(
      paramLibrary
        .filter((p) => p.type === 'named')
        .map((p) => ({ id: p.id, name: p.name, type: 'named' as const, usageCount: usageCounts[p.id] ?? 0 })),
    );
    setArchived([
      ...archivedScalars.map((s) => ({ id: s.id, name: s.name, type: 'scalar' as const, usageCount: usageCounts[s.id] ?? 0 })),
      ...archivedNamed.map((n) => ({ id: n.id, name: n.name, type: 'named' as const, usageCount: usageCounts[n.id] ?? 0 })),
    ]);
  }, []);

  useEffect(() => { load().catch(console.error); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load().catch(console.error)), [navigation, load]);

  const handleNewForm = useCallback(() => {
    navigation.navigate('FormEditor', { formId: randomUUID(), isNew: true, sortOrder: forms.length });
  }, [forms.length, navigation]);

  const handleArchiveForm = useCallback(async (id: string) => {
    await archiveForm(id);
    load();
  }, [load]);

  const handleRestoreForm = useCallback(async (id: string) => {
    await restoreForm(id);
    load();
  }, [load]);

  const handleDeleteArchivedForm = useCallback((id: string, name: string) => {
    Alert.alert(
      'Delete form',
      `Permanently delete "${name}"?\n\nEntries are not affected but this cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteForm(id); load(); } },
      ],
    );
  }, [load]);

  const handleRestore = useCallback(async (p: ParamRow) => {
    if (p.type === 'scalar') await restoreScalarParameter(p.id);
    else await restoreNamedParameter(p.id);
    load();
  }, [load]);

  const handleDeleteParam = useCallback((p: ParamRow) => {
    const warning = p.usageCount > 0
      ? `This will permanently delete "${p.name}" and all ${p.usageCount} of its datapoints. This cannot be undone.`
      : `Permanently delete "${p.name}"? This cannot be undone.`;
    Alert.alert('Delete parameter', warning, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete permanently',
        style: 'destructive',
        onPress: async () => {
          if (p.type === 'scalar') await deleteScalarParameter(p.id);
          else await deleteNamedParameter(p.id);
          load();
        },
      },
    ]);
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Forms & Params" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
      {/* ── Forms ── */}
      <SectionHeader label="Forms" onNew={handleNewForm} />
      <View style={styles.card}>
        {forms.length === 0 ? (
          <Text style={styles.empty}>No forms yet.</Text>
        ) : (
          forms.map((form, i) => (
            <RowItem
              key={form.id}
              title={form.name}
              meta={`${form.paramCount} ${form.paramCount === 1 ? 'param' : 'params'}`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('FormEditor', { formId: form.id })}
            />
          ))
        )}
      </View>

      {/* ── Archived forms ── */}
      {archivedForms.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setArchivedFormsExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>ARCHIVED FORMS ({archivedForms.length})</Text>
            <Feather name={archivedFormsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>
          {archivedFormsExpanded && (
            <View style={styles.card}>
              {archivedForms.map((f, i) => (
                <RowItem
                  key={f.id}
                  title={f.name}
                  bordered={i > 0}
                  dimmed
                  onRestore={() => handleRestoreForm(f.id)}
                  onDelete={() => handleDeleteArchivedForm(f.id, f.name)}
                />
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Named ── */}
      <SectionHeader label="Named" onNew={() => navigation.navigate('ParamEditor', { paramType: 'named', initialName: 'New Parameter' })} />
      <View style={styles.card}>
        {named.length === 0 ? (
          <Text style={styles.empty}>No named params yet.</Text>
        ) : (
          named.map((p, i) => (
            <RowItem
              key={p.id}
              title={p.name}
              meta={p.usageCount === 1 ? '1 entry' : `${p.usageCount} entries`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('ParamEditor', { paramType: 'named', paramId: p.id })}
            />
          ))
        )}
      </View>

      {/* ── Scalars ── */}
      <SectionHeader label="Scalars" onNew={() => navigation.navigate('ParamEditor', { paramType: 'scalar', initialName: 'New Parameter' })} />
      <View style={styles.card}>
        {scalars.length === 0 ? (
          <Text style={styles.empty}>No scalar params yet.</Text>
        ) : (
          scalars.map((p, i) => (
            <RowItem
              key={p.id}
              title={p.name}
              meta={p.usageCount === 1 ? '1 entry' : `${p.usageCount} entries`}
              bordered={i > 0}
              showChevron
              onPress={() => navigation.navigate('ParamEditor', { paramType: 'scalar', paramId: p.id })}
            />
          ))
        )}
      </View>

      {/* ── Archived params ── */}
      {archived.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setArchivedExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>ARCHIVED PARAMS ({archived.length})</Text>
            <Feather name={archivedExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>
          {archivedExpanded && (
            <View style={styles.card}>
              {archived.map((p, i) => (
                <RowItem
                  key={p.id}
                  title={p.name}
                  meta={`${p.type} · ${p.usageCount} entries`}
                  bordered={i > 0}
                  dimmed
                  onRestore={() => handleRestore(p)}
                  onDelete={() => handleDeleteParam(p)}
                />
              ))}
            </View>
          )}
        </>
      )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label, onNew }: { label: string; onNew: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      <TouchableOpacity onPress={onNew} style={styles.sectionBtn}>
        <Feather name="plus" size={15} color={Colors.primary} />
        <Text style={styles.sectionBtnText}>New</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    ...Typography.labelSm, color: Colors.textMuted, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionBtnText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  collapsibleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  empty: {
    ...Typography.label, color: Colors.textDisabled,
    paddingVertical: Spacing.lg, textAlign: 'center', paddingHorizontal: Spacing.lg,
  },
});
