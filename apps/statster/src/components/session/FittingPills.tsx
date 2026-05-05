import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';

export type PillItem = { id: string; label: string };

interface FittingPillsProps {
  items: PillItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  addLabel?: string;
}

// ── Width measurement helpers ─────────────────────────────────────────────────

const PILL_GAP = 6;

function computeVisibleCount(
  items: PillItem[],
  widths: Record<string, number>,
  moreWidth: number,
  addWidth: number,
  available: number,
): number {
  // "+" is right-aligned; pills flow left into the remaining budget
  const pillsBudget = available - addWidth;
  const allCost = items.reduce((s, item) => s + (widths[item.id] ?? 0) + PILL_GAP, 0);
  if (allCost <= pillsBudget) return items.length;

  // Need a "more" button — find how many pills fit alongside it
  const budget = pillsBudget - (moreWidth + PILL_GAP);
  let count = 0;
  let used = 0;
  for (const item of items) {
    const w = widths[item.id] ?? 0;
    if (used + w + PILL_GAP > budget) break;
    used += w + PILL_GAP;
    count++;
  }
  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PillViewProps {
  label: string;
  selected?: boolean;
  variant?: 'normal' | 'more' | 'add';
  onPress?: () => void;
  onLayout?: (w: number) => void;
}

function PillView({ label, selected, variant = 'normal', onPress, onLayout }: PillViewProps) {
  const isAdd = variant === 'add';
  const isMore = variant === 'more';
  return (
    <TouchableOpacity
      style={[
        pill.base,
        selected && pill.selected,
        isAdd && pill.add,
        isMore && pill.more,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.width) : undefined}
    >
      <Text style={[
        pill.label,
        selected && pill.labelSelected,
        isAdd && pill.labelAdd,
        isMore && pill.labelMore,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const pill = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  selected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBorder,
  },
  more: {
    backgroundColor: Colors.surface,
  },
  add: {
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  label: { ...Typography.label, color: Colors.text },
  labelSelected: { color: Colors.primary, fontWeight: '600' },
  labelMore: { color: Colors.textMuted },
  labelAdd: { color: Colors.primary, fontWeight: '700', fontSize: 17 },
});

// ── Overflow sheet ────────────────────────────────────────────────────────────

function OverflowSheet({
  visible,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  items: PillItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={sheet.panel}>
        <View style={sheet.handle} />
        <ScrollView contentContainerStyle={sheet.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[sheet.row, item.id === selectedId && sheet.rowSelected]}
              onPress={() => { onSelect(item.id); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[sheet.rowLabel, item.id === selectedId && sheet.rowLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.lg, gap: 2 },
  row: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
  rowSelected: { backgroundColor: Colors.primaryLight },
  rowLabel: { ...Typography.body, color: Colors.text },
  rowLabelSelected: { color: Colors.primary, fontWeight: '600' },
});

// ── FittingPills ──────────────────────────────────────────────────────────────

export function FittingPills({ items, selectedId, onSelect, onAdd, addLabel = '+' }: FittingPillsProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [pillWidths, setPillWidths] = useState<Record<string, number>>({});
  const [moreWidth, setMoreWidth] = useState(0);
  const [addWidth, setAddWidth] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const measurePill = useCallback((id: string, w: number) => {
    setPillWidths((prev) => prev[id] === w ? prev : { ...prev, [id]: w });
  }, []);

  const allMeasured = useMemo(
    () => containerWidth > 0 && moreWidth > 0 && (onAdd ? addWidth > 0 : true) && items.every((it) => (pillWidths[it.id] ?? 0) > 0),
    [containerWidth, moreWidth, addWidth, onAdd, items, pillWidths],
  );

  const visibleCount = useMemo(() => {
    if (!allMeasured) return items.length;
    return computeVisibleCount(items, pillWidths, moreWidth, onAdd ? addWidth : 0, containerWidth);
  }, [allMeasured, items, pillWidths, moreWidth, addWidth, onAdd, containerWidth]);

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = items.slice(visibleCount);
  const needsMore = allMeasured && overflowItems.length > 0;

  return (
    <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {/* Invisible measurement pass */}
      <View style={fp.measureLayer} pointerEvents="none">
        {items.map((item) => (
          <PillView key={`m-${item.id}`} label={item.label}
            onLayout={(w) => measurePill(item.id, w)} />
        ))}
        <PillView label="more ▾" onLayout={setMoreWidth} />
        {onAdd && <PillView label={addLabel} variant="add" onLayout={setAddWidth} />}
      </View>

      {/* Visible render */}
      <View style={[fp.row, !onAdd && fp.rowNoAdd]}>
        <View style={fp.pillsGroup}>
          {visibleItems.map((item) => (
            <PillView
              key={item.id}
              label={item.label}
              selected={item.id === selectedId}
              onPress={() => onSelect(item.id)}
            />
          ))}
          {needsMore && (
            <PillView
              label={`${overflowItems.length} more ▾`}
              variant="more"
              onPress={() => setSheetOpen(true)}
            />
          )}
        </View>
        {onAdd && <PillView label={addLabel} variant="add" onPress={onAdd} />}
      </View>

      <OverflowSheet
        visible={sheetOpen}
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const fp = StyleSheet.create({
  measureLayer: {
    position: 'absolute', flexDirection: 'row', opacity: 0,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rowNoAdd: {
    justifyContent: 'flex-start',
  },
  pillsGroup: {
    flexDirection: 'row', flexWrap: 'nowrap', gap: PILL_GAP, flexShrink: 1,
  },
});
