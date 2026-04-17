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

const HEIGHT = 52;
const AXIS_Y = 22;
const DOT_R = 7;
const TICK_H_MAJOR = 8;
const PAD_H = Spacing.lg;

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function ScalarInput({ param, value, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { min, max, step, majorStep, lblMin, lblMax } = param;

  const [containerWidth, setContainerWidth] = useState(300);
  const liveValueRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  // Measured page-level offset of the container — stays current via refs
  // so the PanResponder closure (created once) always reads the right value.
  const containerRef = useRef<View>(null);
  const pageOffsetX = useRef(0);
  const widthRef = useRef(300);

  const trackWidthFor = (w: number) => w - PAD_H * 2;

  // Convert an absolute screen x to a snapped param value.
  const valueForPageX = (pageX: number): number => {
    const relX = pageX - pageOffsetX.current;
    const tw = trackWidthFor(widthRef.current);
    const raw = min + ((relX - PAD_H) / tw) * (max - min);
    return snapToStep(raw, min, max, step);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const v = valueForPageX(evt.nativeEvent.pageX);
        liveValueRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v);
      },
      onPanResponderMove: (evt) => {
        const v = valueForPageX(evt.nativeEvent.pageX);
        liveValueRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v);
      },
      onPanResponderRelease: (evt) => {
        const v = valueForPageX(evt.nativeEvent.pageX);
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

  const onLayout = useCallback(() => {
    containerRef.current?.measure((_x, _y, width, _h, pageX) => {
      pageOffsetX.current = pageX;
      widthRef.current = width;
      setContainerWidth(width);
    });
  }, []);

  const trackWidth = trackWidthFor(containerWidth);

  const xForValue = (v: number) => PAD_H + ((v - min) / (max - min)) * trackWidth;

  const displayValue = liveValueRef.current !== null ? liveValueRef.current : value;
  const hasDot = displayValue !== undefined;
  const dotX = hasDot ? xForValue(displayValue!) : 0;

  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v = parseFloat((v + majorStep).toFixed(10))) {
    ticks.push(v);
  }

  return (
    <View ref={containerRef} style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <Svg width={containerWidth} height={HEIGHT}>
        {/* Axis line */}
        <Line
          x1={PAD_H} y1={AXIS_Y}
          x2={PAD_H + trackWidth} y2={AXIS_Y}
          stroke={Colors.separator} strokeWidth={1.5}
        />

        {/* Ticks */}
        {ticks.map((v) => {
          const x = xForValue(v);
          return (
            <Line
              key={v}
              x1={x} y1={AXIS_Y - TICK_H_MAJOR / 2}
              x2={x} y2={AXIS_Y + TICK_H_MAJOR / 2}
              stroke={Colors.textDisabled} strokeWidth={1}
            />
          );
        })}

        {/* End labels */}
        <SvgText
          x={PAD_H} y={AXIS_Y + TICK_H_MAJOR / 2 + 14}
          fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle"
        >
          {lblMin}
        </SvgText>
        <SvgText
          x={PAD_H + trackWidth} y={AXIS_Y + TICK_H_MAJOR / 2 + 14}
          fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle"
        >
          {lblMax}
        </SvgText>

        {/* Dot */}
        {hasDot && <Circle cx={dotX} cy={AXIS_Y} r={DOT_R} fill={Colors.primary} />}
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
