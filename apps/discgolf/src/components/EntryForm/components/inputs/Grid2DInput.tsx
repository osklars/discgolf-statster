import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../../../constants/theme';
import type { Grid2DParam } from '../../types';

interface Props {
  param: Grid2DParam;
  valueX: number | undefined;
  valueY: number | undefined;
  onDragStart: () => void;
  onLiveUpdate: (x: number, y: number) => void;
  onCommit: (x: number, y: number) => void;
}

const PAD = 32; // space for labels
const DOT_R = 8;
const GRID_SIZE = 220; // square plot area

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function Grid2DInput({ param, valueX, valueY, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { axisX, axisY } = param;
  const [containerWidth, setContainerWidth] = useState(300);
  const liveRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);

  // The grid is square: use min(containerWidth - PAD * 2, GRID_SIZE)
  const plotSize = Math.min(containerWidth - PAD * 2, GRID_SIZE);
  const svgWidth = containerWidth;
  const svgHeight = plotSize + PAD * 2;
  const plotX0 = (svgWidth - plotSize) / 2; // centre horizontally
  const plotY0 = PAD;

  function canvasXForValue(v: number): number {
    return plotX0 + ((v - axisX.min) / (axisX.max - axisX.min)) * plotSize;
  }
  function canvasYForValue(v: number): number {
    // Y axis: min at bottom, max at top → invert
    return plotY0 + (1 - (v - axisY.min) / (axisY.max - axisY.min)) * plotSize;
  }

  function valueForCanvasXY(cx: number, cy: number): { x: number; y: number } {
    const rawX = axisX.min + ((cx - plotX0) / plotSize) * (axisX.max - axisX.min);
    const rawY = axisY.min + (1 - (cy - plotY0) / plotSize) * (axisY.max - axisY.min);
    return {
      x: snapToStep(rawX, axisX.min, axisX.max, axisX.step),
      y: snapToStep(rawY, axisY.min, axisY.max, axisY.step),
    };
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const { locationX, locationY } = evt.nativeEvent;
        const v = valueForCanvasXY(locationX, locationY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const v = valueForCanvasXY(locationX, locationY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const v = valueForCanvasXY(locationX, locationY);
        liveRef.current = null;
        forceUpdate((n) => n + 1);
        onCommit(v.x, v.y);
      },
      onPanResponderTerminate: () => {
        liveRef.current = null;
        forceUpdate((n) => n + 1);
      },
    }),
  ).current;

  const live = liveRef.current;
  const dispX = live !== null ? live.x : valueX;
  const dispY = live !== null ? live.y : valueY;
  const hasDot = dispX !== undefined && dispY !== undefined;
  const dotCX = hasDot ? canvasXForValue(dispX!) : 0;
  const dotCY = hasDot ? canvasYForValue(dispY!) : 0;

  // Grid lines at majorStep for each axis
  const xGridValues: number[] = [];
  for (
    let v = axisX.min;
    v <= axisX.max + 1e-9;
    v = parseFloat((v + axisX.majorStep).toFixed(10))
  ) {
    xGridValues.push(v);
  }
  const yGridValues: number[] = [];
  for (
    let v = axisY.min;
    v <= axisY.max + 1e-9;
    v = parseFloat((v + axisY.majorStep).toFixed(10))
  ) {
    yGridValues.push(v);
  }

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setContainerWidth(e.nativeEvent.layout.width);
    },
    [],
  );

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <Svg width={svgWidth} height={svgHeight}>
        {/* Plot background */}
        <Line
          x1={plotX0} y1={plotY0}
          x2={plotX0 + plotSize} y2={plotY0}
          stroke={Colors.separator} strokeWidth={1}
        />
        <Line
          x1={plotX0} y1={plotY0 + plotSize}
          x2={plotX0 + plotSize} y2={plotY0 + plotSize}
          stroke={Colors.separator} strokeWidth={1}
        />
        <Line
          x1={plotX0} y1={plotY0}
          x2={plotX0} y2={plotY0 + plotSize}
          stroke={Colors.separator} strokeWidth={1}
        />
        <Line
          x1={plotX0 + plotSize} y1={plotY0}
          x2={plotX0 + plotSize} y2={plotY0 + plotSize}
          stroke={Colors.separator} strokeWidth={1}
        />

        {/* X grid lines + bottom ticks */}
        {xGridValues.map((v) => {
          const cx = canvasXForValue(v);
          return (
            <React.Fragment key={`xg-${v}`}>
              <Line
                x1={cx} y1={plotY0}
                x2={cx} y2={plotY0 + plotSize}
                stroke={Colors.separator} strokeWidth={0.5} strokeDasharray="3,3"
              />
              <Line
                x1={cx} y1={plotY0 + plotSize}
                x2={cx} y2={plotY0 + plotSize + 4}
                stroke={Colors.textDisabled} strokeWidth={1}
              />
            </React.Fragment>
          );
        })}

        {/* Y grid lines + left ticks */}
        {yGridValues.map((v) => {
          const cy = canvasYForValue(v);
          return (
            <React.Fragment key={`yg-${v}`}>
              <Line
                x1={plotX0} y1={cy}
                x2={plotX0 + plotSize} y2={cy}
                stroke={Colors.separator} strokeWidth={0.5} strokeDasharray="3,3"
              />
              <Line
                x1={plotX0 - 4} y1={cy}
                x2={plotX0} y2={cy}
                stroke={Colors.textDisabled} strokeWidth={1}
              />
            </React.Fragment>
          );
        })}

        {/* X axis end labels (bottom) */}
        <SvgText
          x={plotX0}
          y={plotY0 + plotSize + 18}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="middle"
        >
          {axisX.lblMin}
        </SvgText>
        <SvgText
          x={plotX0 + plotSize}
          y={plotY0 + plotSize + 18}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="middle"
        >
          {axisX.lblMax}
        </SvgText>

        {/* Y axis end labels (left side: top=max, bottom=min) */}
        <SvgText
          x={plotX0 - 6}
          y={plotY0 + 4}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="end"
        >
          {axisY.lblMax}
        </SvgText>
        <SvgText
          x={plotX0 - 6}
          y={plotY0 + plotSize}
          fontSize={Typography.labelSm.fontSize}
          fill={Colors.textMuted}
          textAnchor="end"
        >
          {axisY.lblMin}
        </SvgText>

        {/* Dot */}
        {hasDot && (
          <Circle cx={dotCX} cy={dotCY} r={DOT_R} fill={Colors.primary} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
