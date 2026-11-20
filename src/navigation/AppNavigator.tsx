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
import { UsersScreen } from '../screens/UsersScreen';
import { VoiceCallModal } from '../screens/VoiceCallModal';
import { MainTabs } from './MainTabs';
import { SitesStack } from './SitesStack';
import { TimersStack } from './TimersStack';
import { ServiceTicketsStack } from './ServiceTicketsStack';
import { ClientTicketsStack } from './ClientTicketsStack';
import { PreventiveMaintenanceStack } from './PreventiveMaintenanceStack';
import { ExpenseClaimsStack } from './ExpenseClaimsStack';
import { RobotsScreen } from '../screens/RobotsScreen';
import { RobotActivityScreen } from '../screens/RobotActivityScreen';
import { RobotCommandsScreen } from '../screens/RobotCommandsScreen';
import { PcbLogScreen } from '../screens/PcbLogScreen';
import { BlockwiseScreen } from '../screens/BlockwiseScreen';
import { BlockManagementScreen } from '../screens/BlockManagementScreen';
import { RobotOperatingScreen } from '../screens/RobotOperatingScreen';
import { GatewayDetailScreen } from '../screens/GatewayDetailScreen';
import { GatewaysScreen } from '../screens/GatewaysScreen';
import { RobotUptimeScreen } from '../screens/RobotUptimeScreen';
import { RobotTrackingScreen } from '../screens/RobotTrackingScreen';
import { ServiceInventoryScreen } from '../screens/ServiceInventoryScreen';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { CustomNotificationModal } from '../components/notifications/CustomNotificationModal';
import { TimerExecutionNotificationModal } from '../components/notifications/TimerExecutionNotificationModal';
import { DummyScreen } from '../screens/DummyScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PricingScreen } from '../screens/PricingScreen';
import { MySubscriptionScreen } from '../screens/MySubscriptionScreen';
import { AnalyticsStack } from './AnalyticsStack';
import { ExternalUsersStack } from './ExternalUsersStack';
import {
  canAccessAnalytics,
  canAccessClientTickets,
  canAccessServiceTickets,
  canManageExternalUsers,
} from '../utils/roles';

const AuthStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainDrawer() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const showServiceTickets = canAccessServiceTickets(user?.role);
  const showClientTickets = canAccessClientTickets(user?.role);
  const showAnalytics = canAccessAnalytics(user?.role);
  const showExternalUsers = canManageExternalUsers(user?.role);

  return (
    <>
      <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: colors.overlay,
        drawerStyle: {
          width: 240,
          backgroundColor: colors.sidebar,
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} options={{ title: 'Home' }} />
      <Drawer.Screen name="Robots" component={RobotsScreen} />
      <Drawer.Screen
        name="RobotCommands"
        component={RobotCommandsScreen}
        options={{ title: 'Robot Commands' }}
      />
      <Drawer.Screen
        name="RobotActivity"
        component={RobotActivityScreen}
        options={{ title: 'Command Activity' }}
      />
      <Drawer.Screen
        name="PcbLog"
        component={PcbLogScreen}
        options={{ title: 'PCB log' }}
      />
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
      <Drawer.Screen name="Gateways" component={GatewaysScreen} />
      <Drawer.Screen name="RobotUptime" component={RobotUptimeScreen} />
      <Drawer.Screen
        name="RobotTracking"
        component={RobotTrackingScreen}
        options={{ title: 'Robot Tracking' }}
      />
      {showAnalytics ? (
        <Drawer.Screen
          name="Analytics"
          component={AnalyticsStack}
          options={{ title: 'Analytics' }}
        />
      ) : null}
      <Drawer.Screen name="Timers" component={TimersStack} />
      <Drawer.Screen name="Users" component={UsersScreen} options={{ title: 'Voice Call' }} />
      {showExternalUsers ? (
        <Drawer.Screen
          name="ExternalUsers"
          component={ExternalUsersStack}
          options={{ title: 'Manage Users' }}
        />
      ) : null}
      {showServiceTickets ? (
        <Drawer.Screen name="ServiceTickets" component={ServiceTicketsStack} />
      ) : null}
      {showClientTickets ? (
        <Drawer.Screen
          name="ClientTickets"
          component={ClientTicketsStack}
          options={{ title: 'Client Tickets' }}
        />
      ) : null}
      <Drawer.Screen
        name="ServiceInventory"
        component={ServiceInventoryScreen}
        options={{ title: 'Service Inventory' }}
      />
      <Drawer.Screen
        name="PreventiveMaintenance"
        component={PreventiveMaintenanceStack}
      />
      <Drawer.Screen name="ExpenseClaims" component={ExpenseClaimsStack} />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Drawer.Screen name="Settings">
        {() => (
          <PlaceholderScreen
            title="Settings"
            description="Theme, notifications, and account preferences."
            badgeLabel="Theme Ready"
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
      <Drawer.Screen
        name="Pricing"
        component={PricingScreen}
        options={{ title: 'Pricing' }}
      />
      <Drawer.Screen
        name="MySubscription"
        component={MySubscriptionScreen}
        options={{ title: 'My Subscription' }}
      />
      <Drawer.Screen
        name="Dummy"
        component={DummyScreen}
        options={{ title: 'Dummy' }}
      />
    </Drawer.Navigator>
      <GlobalSearchModal />
      <CustomNotificationModal />
      <TimerExecutionNotificationModal />
      <VoiceCallModal />
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
