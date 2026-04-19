import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography, hairline } from '../../constants/theme';
import { useSkill, type Skill } from '../../contexts/SkillContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddSkill: () => void;
}

export function SkillSwitcherSheet({ visible, onClose, onAddSkill }: Props) {
  const { skills, activeSkill, switchSkill } = useSkill();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start();
  }, [visible, slideAnim]);

  const handleSelect = async (skill: Skill) => {
    await switchSkill(skill.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Switch skill</Text>

        {skills.map((skill) => {
          const isActive = skill.id === activeSkill.id;
          return (
            <TouchableOpacity
              key={skill.id}
              style={styles.skillRow}
              onPress={() => handleSelect(skill)}
              activeOpacity={0.7}
            >
              <View style={[styles.skillIcon, { backgroundColor: skill.color + '22' }]}>
                <Text style={styles.skillEmoji}>{skill.emoji}</Text>
              </View>
              <Text style={[styles.skillName, isActive && { color: skill.color }]}>
                {skill.name}
              </Text>
              {isActive && (
                <Feather name="check" size={18} color={skill.color} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.addRow} onPress={onAddSkill} activeOpacity={0.7}>
          <View style={styles.addIcon}>
            <Feather name="plus" size={18} color={Colors.textMuted} />
          </View>
          <Text style={styles.addText}>Add skill</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  skillIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillEmoji: {
    fontSize: 20,
  },
  skillName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  divider: {
    height: hairline,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  addText: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
