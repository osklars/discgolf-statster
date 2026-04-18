import React, { useRef } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, HIT_SLOP, Spacing, Typography, hairline } from '../../../constants/theme';
import type { Param } from '../types';

interface Props {
  param: Param;
  isDragging: boolean;
  isCombineTarget: boolean;
  combineSourceAsX: boolean; // true = left half (source→X) highlighted
  onRemove: () => void;
  onOpenSettings: () => void;
  onLayout: (contentY: number, height: number) => void;
  onDragHandleGrant: (pageY: number, pageX: number) => void;
  onDragHandleMove: (pageY: number, pageX: number) => void;
  onDragHandleRelease: () => void;
}

const TYPE_LABELS: Record<Param['type'], string> = {
  scalar: 'scalar',
  named: 'named',
  grid2d: '2D',
};

export function EditParamRow({
  param,
  isDragging,
  isCombineTarget,
  combineSourceAsX,
  onRemove,
  onOpenSettings,
  onLayout,
  onDragHandleGrant,
  onDragHandleMove,
  onDragHandleRelease,
}: Props) {
  // Keep latest callbacks in a ref so the PanResponder closure is never stale
  const cbRef = useRef({ onDragHandleGrant, onDragHandleMove, onDragHandleRelease });
  cbRef.current = { onDragHandleGrant, onDragHandleMove, onDragHandleRelease };

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) =>
        cbRef.current.onDragHandleGrant(e.nativeEvent.pageY, e.nativeEvent.pageX),
      onPanResponderMove: (e) =>
        cbRef.current.onDragHandleMove(e.nativeEvent.pageY, e.nativeEvent.pageX),
      onPanResponderRelease: () => cbRef.current.onDragHandleRelease(),
      onPanResponderTerminate: () => cbRef.current.onDragHandleRelease(),
    }),
  ).current;

  return (
    <View
      style={[styles.row, isDragging && styles.rowDragging]}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
    >
      {/* Delete — leftmost */}
      <TouchableOpacity onPress={onRemove} hitSlop={HIT_SLOP} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>

      {/* Name + type badge */}
      <View style={styles.nameArea}>
        <Text style={styles.nameText} numberOfLines={1}>
          {param.name}
        </Text>
        <Text style={styles.typeBadge}>{TYPE_LABELS[param.type]}</Text>
      </View>

      {/* Settings */}
      <TouchableOpacity onPress={onOpenSettings} hitSlop={HIT_SLOP} style={styles.settingsBtn}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>

      {/* Drag handle — rightmost */}
      <View style={styles.dragHandle} {...dragPan.panHandlers}>
        <Text style={styles.dragHandleIcon}>≡</Text>
      </View>

      {/* Combine overlay — only when this row is a valid drop target */}
      {isCombineTarget && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.combineOverlay}>
            <View style={[styles.combineZone, combineSourceAsX && styles.combineZoneActive]}>
              <Text style={[styles.combineLabel, combineSourceAsX && styles.combineLabelActive]}>
                ← X
              </Text>
            </View>
            <View style={styles.combineDivider} />
            <View style={[styles.combineZone, !combineSourceAsX && styles.combineZoneActive]}>
              <Text style={[styles.combineLabel, !combineSourceAsX && styles.combineLabelActive]}>
                Y →
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  rowDragging: {
    opacity: 0.35,
  },
  deleteBtn: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
    color: '#EF4444',
    lineHeight: 24,
  },
  nameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameText: {
    ...Typography.body,
    color: Colors.text,
    flexShrink: 1,
  },
  typeBadge: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  settingsBtn: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  dragHandle: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleIcon: {
    fontSize: 18,
    color: Colors.textDisabled,
    letterSpacing: 1,
  },
  combineOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(12, 68, 124, 0.06)',
  },
  combineZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combineZoneActive: {
    backgroundColor: Colors.primaryLight,
  },
  combineDivider: {
    width: hairline,
    alignSelf: 'stretch',
    backgroundColor: Colors.primaryBorder,
  },
  combineLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  combineLabelActive: {
    color: Colors.primary,
  },
});
