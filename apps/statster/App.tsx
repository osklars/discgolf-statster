import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { InterestProvider, useInterest } from './src/contexts/InterestContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CreateInterestScreen } from './src/screens/CreateInterestScreen';

function AppRoot() {
  const { interests } = useInterest();

  if (interests.length === 0) {
    return (
      <>
        <StatusBar style="dark" />
        <CreateInterestScreen />
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
