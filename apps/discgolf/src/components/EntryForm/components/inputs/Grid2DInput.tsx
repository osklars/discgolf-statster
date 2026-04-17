import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';
import { Colors, Typography } from '../../../../constants/theme';
import type { Grid2DParam } from '../../types';

interface Props {
  param: Grid2DParam;
  valueX: number | undefined;
  valueY: number | undefined;
  onDragStart: () => void;
  onLiveUpdate: (x: number, y: number) => void;
  onCommit: (x: number, y: number) => void;
}

const PAD = 26;
const DOT_R = 7;
const GRID_SIZE = 200;

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function Grid2DInput({ param, valueX, valueY, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { axisX, axisY } = param;

  const [containerWidth, setContainerWidth] = useState(300);
  const liveRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);

  const isActiveRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const containerRef = useRef<View>(null);
  // Only X offset is needed — Y uses locationY which is scroll-invariant.
  const pageOffsetX = useRef(0);
  const widthRef = useRef(300);
  const plotX0Ref = useRef(0);
  const plotSizeRef = useRef(GRID_SIZE);

  const plotSizeFor = (w: number) => Math.min(w - PAD * 2, GRID_SIZE);
  const plotX0For = (w: number) => (w - plotSizeFor(w)) / 2;

  // X: uses pageX - pageOffsetX (horizontal scroll is not a concern).
  // Y: uses locationY directly — it's relative to this View, unaffected by vertical scroll.
  const valueFromTouch = (pageX: number, locationY: number): { x: number; y: number } => {
    const relX = pageX - pageOffsetX.current;
    const ps = plotSizeRef.current;
    const px0 = plotX0Ref.current;
    const rawX = axisX.min + ((relX - px0) / ps) * (axisX.max - axisX.min);
    const rawY = axisY.min + (1 - (locationY - PAD) / ps) * (axisY.max - axisY.min);
    return {
      x: snapToStep(rawX, axisX.min, axisX.max, axisX.step),
      y: snapToStep(rawY, axisY.min, axisY.max, axisY.step),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isActiveRef.current,
      onMoveShouldSetPanResponder: () => isActiveRef.current,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const v = valueFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.locationY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderMove: (evt) => {
        const v = valueFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.locationY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderRelease: (evt) => {
        const v = valueFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.locationY);
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

  const onLayout = useCallback(() => {
    containerRef.current?.measure((_x, _y, width, _h, pageX) => {
      pageOffsetX.current = pageX;
      widthRef.current = width;
      plotX0Ref.current = plotX0For(width);
      plotSizeRef.current = plotSizeFor(width);
      setContainerWidth(width);
    });
  }, []);

  // SVG drawing values (derived from state for render, refs used in pan callbacks)
  const plotSize = plotSizeFor(containerWidth);
  const svgWidth = containerWidth;
  const svgHeight = plotSize + PAD * 2;
  const plotX0 = plotX0For(containerWidth);
  const plotY0 = PAD;

  const canvasXForValue = (v: number) =>
    plotX0 + ((v - axisX.min) / (axisX.max - axisX.min)) * plotSize;
  const canvasYForValue = (v: number) =>
    plotY0 + (1 - (v - axisY.min) / (axisY.max - axisY.min)) * plotSize;

  const live = liveRef.current;
  const dispX = live !== null ? live.x : valueX;
  const dispY = live !== null ? live.y : valueY;
  const hasDot = dispX !== undefined && dispY !== undefined;
  const dotCX = hasDot ? canvasXForValue(dispX!) : 0;
  const dotCY = hasDot ? canvasYForValue(dispY!) : 0;

  const xGridValues: number[] = [];
  for (let v = axisX.min; v <= axisX.max + 1e-9; v = parseFloat((v + axisX.majorStep).toFixed(10))) {
    xGridValues.push(v);
  }
  const yGridValues: number[] = [];
  for (let v = axisY.min; v <= axisY.max + 1e-9; v = parseFloat((v + axisY.majorStep).toFixed(10))) {
    yGridValues.push(v);
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <Svg width={svgWidth} height={svgHeight}>
        {/* Border */}
        <Line x1={plotX0} y1={plotY0} x2={plotX0 + plotSize} y2={plotY0} stroke={Colors.separator} strokeWidth={1} />
        <Line x1={plotX0} y1={plotY0 + plotSize} x2={plotX0 + plotSize} y2={plotY0 + plotSize} stroke={Colors.separator} strokeWidth={1} />
        <Line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY0 + plotSize} stroke={Colors.separator} strokeWidth={1} />
        <Line x1={plotX0 + plotSize} y1={plotY0} x2={plotX0 + plotSize} y2={plotY0 + plotSize} stroke={Colors.separator} strokeWidth={1} />

        {/* X grid lines + bottom ticks */}
        {xGridValues.map((v) => {
          const cx = canvasXForValue(v);
          return (
            <React.Fragment key={`xg-${v}`}>
              <Line x1={cx} y1={plotY0} x2={cx} y2={plotY0 + plotSize} stroke={Colors.separator} strokeWidth={0.5} strokeDasharray="3,3" />
              <Line x1={cx} y1={plotY0 + plotSize} x2={cx} y2={plotY0 + plotSize + 4} stroke={Colors.textDisabled} strokeWidth={1} />
            </React.Fragment>
          );
        })}

        {/* Y grid lines + left ticks */}
        {yGridValues.map((v) => {
          const cy = canvasYForValue(v);
          return (
            <React.Fragment key={`yg-${v}`}>
              <Line x1={plotX0} y1={cy} x2={plotX0 + plotSize} y2={cy} stroke={Colors.separator} strokeWidth={0.5} strokeDasharray="3,3" />
              <Line x1={plotX0 - 4} y1={cy} x2={plotX0} y2={cy} stroke={Colors.textDisabled} strokeWidth={1} />
            </React.Fragment>
          );
        })}

        {/* X end labels (bottom) */}
        <SvgText x={plotX0} y={plotY0 + plotSize + 17} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle">
          {axisX.lblMin}
        </SvgText>
        <SvgText x={plotX0 + plotSize} y={plotY0 + plotSize + 17} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle">
          {axisX.lblMax}
        </SvgText>

        {/* Y end labels (left: top=max, bottom=min) */}
        <SvgText x={plotX0 - 6} y={plotY0 + 4} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="end">
          {axisY.lblMax}
        </SvgText>
        <SvgText x={plotX0 - 6} y={plotY0 + plotSize} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="end">
          {axisY.lblMin}
        </SvgText>

        {hasDot && <Circle cx={dotCX} cy={dotCY} r={DOT_R} fill={Colors.primary} />}

        {/* Active ring */}
        {hasDot && isActive && (
          <Circle cx={dotCX} cy={dotCY} r={DOT_R + 4} fill="none" stroke={Colors.primaryBorder} strokeWidth={1} strokeOpacity={0.4} />
        )}
      </Svg>

      {/* Inactive overlay — captures tap to activate without blocking scroll */}
      {!isActive && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(evt) => {
            isActiveRef.current = true;
            setIsActive(true);
            const v = valueFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.locationY);
            liveRef.current = null;
            forceUpdate((n) => n + 1);
            onCommit(v.x, v.y);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
