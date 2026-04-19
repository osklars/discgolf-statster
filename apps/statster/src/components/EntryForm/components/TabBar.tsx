import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, MIN_HIT, Spacing, Typography } from '../../../constants/theme';

type Tab = 'before' | 'after';

interface Props {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

export function TabBar({ activeTab, onTabPress }: Props) {
  return (
    <View style={styles.container}>
      {(['before', 'after'] as const).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabPress(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab === 'before' ? 'Before' : 'After'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_HIT,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  label: {
    ...Typography.label,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
