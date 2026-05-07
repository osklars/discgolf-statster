import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { InterestProvider, useInterest } from './src/contexts/InterestContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CreateInterestScreen } from './src/screens/CreateInterestScreen';
import { ImportExercisesScreen } from './src/screens/ImportExercisesScreen';

function AppRoot() {
  const { interests, justCreated } = useInterest();

  if (interests.length === 0) {
    return (
      <>
        <StatusBar style="dark" />
        <CreateInterestScreen />
      </>
    );
  }

  if (justCreated) {
    return (
      <>
        <StatusBar style="dark" />
        <ImportExercisesScreen />
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
