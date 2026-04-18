import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { FormDefinition, Param } from './types';
import { ParamRow } from './components/ParamRow';
import { StickyBar } from './components/StickyBar';
import { FormHeader } from './components/FormHeader';
import { EditParamRow } from './components/EditParamRow';
import { EditModeBar } from './components/EditModeBar';
import { ParamSettingsSheet } from './components/ParamSettingsSheet';
import { useEntryForm } from './hooks/useEntryForm';
import { useEditForm } from './hooks/useEditForm';

// ─── Initial form definition ──────────────────────────────────────────────────

const PRACTICE_ROUND: FormDefinition = {
  id: 'practice_round',
  name: 'Practice round',
  params: [
    {
      id: 'disc',
      name: 'Disc',
      type: 'named',
      options: [
        { id: 'd1', label: 'Destroyer' },
        { id: 'd2', label: 'Buzzz' },
        { id: 'd3', label: 'Luna' },
        { id: 'd4', label: 'Roc3' },
        { id: 'd5', label: 'Wraith' },
        { id: 'd6', label: 'Aviar' },
      ],
    },
    {
      id: 'hand',
      name: 'Hand',
      type: 'named',
      options: [
        { id: 'bh', label: 'Backhand' },
        { id: 'fh', label: 'Forehand' },
      ],
    },
    {
      id: 'lie',
      name: 'Lie',
      type: 'named',
      options: [
        { id: 'tee', label: 'Tee' },
        { id: 'fair', label: 'Fairway' },
        { id: 'scr', label: 'Scramble' },
        { id: 'app', label: 'Approach' },
        { id: 'putt', label: 'Putt' },
      ],
    },
    {
      id: 'diff',
      name: 'Difficulty',
      type: 'scalar',
      min: 1,
      max: 10,
      step: 1,
      majorStep: 1,
      lblMin: 'easy',
      lblMax: 'hard',
    },
    {
      id: 'hyzer_i',
      name: 'Hyzer (intended)',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'hyzer',
      lblMax: 'anhyzer',
      displayFormat: 'hyzer',
    },
    {
      id: 'nose_i',
      name: 'Nose (intended)',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'nose ↓',
      lblMax: 'nose ↑',
      displayFormat: 'nose',
    },
    {
      id: 'exec',
      name: 'Execution',
      type: 'scalar',
      min: 1,
      max: 10,
      step: 1,
      majorStep: 1,
      lblMin: 'shank',
      lblMax: 'pured',
    },
    {
      id: 'throw_dist',
      name: 'Distance',
      type: 'scalar',
      min: 0,
      max: 200,
      step: 5,
      majorStep: 50,
      unit: 'm',
      lblMin: '0m',
      lblMax: '200m',
    },
    {
      id: 'height',
      name: 'Height',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'low',
      lblMax: 'high',
    },
    {
      id: 'line',
      name: 'Line',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'early',
      lblMax: 'pulled',
    },
    {
      id: 'form',
      name: 'Form',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'strenuous',
      lblMax: 'smooth',
    },
  ],
};

const DEMO_HOLE = { holeNumber: 4, distanceM: 152, par: 3, throwNumber: 2 };

// ─────────────────────────────────────────────────────────────────────────────

