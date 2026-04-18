import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { EntryForm } from '../components/EntryForm';
import { Colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionForm'>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SessionFormScreen(_props: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <EntryForm />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
