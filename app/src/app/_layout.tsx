import '../firebaseSilence';
import '@react-native-firebase/crashlytics';
import { getCrashlytics, setUserId } from '@react-native-firebase/crashlytics';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { Platform, useColorScheme, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

// Ignore the known upstream Expo Router / React Navigation warning about early linking updates
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  "This method is deprecated (as well as all React Native Firebase namespaced API)",
  "Please use `getApp()` instead."
]);

const CustomTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FCFAF8',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  usePushNotifications();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const crashlytics = getCrashlytics();
    return onAuthStateChanged(getAuth(), user => {
      setUserId(crashlytics, user?.uid ?? '').catch(() => {});
    });
  }, []);
  const [loaded, error] = useFonts({
    Samarkan: require('../../assets/fonts/Samarkan.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : CustomTheme}>
      <StatusBar style={colorScheme === 'dark' ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FCFAF8' } }} />
    </ThemeProvider>
  );
}

