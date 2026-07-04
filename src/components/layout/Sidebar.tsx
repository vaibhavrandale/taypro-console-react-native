import React, { useMemo } from 'react';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge } from '../ui/Badge';
import { Logo } from '../ui/Logo';
import { canAccessAttendance, canSubmitDpr } from '../../utils/roles';

export type DrawerRoute = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeVariant?:
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'purple';
  nestedScreen?: string;
};

type MenuSection = {
  title: string;
  items: DrawerRoute[];
};

const BASE_MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Main',
    items: [
      {
        name: 'MainTabs',
        label: 'Dashboard',
        icon: 'grid-outline',
        nestedScreen: 'Dashboard',
      },
      {
        name: 'Robots',
        label: 'Robot Battery',
        icon: 'battery-charging-outline',
      },
      {
        name: 'MainTabs',
        label: 'Profile',
        icon: 'person-outline',
        nestedScreen: 'Profile',
      },
    ],
  },
  {
    title: 'Fleet',
    items: [
      {
        name: 'Sites',
        label: 'Sites',
        icon: 'location-outline',
        badge: 'Live',
        badgeVariant: 'success',
      },
      {
        name: 'Gateways',
        label: 'Gateways',
        icon: 'wifi-outline',
      },
      {
        name: 'RobotUptime',
        label: 'Robot Uptime',
        icon: 'stats-chart-outline',
      },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Users', label: 'Users', icon: 'people-outline' },
      {
        name: 'ServiceTickets',
        label: 'Service Tickets',
        icon: 'construct-outline',
        badge: '3',
        badgeVariant: 'warning',
      },
      { name: 'Settings', label: 'Settings', icon: 'settings-outline' },
    ],
  },
];

function buildMenuSections(role?: string): MenuSection[] {
  const mainItems = [...BASE_MENU_SECTIONS[0].items];
  const insertIndex = mainItems.findIndex((item) => item.nestedScreen === 'Profile');

  if (canAccessAttendance(role)) {
    mainItems.splice(insertIndex, 0, {
      name: 'MainTabs',
      label: 'Attendance',
      icon: 'finger-print-outline',
      nestedScreen: 'Attendance',
    });
  }

  if (canSubmitDpr(role)) {
    mainItems.splice(insertIndex, 0, {
      name: 'MainTabs',
      label: 'DPR',
      icon: 'document-text-outline',
      nestedScreen: 'DPR',
    });
  }

  return [
    { title: 'Main', items: mainItems },
    ...BASE_MENU_SECTIONS.slice(1),
  ];
}

const SIDEBAR_TEXT = '#F0F4FF';
const SIDEBAR_MUTED = '#8B9DC3';

function getServerRoot() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

function getProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${getServerRoot()}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatRole(role: string) {
  return role
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getActiveRoute(state: DrawerContentComponentProps['state']) {
  const route = state.routes[state.index ?? 0];

  if (route.name === 'MainTabs' && route.state) {
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
};

function MenuItem({ item, focused, onPress }: MenuItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        focused && {
          backgroundColor: 'rgba(0, 201, 167, 0.12)',
        },
        pressed && styles.menuItemPressed,
      ]}
    >
      {focused ? (
        <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />
      ) : null}

      <View
        style={[
          styles.menuIconWrap,
          {
            backgroundColor: focused
              ? 'rgba(0, 201, 167, 0.18)'
              : 'rgba(45, 58, 92, 0.55)',
          },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={17}
          color={focused ? colors.primary : SIDEBAR_MUTED}
        />
      </View>

      <Text
        style={[
          styles.menuLabel,
          { color: focused ? colors.primary : SIDEBAR_TEXT },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>

      {item.badge ? (
        <Badge
          label={item.badge}
          variant={item.badgeVariant ?? 'neutral'}
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
  const active = getActiveRoute(props.state);
  const menuSections = useMemo(
    () => buildMenuSections(user?.role),
    [user?.role],
  );

  const navigateTo = (item: DrawerRoute) => {
    if (item.nestedScreen) {
      props.navigation.navigate(item.name, { screen: item.nestedScreen });
    } else {
      props.navigation.navigate(item.name);
    }
    props.navigation.closeDrawer();
  };

  const profileImageUri = getProfileImageUri(user?.profile_image);

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Logo size="xl" background="dark" rounded={false} />
        <Text style={styles.brand}>Nectyr</Text>
        <Text style={styles.tagline}>Solar Operations Console</Text>
      </View>

      {user ? (
        <Pressable
          onPress={() => navigateTo({
            name: 'MainTabs',
            label: 'Profile',
            icon: 'person-outline',
            nestedScreen: 'Profile',
          })}
          style={({ pressed }) => [
            styles.userCard,
            pressed && styles.userCardPressed,
          ]}
        >
          <View style={styles.avatar}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Logo size="xs" background="dark" rounded />
              </View>
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
          <Ionicons name="chevron-forward" size={16} color={SIDEBAR_MUTED} />
        </Pressable>
      ) : null}

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, index) => (
              <MenuItem
                key={`${item.name}-${item.label}-${index}`}
                item={item}
                focused={isItemFocused(item, active)}
                onPress={() => navigateTo(item)}
              />
            ))}
          </View>
        ))}
      </DrawerContentScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            signOut();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(45, 58, 92, 0.8)',
    gap: spacing.xs,
  },
  brand: {
    ...typography.h3,
    color: SIDEBAR_TEXT,
    letterSpacing: 0.3,
  },
  tagline: {
    ...typography.caption,
    color: SIDEBAR_MUTED,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(26, 37, 71, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(45, 58, 92, 0.9)',
    gap: spacing.sm,
  },
  userCardPressed: {
    opacity: 0.88,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(36, 48, 86, 0.9)',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.label,
    color: SIDEBAR_TEXT,
  },
  userRole: {
    ...typography.caption,
    color: SIDEBAR_MUTED,
    marginTop: 2,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: SIDEBAR_MUTED,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    fontSize: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginVertical: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  menuItemPressed: {
    opacity: 0.85,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderRadius: radius.pill,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45, 58, 92, 0.6)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
