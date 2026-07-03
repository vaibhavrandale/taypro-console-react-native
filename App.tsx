import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SiteDetailsProvider } from './src/context/SiteDetailsContext';
import { SearchProvider } from './src/context/SearchContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ThemeProvider } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppStatusBar } from './src/components/layout';
import { StatusBarOverlayProvider } from './src/context/StatusBarOverlayContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarOverlayProvider>
          <AppStatusBar />
          <AuthProvider>
            <SiteDetailsProvider>
              <SearchProvider>
                <NotificationProvider>
                  <AppNavigator />
                </NotificationProvider>
              </SearchProvider>
            </SiteDetailsProvider>
          </AuthProvider>
        </StatusBarOverlayProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
