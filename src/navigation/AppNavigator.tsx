import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { Sidebar } from '../components/layout';
import { LoginScreen } from '../screens/LoginScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { MainTabs } from './MainTabs';
import { SitesStack } from './SitesStack';
import { RobotsScreen } from '../screens/RobotsScreen';
import { BlockwiseScreen } from '../screens/BlockwiseScreen';
import { BlockManagementScreen } from '../screens/BlockManagementScreen';
import { RobotOperatingScreen } from '../screens/RobotOperatingScreen';
import { GatewayDetailScreen } from '../screens/GatewayDetailScreen';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { CustomNotificationModal } from '../components/notifications/CustomNotificationModal';

const AuthStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainDrawer() {
  const { colors } = useTheme();

  return (
    <>
      <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: colors.overlay,
        drawerStyle: {
          width: 288,
          backgroundColor: colors.sidebar,
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} options={{ title: 'Home' }} />
      <Drawer.Screen name="Robots" component={RobotsScreen} />
      <Drawer.Screen
        name="Blockwise"
        component={BlockwiseScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="BlockManagement"
        component={BlockManagementScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="RobotOperating"
        component={RobotOperatingScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="GatewayDetail"
        component={GatewayDetailScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen name="Sites" component={SitesStack} />
      <Drawer.Screen name="Gateways">
        {() => (
          <PlaceholderScreen
            title="Gateways"
            description="Track LoRaWAN gateway health and uplink activity."
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Users">
        {() => (
          <PlaceholderScreen
            title="Users"
            description="Browse technicians and console users by role and department."
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="ServiceTickets">
        {() => (
          <PlaceholderScreen
            title="Service Tickets"
            description="Open, assigned, and resolved service tickets."
            badgeLabel="3 Open"
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Settings">
        {() => (
          <PlaceholderScreen
            title="Settings"
            description="Theme, notifications, and account preferences."
            badgeLabel="Theme Ready"
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
      <GlobalSearchModal />
      <CustomNotificationModal />
    </>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors, isDark } = useTheme();

  const navigationTheme = React.useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundSecondary,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.danger,
      },
    }),
    [isDark, colors],
  );

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? (
        <MainDrawer key={user?._id ?? "authenticated"} />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
