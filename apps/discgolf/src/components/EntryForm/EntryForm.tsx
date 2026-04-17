import React, { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/theme';
import type { Param } from './types';
import { ParamRow } from './components/ParamRow';
import { StickyBar } from './components/StickyBar';
import { TabBar } from './components/TabBar';
import { useEntryForm } from './hooks/useEntryForm';

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_BEFORE: Param[] = [
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
    id: 'hyzer_i+nose_i',
    name: 'Intended release',
    type: 'grid2d',
    axisX: {
      id: 'hyzer_i',
      name: 'Hyzer',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'hyzer',
      lblMax: 'anhyzer',
      displayFormat: 'hyzer',
    },
    axisY: {
      id: 'nose_i',
      name: 'Nose',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'nose ↓',
      lblMax: 'nose ↑',
      displayFormat: 'nose',
    },
  },
];

const DEMO_AFTER: Param[] = [
  {
    id: 'diff+exec',
    name: 'Difficulty × Execution',
    type: 'grid2d',
    axisX: {
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
    axisY: {
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
  },
  {
    id: 'throw_dist+height',
    name: 'Throw distance × Height',
    type: 'grid2d',
    axisX: {
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
    axisY: {
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
];

// ─────────────────────────────────────────────────────────────────────────────

const DEMO_HOLE = { holeNumber: 4, distanceM: 152, par: 3, throwNumber: 2 };

export function EntryForm() {
  const form = useEntryForm(DEMO_BEFORE, DEMO_AFTER);
  const scrollRef = useRef<ScrollView>(null);

  // Called by ScalarInput / Grid2DInput on drag start to freeze the scroll
  const handleDragStart = useCallback(() => {
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  }, []);

  // Re-enable scroll once the PanResponder releases (called via onCommit which fires after release)
  const wrapCommit = useCallback(
    (paramId: string, value: string) => {
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      form.setValue(paramId, value);
    },
    [form],
  );

  const params =
    form.activeTab === 'before' ? form.beforeParams : form.afterParams;

  return (
    <View style={styles.root}>
      <TabBar activeTab={form.activeTab} onTabPress={form.setActiveTab} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {params.map((param) => (
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
        activeTab={form.activeTab}
        holeContext={DEMO_HOLE}
        onAction={() => {
          // placeholder — wire to DB later
          console.log('Action tapped', form.activeTab, form.values);
        }}
      />
    </View>
  );
}

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
});
