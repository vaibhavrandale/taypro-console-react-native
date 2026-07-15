import 'react-native-gesture-handler';
import './src/services/technicianLocationTracking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LocationTrackingProvider } from './src/context/LocationTrackingContext';
import { SiteDetailsProvider } from './src/context/SiteDetailsContext';
import { SearchProvider } from './src/context/SearchContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { TimerExecutionNotificationProvider } from './src/context/TimerExecutionNotificationContext';
import { ThemeProvider } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppAlertHost } from './src/components/ui/AppAlertHost';
import { AppStatusBar } from './src/components/layout';
import { StatusBarOverlayProvider } from './src/context/StatusBarOverlayContext';

export default function App() {
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
