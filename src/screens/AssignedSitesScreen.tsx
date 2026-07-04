import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { AssignedSite } from '../types/auth';
import type { DrawerParamList } from '../navigation/types';
import { SitesStackParamList } from '../navigation/SitesStack';

type Navigation = CompositeNavigationProp<
  NativeStackNavigationProp<SitesStackParamList, 'AssignedSites'>,
  DrawerNavigationProp<DrawerParamList>
>;

type SiteActionProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function SiteActionLink({ label, icon, onPress }: SiteActionProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionLink,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

export function AssignedSitesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const sites = (user?.assigned_sites ?? []).filter((site) => site.site_id);

  const renderSite = ({ item }: { item: AssignedSite }) => {
    const siteName = item.site_name || item.site_id;

    return (
      <View
        style={[
          styles.siteCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.siteTopRow}>
          <View
            style={[styles.iconWrap, { backgroundColor: colors.backgroundTertiary }]}
          >
            <Ionicons name="business-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.siteInfo}>
            <Text
              style={[styles.siteName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {siteName}
            </Text>
            <Text
              style={[styles.siteId, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.site_id}
            </Text>
          </View>
          {item.assignedAt ? (
            <Badge label="Assigned" variant="success" size="sm" />
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <SiteActionLink
            label="Blockwise"
            icon="grid-outline"
            onPress={() =>
              navigation.navigate('Blockwise', {
                siteId: item.site_id,
                siteName,
              })
            }
          />
          <SiteActionLink
            label="Logs"
            icon="list-outline"
            onPress={() =>
              navigation.navigate('SiteCleaningLogs', {
                siteId: item.site_id,
                siteName,
              })
            }
          />
          <SiteActionLink
            label="Uptime / Summary"
            icon="stats-chart-outline"
            onPress={() =>
              navigation.navigate('RobotUptime', {
                siteId: item.site_id,
                siteName,
              })
            }
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Assigned Sites"
        subtitle="Choose blockwise, logs, or uptime for a site"
      />

      <FlatList
        data={sites}
        keyExtractor={(item) => item.site_id}
        renderItem={renderSite}
        contentContainerStyle={[
          styles.listContent,
          sites.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          sites.length > 0 ? (
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {sites.length} assigned site{sites.length === 1 ? '' : 's'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Badge label="No Site Assigned" variant="warning" />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No assigned sites found
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ask an admin to assign sites to your account before viewing site
              tools.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  countText: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  siteCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  siteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    ...typography.h3,
  },
  siteId: {
    ...typography.caption,
    marginTop: 2,
  },
  actionsRow: {
    gap: spacing.xs,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    ...typography.label,
    flex: 1,
    fontSize: 13,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyText: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
});
