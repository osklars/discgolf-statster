import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { queryRichEntries } from '../db/queries';
import type { RichEntry } from '../db/queries';
import { getNumberStats, getChoiceStats, getAllChoiceOptions } from '../db/parameters';
import type { NumberStat, ChoiceStat, ChoiceOption } from '../db/types';
import { getLevels, insertLevel } from '../db/levels';
import type { Level } from '../db/levels';

type Props = NativeStackScreenProps<RootStackParamList, 'StatDetail'>;

// ── Filter types ──────────────────────────────────────────────────────────────

type ChoiceFilter = { type: 'named'; statId: string; statName: string; optionId: string; optionLabel: string };
type NumberFilter = { type: 'scalar'; statId: string; statName: string; min: number; max: number };
type ActiveFilter = ChoiceFilter | NumberFilter;

function filterLabel(f: ActiveFilter): string {
  return f.type === 'named' ? f.optionLabel : `${f.statName} ${f.min}–${f.max}`;
}

function filtersToQuery(filters: ActiveFilter[]) {
  return {
    choiceFilters: filters
      .filter((f): f is ChoiceFilter => f.type === 'named')
      .map((f) => ({ statId: f.statId, optionIds: [f.optionId] })),
    numberFilters: filters
      .filter((f): f is NumberFilter => f.type === 'scalar')
      .map((f) => ({ statId: f.statId, min: f.min, max: f.max })),
  };
}

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  entryCount: number | null;
  filters: ActiveFilter[];
  onRemoveFilter: (f: ActiveFilter) => void;
}

