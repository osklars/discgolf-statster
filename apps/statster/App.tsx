import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { InterestProvider, useInterest } from './src/contexts/InterestContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CreateInterestScreen } from './src/screens/CreateInterestScreen';
import { ImportExercisesScreen } from './src/screens/ImportExercisesScreen';
import { Colors, Spacing } from './src/constants/theme';

function SwitchingScreen() {
  const { activeInterest } = useInterest();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.switchRoot, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <Text style={styles.switchEmoji}>{activeInterest.emoji}</Text>
      <Text style={[styles.switchName, { color: activeInterest.color }]}>{activeInterest.name}</Text>
      <ActivityIndicator color={activeInterest.color} style={styles.switchSpinner} />
    </View>
  );
}

function AppRoot() {
  const { interests, justCreated, clearJustCreated, switching } = useInterest();

  if (interests.length === 0) {
    return (
      <>
        <StatusBar style="dark" />
        <CreateInterestScreen />
      </>
    );
  }

  if (switching) {
    return <SwitchingScreen />;
  }

  if (justCreated) {
    return (
      <>
        <StatusBar style="dark" />
        <ImportExercisesScreen onDone={clearJustCreated} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <InterestProvider>
        <AppRoot />
      </InterestProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  switchRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  switchEmoji: { fontSize: 52 },
  switchName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  switchSpinner: { marginTop: Spacing.md },
});
