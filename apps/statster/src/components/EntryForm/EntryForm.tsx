import { randomUUID } from 'expo-crypto';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';
import type { ExerciseDef, ChoiceStatDef, StatDef, StatValue, NumberStatDef } from './types';
import { ParamRow } from './components/ParamRow';
import { StickyBar } from './components/StickyBar';
import { FormHeader } from './components/FormHeader';
import { EditParamRow } from './components/EditParamRow';
import { EditModeBar } from './components/EditModeBar';
import { ParamSettingsSheet } from './components/ParamSettingsSheet';
import { AddParamSheet } from './components/AddParamSheet';
import { useEntryForm } from './hooks/useEntryForm';
import { useEditForm } from './hooks/useEditForm';
import { loadExerciseDefs, saveExerciseDefToDb, saveStatToDb } from '../../db/mappers';
import { upsertExercise } from '../../db/forms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParamIdsInDraft(draft: StatDef[]): Set<string> {
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

// ─── Main component ───────────────────────────────────────────────────────────

interface EntryFormProps {
  onBack?: () => void;
  entryCount?: number;
  onLogThrow?: (exerciseId: string, stats: StatDef[], values: Record<string, StatValue>) => Promise<void>;
}

export function EntryForm({ onBack, entryCount = 0, onLogThrow }: EntryFormProps = {}) {
  const [exerciseDefs, setExerciseDefs] = useState<ExerciseDef[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statLibrary, setStatLibrary] = useState<(NumberStatDef | ChoiceStatDef)[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [stickyValues, setStickyValues] = useState<Record<string, StatValue>>({});

  const handleStickyChange = useCallback((statId: string, value: StatValue | undefined) => {
    setStickyValues((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[statId];
      } else {
        next[statId] = value;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    loadExerciseDefs()
      .then(({ exercises, statLibrary: lib }) => {
        setExerciseDefs(exercises);
        setActiveId(exercises[0]?.id ?? null);
        setStatLibrary(lib);
        setDbReady(true);
      })
      .catch(console.error);
  }, []);

  const activeDef = exerciseDefs.find((f) => f.id === activeId) ?? exerciseDefs[0];

  const enterEdit = () => {
    setEditKey((k) => k + 1);
    setIsEditMode(true);
  };

  const handleRenameExercise = useCallback(() => {
    if (!activeDef) return;
    Alert.prompt(
      'Rename exercise',
      'Enter a new name',
      async (name) => {
        if (!name?.trim()) return;
        await upsertExercise({ id: activeDef.id, name: name.trim(), sortOrder: 0 });
        setExerciseDefs((prev) => prev.map((f) => (f.id === activeDef.id ? { ...f, name: name.trim() } : f)));
      },
      'plain-text',
      activeDef.name,
    );
  }, [activeDef]);

  const handleAddExercise = useCallback(() => {
    Alert.prompt(
      'New exercise',
      'Enter a name for the new exercise',
      async (name) => {
        if (!name?.trim()) return;
        const newDef: ExerciseDef = {
          id: randomUUID(),
          name: name.trim(),
          params: [],
        };
        await saveExerciseDefToDb(newDef);
        setExerciseDefs((prev) => [...prev, newDef]);
        setActiveId(newDef.id);
      },
      'plain-text',
    );
  }, [exerciseDefs.length]);

  const handleOverwrite = useCallback(
    async (draft: StatDef[]) => {
      const updated = { ...activeDef, params: draft };
      await saveExerciseDefToDb(updated);
      setExerciseDefs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setIsEditMode(false);
    },
    [activeDef],
  );

  const handleSaveAsNew = useCallback(
    (draft: StatDef[]) => {
      Alert.prompt(
        'Save as new',
        'Enter a name for the new exercise',
        async (name) => {
          if (!name?.trim()) return;
          const newDef: ExerciseDef = {
            id: randomUUID(),
            name: name.trim(),
            params: draft,
          };
          await saveExerciseDefToDb(newDef);
          setExerciseDefs((prev) => [...prev, newDef]);
          setActiveId(newDef.id);
          setIsEditMode(false);
        },
        'plain-text',
        activeDef?.name,
      );
    },
    [activeDef?.name],
  );

  if (!dbReady || !activeDef) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FormHeader
        name={activeDef.name}
        isEditMode={isEditMode}
        onEditPress={enterEdit}
        onRenamePress={handleRenameExercise}
        onBack={onBack}
      />

      {!isEditMode && (
        <FormTabs defs={exerciseDefs} activeId={activeId!} onSelect={setActiveId} onAdd={handleAddExercise} />
      )}

      {isEditMode ? (
        <EditModeContent
          key={editKey}
          formDef={activeDef}
          statLibrary={statLibrary}
          onAddToLibrary={(stat: NumberStatDef | ChoiceStatDef) =>
            setStatLibrary((prev) =>
              prev.some((p) => p.id === stat.id) ? prev : [...prev, stat],
            )
          }
          onOverwrite={handleOverwrite}
          onSaveAsNew={handleSaveAsNew}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <ViewModeContent
          key={activeId!}
          formDef={activeDef}
          entryCount={entryCount}
          onLogThrow={onLogThrow}
          stickyValues={stickyValues}
          onStickyChange={handleStickyChange}
        />
      )}
    </View>
  );
}

// ─── View mode sub-component ──────────────────────────────────────────────────
// Keyed by activeId so form values reset when switching forms.

interface ViewModeProps {
  formDef: ExerciseDef;
  entryCount: number;
  onLogThrow?: EntryFormProps['onLogThrow'];
  stickyValues: Record<string, StatValue>;
  onStickyChange: (statId: string, value: StatValue | undefined) => void;
}

function ViewModeContent({ formDef, entryCount, onLogThrow, stickyValues, onStickyChange }: ViewModeProps) {
  const initialValues = Object.fromEntries(
    formDef.params
      .filter((p) => p.clearAfterSubmit === false && stickyValues[p.id] !== undefined)
      .map((p) => [p.id, stickyValues[p.id]]),
  );
  const form = useEntryForm(formDef.params, initialValues);
  const scrollRef = useRef<ScrollView>(null);

  const handleDragStart = useCallback(() => {
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  }, []);

  const wrapCommit = useCallback(
    (statId: string, value: string) => {
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      form.setValue(statId, value);
      const stat = formDef.params.find((p) => p.id === statId);
      if (stat?.clearAfterSubmit === false) onStickyChange(statId, value);
    },
    [form, formDef.params, onStickyChange],
  );

  const wrapClear = useCallback(
    (statId: string) => {
      form.clearValue(statId);
      const stat = formDef.params.find((p) => p.id === statId);
      if (stat?.clearAfterSubmit === false) onStickyChange(statId, undefined);
    },
    [form, formDef.params, onStickyChange],
  );

  const handleLogThrow = useCallback(async () => {
    if (onLogThrow) {
      await onLogThrow(formDef.id, formDef.params, form.values);
    }
    form.clearSubmitted();
  }, [onLogThrow, formDef, form]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {form.stats.map((stat) => (
          <ParamRow
            key={stat.id}
            param={stat}
            value={form.values[stat.id]}
            isExpanded={form.expandedIds.has(stat.id)}
            onToggle={() => form.toggleExpanded(stat.id)}
            onCommit={(v) => wrapCommit(stat.id, v)}
            onClear={() => wrapClear(stat.id)}
            formatValue={form.formatValue}
            onDragStart={handleDragStart}
          />
        ))}
      </ScrollView>
      <StickyBar entryCount={entryCount} onAction={handleLogThrow} />
    </>
  );
}

// ─── Edit mode sub-component ──────────────────────────────────────────────────

type DragState = {
  paramId: string;
  pageY: number;
  pageX: number;
  offsetY: number;
  rowHeight: number;
};

interface EditModeProps {
  formDef: ExerciseDef;
  statLibrary: (NumberStatDef | ChoiceStatDef)[];
  onAddToLibrary: (stat: NumberStatDef | ChoiceStatDef) => void;
  onOverwrite: (draft: StatDef[]) => void;
  onSaveAsNew: (draft: StatDef[]) => void;
  onCancel: () => void;
}

function EditModeContent({
  formDef,
  statLibrary,
  onAddToLibrary,
  onOverwrite,
  onSaveAsNew,
  onCancel,
}: EditModeProps) {
  const edit = useEditForm(formDef);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const [drag, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const rowContentY = useRef<Map<string, number>>(new Map());
  const rowHeights = useRef<Map<string, number>>(new Map());
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const scrollContainerRef = useRef<View>(null);
  const scrollContainerPageY = useRef(0);
  const rootRef = useRef<View>(null);
  const rootPageY = useRef(0);

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
          e.commitCombine(d.paramId, overId, d.pageX < screenWidth / 2);
          return;
        }
      }

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
  const ghostTop = drag ? drag.pageY - drag.offsetY - rootPageY.current : 0;

  const sheetTarget = edit.settingsTarget === 'new' ? null : (edit.settingsTarget ?? null);
  const sheetVisible = edit.settingsTarget !== null;

  return (
    <View
      ref={rootRef}
      style={styles.editRoot}
      onLayout={() => {
        rootRef.current?.measure((_x, _y, _w, _h, _px, py) => { rootPageY.current = py; });
      }}
    >
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
                onToggleSticky={() => edit.toggleStickyParam(param.id)}
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

      {drag && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={[styles.ghost, { top: ghostTop, height: drag.rowHeight }]}>
            <Text style={styles.ghostText} numberOfLines={1}>{dragParam?.name ?? ''}</Text>
            <Text style={styles.ghostHandle}>≡</Text>
          </View>
        </View>
      )}

      <ParamSettingsSheet
        visible={sheetVisible}
        initial={sheetTarget}
        onSave={async (stat) => {
          const isNewStat = edit.settingsTarget === 'new';
          await saveStatToDb(stat).catch(console.error);
          edit.saveParam(stat);
          if (isNewStat && (stat.type === 'scalar' || stat.type === 'named')) {
            onAddToLibrary(stat as NumberStatDef | ChoiceStatDef);
          }
        }}
        onDisband={() => {
          if (sheetTarget?.type === 'grid2d') edit.splitGrid2D(sheetTarget.id);
          edit.closeSettings();
        }}
        onClose={edit.closeSettings}
      />

      <AddParamSheet
        visible={showAddSheet}
        available={statLibrary.filter((p) => !getParamIdsInDraft(edit.draft).has(p.id))}
        onAdd={(stat) => {
          edit.saveParam(stat);
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
  defs: ExerciseDef[];
  activeId: string;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
}

function FormTabs({ defs, activeId, onSelect, onAdd }: FormTabsProps) {
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
      <TouchableOpacity onPress={onAdd} activeOpacity={0.7} style={styles.addFormTab}>
        <Text style={styles.addFormTabText}>+</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  addFormTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormTabText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 20,
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
