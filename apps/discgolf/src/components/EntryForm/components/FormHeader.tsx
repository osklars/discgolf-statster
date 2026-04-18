import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Typography, hairline } from '../../../constants/theme';

interface Props {
  name: string;
  isEditMode: boolean;
  onEditPress: () => void;
}

export function FormHeader({ name, isEditMode, onEditPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      {!isEditMode && (
        <TouchableOpacity onPress={onEditPress} activeOpacity={0.6} style={styles.editBtn}>
          <Text style={styles.editLabel}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  name: {
    ...Typography.title,
    flex: 1,
    color: Colors.text,
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  editLabel: {
    ...Typography.body,
    color: Colors.primary,
  },
});
