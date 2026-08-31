import React, { useMemo, useState } from "react";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useTimerExecutionNotification } from "../../context/TimerExecutionNotificationContext";
import { useTheme } from "../../theme";
import { Badge } from "../ui";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import {
  canAccessAttendance,
  canAccessExpenses,
  canAccessPreventiveMaintenance,
  canAccessServiceInventory,
  canSubmitDpr,
} from "../../utils/roles";

export type DrawerRoute = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  nestedScreen?: string;
};

type MenuSection = {
  title: string;
  items: DrawerRoute[];
};

const BASE_MENU_SECTIONS: MenuSection[] = [
  {
    title: "Main",
    items: [
      {
        name: "MainTabs",
        label: "Dashboard",
        icon: "grid-outline",
        nestedScreen: "Dashboard",
      },
      {
        name: "Notifications",
        label: "Notifications",
        icon: "notifications-outline",
      },
      {
        name: "Robots",
        label: "Robot Battery",
        icon: "battery-charging-outline",
      },
    ],
  },
  {
    title: "Fleet",
    items: [
      { name: "Sites", label: "Sites", icon: "location-outline" },
      { name: "Gateways", label: "Gateways", icon: "wifi-outline" },
      {
        name: "RobotUptime",
        label: "Robot Uptime",
        icon: "stats-chart-outline",
      },
      {
        name: "RobotTracking",
        label: "Robot Tracking",
        icon: "navigate-outline",
      },
      {
        name: "RobotCommands",
        label: "Robot Commands",
        icon: "send-outline",
      },
      {
        name: "RobotActivity",
        label: "Command Activity",
        icon: "hardware-chip-outline",
      },
      { name: "Timers", label: "Timers", icon: "timer-outline" },
    ],
  },
  {
    title: "Management",
    items: [
      { name: "Users", label: "Users", icon: "people-outline" },
      {
        name: "ServiceTickets",
        label: "Service Tickets",
        icon: "construct-outline",
      },
      {
        name: "ServiceInventory",
        label: "Service Inventory",
        icon: "cube-outline",
      },
      { name: "Settings", label: "Settings", icon: "settings-outline" },
      { name: "Dummy", label: "Dummy", icon: "color-palette-outline" },
    ],
  },
];

function buildMenuSections(role?: string): MenuSection[] {
  const mainItems = [...BASE_MENU_SECTIONS[0].items];

  if (canSubmitDpr(role)) {
    mainItems.push({
      name: "MainTabs",
      label: "DPR",
      icon: "document-text-outline",
      nestedScreen: "DPR",
    });
  }

  if (canAccessAttendance(role)) {
    mainItems.push({
      name: "MainTabs",
      label: "Attendance",
      icon: "finger-print-outline",
      nestedScreen: "Attendance",
    });
  }

  const managementItems = BASE_MENU_SECTIONS[2].items.filter(
    (item) =>
      item.name !== "ServiceInventory" || canAccessServiceInventory(role),
  );
  if (canAccessPreventiveMaintenance(role)) {
    const ticketsIndex = managementItems.findIndex(
      (item) => item.name === "ServiceTickets",
    );
    managementItems.splice(ticketsIndex + 1, 0, {
      name: "PreventiveMaintenance",
      label: "Preventive Maintenance",
      icon: "build-outline",
    });
  }

  if (canAccessExpenses(role)) {
    const pmIndex = managementItems.findIndex(
      (item) => item.name === "PreventiveMaintenance",
    );
    const ticketsIndex = managementItems.findIndex(
      (item) => item.name === "ServiceTickets",
    );
    const insertAt = (pmIndex >= 0 ? pmIndex : ticketsIndex) + 1;
    managementItems.splice(insertAt, 0, {
      name: "ExpenseClaims",
      label: "Expense Claims",
      icon: "wallet-outline",
    });
  }

  return [
    { title: "Main", items: mainItems },
    BASE_MENU_SECTIONS[1],
    { title: "Management", items: managementItems },
  ];
}

const SIDEBAR_TEXT = "#F0F4FF";
const SIDEBAR_MUTED = "#8B9DC3";

function getServerRoot() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
}

function getProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${getServerRoot()}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatRole(role: string) {
  return role
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getActiveRoute(state: DrawerContentComponentProps["state"]) {
  const route = state.routes[state.index ?? 0];

  if (route.name === "MainTabs" && route.state) {
    const tabState = route.state;
    const tabRoute = tabState.routes[tabState.index ?? 0];
    return {
      drawerRoute: route.name,
      nestedScreen: tabRoute?.name as string | undefined,
    };
  }

  return { drawerRoute: route.name, nestedScreen: undefined };
}

function isItemFocused(
  item: DrawerRoute,
  active: { drawerRoute: string; nestedScreen?: string },
) {
  if (item.nestedScreen) {
    return (
      active.drawerRoute === item.name &&
      active.nestedScreen === item.nestedScreen
    );
  }
  return active.drawerRoute === item.name;
}

type MenuItemProps = {
  item: DrawerRoute;
  focused: boolean;
  onPress: () => void;
  badgeCount?: number;
};

function MenuItem({ item, focused, onPress, badgeCount }: MenuItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        focused && { backgroundColor: "rgba(0, 201, 167, 0.12)" },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={17}
        color={focused ? colors.primary : SIDEBAR_MUTED}
      />
      <Text
        style={[
          styles.menuLabel,
          { color: focused ? colors.primary : SIDEBAR_TEXT },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {badgeCount && badgeCount > 0 ? (
        <Badge
          label={badgeCount > 9 ? "9+" : String(badgeCount)}
          variant="error"
          size="sm"
        />
      ) : null}
    </Pressable>
  );
}

export function Sidebar(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotification();
  const { notifications: timerNotifications } = useTimerExecutionNotification();
  const [search, setSearch] = useState("");
  const active = getActiveRoute(props.state);
  const notificationBadge = unreadCount + timerNotifications.length;
  const menuSections = useMemo(
    () => buildMenuSections(user?.role),
    [user?.role],
  );

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuSections;
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, search]);

  const navigateTo = (item: DrawerRoute) => {
    if (item.nestedScreen) {
      props.navigation.navigate(item.name, { screen: item.nestedScreen });
    } else {
      props.navigation.navigate(item.name);
    }
    setSearch("");
    props.navigation.closeDrawer();
  };

  const profileImageUri = getProfileImageUri(user?.profile_image);
  const profileFocused =
    active.drawerRoute === "MainTabs" && active.nestedScreen === "Profile";

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../../assets/logofordarkbg.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Pressable
            onPress={() => props.navigation.closeDrawer()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: "#080e22" },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={12} color={SIDEBAR_MUTED} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search menu..."
            placeholderTextColor={SIDEBAR_MUTED}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={12} color={SIDEBAR_MUTED} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredSections.length === 0 ? (
          <Text style={styles.emptySearch}>No matching links</Text>
        ) : (
          filteredSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              {sectionIndex > 0 ? <View style={styles.divider} /> : null}
              {section.items.map((item, index) => (
                <MenuItem
                  key={`${item.name}-${item.label}-${index}`}
                  item={item}
                  focused={isItemFocused(item, active)}
                  onPress={() => navigateTo(item)}
                  badgeCount={
                    item.name === "Notifications"
                      ? notificationBadge
                      : undefined
                  }
                />
              ))}
            </View>
          ))
        )}
      </DrawerContentScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {user ? (
          <Pressable
            onPress={() =>
              navigateTo({
                name: "MainTabs",
                label: "Profile",
                icon: "person-outline",
                nestedScreen: "Profile",
              })
            }
            style={({ pressed }) => [
              styles.userRow,
              profileFocused && { backgroundColor: "rgba(0, 201, 167, 0.12)" },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.avatar}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={16} color={SIDEBAR_MUTED} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={styles.userRole} numberOfLines={1}>
                {formatRole(user.role)}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            signOut();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  logoWrap: {
    flex: 1,
    aspectRatio: 4.2,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: "rgba(139, 157, 195, 0.55)",
    paddingHorizontal: 2,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 36,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: SIDEBAR_TEXT,
  },
  emptySearch: {
    ...typography.bodySmall,
    fontSize: 12,
    color: SIDEBAR_MUTED,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  section: {
    gap: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(45, 58, 92, 0.9)",
    marginVertical: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  menuLabel: {
    ...typography.body,
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(45, 58, 92, 0.9)",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45, 58, 92, 0.7)",
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.label,
    fontSize: 12,
    color: SIDEBAR_TEXT,
  },
  userRole: {
    ...typography.caption,
    fontSize: 10,
    color: SIDEBAR_MUTED,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  logoutText: {
    ...typography.body,
    fontWeight: "500",
    fontSize: 13,
  },
});