export function EntryForm() {
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([PRACTICE_ROUND]);
  const [activeId, setActiveId] = useState(PRACTICE_ROUND.id);
  const [isEditMode, setIsEditMode] = useState(false);
  // Increment to force-remount the edit form and reset its state
  const [editKey, setEditKey] = useState(0);

  const activeDef = formDefs.find((f) => f.id === activeId) ?? formDefs[0];

  // ── View mode ──────────────────────────────────────────────────────────────
  const form = useEntryForm(activeDef.params);
  const scrollRef = useRef<ScrollView>(null);

  const handleDragStart = useCallback(() => {
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  }, []);

  const wrapCommit = useCallback(
    (paramId: string, value: string) => {
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      form.setValue(paramId, value);
    },
    [form],
  );

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const enterEdit = () => {
    setEditKey((k) => k + 1);
    setIsEditMode(true);
  };

  const handleOverwrite = useCallback(
    (draft: Param[]) => {
      setFormDefs((prev) =>
        prev.map((f) => (f.id === activeDef.id ? { ...f, params: draft } : f)),
      );
      setIsEditMode(false);
    },
    [activeDef.id],
  );

  const handleSaveAsNew = useCallback(
    (draft: Param[]) => {
      Alert.prompt(
        'Save as new',
        'Enter a name for the new form',
        (name) => {
          if (!name?.trim()) return;
          const newDef: FormDefinition = {
            id: `form_${Date.now()}`,
            name: name.trim(),
            params: draft,
          };
          setFormDefs((prev) => [...prev, newDef]);
          setActiveId(newDef.id);
          setIsEditMode(false);
        },
        'plain-text',
        activeDef.name,
      );
    },
    [activeDef.name],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <FormHeader name={activeDef.name} isEditMode={isEditMode} onEditPress={enterEdit} />

      {isEditMode ? (
        <EditModeContent
          key={editKey}
          formDef={activeDef}
          onOverwrite={handleOverwrite}
          onSaveAsNew={handleSaveAsNew}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {form.params.map((param) => (
              <ParamRow
                key={param.id}
                param={param}
                value={form.values[param.id]}
                isExpanded={form.expandedIds.has(param.id)}
                onToggle={() => form.toggleExpanded(param.id)}
                onCommit={(v) => wrapCommit(param.id, v)}
                onClear={() => form.clearValue(param.id)}
                formatValue={form.formatValue}
                onDragStart={handleDragStart}
              />
            ))}
          </ScrollView>

          <StickyBar
            holeContext={DEMO_HOLE}
            onAction={() => console.log('Log throw', form.values)}
          />
        </>
      )}
    </View>
  );
}

// ─── Edit mode sub-component ──────────────────────────────────────────────────

interface EditModeProps {
  formDef: FormDefinition;
  onOverwrite: (draft: Param[]) => void;
  onSaveAsNew: (draft: Param[]) => void;
  onCancel: () => void;
}

function EditModeContent({ formDef, onOverwrite, onSaveAsNew, onCancel }: EditModeProps) {
  const edit = useEditForm(formDef);

  const sheetTarget =
    edit.settingsTarget === 'new' ? null : (edit.settingsTarget ?? null);
  const sheetVisible = edit.settingsTarget !== null;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {edit.draft.map((param, idx) => (
          <EditParamRow
            key={param.id}
            param={param}
            isFirst={idx === 0}
            isLast={idx === edit.draft.length - 1}
            combinePending={edit.combinePending}
            onMoveUp={() => edit.moveUp(param.id)}
            onMoveDown={() => edit.moveDown(param.id)}
            onRemove={() => edit.removeParam(param.id)}
            onOpenSettings={() => edit.openSettings(param)}
            onStartCombine={() => edit.startCombine(param.id)}
            onCommitCombine={(sourceAsX) =>
              edit.commitCombine(edit.combinePending!.sourceId, param.id, sourceAsX)
            }
            onSplit={() => edit.splitGrid2D(param.id)}
          />
        ))}

        <TouchableOpacity style={styles.addParamBtn} onPress={edit.openAddNew} activeOpacity={0.7}>
          <Text style={styles.addParamText}>+ Add param</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditModeBar
        onOverwrite={() => onOverwrite(edit.draft)}
        onSaveAsNew={() => onSaveAsNew(edit.draft)}
        onCancel={onCancel}
      />

      <ParamSettingsSheet
        visible={sheetVisible}
        initial={sheetTarget}
        onSave={edit.saveParam}
        onClose={edit.closeSettings}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  addParamBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  addParamText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});
