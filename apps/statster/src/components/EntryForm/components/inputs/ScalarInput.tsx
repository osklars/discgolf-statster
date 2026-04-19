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
const PAD = Spacing.lg;
const TRACK_SIZE = 200;
const DOT_HIT_SLOP = 12;
const TAP_THRESHOLD = 8;

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function ScalarInput({ param, value, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { min, max, step, majorStep, lblMin, lblMax } = param;

  const [containerWidth, setContainerWidth] = useState(300);
  const liveValueRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  const containerRef = useRef<View>(null);
  const pageOffsetX = useRef(0);
  const widthRef = useRef(300);
  const trackX0Ref = useRef(0);
  const valueRef = useRef<number | undefined>(value);
  valueRef.current = value;

  // Tracks whether the current gesture started on the dot.
  const isDotDragRef = useRef(false);

  const trackWidthFor = (w: number) => Math.min(w - PAD * 2, TRACK_SIZE);
  const trackX0For = (w: number) => (w - trackWidthFor(w)) / 2;

  const valueFromPageX = (pageX: number): number => {
    const relX = pageX - pageOffsetX.current;
    const tw = trackWidthFor(widthRef.current);
    const tx0 = trackX0Ref.current;
    const raw = min + ((relX - tx0) / tw) * (max - min);
    return snapToStep(raw, min, max, step);
  };

  const dotRelX = (): number => {
    const v = liveValueRef.current ?? valueRef.current;
    if (v === undefined) return -9999;
    return trackX0Ref.current + ((v - min) / (max - min)) * trackWidthFor(widthRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Always claim the touch — SVG has no competing responder.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,

      // Yield to the ScrollView for vertical scrolls, but hold on during dot drag.
      onPanResponderTerminationRequest: () => !isDotDragRef.current,

      onPanResponderGrant: (evt) => {
        const relX = evt.nativeEvent.pageX - pageOffsetX.current;
        isDotDragRef.current =
          valueRef.current !== undefined &&
          Math.abs(relX - dotRelX()) <= DOT_R + DOT_HIT_SLOP;
        if (isDotDragRef.current) {
          onDragStart(); // disables ScrollView scroll for the duration of the drag
        }
      },

      onPanResponderMove: (evt) => {
        if (!isDotDragRef.current) return;
        const v = valueFromPageX(evt.nativeEvent.pageX);
        liveValueRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v);
      },

      onPanResponderRelease: (evt, gestureState) => {
        const wasDotDrag = isDotDragRef.current;
        isDotDragRef.current = false;
        const isTap =
          Math.abs(gestureState.dx) <= TAP_THRESHOLD &&
          Math.abs(gestureState.dy) <= TAP_THRESHOLD;

        liveValueRef.current = null;
        forceUpdate((n) => n + 1);

        if (isTap || wasDotDrag) {
          onCommit(valueFromPageX(evt.nativeEvent.pageX));
        }
        // else: horizontal swipe not on dot — ignore
      },

      // ScrollView stole the responder — clean up without committing.
      onPanResponderTerminate: () => {
        isDotDragRef.current = false;
        liveValueRef.current = null;
        forceUpdate((n) => n + 1);
      },
    }),
  ).current;

  const onLayout = useCallback(() => {
    containerRef.current?.measure((_x, _y, width, _h, pageX) => {
      pageOffsetX.current = pageX;
      widthRef.current = width;
      trackX0Ref.current = trackX0For(width);
      setContainerWidth(width);
    });
  }, []);

  const trackWidth = trackWidthFor(containerWidth);
  const trackX0 = trackX0For(containerWidth);
  const xForValue = (v: number) => trackX0 + ((v - min) / (max - min)) * trackWidth;

  const displayValue = liveValueRef.current !== null ? liveValueRef.current : value;
  const hasDot = displayValue !== undefined;
  const dotX = hasDot ? xForValue(displayValue!) : 0;

  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v = parseFloat((v + majorStep).toFixed(10))) {
    ticks.push(v);
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <Svg width={containerWidth} height={HEIGHT}>
        <Line
          x1={trackX0} y1={AXIS_Y}
          x2={trackX0 + trackWidth} y2={AXIS_Y}
          stroke={Colors.separator} strokeWidth={1.5}
        />
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
        <SvgText
          x={trackX0} y={AXIS_Y + TICK_H_MAJOR / 2 + 13}
          fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="start"
        >
          {lblMin}
        </SvgText>
        <SvgText
          x={trackX0 + trackWidth} y={AXIS_Y + TICK_H_MAJOR / 2 + 13}
          fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="end"
        >
          {lblMax}
        </SvgText>
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
