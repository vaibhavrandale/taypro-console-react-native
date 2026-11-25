import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { spacing } from "../theme/spacing";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AttendanceStack } from "./AttendanceStack";
import { DprStack, type DprStackParamList } from "./DprStack";
import { SitesStack, type SitesStackParamList } from "./SitesStack";
import {
  canAccessAttendance,
  canAccessSubscriptionPages,
  canSubmitDpr,
} from "../utils/roles";
import type { AttendanceStackParamList } from "./types";

export type MainTabParamList = {
  Dashboard: undefined;
  CleaningLogs: NavigatorScreenParams<SitesStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
  DPR: NavigatorScreenParams<DprStackParamList> | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function BlinkTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const inactive = isDark ? colors.textSecondary : "#1C1C1C";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.navbar,
          paddingBottom: Math.max(insets.bottom, 8),
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: isDark ? 0.3 : 0.06,
              shadowRadius: 6,
            },
            android: { elevation: 8 },
            default: {
              boxShadow: isDark
                ? "0 -1px 6px rgba(0, 0, 0, 0.3)"
                : "0 -1px 6px rgba(16, 25, 54, 0.06)",
            },
          }),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const color = focused ? colors.primary : inactive;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: "tabLongPress", target: route.key })
            }
            style={styles.item}
          >
            {options.tabBarIcon?.({ focused, color, size: 22 })}
            <Text
              numberOfLines={1}
              style={[styles.label, { color, fontWeight: focused ? "700" : "500" }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  const { user } = useAuth();
  const showAttendance = canAccessAttendance(user?.role);
  const showDpr = canSubmitDpr(user?.role);
  const showSubscriptionBadge = canAccessSubscriptionPages(user?.role);

  return (
    <Tab.Navigator
      tabBar={(props) => <BlinkTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: spacing.xl },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CleaningLogs"
        component={SitesStack}
        options={{
          tabBarLabel: "Logs",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "list" : "list-outline"}
                size={22}
                color={color}
              />
              {showSubscriptionBadge ? (
                <Ionicons
                  name="diamond"
                  size={8}
                  color="#FACC15"
                  style={styles.badge}
                />
              ) : null}
            </View>
          ),
        }}
      />
      {showAttendance ? (
        <Tab.Screen
          name="Attendance"
          component={AttendanceStack}
          options={{
            tabBarLabel: "Attendance",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "finger-print" : "finger-print-outline"}
                size={22}
                color={color}
              />
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -7,
  },
});
