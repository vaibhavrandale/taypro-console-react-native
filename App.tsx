import 'react-native-gesture-handler';
import './src/services/technicianLocationTracking';
import { useEffect } from 'react';
import { useFonts } from '@expo-google-fonts/blinker/useFonts';
import { Blinker_100Thin } from '@expo-google-fonts/blinker/100Thin';
import { Blinker_200ExtraLight } from '@expo-google-fonts/blinker/200ExtraLight';
import { Blinker_300Light } from '@expo-google-fonts/blinker/300Light';
import { Blinker_400Regular } from '@expo-google-fonts/blinker/400Regular';
import { Blinker_600SemiBold } from '@expo-google-fonts/blinker/600SemiBold';
import { Blinker_700Bold } from '@expo-google-fonts/blinker/700Bold';
import { Blinker_800ExtraBold } from '@expo-google-fonts/blinker/800ExtraBold';
import { Blinker_900Black } from '@expo-google-fonts/blinker/900Black';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LocationTrackingProvider } from './src/context/LocationTrackingContext';
import { SiteDetailsProvider } from './src/context/SiteDetailsContext';
import { SearchProvider } from './src/context/SearchContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { TimerExecutionNotificationProvider } from './src/context/TimerExecutionNotificationContext';
import { ThemeProvider } from './src/theme';
import { applyBlinkerFont } from './src/theme/applyBlinkerFont';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppAlertHost } from './src/components/ui/AppAlertHost';
import { AppStatusBar } from './src/components/layout';
import { StatusBarOverlayProvider } from './src/context/StatusBarOverlayContext';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Blinker_100Thin,
    Blinker_200ExtraLight,
    Blinker_300Light,
    Blinker_400Regular,
    Blinker_600SemiBold,
    Blinker_700Bold,
    Blinker_800ExtraBold,
    Blinker_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyBlinkerFont();
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarOverlayProvider>
          <AppStatusBar />
          <AuthProvider>
            <LocationTrackingProvider>
              <SiteDetailsProvider>
                <SearchProvider>
                  <NotificationProvider>
                    <TimerExecutionNotificationProvider>
                      <AppNavigator />
                      <AppAlertHost />
                    </TimerExecutionNotificationProvider>
                  </NotificationProvider>
                </SearchProvider>
              </SiteDetailsProvider>
            </LocationTrackingProvider>
          </AuthProvider>
        </StatusBarOverlayProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
