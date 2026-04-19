import React, { useCallback, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';
import type { FormDefinition, NamedParam, Param, ScalarParam } from './types';
import { ParamRow } from './components/ParamRow';
import { StickyBar } from './components/StickyBar';
import { FormHeader } from './components/FormHeader';
import { EditParamRow } from './components/EditParamRow';
import { EditModeBar } from './components/EditModeBar';
import { ParamSettingsSheet } from './components/ParamSettingsSheet';
import { AddParamSheet } from './components/AddParamSheet';
import { useEntryForm } from './hooks/useEntryForm';
import { useEditForm } from './hooks/useEditForm';

// ─── Initial form definition ──────────────────────────────────────────────────

const PRACTICE_ROUND: FormDefinition = {
  id: 'practice_round',
  name: 'Practice round',
  params: [
    {
      id: 'disc',
      name: 'Disc',
      type: 'named',
      options: [
        { id: 'd1', label: 'Destroyer' },
        { id: 'd2', label: 'Buzzz' },
        { id: 'd3', label: 'Luna' },
        { id: 'd4', label: 'Roc3' },
        { id: 'd5', label: 'Wraith' },
        { id: 'd6', label: 'Aviar' },
      ],
    },
    {
      id: 'hand',
      name: 'Hand',
      type: 'named',
      options: [
        { id: 'bh', label: 'Backhand' },
        { id: 'fh', label: 'Forehand' },
      ],
    },
    {
      id: 'lie',
      name: 'Lie',
      type: 'named',
      options: [
        { id: 'tee', label: 'Tee' },
        { id: 'fair', label: 'Fairway' },
        { id: 'scr', label: 'Scramble' },
        { id: 'app', label: 'Approach' },
        { id: 'putt', label: 'Putt' },
      ],
    },
    {
      id: 'diff',
      name: 'Difficulty',
      type: 'scalar',
      min: 1,
      max: 10,
      step: 1,
      majorStep: 1,
      lblMin: 'easy',
      lblMax: 'hard',
    },
    {
      id: 'hyzer_i',
      name: 'Hyzer (intended)',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'hyzer',
      lblMax: 'anhyzer',
    },
    {
      id: 'nose_i',
      name: 'Nose (intended)',
      type: 'scalar',
      min: -5,
      max: 5,
      step: 1,
      majorStep: 1,
      lblMin: 'nose ↓',
      lblMax: 'nose ↑',
    },
    {
      id: 'exec',
      name: 'Execution',
      type: 'scalar',
      min: 1,
      max: 10,
      step: 1,
      majorStep: 1,
      lblMin: 'shank',
      lblMax: 'pured',
    },
    {
      id: 'throw_dist',
      name: 'Distance',
      type: 'scalar',
      min: 0,
      max: 200,
      step: 5,
      majorStep: 50,
      unit: 'm',
      lblMin: '0m',
      lblMax: '200m',
    },
    {
      id: 'height',
      name: 'Height',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'low',
      lblMax: 'high',
    },
    {
      id: 'line',
      name: 'Line',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'early',
      lblMax: 'pulled',
    },
    {
      id: 'form',
      name: 'Form',
      type: 'scalar',
      min: -2,
      max: 2,
      step: 1,
      majorStep: 1,
      lblMin: 'strenuous',
      lblMax: 'smooth',
    },
  ],
};

const DEMO_HOLE = { holeNumber: 4, distanceM: 152, par: 3, throwNumber: 2 };

// ─── Library helpers ──────────────────────────────────────────────────────────

function extractLibraryParams(params: Param[]): (ScalarParam | NamedParam)[] {
  const result: (ScalarParam | NamedParam)[] = [];
  for (const p of params) {
    if (p.type === 'grid2d') {
      result.push(p.axisX, p.axisY);
    } else {
      result.push(p as ScalarParam | NamedParam);
    }
  }
  return result;
}

function getParamIdsInDraft(draft: Param[]): Set<string> {
  const ids = new Set<string>();
  for (const p of draft) {
    if (p.type === 'grid2d') {
      ids.add(p.axisX.id);
      ids.add(p.axisY.id);
    } else {
      ids.add(p.id);
    }
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────

interface EntryFormProps {
  onBack?: () => void;
}

export function EntryForm({ onBack }: EntryFormProps = {}) {
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([PRACTICE_ROUND]);
  const [activeId, setActiveId] = useState(PRACTICE_ROUND.id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [paramLibrary, setParamLibrary] = useState<(ScalarParam | NamedParam)[]>(() =>
    extractLibraryParams(PRACTICE_ROUND.params),
  );
  // Increment to force-remount the edit form and reset its state
  const [editKey, setEditKey] = useState(0);

  const activeDef = formDefs.find((f) => f.id === activeId) ?? formDefs[0];

  // ── View mode ──────────────────────────────────────────────────────────────
  const form = useEntryForm(activeDef.params);
  const scrollRef = useRef<ScrollView>(null);

  const handleDragStart = useCallback(() => {
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  }, []);

  const wrapCommit = useCallback(
    (paramId: string, value: string) => {
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      form.setValue(paramId, value);
    },
    [form],
  );

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const enterEdit = () => {
    setEditKey((k) => k + 1);
    setIsEditMode(true);
  };

  const handleOverwrite = useCallback(
    (draft: Param[]) => {
      setFormDefs((prev) =>
        prev.map((f) => (f.id === activeDef.id ? { ...f, params: draft } : f)),
      );
      setIsEditMode(false);
    },
    [activeDef.id],
  );

  const handleSaveAsNew = useCallback(
    (draft: Param[]) => {
      Alert.prompt(
        'Save as new',
        'Enter a name for the new form',
        (name) => {
          if (!name?.trim()) return;
          const newDef: FormDefinition = {
            id: `form_${Date.now()}`,
            name: name.trim(),
            params: draft,
          };
          setFormDefs((prev) => [...prev, newDef]);
          setActiveId(newDef.id);
          setIsEditMode(false);
        },
        'plain-text',
        activeDef.name,
      );
    },
    [activeDef.name],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <FormHeader name={activeDef.name} isEditMode={isEditMode} onEditPress={enterEdit} onBack={onBack} />

      {!isEditMode && (
        <FormTabs defs={formDefs} activeId={activeId} onSelect={setActiveId} />
      )}

      {isEditMode ? (
        <EditModeContent
          key={editKey}
          formDef={activeDef}
          paramLibrary={paramLibrary}
          onAddToLibrary={(param) =>
            setParamLibrary((prev) =>
              prev.some((p) => p.id === param.id) ? prev : [...prev, param],
            )
          }
          onOverwrite={handleOverwrite}
          onSaveAsNew={handleSaveAsNew}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {form.params.map((param) => (
              <ParamRow
                key={param.id}
                param={param}
                value={form.values[param.id]}
                isExpanded={form.expandedIds.has(param.id)}
                onToggle={() => form.toggleExpanded(param.id)}
                onCommit={(v) => wrapCommit(param.id, v)}
                onClear={() => form.clearValue(param.id)}
                formatValue={form.formatValue}
                onDragStart={handleDragStart}
              />
            ))}
          </ScrollView>

          <StickyBar
            holeContext={DEMO_HOLE}
            onAction={() => console.log('Log throw', form.values)}
          />
        </>
      )}
    </View>
  );
}

// ─── Edit mode sub-component ──────────────────────────────────────────────────

type DragState = {
  paramId: string;
  pageY: number;  // current touch screen Y
  pageX: number;  // current touch screen X
  offsetY: number; // touch Y - row top screen Y (captured at drag start)
  rowHeight: number;
};

interface EditModeProps {
  formDef: FormDefinition;
  paramLibrary: (ScalarParam | NamedParam)[];
  onAddToLibrary: (param: ScalarParam | NamedParam) => void;
  onOverwrite: (draft: Param[]) => void;
  onSaveAsNew: (draft: Param[]) => void;
  onCancel: () => void;
}

function EditModeContent({
  formDef,
  paramLibrary,
  onAddToLibrary,
  onOverwrite,
  onSaveAsNew,
  onCancel,
}: EditModeProps) {
  const edit = useEditForm(formDef);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [drag, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const setDrag = useCallback((d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  }, []);

  // ── Layout tracking ────────────────────────────────────────────────────────
  // content Y and height of each row (onLayout y = offset within ScrollView content)
  const rowContentY = useRef<Map<string, number>>(new Map());
  const rowHeights = useRef<Map<string, number>>(new Map());

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const scrollContainerRef = useRef<View>(null);
  const scrollContainerPageY = useRef(0);

  const rootRef = useRef<View>(null);
  const rootPageY = useRef(0);

  // ── Drag handlers (kept in ref so PanResponder closures are never stale) ───
  const editRef = useRef(edit);
  editRef.current = edit;

  const dragHandlers = useRef({
    onGrant: (paramId: string, pageY: number, pageX: number) => {
      const contentY = rowContentY.current.get(paramId) ?? 0;
      const h = rowHeights.current.get(paramId) ?? 48;
      const rowScreenY = scrollContainerPageY.current + contentY - scrollY.current;
      const offsetY = pageY - rowScreenY;
      scrollRef.current?.setNativeProps({ scrollEnabled: false });
      dragRef.current = { paramId, pageY, pageX, offsetY, rowHeight: h };
      setDragState({ paramId, pageY, pageX, offsetY, rowHeight: h });
    },
    onMove: (pageY: number, pageX: number) => {
      if (!dragRef.current) return;
      const next = { ...dragRef.current, pageY, pageX };
      dragRef.current = next;
      setDragState(next);
    },
    onRelease: () => {
      const d = dragRef.current;
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      dragRef.current = null;
      setDragState(null);
      if (!d) return;

      const e = editRef.current;
      const overId = (() => {
        for (const param of e.draft) {
          if (param.id === d.paramId) continue;
          const contentY = rowContentY.current.get(param.id);
          const h = rowHeights.current.get(param.id);
          if (contentY === undefined || h === undefined) continue;
          const rowScreenY = scrollContainerPageY.current + contentY - scrollY.current;
          if (d.pageY >= rowScreenY && d.pageY < rowScreenY + h) return param.id;
        }
        return null;
      })();

      if (overId) {
        const dragParam = e.draft.find((p) => p.id === d.paramId);
        const overParam = e.draft.find((p) => p.id === overId);
        if (dragParam?.type === 'scalar' && overParam?.type === 'scalar') {
          const screenWidth = Dimensions.get('window').width;
          const sourceAsX = d.pageX < screenWidth / 2;
          e.commitCombine(d.paramId, overId, sourceAsX);
          return;
        }
      }

      // Reorder
      let insertIdx = 0;
      for (let i = 0; i < e.draft.length; i++) {
        if (e.draft[i].id === d.paramId) continue;
        const contentY = rowContentY.current.get(e.draft[i].id);
        const h = rowHeights.current.get(e.draft[i].id);
        if (contentY === undefined || h === undefined) continue;
        const rowScreenY = scrollContainerPageY.current + contentY - scrollY.current;
        if (d.pageY > rowScreenY + h / 2) insertIdx = i + 1;
      }
      e.reorderTo(d.paramId, insertIdx);
    },
  });

  // ── Derived drag info for rendering ───────────────────────────────────────
  const overIdForRender = drag
    ? (() => {
        for (const param of edit.draft) {
          if (param.id === drag.paramId) continue;
          const contentY = rowContentY.current.get(param.id);
          const h = rowHeights.current.get(param.id);
          if (contentY === undefined || h === undefined) continue;
          const rowScreenY = scrollContainerPageY.current + contentY - scrollY.current;
          if (drag.pageY >= rowScreenY && drag.pageY < rowScreenY + h) return param.id;
        }
        return null;
      })()
    : null;

  const dragParam = drag ? edit.draft.find((p) => p.id === drag.paramId) : null;
  const screenWidth = Dimensions.get('window').width;
  const combineSourceAsX = drag ? drag.pageX < screenWidth / 2 : false;

  // Ghost top position relative to root View
  const ghostTop = drag
    ? drag.pageY - drag.offsetY - rootPageY.current
    : 0;

  // ── Settings sheet ─────────────────────────────────────────────────────────
  const sheetTarget = edit.settingsTarget === 'new' ? null : (edit.settingsTarget ?? null);
  const sheetVisible = edit.settingsTarget !== null;

  return (
    <View ref={rootRef} style={styles.editRoot} onLayout={() => {
      rootRef.current?.measure((_x, _y, _w, _h, _px, py) => {
        rootPageY.current = py;
      });
    }}>
      {/* Scroll container — measure once for pageY */}
      <View
        ref={scrollContainerRef}
        style={styles.scroll}
        onLayout={() => {
          scrollContainerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
            scrollContainerPageY.current = py;
          });
        }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        >
          {edit.draft.map((param) => {
            const isCombineTarget =
              overIdForRender === param.id &&
              dragParam?.type === 'scalar' &&
              param.type === 'scalar';
            return (
              <EditParamRow
                key={param.id}
                param={param}
                isDragging={drag?.paramId === param.id}
                isCombineTarget={isCombineTarget}
                combineSourceAsX={combineSourceAsX}
                onRemove={() => edit.removeParam(param.id)}
                onOpenSettings={() => edit.openSettings(param)}
                onLayout={(contentY, height) => {
                  rowContentY.current.set(param.id, contentY);
                  rowHeights.current.set(param.id, height);
                }}
                onDragHandleGrant={(pageY, pageX) =>
                  dragHandlers.current.onGrant(param.id, pageY, pageX)
                }
                onDragHandleMove={dragHandlers.current.onMove}
                onDragHandleRelease={dragHandlers.current.onRelease}
              />
            );
          })}

          <TouchableOpacity
            style={styles.addParamBtn}
            onPress={() => setShowAddSheet(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addParamText}>+ Add param</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <EditModeBar
        onOverwrite={() => onOverwrite(edit.draft)}
        onSaveAsNew={() => onSaveAsNew(edit.draft)}
        onCancel={onCancel}
      />

      {/* Drag ghost — floats above everything, no pointer events */}
      {drag && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={[styles.ghost, { top: ghostTop, height: drag.rowHeight }]}>
            <Text style={styles.ghostText} numberOfLines={1}>
              {dragParam?.name ?? ''}
            </Text>
            <Text style={styles.ghostHandle}>≡</Text>
          </View>
        </View>
      )}

      <ParamSettingsSheet
        visible={sheetVisible}
        initial={sheetTarget}
        onSave={(param) => {
          const isNewParam = edit.settingsTarget === 'new';
          edit.saveParam(param);
          if (isNewParam && (param.type === 'scalar' || param.type === 'named')) {
            onAddToLibrary(param as ScalarParam | NamedParam);
          }
        }}
        onDisband={() => {
          if (sheetTarget?.type === 'grid2d') edit.splitGrid2D(sheetTarget.id);
          edit.closeSettings();
        }}
        onClose={edit.closeSettings}
      />

      {/* Computed available params: in library but not already in draft */}
      <AddParamSheet
        visible={showAddSheet}
        available={paramLibrary.filter((p) => !getParamIdsInDraft(edit.draft).has(p.id))}
        onAdd={(param) => {
          edit.saveParam(param);
          setShowAddSheet(false);
        }}
        onCreateNew={() => {
          setShowAddSheet(false);
          edit.openAddNew();
        }}
        onClose={() => setShowAddSheet(false)}
      />
    </View>
  );
}

// ─── Form layout tab strip ────────────────────────────────────────────────────

interface FormTabsProps {
  defs: FormDefinition[];
  activeId: string;
  onSelect: (id: string) => void;
}

function FormTabs({ defs, activeId, onSelect }: FormTabsProps) {
  if (defs.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.formTabsScroll}
      contentContainerStyle={styles.formTabsContent}
      keyboardShouldPersistTaps="handled"
    >
      {defs.map((def) => {
        const active = def.id === activeId;
        return (
          <TouchableOpacity
            key={def.id}
            onPress={() => onSelect(def.id)}
            activeOpacity={0.7}
            style={[styles.formTab, active && styles.formTabActive]}
          >
            <Text style={[styles.formTabText, active && styles.formTabTextActive]}>
              {def.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editRoot: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  addParamBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  addParamText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  formTabsScroll: {
    flexGrow: 0,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  formTabsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  formTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  formTabActive: {
    backgroundColor: Colors.primary,
  },
  formTabText: {
    ...Typography.label,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  formTabTextActive: {
    color: '#fff',
  },
  ghost: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    opacity: 0.96,
  },
  ghostText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  ghostHandle: {
    fontSize: 18,
    color: Colors.textDisabled,
    marginLeft: Spacing.md,
  },
});
