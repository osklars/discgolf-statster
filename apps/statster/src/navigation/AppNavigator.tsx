import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { StatDetailScreen } from '../screens/StatDetailScreen';
import { LevelsScreen } from '../screens/LevelsScreen';
import { UnifiedSessionScreen } from '../screens/UnifiedSessionScreen';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { ExerciseEditorScreen } from '../screens/ExerciseEditorScreen';
import { StatEditorScreen } from '../screens/StatEditorScreen';
import { ImportExercisesScreen } from '../screens/ImportExercisesScreen';
import { LevelCelebrationScreen } from '../screens/LevelCelebrationScreen';
import { Colors } from '../constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

function ImportExercisesRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'ImportExercises'>) {
  return <ImportExercisesScreen onDone={() => navigation.goBack()} />;
}

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
      <Stack.Screen name="Levels" component={LevelsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UnifiedSession" component={UnifiedSessionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Exercises" component={ExercisesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ExerciseEditor" component={ExerciseEditorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StatEditor" component={StatEditorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ImportExercises" component={ImportExercisesRoute} options={{ headerShown: false }} />
      <Stack.Screen name="LevelCelebration" component={LevelCelebrationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
