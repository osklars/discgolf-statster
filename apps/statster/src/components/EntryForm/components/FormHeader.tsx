import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, hairline } from '../../../constants/theme';

interface Props {
  name: string;
  isEditMode: boolean;
  onEditPress: () => void;
  onRenamePress?: () => void;
  onBack?: () => void;
}

export function FormHeader({ name, isEditMode, onEditPress, onRenamePress, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack} activeOpacity={0.6} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
      {!isEditMode && onRenamePress ? (
        <TouchableOpacity onPress={onRenamePress} activeOpacity={0.6} style={styles.nameBtn}>
          <Text style={styles.name}>{name}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.name, styles.nameStatic]}>{name}</Text>
      )}
      {!isEditMode && (
        <TouchableOpacity onPress={onEditPress} activeOpacity={0.6} style={styles.editBtn}>
          <Feather name="sliders" size={18} color={Colors.primary} />
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
  nameBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
  },
  nameStatic: {
    flex: 1,
  },
  name: {
    ...Typography.title,
    color: Colors.text,
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
});
