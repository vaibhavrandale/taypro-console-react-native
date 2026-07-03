import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Badge } from "../ui/Badge";
import { Logo } from "../ui/Logo";
import { useSearch } from "../../context/SearchContext";
import { useNotification } from "../../context/NotificationContext";

type Props = {
  title: string;
  subtitle?: string;
  showMenu?: boolean;
  showLogo?: boolean;
  showThemeToggle?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onThemeToggle?: () => void;
  onNotificationsPress?: () => void;
  leftAction?: React.ReactNode;
};

export function Navbar({
  title,
  subtitle,
  showMenu = true,
  showLogo = true,
  showThemeToggle = true,
  showSearch = true,
  showNotifications = true,
  notificationCount,
  onThemeToggle,
  onNotificationsPress,
  leftAction,
}: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { openSearch } = useSearch();
  const { unreadCount, openNotification } = useNotification();

  const handleThemeToggle = onThemeToggle ?? toggleTheme;
  const badgeCount = notificationCount ?? unreadCount;
  const handleNotificationsPress = onNotificationsPress ?? openNotification;

  return (
    <View style={{ backgroundColor: colors.navbar }}>
      <View style={{ height: insets.top, backgroundColor: colors.navbar }} />
      <View
        style={[
          styles.container,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
      <View style={styles.row}>
        {leftAction ? (
          leftAction
        ) : showMenu ? (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={[
              styles.iconButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
            hitSlop={6}
          >
            <Ionicons name="menu" size={18} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        {/* {showLogo ? <Logo size="sm" /> : null} */}

        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {showSearch ? (
            <Pressable
              onPress={openSearch}
              style={[
                styles.iconButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
              hitSlop={6}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textPrimary}
              />
            </Pressable>
          ) : null}

          {showNotifications ? (
            <Pressable
              onPress={handleNotificationsPress}
              style={[
                styles.iconButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
              hitSlop={6}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.textPrimary}
              />
              {badgeCount > 0 ? (
                <View style={styles.badgeWrap}>
                  <Badge
                    label={badgeCount > 9 ? "9+" : String(badgeCount)}
                    variant="error"
                    size="sm"
                  />
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {showThemeToggle ? (
            <Pressable
              onPress={handleThemeToggle}
              style={[
                styles.iconButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
              hitSlop={6}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={16}
                color={colors.textPrimary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 32,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badgeWrap: {
    position: "absolute",
    top: -3,
    right: -5,
  },
});
