import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RouteProp } from '@react-navigation/native';
import { Navbar } from '../components/layout';
import { DailyUptimeCard } from '../components/robotUptime/DailyUptimeCard';
import { UptimeHeatmap } from '../components/robotUptime/UptimeHeatmap';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { UptimeSummaryHero } from '../components/robotUptime/UptimeSummaryHero';
import { UptimeTrendChart } from '../components/robotUptime/UptimeTrendChart';
import { fetchRobotUptime } from '../api/robotUptime';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import type { RobotUptimeDay } from '../types/robotUptime';
import {
  buildUptimeSummary,
  formatMonthYear,
  getMonthOptionsForYear,
  getPreviousMonthYear,
  getYearOptions,
  isFutureMonth,
  isRainOrNoRunDay,
} from '../utils/robotUptime';
import {
  getUptimeCache,
  getUptimeCacheKey,
  normalizeUptimeNumbers,
  setUptimeCache,
  toUptimeResultPayload,
  type UptimeResultPayload,
} from '../utils/uptimeCache';
import { canSubmitDpr } from '../utils/roles';
import type { DrawerParamList } from '../navigation/types';

type FilterKey = 'all' | 'issues' | 'norun';
type Route = RouteProp<DrawerParamList, 'RobotUptime'>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

function isAbortError(err: unknown) {
  return err instanceof Error && err.name === 'AbortError';
}

