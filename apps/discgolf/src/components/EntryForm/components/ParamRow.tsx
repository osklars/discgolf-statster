import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  HIT_SLOP,
  Spacing,
  Typography,
  hairline,
} from '../../../constants/theme';
import type { Grid2DParam, NamedParam, Param, ParamValue, ScalarParam } from '../types';
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

  const [liveDisplay, setLiveDisplay] = useState<string | null>(null);
  const headerDisplay = liveDisplay !== null ? liveDisplay : committedDisplay;

  const handleScalarLive = useCallback(
    (v: number) => {
      setLiveDisplay(formatValue(param, String(v)));
    },
    [param, formatValue],
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
      const fmtAxis = (v: number, axis: ScalarParam): string =>
        axis.unit ? `${v}${axis.unit}` : String(v);
      setLiveDisplay(`${fmtAxis(x, p.axisX)} × ${fmtAxis(y, p.axisY)}`);
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

  const handleAutoCloseCommit = useCallback(
    (v: string) => {
      onCommit(v);
      onToggle();
    },
    [onCommit, onToggle],
  );

  const renderInput = () => {
    switch (param.type) {
      case 'scalar': {
        const p = param as ScalarParam;
        const n = value !== undefined ? parseFloat(value) : undefined;
        return (
          <ScalarInput
            param={p}
            value={n !== undefined && !isNaN(n) ? n : undefined}
            onDragStart={onDragStart}
            onLiveUpdate={handleScalarLive}
            onCommit={handleScalarCommit}
          />
        );
      }
      case 'named': {
        const p = param as NamedParam;
        return (
          <PillPicker options={p.options} selectedId={value} onSelect={handleAutoCloseCommit} />
        );
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
      <View style={styles.legendRow}>
        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.6}
          style={styles.nameTap}
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.nameText} numberOfLines={1}>
            {param.name}
          </Text>
        </TouchableOpacity>

        <View style={styles.sepLine} />

        {isSet && (
          <Text style={styles.valueText} numberOfLines={1}>
            {headerDisplay}
          </Text>
        )}

        {isSet && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={HIT_SLOP}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onToggle} style={styles.chevronBtn} hitSlop={HIT_SLOP}>
          <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
        </TouchableOpacity>
      </View>

      {isExpanded && <View style={styles.body}>{renderInput()}</View>}
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
    transform: [{ rotate: '0deg' }],
    lineHeight: 20,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  body: {},
});
