import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { StatDetailScreen } from '../screens/StatDetailScreen';
import { SavedLevelsScreen } from '../screens/SavedLevelsScreen';
import { UnifiedSessionScreen } from '../screens/UnifiedSessionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FormEditorScreen } from '../screens/FormEditorScreen';
import { ParamEditorScreen } from '../screens/ParamEditorScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StatDetail" component={StatDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SavedLevels" component={SavedLevelsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UnifiedSession" component={UnifiedSessionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Forms" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FormEditor" component={FormEditorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ParamEditor" component={ParamEditorScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