function SummaryCard({ entryCount, filters, onRemoveFilter }: SummaryCardProps) {
  return (
    <View style={summary.card}>
      <View style={summary.chipRow}>
        {filters.length === 0 ? (
          <Text style={summary.overallLabel}>Overall</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={summary.chipScroll}>
            {filters.map((f, i) => (
              <TouchableOpacity key={i} style={summary.chip} onPress={() => onRemoveFilter(f)} activeOpacity={0.7}>
                <Text style={summary.chipText}>{filterLabel(f)}</Text>
                <Feather name="x" size={11} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      {entryCount !== null ? (
        <Text style={summary.entryCount}>{entryCount} {entryCount === 1 ? 'entry' : 'entries'}</Text>
      ) : (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
      )}
    </View>
  );
}

const summary = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  chipRow: { minHeight: 28, justifyContent: 'center' },
  chipScroll: { gap: Spacing.sm, flexDirection: 'row' },
  overallLabel: { ...Typography.label, color: Colors.textMuted, fontWeight: '600' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.primaryBorder,
  },
  chipText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  entryCount: { ...Typography.label, color: Colors.textMuted },
});

// ── Shared card primitives ────────────────────────────────────────────────────

export type CardAction = { label: string; onPress: () => void };

function CardHeader({ title, action }: { title: string; action?: CardAction }) {
  return (
    <View style={ch.header}>
      <Text style={ch.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={ch.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ch = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Typography.label, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 },
  actionLabel: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
});

// ── Histogram (self-contained, with optional editable range slider) ────────────
//
// All slider state lives here. The parent reads the selected range imperatively
// via the forwarded ref when the user taps Apply.
//
// PanResponder closures reference only module-level functions and stable refs —
// no component-scoped captures that could go stale.

const H_BARS = 10;
const BAR_W = 18;
const BAR_GAP = 3;
const CHART_H = 44;
const CHART_W = H_BARS * (BAR_W + BAR_GAP) - BAR_GAP; // 207px

const KNOB = 22;
const TRACK_W = CHART_W - KNOB; // usable knob travel: 185px

function snapVal(raw: number, min: number, max: number, step: number): number {
  if (step <= 0) return Math.min(max, Math.max(min, raw));
  return Math.min(max, Math.max(min, min + Math.round((raw - min) / step) * step));
}

function valToPx(v: number, min: number, max: number): number {
  return max === min ? 0 : ((v - min) / (max - min)) * TRACK_W;
}

function pxToVal(px: number, min: number, max: number, step: number): number {
  return snapVal(min + (Math.max(0, Math.min(TRACK_W, px)) / TRACK_W) * (max - min), min, max, step);
}

type HistogramHandle = { getCurrentRange(): { min: number; max: number } };

interface HistogramProps {
  values: number[];
  paramMin: number;
  paramMax: number;
  step: number;
  unit?: string;
  editable: boolean;
  activeFilter?: { min: number; max: number };
  onToggle(): void;
}

const Histogram = forwardRef<HistogramHandle, HistogramProps>(function Histogram(
  { values, paramMin, paramMax, step, unit, editable, activeFilter, onToggle },
  ref,
) {
  // Two independent handle positions — neither is inherently "min" or "max".
  // The selected range is always derived as [min(h1, h2), max(h1, h2)].
  const [h1, setH1State] = useState(activeFilter?.min ?? paramMin);
  const [h2, setH2State] = useState(activeFilter?.max ?? paramMax);
  const h1Ref = useRef(h1);
  const h2Ref = useRef(h2);

  // Stable setters that keep state and refs in sync.
  // useState setters are guaranteed stable across renders.
  const setH1 = useRef((v: number) => { h1Ref.current = v; setH1State(v); }).current;
  const setH2 = useRef((v: number) => { h2Ref.current = v; setH2State(v); }).current;

  useImperativeHandle(ref, () => ({
    getCurrentRange: () => ({
      min: Math.min(h1Ref.current, h2Ref.current),
      max: Math.max(h1Ref.current, h2Ref.current),
    }),
  }));

  // Reset to active filter (or param bounds) whenever the card collapses.
  useEffect(() => {
    if (!editable) {
      setH1(activeFilter?.min ?? paramMin);
      setH2(activeFilter?.max ?? paramMax);
    }
  // setH1/setH2 are stable; eslint can't verify that, so deps include them.
  }, [editable, activeFilter, paramMin, paramMax, setH1, setH2]);

  // PanResponders created once — closures capture only refs, stable setters,
  // and module-level functions. paramMin/paramMax/step from first render are
  // fine since they come from DB param rows and don't change at runtime.
  const h1Pan = useRef((() => {
    let startPx = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { startPx = valToPx(h1Ref.current, paramMin, paramMax); },
      onPanResponderMove: (_, gs) => {
        setH1(pxToVal(startPx + gs.dx, paramMin, paramMax, step));
      },
    });
  })()).current;

  const h2Pan = useRef((() => {
    let startPx = TRACK_W;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { startPx = valToPx(h2Ref.current, paramMin, paramMax); },
      onPanResponderMove: (_, gs) => {
        setH2(pxToVal(startPx + gs.dx, paramMin, paramMax, step));
      },
    });
  })()).current;

  // Histogram buckets in param space so bar positions align with the slider.
  const paramRange = paramMax - paramMin;
  const buckets = Array(H_BARS).fill(0) as number[];
  for (const v of values) {
    const idx = paramRange === 0 ? 0
      : Math.min(H_BARS - 1, Math.floor(((v - paramMin) / paramRange) * H_BARS));
    buckets[idx]++;
  }
  const maxBucket = Math.max(...buckets, 1);

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const h1Px = valToPx(h1, paramMin, paramMax);
  const h2Px = valToPx(h2, paramMin, paramMax);
  const rangeMin = Math.min(h1, h2);
  const rangeMax = Math.max(h1, h2);
  const fillLeft = Math.min(h1Px, h2Px);
  const fillWidth = Math.abs(h2Px - h1Px);
  const trackTop = (KNOB - 4) / 2;

  return (
    <View style={hist.wrap}>
      {/* Histogram bars — tapping toggles editable mode */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.75}>
        <Svg width={CHART_W} height={CHART_H}>
          {buckets.map((count, i) => {
            const h = Math.max(2, (count / maxBucket) * CHART_H);
            const x = i * (BAR_W + BAR_GAP);
            const bStart = paramMin + (i / H_BARS) * paramRange;
            const bEnd   = paramMin + ((i + 1) / H_BARS) * paramRange;
            const inRange = rangeMax >= bStart && rangeMin <= bEnd;
            return (
              <Rect key={i} x={x} y={CHART_H - h} width={BAR_W} height={h} rx={2}
                fill={inRange ? Colors.primary : Colors.separator} />
            );
          })}
        </Svg>
      </TouchableOpacity>

      {/* Range slider — directly below histogram, same width */}
      {editable && (
        <View style={{ width: CHART_W, height: KNOB }}>
          {/* inactive track */}
          <View pointerEvents="none" style={{
            position: 'absolute', left: KNOB / 2, right: KNOB / 2,
            top: trackTop, height: 4, borderRadius: 2,
            backgroundColor: Colors.separator,
          }} />
          {/* active fill between knob centers */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: trackTop, height: 4, borderRadius: 2,
            left: fillLeft + KNOB / 2, width: fillWidth,
            backgroundColor: Colors.primary,
          }} />
          <View style={[hist.knob, { left: h1Px, zIndex: 1 }]} {...h1Pan.panHandlers} />
          <View style={[hist.knob, { left: h2Px, zIndex: 2 }]} {...h2Pan.panHandlers} />
        </View>
      )}

      {/* Stats always at the bottom */}
      <View style={hist.stats}>
        <Text style={hist.stat}>min {dataMin}{unit ?? ''}</Text>
        <Text style={hist.stat}>avg {avg.toFixed(1)}{unit ?? ''}</Text>
        <Text style={hist.stat}>max {dataMax}{unit ?? ''}</Text>
        <Text style={hist.stat}>{values.length} entries</Text>
      </View>
    </View>
  );
});

