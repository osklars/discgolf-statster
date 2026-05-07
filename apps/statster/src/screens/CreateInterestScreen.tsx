import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography, hairline } from '../constants/theme';
import { useInterest } from '../contexts/InterestContext';
import TEMPLATES from '../assets/interestTemplates.json';

type Template = { id: string; name: string; emoji: string; color: string; description: string };

const EMOJIS = [
  '🏆', '🥏', '⚽', '🏀', '🎾', '⚾', '🏈',
  '🥊', '💪', '🏃', '🧘', '🏊', '🚴',
  '🎸', '🎹', '🎻', '🎶', '🎯', '🎮',
  '📚', '✍️', '🎨', '🌱', '🍳', '🧠', '🔬', '🐕', '🌍',
];

const COLORS = [
  '#0C447C',
  '#1A6B2E',
  '#7C3A0C',
  '#5B2D8E',
  '#8E1A1A',
  '#0C6B5B',
];

export function CreateInterestScreen() {
  const { addInterest } = useInterest();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏆');
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSelectTemplate = (template: Template) => {
    setName(template.name);
    setEmoji(template.emoji);
    setColor(template.color);
    inputRef.current?.blur();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give your interest a name first.');
      return;
    }
    setCreating(true);
    try {
      await addInterest({ name: trimmed, emoji, color });
    } catch {
      setCreating(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const canCreate = name.trim().length > 0 && !creating;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroRow}>
          <View style={[styles.heroCircle, { backgroundColor: color + '22' }]}>
            <Text style={styles.heroEmoji}>{emoji}</Text>
          </View>
        </View>

        <Text style={styles.heading}>What do you want to track?</Text>
        <Text style={styles.subheading}>Name your interest and pick an emoji.</Text>

        {/* Name input */}
        <TextInput
          ref={inputRef}
          style={styles.nameInput}
          placeholder="e.g. Guitar, Gym, Climbing…"
          placeholderTextColor={Colors.textDisabled}
          value={name}
          onChangeText={setName}
          autoCorrect={false}
          returnKeyType="done"
          maxLength={40}
        />

        {/* Emoji row */}
        <Text style={styles.sectionLabel}>EMOJI</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiRow}
          keyboardShouldPersistTaps="handled"
        >
          {EMOJIS.map((e) => {
            const active = emoji === e;
            return (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, active && { backgroundColor: color + '28', borderColor: color }]}
                onPress={() => setEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiChar}>{e}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Color row */}
        <Text style={styles.sectionLabel}>COLOR</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
              onPress={() => setColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </View>

        {/* Templates */}
        <View style={styles.templateDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>OR START FROM A TEMPLATE</Text>
          <View style={styles.dividerLine} />
        </View>

        {(TEMPLATES as Template[]).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.templateRow}
            onPress={() => handleSelectTemplate(t)}
            activeOpacity={0.7}
          >
            <View style={[styles.templateIcon, { backgroundColor: t.color + '22' }]}>
              <Text style={styles.templateEmoji}>{t.emoji}</Text>
            </View>
            <View style={styles.templateBody}>
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateDesc}>{t.description}</Text>
            </View>
            <Text style={[styles.templateArrow, { color: t.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: color }, !canCreate && styles.createBtnDisabled]}
          onPress={handleCreate}
          activeOpacity={0.8}
          disabled={!canCreate}
        >
          <Text style={styles.createBtnText}>{creating ? 'Creating…' : 'Get started →'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  heroRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 48,
  },
  heading: {
    ...Typography.title,
    color: Colors.text,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  subheading: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  nameInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 17,
    borderWidth: hairline,
    borderColor: Colors.separator,
  },
  sectionLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiChar: {
    fontSize: 24,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  templateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: hairline,
    backgroundColor: Colors.separator,
  },
  dividerLabel: {
    ...Typography.labelSm,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  templateEmoji: {
    fontSize: 22,
  },
  templateBody: {
    flex: 1,
    gap: 2,
  },
  templateName: {
    ...Typography.label,
    color: Colors.text,
    fontWeight: '600',
  },
  templateDesc: {
    ...Typography.labelSm,
    color: Colors.textMuted,
  },
  templateArrow: {
    fontSize: 22,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: hairline,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  createBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
