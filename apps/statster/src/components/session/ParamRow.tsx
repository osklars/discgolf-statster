import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FittingPills } from './FittingPills';
import { ScalarInput } from '../EntryForm/components/inputs/ScalarInput';
import type { ScalarParam } from '../EntryForm/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';

export type ParamRowDef =
  | {
      type: 'scalar' | 'quality';
      id: string;
      name: string;
      min: number;
      max: number;
      step: number;
      majorStep: number;
      lblMin: string;
      lblMax: string;
      unit: string | null;
      clearAfterSubmit: boolean;
      oneOff?: boolean;
    }
  | {
      type: 'named';
      id: string;
      name: string;
      options: { id: string; label: string }[];
      clearAfterSubmit: boolean;
      oneOff?: boolean;
    };

interface ParamRowProps {
  param: ParamRowDef;
  value: string | undefined;
  expanded: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  onAddOption: () => void;
  onRemove?: () => void;
  onDragStart?: () => void;
}

// ── Collapsed display ─────────────────────────────────────────────────────────

function displayValue(param: ParamRowDef, value: string | undefined): string {
  if (!value) return '—';
  if (param.type === 'named') {
    const opt = param.options.find((o) => o.id === value);
    return opt?.label ?? '—';
  }
  return `${value}${param.unit ?? ''}`;
}

// ── ParamRow ──────────────────────────────────────────────────────────────────

export function ParamRow({ param, value, expanded, onToggle, onChange, onAddOption, onRemove, onDragStart }: ParamRowProps) {
  const [liveValue, setLiveValue] = useState<string | null>(null);

  const currentDisplay = liveValue !== null
    ? displayValue(param, liveValue)
    : displayValue(param, value);

  const scalarNumeric = param.type !== 'named' && value !== undefined
    ? parseFloat(value)
    : undefined;

  return (
    <View style={styles.container}>
      {/* Collapsed header — always visible */}
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.paramName}>{param.name}</Text>
          {param.oneOff && (
            <Text style={styles.oneOffBadge}>one-off</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.currentValue, !value && styles.currentValueEmpty]}>
            {currentDisplay}
          </Text>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.textMuted}
          />
          {onRemove && (
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded input */}
      {expanded && (
        <View style={styles.expanded}>
          {param.type === 'named' ? (
            <FittingPills
              items={param.options}
              selectedId={value}
              onSelect={onChange}
              onAdd={onAddOption}
            />
          ) : (
            <ScalarInput
              param={param as unknown as ScalarParam}
              value={scalarNumeric !== undefined && !isNaN(scalarNumeric) ? scalarNumeric : undefined}
              onDragStart={onDragStart ?? (() => {})}
              onLiveUpdate={(v) => setLiveValue(String(v))}
              onCommit={(v) => {
                setLiveValue(null);
                onChange(String(v));
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  paramName: { ...Typography.label, color: Colors.text, fontWeight: '500' },
  oneOffBadge: {
    ...Typography.labelSm,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  currentValue: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  currentValueEmpty: { color: Colors.textDisabled, fontWeight: '400' },
  expanded: { paddingBottom: Spacing.md },
});
