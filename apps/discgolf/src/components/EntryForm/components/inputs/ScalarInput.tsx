import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../../../constants/theme';
import type { ScalarParam } from '../../types';

interface Props {
  param: ScalarParam;
  value: number | undefined;
  onDragStart: () => void;
  onLiveUpdate: (value: number) => void;
  onCommit: (value: number) => void;
}

const HEIGHT = 72;
const AXIS_Y = 36;
const DOT_R = 8;
const TICK_H_MAJOR = 10;
const PAD_H = Spacing.lg;

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function ScalarInput({ param, value, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { min, max, step, majorStep, lblMin, lblMax } = param;
  const [containerWidth, setContainerWidth] = useState(300);
  // live dot position during drag (null = use committed value)
  const liveValueRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  const trackWidth = containerWidth - PAD_H * 2;

  function xForValue(v: number): number {
    return PAD_H + ((v - min) / (max - min)) * trackWidth;
  }

  function valueForX(x: number): number {
    const raw = min + ((x - PAD_H) / trackWidth) * (max - min);
    return snapToStep(raw, min, max, step);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const x = evt.nativeEvent.locationX;
        const v = valueForX(x);
        liveValueRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const v = valueForX(x);
        liveValueRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v);
      },
      onPanResponderRelease: (evt) => {
        const x = evt.nativeEvent.locationX;
        const v = valueForX(x);
        liveValueRef.current = null;
        forceUpdate((n) => n + 1);
        onCommit(v);
      },
      onPanResponderTerminate: () => {
        liveValueRef.current = null;
        forceUpdate((n) => n + 1);
      },
    }),
  ).current;

  const displayValue = liveValueRef.current !== null ? liveValueRef.current : value;
  const hasDot = displayValue !== undefined;
  const dotX = hasDot ? xForValue(displayValue!) : 0;

  // Generate major ticks
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v = parseFloat((v + majorStep).toFixed(10))) {
    ticks.push(v);
  }

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setContainerWidth(e.nativeEvent.layout.width);
    },
    [],
  );

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <Svg width={containerWidth} height={HEIGHT}>
        {/* Axis line */}
        <Line
          x1={PAD_H}
          y1={AXIS_Y}
          x2={PAD_H + trackWidth}
          y2={AXIS_Y}
          stroke={Colors.separator}
          strokeWidth={1.5}
        />

        {/* Ticks */}
        {ticks.map((v) => {
          const x = xForValue(v);
          return (
            <Line
              key={v}
              x1={x}
              y1={AXIS_Y - TICK_H_MAJOR / 2}
              x2={x}
              y2={AXIS_Y + TICK_H_MAJOR / 2}
              stroke={Colors.textDisabled}
              strokeWidth={1}
            />
          );
        })}

        {/* End labels */}
        <SvgText
          x={PAD_H}
          y={AXIS_Y + TICK_H_MAJOR / 2 + 14}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="middle"
        >
          {lblMin}
        </SvgText>
        <SvgText
          x={PAD_H + trackWidth}
          y={AXIS_Y + TICK_H_MAJOR / 2 + 14}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="middle"
        >
          {lblMax}
        </SvgText>

        {/* Dot */}
        {hasDot && (
          <Circle
            cx={dotX}
            cy={AXIS_Y}
            r={DOT_R}
            fill={Colors.primary}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: HEIGHT,
  },
});
