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
import { useInterest, type Interest } from '../../contexts/InterestContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddInterest: () => void;
}

export function InterestSwitcherSheet({ visible, onClose, onAddInterest }: Props) {
  const { interests, activeInterest, switchInterest } = useInterest();
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

  const handleSelect = async (interest: Interest) => {
    await switchInterest(interest.id);
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
        <Text style={styles.sheetTitle}>Switch interest</Text>

        {interests.map((interest) => {
          const isActive = interest.id === activeInterest.id;
          return (
            <TouchableOpacity
              key={interest.id}
              style={styles.interestRow}
              onPress={() => handleSelect(interest)}
              activeOpacity={0.7}
            >
              <View style={[styles.interestIcon, { backgroundColor: interest.color + '22' }]}>
                <Text style={styles.interestEmoji}>{interest.emoji}</Text>
              </View>
              <Text style={[styles.interestName, isActive && { color: interest.color }]}>
                {interest.name}
              </Text>
              {isActive && (
                <Feather name="check" size={18} color={interest.color} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.addRow} onPress={onAddInterest} activeOpacity={0.7}>
          <View style={styles.addIcon}>
            <Feather name="plus" size={18} color={Colors.textMuted} />
          </View>
          <Text style={styles.addText}>Add interest</Text>
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
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  interestIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestEmoji: {
    fontSize: 20,
  },
  interestName: {
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
