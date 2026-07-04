import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AttendanceStack } from "./AttendanceStack";
import { DprStack, type DprStackParamList } from "./DprStack";
import { SitesStack, type SitesStackParamList } from "./SitesStack";
import { canAccessAttendance, canSubmitDpr } from "../utils/roles";
import type { AttendanceStackParamList } from "./types";

export type MainTabParamList = {
  Dashboard: undefined;
  CleaningLogs: NavigatorScreenParams<SitesStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
  DPR: NavigatorScreenParams<DprStackParamList> | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + Math.max(insets.bottom, 6);
  const showAttendance = canAccessAttendance(user?.role);
  const showDpr = canSubmitDpr(user?.role);

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
      <Tab.Screen
        name="CleaningLogs"
        component={SitesStack}
        options={{
          tabBarLabel: "Logs",
          tabBarIcon: ({ color }) => (
            <Ionicons name="list-outline" size={20} color={color} />
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
      {showDpr ? (
        <Tab.Screen
          name="DPR"
          component={DprStack}
          options={{
            tabBarLabel: "DPR",
            tabBarIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={20} color={color} />
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
