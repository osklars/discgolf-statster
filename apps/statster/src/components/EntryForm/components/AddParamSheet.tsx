import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, MIN_HIT, Spacing, Typography, hairline } from '../../../constants/theme';
import type { NamedParam, QualityParam, ScalarParam } from '../types';

interface Props {
  visible: boolean;
  available: (ScalarParam | NamedParam | QualityParam)[];
  onAdd: (param: ScalarParam | NamedParam | QualityParam) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  scalar: 'scalar',
  named: 'named',
};

export function AddParamSheet({ visible, available, onAdd, onCreateNew, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Param</Text>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* New param — always at top */}
          <TouchableOpacity style={styles.newRow} onPress={onCreateNew} activeOpacity={0.7}>
            <Text style={styles.newText}>+ New param</Text>
          </TouchableOpacity>

          {available.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>From library</Text>
            </View>
          )}

          {available.map((param) => (
            <TouchableOpacity
              key={param.id}
              style={styles.paramRow}
              onPress={() => onAdd(param)}
              activeOpacity={0.7}
            >
              <View style={styles.paramInfo}>
                <Text style={styles.paramName}>{param.name}</Text>
                <Text style={styles.paramType}>{TYPE_LABELS[param.type] ?? param.type}</Text>
              </View>
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          ))}

          {available.length === 0 && (
            <Text style={styles.emptyText}>All library params are already in this form</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
    ...Typography.title,
    flex: 1,
    color: Colors.text,
  },
  cancelBtn: {
    paddingLeft: Spacing.md,
    minHeight: MIN_HIT,
    justifyContent: 'center',
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  newRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: MIN_HIT,
    justifyContent: 'center',
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  newText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
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
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: MIN_HIT,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
  },
  paramInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paramName: {
    ...Typography.body,
    color: Colors.text,
    flexShrink: 1,
  },
  paramType: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addIcon: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '300',
    paddingLeft: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
});
