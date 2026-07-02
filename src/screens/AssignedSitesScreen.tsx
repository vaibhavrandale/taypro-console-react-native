import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { AssignedSite } from '../types/auth';
import { SitesStackParamList } from '../navigation/SitesStack';

type Navigation = NativeStackNavigationProp<SitesStackParamList, 'AssignedSites'>;

export function AssignedSitesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const sites = (user?.assigned_sites ?? []).filter((site) => site.site_id);

  const renderSite = ({ item }: { item: AssignedSite }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('CleaningLogs', {
          siteId: item.site_id,
          siteName: item.site_name,
        })
      }
      style={[
        styles.siteCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.siteTopRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.backgroundTertiary }]}>
          <Ionicons name="business-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.siteInfo}>
          <Text style={[styles.siteName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.site_name || item.site_id}
          </Text>
          <Text style={[styles.siteId, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.site_id}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      <View style={styles.badgeRow}>
        <Badge label="Cleaning Logs" variant="info" size="sm" />
        {item.assignedAt ? <Badge label="Assigned" variant="success" size="sm" /> : null}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="Assigned Sites" subtitle="Select a site for daily cleaning logs" />

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
              Ask an admin to assign sites to your account before viewing cleaning logs.
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
