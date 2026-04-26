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
import type { FormDefinition, NamedParam, Param, ParamValue, QualityParam, ScalarParam } from './types';
import { ParamRow } from './components/ParamRow';
import { StickyBar } from './components/StickyBar';
import { FormHeader } from './components/FormHeader';
import { EditParamRow } from './components/EditParamRow';
import { EditModeBar } from './components/EditModeBar';
import { ParamSettingsSheet } from './components/ParamSettingsSheet';
import { AddParamSheet } from './components/AddParamSheet';
import { useEntryForm } from './hooks/useEntryForm';
import { useEditForm } from './hooks/useEditForm';
import { loadFormDefinitions, saveFormDefinitionToDb, saveParamToDb } from '../../db/mappers';
import { upsertForm } from '../../db/forms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

interface EntryFormProps {
  onBack?: () => void;
  entryCount?: number;
  onLogThrow?: (formId: string, params: Param[], values: Record<string, ParamValue>) => Promise<void>;
}

export function EntryForm({ onBack, entryCount = 0, onLogThrow }: EntryFormProps = {}) {
  const [formDefs, setFormDefs] = useState<FormDefinition[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paramLibrary, setParamLibrary] = useState<(ScalarParam | NamedParam | QualityParam)[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [stickyValues, setStickyValues] = useState<Record<string, ParamValue>>({});

  const handleStickyChange = useCallback((paramId: string, value: ParamValue | undefined) => {
    setStickyValues((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[paramId];
      } else {
        next[paramId] = value;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    loadFormDefinitions()
      .then(({ forms, paramLibrary: lib }) => {
        setFormDefs(forms);
        setActiveId(forms[0]?.id ?? null);
        setParamLibrary(lib);
        setDbReady(true);
      })
      .catch(console.error);
  }, []);

  const activeDef = formDefs.find((f) => f.id === activeId) ?? formDefs[0];

  const enterEdit = () => {
    setEditKey((k) => k + 1);
    setIsEditMode(true);
  };

  const handleRenameForm = useCallback(() => {
    if (!activeDef) return;
    Alert.prompt(
      'Rename form',
      'Enter a new name',
      async (name) => {
        if (!name?.trim()) return;
        await upsertForm({ id: activeDef.id, name: name.trim(), sortOrder: 0 });
        setFormDefs((prev) => prev.map((f) => (f.id === activeDef.id ? { ...f, name: name.trim() } : f)));
      },
      'plain-text',
      activeDef.name,
    );
  }, [activeDef]);

  const handleAddForm = useCallback(() => {
    Alert.prompt(
      'New form',
      'Enter a name for the new form',
      async (name) => {
        if (!name?.trim()) return;
        const newDef: FormDefinition = {
          id: randomUUID(),
          name: name.trim(),
          params: [],
        };
        await saveFormDefinitionToDb(newDef);
        setFormDefs((prev) => [...prev, newDef]);
        setActiveId(newDef.id);
      },
      'plain-text',
    );
  }, [formDefs.length]);

  const handleOverwrite = useCallback(
    async (draft: Param[]) => {
      const updated = { ...activeDef, params: draft };
      await saveFormDefinitionToDb(updated);
      setFormDefs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setIsEditMode(false);
    },
    [activeDef],
  );

  const handleSaveAsNew = useCallback(
    (draft: Param[]) => {
      Alert.prompt(
        'Save as new',
        'Enter a name for the new form',
        async (name) => {
          if (!name?.trim()) return;
          const newDef: FormDefinition = {
            id: randomUUID(),
            name: name.trim(),
            params: draft,
          };
          await saveFormDefinitionToDb(newDef);
          setFormDefs((prev) => [...prev, newDef]);
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
        onRenamePress={handleRenameForm}
        onBack={onBack}
      />

      {!isEditMode && (
        <FormTabs defs={formDefs} activeId={activeId!} onSelect={setActiveId} onAdd={handleAddForm} />
      )}

      {isEditMode ? (
        <EditModeContent
          key={editKey}
          formDef={activeDef}
          paramLibrary={paramLibrary}
          onAddToLibrary={(param: ScalarParam | NamedParam | QualityParam) =>
            setParamLibrary((prev) =>
              prev.some((p) => p.id === param.id) ? prev : [...prev, param],
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
  formDef: FormDefinition;
  entryCount: number;
  onLogThrow?: EntryFormProps['onLogThrow'];
  stickyValues: Record<string, ParamValue>;
  onStickyChange: (paramId: string, value: ParamValue | undefined) => void;
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
    (paramId: string, value: string) => {
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
      form.setValue(paramId, value);
      const param = formDef.params.find((p) => p.id === paramId);
      if (param?.clearAfterSubmit === false) onStickyChange(paramId, value);
    },
    [form, formDef.params, onStickyChange],
  );

  const wrapClear = useCallback(
    (paramId: string) => {
      form.clearValue(paramId);
      const param = formDef.params.find((p) => p.id === paramId);
      if (param?.clearAfterSubmit === false) onStickyChange(paramId, undefined);
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
        {form.params.map((param) => (
          <ParamRow
            key={param.id}
            param={param}
            value={form.values[param.id]}
            isExpanded={form.expandedIds.has(param.id)}
            onToggle={() => form.toggleExpanded(param.id)}
            onCommit={(v) => wrapCommit(param.id, v)}
            onClear={() => wrapClear(param.id)}
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
  formDef: FormDefinition;
  paramLibrary: (ScalarParam | NamedParam | QualityParam)[];
  onAddToLibrary: (param: ScalarParam | NamedParam | QualityParam) => void;
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
        onSave={async (param) => {
          const isNewParam = edit.settingsTarget === 'new';
          await saveParamToDb(param).catch(console.error);
          edit.saveParam(param);
          if (isNewParam && (param.type === 'scalar' || param.type === 'named' || param.type === 'quality')) {
            onAddToLibrary(param as ScalarParam | NamedParam | QualityParam);
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
