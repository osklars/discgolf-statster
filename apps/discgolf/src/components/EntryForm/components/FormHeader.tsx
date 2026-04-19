import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, hairline } from '../../../constants/theme';

interface Props {
  name: string;
  isEditMode: boolean;
  onEditPress: () => void;
  onBack?: () => void;
}

export function FormHeader({ name, isEditMode, onEditPress, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} activeOpacity={0.6} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
      <Text style={styles.name}>{name}</Text>
      {!isEditMode && (
        <TouchableOpacity onPress={onEditPress} activeOpacity={0.6} style={styles.editBtn}>
          <Feather name="edit-2" size={18} color={Colors.primary} />
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
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.xs,
    marginLeft: -Spacing.xs,
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
});