export function RobotUptimeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const route = useRoute<Route>();
  const showDpr = canSubmitDpr(user?.role);
  const initialSiteId = route.params?.siteId;

  const openDprHistory = useCallback(() => {
    navigation.navigate('MainTabs', {
      screen: 'DPR',
      params: { screen: 'DprHistory' },
    });
  }, [navigation]);

  const openDprSubmit = useCallback(() => {
    navigation.navigate('MainTabs', {
      screen: 'DPR',
      params: { screen: 'DprSubmit' },
    });
  }, [navigation]);

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const initialMonth = getPreviousMonthYear();
  const [siteId, setSiteId] = useState('');
  const [month, setMonth] = useState(initialMonth.month);
  const [year, setYear] = useState(initialMonth.year);
  const [days, setDays] = useState<RobotUptimeDay[]>([]);
  const [totals, setTotals] = useState({
    totalAssignedRobots: 0,
    monthlyCleaningUptime: 0,
    monthlyAvailabilityUptime: 0,
    averageSuccess: 0,
    averageFailure: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (assignedSites.length === 0) {
      setSiteId('');
      setLoading(false);
      return;
    }

    setSiteId((current) => {
      if (initialSiteId && assignedSites.some((site) => site.site_id === initialSiteId)) {
        return initialSiteId;
      }
      if (current && assignedSites.some((site) => site.site_id === current)) {
        return current;
      }
      return assignedSites[0].site_id;
    });
  }, [assignedSites, initialSiteId]);

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );

  const yearOptions = useMemo(
    () =>
      getYearOptions().map((value) => ({
        value,
        label: String(value),
      })),
    [],
  );

  const monthOptions = useMemo(
    () => getMonthOptionsForYear(year),
    [year],
  );

  const selectedSite = useMemo(
    () => assignedSites.find((site) => site.site_id === siteId) ?? null,
    [assignedSites, siteId],
  );

  const summary = useMemo(
    () => buildUptimeSummary(days, totals),
    [days, totals],
  );

  const filteredDays = useMemo(() => {
    if (filter === 'issues') {
      return days.filter(
        (day) =>
          day.cleaning_uptime_percentage < 90 ||
          day.failure_count > 0,
      );
    }
    if (filter === 'norun') {
      return days.filter(isRainOrNoRunDay);
    }
    return days;
  }, [days, filter]);

  const applyResult = useCallback((result: UptimeResultPayload) => {
    setDays(result.days ?? []);
    setTotals(normalizeUptimeNumbers(result));
  }, []);

  const stopLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingSeconds(0);
  }, []);

  const startLoadingTimer = useCallback(() => {
    stopLoadingTimer();
    setLoadingSeconds(0);
    loadingTimerRef.current = setInterval(() => {
      setLoadingSeconds((value) => value + 1);
    }, 1000);
  }, [stopLoadingTimer]);

  useEffect(() => () => stopLoadingTimer(), [stopLoadingTimer]);

  const loadUptime = useCallback(
    async (
      targetSiteId: string,
      options?: { forceRefresh?: boolean; isPullRefresh?: boolean },
    ) => {
      if (!targetSiteId || isFutureMonth(month, year)) {
        abortRef.current?.abort();
        setDays([]);
        setTotals({
          totalAssignedRobots: 0,
          monthlyCleaningUptime: 0,
          monthlyAvailabilityUptime: 0,
          averageSuccess: 0,
          averageFailure: 0,
        });
        setError('');
        setLoading(false);
        setRefreshing(false);
        stopLoadingTimer();
        return;
      }

      const cacheKey = getUptimeCacheKey(targetSiteId, month, year);
      const cached = getUptimeCache(cacheKey);
      const requestId = ++requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (cached && !options?.forceRefresh) {
        applyResult(toUptimeResultPayload(cached));
        setError('');
        setLoading(false);
        setRefreshing(false);
        stopLoadingTimer();
        return;
      }

      if (cached) {
        applyResult(toUptimeResultPayload(cached));
        setRefreshing(true);
        setLoading(false);
      } else {
        setDays([]);
        setTotals({
          totalAssignedRobots: 0,
          monthlyCleaningUptime: 0,
          monthlyAvailabilityUptime: 0,
          averageSuccess: 0,
          averageFailure: 0,
        });
        setLoading(true);
        setRefreshing(false);
      }

      setError('');
      startLoadingTimer();

      try {
        const result = await fetchRobotUptime({
          siteId: targetSiteId,
          month,
          year,
          signal: controller.signal,
        });

        if (requestId !== requestIdRef.current) return;

        setUptimeCache(cacheKey, {
          days: result.days,
          totals: {
            totalAssignedRobots: result.totalAssignedRobots,
            monthlyCleaningUptime: result.monthlyCleaningUptime,
            monthlyAvailabilityUptime: result.monthlyAvailabilityUptime,
            averageSuccess: result.averageSuccess,
            averageFailure: result.averageFailure,
          },
        });
        applyResult(result);
      } catch (err) {
        if (isAbortError(err) || requestId !== requestIdRef.current) return;
        if (!cached) {
          setDays([]);
        }
        setError(err instanceof Error ? err.message : 'Failed to load uptime');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          stopLoadingTimer();
        }
      }
    },
    [applyResult, month, startLoadingTimer, stopLoadingTimer, year],
  );

  useEffect(() => {
    if (!siteId) return;
    void loadUptime(siteId);
  }, [loadUptime, siteId]);

  const onRefresh = useCallback(() => {
    if (!siteId) return;
    void loadUptime(siteId, { forceRefresh: true, isPullRefresh: true });
  }, [loadUptime, siteId]);

  const handleYearChange = (value: string | number) => {
    const nextYear = Number(value);
    setYear(nextYear);

    if (isFutureMonth(month, nextYear)) {
      const previous = getPreviousMonthYear();
      setMonth(previous.month);
    }
  };

  const filtersBar = (
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

      <View style={styles.filtersRow}>
        <UptimeSelectField
          label="Month"
          value={month}
          options={monthOptions}
          onChange={(value) => setMonth(Number(value))}
          icon="calendar-outline"
        />
        <UptimeSelectField
          label="Year"
          value={year}
          options={yearOptions}
          onChange={handleYearChange}
          icon="time-outline"
        />
      </View>

      <Text style={[styles.filtersHint, { color: colors.textMuted }]}>
        {formatMonthYear(month, year)}
        {selectedSite ? ` · ${getSiteLabel(selectedSite)}` : ''}
      </Text>
    </View>
  );

  const listHeader = !error && days.length > 0 ? (
    <>
      <UptimeSummaryHero summary={summary} />
      <UptimeTrendChart days={days} />
      <UptimeHeatmap days={days} />

      <View style={styles.filterRow}>
        {([
          { key: 'all', label: 'All Days' },
          { key: 'issues', label: 'Issues' },
          { key: 'norun', label: 'No Run' },
        ] as const).map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active
                    ? colors.primary
                    : colors.backgroundTertiary,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: active ? colors.background : colors.textSecondary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Daily Reports ({filteredDays.length})
      </Text>
    </>
  ) : null;

  const emptyContent = !loading && !error && days.length === 0 ? (
    <View style={styles.inlineEmpty}>
      <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        No uptime data
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {isFutureMonth(month, year)
          ? 'Future month selected. Choose an earlier month or year.'
          : 'No records found for the selected site, month, and year.'}
      </Text>
    </View>
  ) : null;

  const errorContent = !loading && error ? (
    <View style={styles.inlineEmpty}>
      <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      <Pressable
        onPress={() => siteId && void loadUptime(siteId)}
        style={[
          styles.retryButton,
          {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
      </Pressable>
    </View>
  ) : null;

  const loadingContent =
    loading || refreshing ? (
      <View
        style={[
          styles.loadingBanner,
          {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <View style={styles.loadingTextWrap}>
          <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>
            {loading ? 'Loading monthly uptime' : 'Refreshing uptime'}
          </Text>
          <Text style={[styles.loadingHint, { color: colors.textMuted }]}>
            Server aggregates all robots for the month. This can take 15–30
            seconds.
            {loadingSeconds > 0 ? ` (${loadingSeconds}s)` : ''}
          </Text>
        </View>
      </View>
    ) : null;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Robot Uptime"
        subtitle="Monthly cleaning & availability"
      />

      {assignedSites.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No site assigned
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ask an admin to assign a site before viewing uptime reports.
          </Text>
        </View>
      ) : (
        <FlatList
          data={error && days.length === 0 ? [] : filteredDays.slice().reverse()}
          keyExtractor={(item) => item.date}
          renderItem={({ item, index }) => (
            <DailyUptimeCard
              day={item}
              defaultExpanded={index === 0}
              onViewDpr={showDpr ? openDprHistory : undefined}
              onSubmitDpr={showDpr ? openDprSubmit : undefined}
            />
          )}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              {filtersBar}
              {loadingContent}
              {errorContent}
              {emptyContent}
              {listHeader}
            </View>
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    flexGrow: 1,
  },
  headerContent: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filtersCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filtersHint: {
    ...typography.caption,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
  },
  separator: {
    height: spacing.sm,
  },
  inlineLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  loadingTextWrap: {
    flex: 1,
    gap: 4,
  },
  loadingTitle: {
    ...typography.label,
    fontSize: 13,
  },
  loadingHint: {
    ...typography.caption,
    lineHeight: 18,
  },
  inlineEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    ...typography.label,
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 16,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
