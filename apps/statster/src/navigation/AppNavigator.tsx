import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { StatDetailScreen } from '../screens/StatDetailScreen';
import { SavedLevelsScreen } from '../screens/SavedLevelsScreen';
import { SessionScreen } from '../screens/SessionScreen';
import { SessionFormScreen } from '../screens/SessionFormScreen';
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
      <Stack.Screen name="StatDetail" component={StatDetailScreen} options={{ title: 'Stats' }} />
      <Stack.Screen name="SavedLevels" component={SavedLevelsScreen} options={{ title: 'Saved Levels' }} />
      <Stack.Screen name="Session" component={SessionScreen} options={{ title: 'Session' }} />
      <Stack.Screen
        name="SessionForm"
        component={SessionFormScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
