import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  HIT_SLOP,
  Spacing,
  Typography,
  hairline,
} from '../../../constants/theme';
import type {
  DiscParam,
  Grid2DParam,
  NamedParam,
  Param,
  ParamValue,
  ScalarParam,
} from '../types';
import { DiscPicker } from './inputs/DiscPicker';
import { Grid2DInput } from './inputs/Grid2DInput';
import { PillPicker } from './inputs/PillPicker';
import { ScalarInput } from './inputs/ScalarInput';

const GRID2D_SEP = '·';

interface Props {
  param: Param;
  value: ParamValue | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onCommit: (value: ParamValue) => void;
  onClear: () => void;
  formatValue: (param: Param, raw: ParamValue | undefined) => string;
  onDragStart: () => void;
}

export function ParamRow({
  param,
  value,
  isExpanded,
  onToggle,
  onCommit,
  onClear,
  formatValue,
  onDragStart,
}: Props) {
  const isSet = value !== undefined && value !== '';
  const committedDisplay = isSet ? formatValue(param, value) : '';

  // During a drag only this row re-renders — the list stays still.
  const [liveDisplay, setLiveDisplay] = useState<string | null>(null);
  const headerDisplay = liveDisplay !== null ? liveDisplay : committedDisplay;

  const handleScalarLive = useCallback(
    (v: number) => {
      const p = param as ScalarParam;
      setLiveDisplay(p.unit ? `${v}${p.unit}` : String(v));
    },
    [param],
  );

  const handleScalarCommit = useCallback(
    (v: number) => {
      setLiveDisplay(null);
      onCommit(String(v));
    },
    [onCommit],
  );

  const handleGrid2DLive = useCallback(
    (x: number, y: number) => {
      const p = param as Grid2DParam;
      const fmtX = p.axisX.unit ? `${x}${p.axisX.unit}` : String(x);
      const fmtY = p.axisY.unit ? `${y}${p.axisY.unit}` : String(y);
      setLiveDisplay(`${fmtX} × ${fmtY}`);
    },
    [param],
  );

  const handleGrid2DCommit = useCallback(
    (x: number, y: number) => {
      setLiveDisplay(null);
      onCommit(`${x}${GRID2D_SEP}${y}`);
    },
    [onCommit],
  );

  const renderInput = () => {
    switch (param.type) {
      case 'scalar': {
        const p = param as ScalarParam;
        const num = value !== undefined ? parseFloat(value) : undefined;
        return (
          <ScalarInput
            param={p}
            value={num !== undefined && !isNaN(num) ? num : undefined}
            onDragStart={onDragStart}
            onLiveUpdate={handleScalarLive}
            onCommit={handleScalarCommit}
          />
        );
      }
      case 'named': {
        const p = param as NamedParam;
        return <PillPicker options={p.options} selectedId={value} onSelect={onCommit} />;
      }
      case 'disc': {
        const p = param as DiscParam;
        return <DiscPicker discs={p.discs} selectedId={value} onSelect={onCommit} />;
      }
      case 'grid2d': {
        const p = param as Grid2DParam;
        const parts = value ? value.split(GRID2D_SEP) : [];
        const xNum = parts[0] !== undefined ? parseFloat(parts[0]) : undefined;
        const yNum = parts[1] !== undefined ? parseFloat(parts[1]) : undefined;
        return (
          <Grid2DInput
            param={p}
            valueX={xNum !== undefined && !isNaN(xNum) ? xNum : undefined}
            valueY={yNum !== undefined && !isNaN(yNum) ? yNum : undefined}
            onDragStart={onDragStart}
            onLiveUpdate={handleGrid2DLive}
            onCommit={handleGrid2DCommit}
          />
        );
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      {/*
        Legend-style separator: the param name sits in a gap in the line.
        Right side holds the current value, clear button, and chevron.
      */}
      <View style={styles.legendRow}>
        {/* Name — no left line nub, starts at the content margin */}
        <TouchableOpacity onPress={onToggle} activeOpacity={0.6} style={styles.nameTap} hitSlop={HIT_SLOP}>
          <Text style={styles.nameText} numberOfLines={1}>
            {param.name}
          </Text>
        </TouchableOpacity>

        {/* Separator line filling the gap after the name */}
        <View style={styles.sepLine} />

        {/* Value */}
        {isSet && (
          <Text style={styles.valueText} numberOfLines={1}>
            {headerDisplay}
          </Text>
        )}

        {/* Clear button */}
        {isSet && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={HIT_SLOP}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}

        {/* Chevron toggle */}
        <TouchableOpacity onPress={onToggle} style={styles.chevronBtn} hitSlop={HIT_SLOP}>
          <Text style={[styles.chevron, isExpanded && styles.chevronUp]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible body — input starts immediately below the legend line */}
      {isExpanded && <View style={styles.body}>{renderInput()}</View>}

      {/* Bottom separator */}
      <View style={styles.bottomSep} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    minHeight: 28,
  },
  nameTap: {
    // Just enough padding to make tap target reasonable, no extra height
    paddingVertical: Spacing.xs,
  },
  nameText: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  sepLine: {
    flex: 1,
    height: hairline,
    backgroundColor: Colors.separator,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
  },
  valueText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '600',
    flexShrink: 1,
    maxWidth: 100,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  chevronBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 18,
    color: Colors.textDisabled,
    transform: [{ rotate: '90deg' }],
    lineHeight: 20,
  },
  chevronUp: {
    transform: [{ rotate: '270deg' }],
  },
  body: {
    // No extra padding — inputs handle their own horizontal spacing
  },
  bottomSep: {
    height: hairline,
    backgroundColor: Colors.separator,
  },
});
