import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AttendanceStack } from "./AttendanceStack";
import { canAccessAttendance } from "../utils/roles";

export type MainTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + Math.max(insets.bottom, 6);
  const showAttendance = canAccessAttendance(user?.role);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.navbar,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={20} color={color} />
          ),
        }}
      />
      {showAttendance ? (
        <Tab.Screen
          name="Attendance"
          component={AttendanceStack}
          options={{
            tabBarLabel: "Attendance",
            tabBarIcon: ({ color }) => (
              <Ionicons name="finger-print-outline" size={20} color={color} />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
