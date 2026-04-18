import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Colors,
  MIN_HIT,
  Radius,
  Spacing,
  Typography,
  hairline,
} from '../../../constants/theme';
import type { Grid2DParam, NamedParam, Param, ScalarParam } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function num(s: string, fallback = 0): number {
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

type ParamType = 'scalar' | 'named' | 'grid2d';

type ScalarFields = {
  name: string;
  min: string;
  max: string;
  step: string;
  majorStep: string;
  unit: string;
  lblMin: string;
  lblMax: string;
  displayFormat: string;
};

function scalarToFields(p: ScalarParam): ScalarFields {
  return {
    name: p.name,
    min: String(p.min),
    max: String(p.max),
    step: String(p.step),
    majorStep: String(p.majorStep),
    unit: p.unit ?? '',
    lblMin: p.lblMin,
    lblMax: p.lblMax,
    displayFormat: p.displayFormat ?? '',
  };
}

function defaultScalarFields(name = ''): ScalarFields {
  return { name, min: '0', max: '10', step: '1', majorStep: '1', unit: '', lblMin: '', lblMax: '', displayFormat: '' };
}

function buildScalar(id: string, fields: ScalarFields): ScalarParam {
  return {
    id,
    name: fields.name,
    type: 'scalar',
    min: num(fields.min),
    max: num(fields.max, 10),
    step: num(fields.step, 1),
    majorStep: num(fields.majorStep, 1),
    unit: fields.unit || undefined,
    lblMin: fields.lblMin,
    lblMax: fields.lblMax,
    displayFormat: fields.displayFormat || undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={ss.sectionHeader}>
      <Text style={ss.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <View style={ss.field}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <TextInput
        style={ss.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.textDisabled}
        keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={ss.fieldRow}>{children}</View>;
}

function FormatPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    { key: '', label: '—' },
    { key: 'hyzer', label: 'hyzer' },
    { key: 'nose', label: 'nose' },
  ];
  return (
    <View style={ss.field}>
      <Text style={ss.fieldLabel}>Display format</Text>
      <View style={ss.formatPicker}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[ss.formatOption, value === o.key && ss.formatOptionActive]}
            onPress={() => onChange(o.key)}
            activeOpacity={0.7}
          >
            <Text style={[ss.formatOptionText, value === o.key && ss.formatOptionTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ScalarAxisFields({
  fields,
  onChange,
}: {
  fields: ScalarFields;
  onChange: (patch: Partial<ScalarFields>) => void;
}) {
  return (
    <>
      <FieldRow>
        <Field label="Min" value={fields.min} onChangeText={(t) => onChange({ min: t })} numeric />
        <Field label="Max" value={fields.max} onChangeText={(t) => onChange({ max: t })} numeric />
      </FieldRow>
      <FieldRow>
        <Field label="Step" value={fields.step} onChangeText={(t) => onChange({ step: t })} numeric />
        <Field label="Major tick" value={fields.majorStep} onChangeText={(t) => onChange({ majorStep: t })} numeric />
      </FieldRow>
      <FieldRow>
        <Field label="Min label" value={fields.lblMin} onChangeText={(t) => onChange({ lblMin: t })} />
        <Field label="Max label" value={fields.lblMax} onChangeText={(t) => onChange({ lblMax: t })} />
      </FieldRow>
      <Field label="Unit (optional)" value={fields.unit} onChangeText={(t) => onChange({ unit: t })} />
      <FormatPicker value={fields.displayFormat} onChange={(v) => onChange({ displayFormat: v })} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  initial: Param | null; // null = new param
  onSave: (param: Param) => void;
  onClose: () => void;
}

function SheetContent({ initial, onSave, onClose }: Omit<Props, 'visible'>) {
  const isNew = initial === null;
  const existingId = initial?.id ?? uid();

  const [paramType, setParamType] = useState<ParamType>(initial?.type ?? 'scalar');

  // Scalar state
  const [scalarName, setScalarName] = useState(
    initial?.type === 'scalar' ? initial.name : '',
  );
  const [scalarFields, setScalarFields] = useState<ScalarFields>(
    initial?.type === 'scalar' ? scalarToFields(initial) : defaultScalarFields(),
  );

  // Named state
  const [namedName, setNamedName] = useState(initial?.type === 'named' ? initial.name : '');
  const [options, setOptions] = useState<{ id: string; label: string }[]>(
    initial?.type === 'named' ? initial.options : [],
  );

  // Grid2D state
  const [axisXFields, setAxisXFields] = useState<ScalarFields>(
    initial?.type === 'grid2d'
      ? scalarToFields(initial.axisX)
      : defaultScalarFields('X'),
  );
  const [axisYFields, setAxisYFields] = useState<ScalarFields>(
    initial?.type === 'grid2d'
      ? scalarToFields(initial.axisY)
      : defaultScalarFields('Y'),
  );

  const addOption = () => setOptions((prev) => [...prev, { id: uid(), label: '' }]);
  const updateOption = (id: string, label: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  const removeOption = (id: string) =>
    setOptions((prev) => prev.filter((o) => o.id !== id));

  const handleSave = () => {
    switch (paramType) {
      case 'scalar':
        onSave(buildScalar(existingId, { ...scalarFields, name: scalarName }));
        break;
      case 'named': {
        const named: NamedParam = {
          id: existingId,
          name: namedName,
          type: 'named',
          options: options.filter((o) => o.label.trim() !== ''),
        };
        onSave(named);
        break;
      }
      case 'grid2d': {
        const axisXId = initial?.type === 'grid2d' ? initial.axisX.id : uid();
        const axisYId = initial?.type === 'grid2d' ? initial.axisY.id : uid();
        const axisX = buildScalar(axisXId, axisXFields);
        const axisY = buildScalar(axisYId, axisYFields);
        const grid: Grid2DParam = {
          id: existingId,
          name: `${axisX.name} × ${axisY.name}`,
          type: 'grid2d',
          axisX,
          axisY,
        };
        onSave(grid);
        break;
      }
    }
  };

  const TYPE_OPTIONS: { key: ParamType; label: string }[] = [
    { key: 'scalar', label: 'Scalar' },
    { key: 'named', label: 'Named' },
    { key: 'grid2d', label: 'Grid 2D' },
  ];

  return (
    <View style={ss.sheet}>
      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={onClose} style={ss.headerBtn} activeOpacity={0.7}>
          <Text style={ss.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>{isNew ? 'New Param' : 'Edit Param'}</Text>
        <TouchableOpacity onPress={handleSave} style={ss.headerBtn} activeOpacity={0.7}>
          <Text style={ss.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <View style={ss.typePicker}>
          {TYPE_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[ss.typeOption, paramType === o.key && ss.typeOptionActive]}
              onPress={() => setParamType(o.key)}
              activeOpacity={0.7}
            >
              <Text style={[ss.typeOptionText, paramType === o.key && ss.typeOptionTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scalar fields */}
        {paramType === 'scalar' && (
          <>
            <Field label="Name" value={scalarName} onChangeText={setScalarName} />
            <ScalarAxisFields
              fields={scalarFields}
              onChange={(patch) => setScalarFields((prev) => ({ ...prev, ...patch }))}
            />
          </>
        )}

        {/* Named fields */}
        {paramType === 'named' && (
          <>
            <Field label="Name" value={namedName} onChangeText={setNamedName} />
            <SectionHeader title="Options" />
            {options.map((o) => (
              <View key={o.id} style={ss.optionRow}>
                <TextInput
                  style={ss.optionInput}
                  value={o.label}
                  onChangeText={(t) => updateOption(o.id, t)}
                  placeholder="Option label"
                  placeholderTextColor={Colors.textDisabled}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => removeOption(o.id)} style={ss.optionRemove}>
                  <Text style={ss.optionRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={ss.addOptionBtn} onPress={addOption} activeOpacity={0.7}>
              <Text style={ss.addOptionText}>+ Add option</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Grid 2D fields */}
        {paramType === 'grid2d' && (
          <>
            <SectionHeader title="X Axis" />
            <Field
              label="Name"
              value={axisXFields.name}
              onChangeText={(t) => setAxisXFields((prev) => ({ ...prev, name: t }))}
            />
            <ScalarAxisFields
              fields={axisXFields}
              onChange={(patch) => setAxisXFields((prev) => ({ ...prev, ...patch }))}
            />
            <SectionHeader title="Y Axis" />
            <Field
              label="Name"
              value={axisYFields.name}
              onChangeText={(t) => setAxisYFields((prev) => ({ ...prev, name: t }))}
            />
            <ScalarAxisFields
              fields={axisYFields}
              onChange={(patch) => setAxisYFields((prev) => ({ ...prev, ...patch }))}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function ParamSettingsSheet({ visible, initial, onSave, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Key forces remount when the target param changes */}
        <SheetContent
          key={initial?.id ?? 'new'}
          initial={initial}
          onSave={onSave}
          onClose={onClose}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  headerBtn: {
    minWidth: 60,
    minHeight: MIN_HIT,
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.title,
    flex: 1,
    textAlign: 'center',
    color: Colors.text,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  saveText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  typePicker: {
    flexDirection: 'row',
    margin: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.separator,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  typeOptionActive: {
    backgroundColor: Colors.primary,
  },
  typeOptionText: {
    ...Typography.label,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: Colors.background,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  sectionHeaderText: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  fieldInput: {
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 4,
    minHeight: 32,
  },
  formatPicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  formatOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  formatOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  formatOptionText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  formatOptionTextActive: {
    color: Colors.background,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  optionInput: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    minHeight: MIN_HIT,
  },
  optionRemove: {
    width: 40,
    height: MIN_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRemoveText: {
    fontSize: 20,
    color: '#EF4444',
  },
  addOptionBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: MIN_HIT,
    justifyContent: 'center',
  },
  addOptionText: {
    ...Typography.body,
    color: Colors.primary,
  },
});