const hist = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  knob: {
    position: 'absolute', top: 0,
    width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    backgroundColor: Colors.surface,
    borderWidth: 2, borderColor: Colors.primary,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  stats: { flexDirection: 'row', gap: Spacing.lg },
  stat: { ...Typography.labelSm, color: Colors.textMuted },
});

// ── Named param card ──────────────────────────────────────────────────────────

const NAMED_PREVIEW_ROWS = 2;
const OPTION_ROW_H = 32;

interface ChoiceStatCardProps {
  param: ChoiceStat;
  options: ChoiceOption[];
  entries: RichEntry[];
  expanded: boolean;
  onExpand(): void;
  onCollapse(): void;
  onSelect(optionId: string, optionLabel: string): void;
}

function ChoiceStatCard({ param, options, entries, expanded, onExpand, onCollapse, onSelect }: ChoiceStatCardProps) {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    for (const dp of entry.named) {
      if (dp.statId === param.id) counts[dp.optionId] = (counts[dp.optionId] ?? 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const withData = options
    .filter((o) => (counts[o.id] ?? 0) > 0)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));

  if (withData.length === 0) return null;

  const shown = expanded ? withData : withData.slice(0, NAMED_PREVIEW_ROWS);
  const hiddenCount = withData.length - NAMED_PREVIEW_ROWS;

  const action: CardAction | undefined = expanded
    ? { label: 'Done', onPress: onCollapse }
    : hiddenCount > 0
      ? { label: `+${hiddenCount} more`, onPress: onExpand }
      : undefined;

  return (
    <View style={card.container}>
      <CardHeader title={param.name} action={action} />
      <View>
        {shown.map((opt) => {
          const count = counts[opt.id] ?? 0;
          const pct = total > 0 ? count / total : 0;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[card.optionRow, { height: OPTION_ROW_H }]}
              activeOpacity={0.7}
              onPress={() => { onSelect(opt.id, opt.label); onCollapse(); }}
            >
              <Text style={card.optionLabel} numberOfLines={1}>{opt.label}</Text>
              <View style={card.barWrap}>
                <View style={[card.barFill, { flex: pct }]} />
                <View style={{ flex: 1 - pct }} />
              </View>
              <Text style={card.optionCount}>{count}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Placeholder keeps card height fixed when there's only 1 option */}
        {!expanded && withData.length === 1 && (
          <View style={{ height: OPTION_ROW_H }} pointerEvents="none" />
        )}
      </View>
    </View>
  );
}

// ── Number stat card ─────────────────────────────────────────────────────────

interface NumberStatCardProps {
  param: NumberStat;
  entries: RichEntry[];
  expanded: boolean;
  onExpand(): void;
  onCollapse(): void;
  activeFilter: NumberFilter | undefined;
  onApply(min: number, max: number): void;
}

function NumberStatCard({ param, entries, expanded, onExpand, onCollapse, activeFilter, onApply }: NumberStatCardProps) {
  const histRef = useRef<HistogramHandle>(null);

  const values: number[] = [];
  for (const entry of entries) {
    for (const dp of entry.scalars) {
      if (dp.statId === param.id) values.push(dp.value);
    }
  }

  if (values.length === 0) return null;

  const action: CardAction | undefined = expanded
    ? {
        label: 'Apply',
        onPress: () => {
          const r = histRef.current?.getCurrentRange();
          if (r) onApply(r.min, r.max);
          onCollapse();
        },
      }
    : undefined;

  return (
    <View style={card.container}>
      <CardHeader title={param.name} action={action} />
      <Histogram
        ref={histRef}
        values={values}
        paramMin={param.min}
        paramMax={param.max}
        step={param.step}
        unit={param.unit ?? undefined}
        editable={expanded}
        activeFilter={activeFilter}
        onToggle={expanded ? onCollapse : onExpand}
      />
    </View>
  );
}

const card = StyleSheet.create({
  container: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionLabel: { ...Typography.label, color: Colors.text, width: 90 },
  barWrap: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.separator, flexDirection: 'row', overflow: 'hidden' },
  barFill: { backgroundColor: Colors.primary, borderRadius: 3 },
  optionCount: { ...Typography.labelSm, color: Colors.textMuted, width: 28, textAlign: 'right' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export function StatDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const initialFilters: ActiveFilter[] = (route.params?.filters ?? []).map((f) => ({
    type: 'named' as const,
    statId: f.statId,
    statName: f.statName,
    optionId: f.optionId,
    optionLabel: f.optionLabel,
  }));
  const [filters, setFilters] = useState<ActiveFilter[]>(initialFilters);
  const [entries, setEntries] = useState<RichEntry[]>([]);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [numberStats, setNumberStats] = useState<NumberStat[]>([]);
  const [choiceStats, setChoiceStats] = useState<ChoiceStat[]>([]);
  const [allOptions, setAllOptions] = useState<ChoiceOption[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statEntryCount, setStatEntryCount] = useState<Record<string, number>>({});
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [savedLevels, setSavedLevels] = useState<Level[]>([]);

  useEffect(() => {
    Promise.all([getNumberStats(), getChoiceStats(), getAllChoiceOptions()])
      .then(([scalars, named, options]) => {
        setNumberStats(scalars);
        setChoiceStats(named);
        setAllOptions(options);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    getLevels().then(setSavedLevels).catch(console.error);
  }, []);

  const reload = useCallback(async (activeFilters: ActiveFilter[]) => {
    const query = filtersToQuery(activeFilters);
    const richEntries = await queryRichEntries(query);
    const counts: Record<string, number> = {};
    for (const entry of richEntries) {
      const seen = new Set<string>();
      for (const dp of [...entry.scalars, ...entry.named]) {
        if (!seen.has(dp.statId)) {
          seen.add(dp.statId);
          counts[dp.statId] = (counts[dp.statId] ?? 0) + 1;
        }
      }
    }
    setEntries(richEntries);
    setEntryCount(richEntries.length);
    setStatEntryCount(counts);
    setInitialLoading(false);
  }, []);

  useEffect(() => { reload(filters).catch(console.error); }, [filters, reload]);
  useEffect(() => {
    return navigation.addListener('focus', () => {
      reload(filters).catch(console.error);
      getLevels().then(setSavedLevels).catch(console.error);
    });
  }, [navigation, filters, reload]);

  const choiceFilters = filters.filter((f): f is ChoiceFilter => f.type === 'named');

  const existingLevel = choiceFilters.length > 0
    ? savedLevels.find((lv) =>
        lv.filters.length === choiceFilters.length &&
        lv.filters.every((lf) => choiceFilters.some((cf) => cf.statId === lf.statId && cf.optionId === lf.optionId)),
      )
    : undefined;

  const handleStarPress = useCallback(() => {
    if (choiceFilters.length === 0) return;
    if (existingLevel) {
      navigation.navigate('LevelCelebration', { levelId: existingLevel.id });
      return;
    }
    Alert.prompt(
      'Save level',
      'Give this filter set a name:',
      async (name) => {
        if (!name?.trim()) return;
        const id = await insertLevel(name.trim(), choiceFilters.map((f) => ({ statId: f.statId, optionId: f.optionId })));
        setSavedLevels(await getLevels());
        navigation.navigate('LevelCelebration', { levelId: id });
      },
      'plain-text',
      '',
    );
  }, [choiceFilters, existingLevel, navigation]);

  const filteredStatIds = new Set(filters.map((f) => f.statId));

  const toggleExpanded = useCallback((id: string) => {
    setExpandedStatId((prev) => (prev === id ? null : id));
  }, []);

  const addChoiceFilter = useCallback((statId: string, statName: string, optionId: string, optionLabel: string) => {
    setFilters((prev) => {
      const without = prev.filter((f) => !(f.type === 'named' && f.statId === statId));
      return [...without, { type: 'named', statId, statName, optionId, optionLabel }];
    });
    setExpandedStatId(null);
  }, []);

  const addNumberFilter = useCallback((statId: string, statName: string, min: number, max: number) => {
    setFilters((prev) => {
      const without = prev.filter((f) => !(f.type === 'scalar' && f.statId === statId));
      return [...without, { type: 'scalar', statId, statName, min, max }];
    });
    setExpandedStatId(null);
  }, []);

  const removeFilter = useCallback((toRemove: ActiveFilter) => {
    setFilters((prev) => prev.filter((f) => f.statId !== toRemove.statId));
  }, []);

  const sortedChoice = [...choiceStats]
    .filter((p) => !filteredStatIds.has(p.id))
    .sort((a, b) => (statEntryCount[b.id] ?? 0) - (statEntryCount[a.id] ?? 0));

  const sortedNumber = [...numberStats]
    .filter((p) => !filteredStatIds.has(p.id))
    .sort((a, b) => (statEntryCount[b.id] ?? 0) - (statEntryCount[a.id] ?? 0));

  const starElement = (
    <TouchableOpacity
      onPress={handleStarPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      disabled={choiceFilters.length === 0}
    >
      <Ionicons
        name={existingLevel ? 'star' : 'star-outline'}
        size={22}
        color={choiceFilters.length === 0 ? Colors.textDisabled : existingLevel ? '#F5A623' : Colors.textMuted}
      />
    </TouchableOpacity>
  );

  if (initialLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Stats" onBack={() => navigation.goBack()} rightElement={starElement} />
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Stats" onBack={() => navigation.goBack()} rightElement={starElement} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <SummaryCard entryCount={entryCount} filters={filters} onRemoveFilter={removeFilter} />

        {sortedChoice.map((param) => {
          const options = allOptions.filter((o) => o.statId === param.id && o.archivedAt === null);
          const expanded = expandedStatId === param.id;
          return (
            <ChoiceStatCard
              key={param.id}
              param={param}
              options={options}
              entries={entries}
              expanded={expanded}
              onExpand={() => toggleExpanded(param.id)}
              onCollapse={() => setExpandedStatId(null)}
              onSelect={(optionId, optionLabel) => addChoiceFilter(param.id, param.name, optionId, optionLabel)}
            />
          );
        })}

        {sortedNumber.map((param) => {
          const expanded = expandedStatId === param.id;
          const activeFilter = filters.find((f): f is NumberFilter => f.type === 'scalar' && f.statId === param.id);
          return (
            <NumberStatCard
              key={param.id}
              param={param}
              entries={entries}
              expanded={expanded}
              onExpand={() => toggleExpanded(param.id)}
              onCollapse={() => setExpandedStatId(null)}
              activeFilter={activeFilter}
              onApply={(min, max) => addNumberFilter(param.id, param.name, min, max)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
});
