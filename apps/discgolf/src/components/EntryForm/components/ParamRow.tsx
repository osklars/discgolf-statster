import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Colors,
  HIT_SLOP,
  MIN_HIT,
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

  // During a drag, only this row re-renders via liveDisplay — the list stays still.
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
        return (
          <PillPicker
            options={p.options}
            selectedId={value}
            onSelect={onCommit}
          />
        );
      }
      case 'disc': {
        const p = param as DiscParam;
        return (
          <DiscPicker
            discs={p.discs}
            selectedId={value}
            onSelect={onCommit}
          />
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
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, isSet && styles.dotFilled]} />

        <Text style={styles.name} numberOfLines={1}>
          {param.name}
        </Text>

        {isSet && (
          <View style={styles.valueRow}>
            <Text style={styles.valueText} numberOfLines={1}>
              {headerDisplay}
            </Text>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={(e) => {
                e.stopPropagation();
                onClear();
              }}
              hitSlop={HIT_SLOP}
            >
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.chevron, isExpanded && styles.chevronUp]}>›</Text>
      </TouchableOpacity>

      {isExpanded && <View style={styles.body}>{renderInput()}</View>}

      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_HIT,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.dotEmpty,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  dotFilled: {
    backgroundColor: Colors.dot,
    borderColor: Colors.dot,
  },
  name: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  valueText: {
    ...Typography.label,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 18,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textDisabled,
    transform: [{ rotate: '90deg' }],
    flexShrink: 0,
    lineHeight: 22,
  },
  chevronUp: {
    transform: [{ rotate: '270deg' }],
  },
  body: {
    paddingBottom: Spacing.sm,
  },
  separator: {
    height: hairline,
    backgroundColor: Colors.separator,
    marginLeft: Spacing.lg,
  },
});
