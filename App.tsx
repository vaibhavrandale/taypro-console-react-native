import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SiteDetailsProvider } from './src/context/SiteDetailsContext';
import { SearchProvider } from './src/context/SearchContext';
import { ThemeProvider } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SiteDetailsProvider>
            <SearchProvider>
              <AppNavigator />
            </SearchProvider>
          </SiteDetailsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
