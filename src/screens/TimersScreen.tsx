import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { TimerCard } from '../components/timers/TimerCard';
import { TimerDetailModal } from '../components/timers/TimerDetailModal';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Button, Input } from '../components/ui';
import {
  bulkToggleTimerPermission,
  fetchTimers,
} from '../api/timers';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import type { BlockTimer } from '../types/timers';
import {
  canBulkToggleTimers,
  canEditTimer,
} from '../utils/roles';
import type { TimersStackParamList } from '../navigation/TimersStack';

type Navigation = NativeStackNavigationProp<TimersStackParamList, 'TimersList'>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

export function TimersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const showBulkToggle = canBulkToggleTimers(user?.role);

  const [siteId, setSiteId] = useState('');
  const [timers, setTimers] = useState<BlockTimer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewTimer, setViewTimer] = useState<BlockTimer | null>(null);
  const [blockSearch, setBlockSearch] = useState('');

  useEffect(() => {
    if (assignedSites.length === 0) {
      setSiteId('');
      setLoading(false);
      return;
    }

    setSiteId((current) => {
      if (
        current === 'all' ||
        (current && assignedSites.some((site) => site.site_id === current))
      ) {
        return current;
      }
      return assignedSites[0].site_id;
    });
  }, [assignedSites]);

  const siteOptions = useMemo(() => {
    const options = assignedSites.map((site) => ({
      value: site.site_id,
      label: getSiteLabel(site),
    }));

    if (assignedSites.length > 1) {
      return [{ value: 'all', label: 'All assigned sites' }, ...options];
    }

    return options;
  }, [assignedSites]);

  const loadTimers = useCallback(
    async (isRefresh = false) => {
      if (!siteId) {
        setTimers([]);
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const data = await fetchTimers(siteId);
        setTimers(data);
        setSelectedIds(new Set());
      } catch (err) {
        setTimers([]);
        setError(err instanceof Error ? err.message : 'Failed to load timers');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId],
  );

  useEffect(() => {
    void loadTimers();
  }, [loadTimers]);

  useEffect(() => {
    setBlockSearch('');
  }, [siteId]);

  const filteredTimers = useMemo(() => {
    const query = blockSearch.trim().toLowerCase();
    if (!query) return timers;
    return timers.filter((timer) => {
      const block = (timer.block ?? '').toLowerCase();
      const site = (timer.site_id ?? '').toLowerCase();
      return block.includes(query) || site.includes(query);
    });
  }, [timers, blockSearch]);

  const allSelected =
    filteredTimers.length > 0 &&
    filteredTimers.every((timer) => selectedIds.has(timer._id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const timer of filteredTimers) next.delete(timer._id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const timer of filteredTimers) next.add(timer._id);
      return next;
    });
  };

  const handleBulkToggle = async () => {
    if (selectedIds.size === 0) {
      appAlert('Select blocks', 'Please select at least one block to update.');
      return;
    }

    setBulkLoading(true);
    try {
      const updated = await bulkToggleTimerPermission([...selectedIds]);
      const byId = new Map(updated.map((item) => [item._id, item]));
      setTimers((prev) =>
        prev.map((timer) => byId.get(timer._id) ?? timer),
      );
      setSelectedIds(new Set());
      appAlert('Success', 'Timer permission updated.');
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Bulk update failed',
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const header = (
    <View style={styles.headerContent}>
      <View
        style={[
          styles.filtersCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <UptimeSelectField
          label="Site"
          value={siteId}
          options={siteOptions}
          onChange={(value) => setSiteId(String(value))}
          icon="business-outline"
        />

        <Input
          placeholder="Search block..."
          value={blockSearch}
          onChangeText={setBlockSearch}
          leftIcon="search-outline"
        />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {filteredTimers.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {blockSearch.trim() ? 'Matches' : 'Blocks'}
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCellWide}>
            <Text
              style={[styles.summarySite, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {blockSearch.trim()
                ? `${filteredTimers.length} of ${timers.length} blocks`
                : siteId === 'all'
                  ? 'All assigned sites'
                  : siteId || '—'}
            </Text>
          </View>
        </View>
      </View>

      {showBulkToggle ? (
        <View style={styles.bulkRow}>
          <Pressable
            onPress={toggleSelectAll}
            disabled={filteredTimers.length === 0}
            style={[
              styles.selectAll,
              {
                borderColor: colors.border,
                backgroundColor: colors.backgroundSecondary,
                opacity: filteredTimers.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: allSelected ? colors.primary : colors.border,
                  backgroundColor: allSelected ? colors.primary : 'transparent',
                },
              ]}
            >
              {allSelected ? (
                <Ionicons name="checkmark" size={14} color="#101936" />
              ) : null}
            </View>
            <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>
              Select all
            </Text>
          </Pressable>

          <Button
            title={
              bulkLoading
                ? 'Updating...'
                : selectedIds.size > 0
                  ? `Toggle (${selectedIds.size})`
                  : 'Toggle Permission'
            }
            size="sm"
            onPress={handleBulkToggle}
            loading={bulkLoading}
            disabled={selectedIds.size === 0}
          />
        </View>
      ) : null}

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.badge.error.bg,
              borderColor: colors.danger,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Button
            title="Retry"
            size="sm"
            variant="outline"
            onPress={() => void loadTimers()}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Timers" subtitle="Block cleaning schedules" />

      {assignedSites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No assigned sites
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Timers will appear once sites are assigned to your account.
          </Text>
        </View>
      ) : loading && timers.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTimers}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadTimers(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyList}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {blockSearch.trim() ? 'No blocks match' : 'No blocks found'}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                  {blockSearch.trim()
                    ? 'Try a different block name.'
                    : 'No timer blocks for this site.'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <TimerCard
              timer={item}
              index={index + 1}
              selectable={showBulkToggle}
              selected={selectedIds.has(item._id)}
              canUpdate={canEditTimer(user?.role, item.is_available_to_edit)}
              onToggleSelect={() => toggleSelect(item._id)}
              onView={() => setViewTimer(item)}
              onUpdate={() =>
                navigation.navigate('UpdateTimer', { timerId: item._id })
              }
            />
          )}
        />
      )}

      <TimerDetailModal
        visible={viewTimer != null}
        timer={viewTimer}
        onClose={() => setViewTimer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filtersCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCell: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  summaryCellWide: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  summaryValue: {
    ...typography.label,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summarySite: {
    ...typography.bodySmall,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllText: {
    ...typography.bodySmall,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.label,
    fontSize: 16,
  },
  emptyBody: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
