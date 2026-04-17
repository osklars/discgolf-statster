import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
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

const PAD = 32;
const DOT_R = 8;
const GRID_SIZE = 220;

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const steps = Math.round((raw - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

export function Grid2DInput({ param, valueX, valueY, onDragStart, onLiveUpdate, onCommit }: Props) {
  const { axisX, axisY } = param;

  const [containerWidth, setContainerWidth] = useState(300);
  const liveRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);

  // Page-level offsets stored in refs so the PanResponder closure is always current.
  const containerRef = useRef<View>(null);
  const pageOffsetX = useRef(0);
  const pageOffsetY = useRef(0);
  const widthRef = useRef(300);

  // Derived layout (recalculated each render for SVG drawing, refs for pan math)
  const plotSizeFor = (w: number) => Math.min(w - PAD * 2, GRID_SIZE);
  const plotX0For = (w: number) => (w - plotSizeFor(w)) / 2;
  const plotX0Ref = useRef(plotX0For(300));
  const plotSizeRef = useRef(plotSizeFor(300));

  // Convert absolute screen coords to snapped param values.
  const valueForPageXY = (pageX: number, pageY: number): { x: number; y: number } => {
    const relX = pageX - pageOffsetX.current;
    const relY = pageY - pageOffsetY.current;
    const ps = plotSizeRef.current;
    const px0 = plotX0Ref.current;
    const rawX = axisX.min + ((relX - px0) / ps) * (axisX.max - axisX.min);
    const rawY = axisY.min + (1 - (relY - PAD) / ps) * (axisY.max - axisY.min);
    return {
      x: snapToStep(rawX, axisX.min, axisX.max, axisX.step),
      y: snapToStep(rawY, axisY.min, axisY.max, axisY.step),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const v = valueForPageXY(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderMove: (evt) => {
        const v = valueForPageXY(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        liveRef.current = v;
        forceUpdate((n) => n + 1);
        onLiveUpdate(v.x, v.y);
      },
      onPanResponderRelease: (evt) => {
        const v = valueForPageXY(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
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
    containerRef.current?.measure((_x, _y, width, _h, pageX, pageY) => {
      pageOffsetX.current = pageX;
      pageOffsetY.current = pageY;
      widthRef.current = width;
      plotX0Ref.current = plotX0For(width);
      plotSizeRef.current = plotSizeFor(width);
      setContainerWidth(width);
    });
  }, []);

  // SVG drawing values (derived from containerWidth state for render)
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
    <View ref={containerRef} style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
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
        <SvgText x={plotX0} y={plotY0 + plotSize + 18} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle">
          {axisX.lblMin}
        </SvgText>
        <SvgText x={plotX0 + plotSize} y={plotY0 + plotSize + 18} fontSize={Typography.labelSm.fontSize} fill={Colors.textMuted} textAnchor="middle">
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
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
