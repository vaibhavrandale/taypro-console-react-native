import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Navbar } from '../components/layout';
import { AnalyticsKpiCard } from '../components/analytics/AnalyticsKpiCard';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { ScreenError, SubscriptionBlockedPage } from '../components/subscription/SubscriptionExpiryCard';
import { fetchSiteCleaningAnalytics } from '../api/robotAnalytics';
import { usePersistedSiteId } from '../context/SiteDetailsContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { asLoadError, isSubscriptionError, type SubscriptionError } from '../utils/subscription';
import { last7AndToday } from '../utils/robotAnalytics';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';
import type { AssignedSite } from '../types/auth';
import type { SiteAnalyticsRobot } from '../types/robotAnalytics';

type DateField = 'start' | 'end' | null;
type SortKey = keyof SiteAnalyticsRobot;
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

const COLUMNS: Array<{ label: string; key: SortKey; width: number }> = [
  { label: 'Robot No', key: 'robot_no', width: 120 },
  { label: 'Cycles', key: 'total_cycles', width: 72 },
  { label: 'Avg min', key: 'avg_cleaning_minutes', width: 72 },
  { label: 'Bat before', key: 'avgBatteryBeforeCleaning', width: 88 },
  { label: 'Bat after', key: 'avgBatteryAfterCleaning', width: 80 },
  { label: 'Max wheel', key: 'maxWheelCurrent', width: 80 },
  { label: 'Avg wheel', key: 'avgWheelCurrent', width: 80 },
  { label: 'Max brush', key: 'maxBrushCurrent', width: 80 },
  { label: 'Avg brush', key: 'avgBrushCurrent', width: 80 },
];

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

function cellValue(robot: SiteAnalyticsRobot, key: SortKey) {
  const value = robot[key];
  if (value == null || value === '') return '—';
  return String(value);
}

export function SiteAnalyticsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const bottomPad = useContentBottomPadding(spacing.xxxl);
  const defaults = useMemo(() => last7AndToday(), []);

  const { assignedSites, siteId, setSiteId } = usePersistedSiteId();

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [dateField, setDateField] = useState<DateField>(null);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [robots, setRobots] = useState<SiteAnalyticsRobot[]>([]);
  const [summary, setSummary] = useState({
    total_robots: 0,
    total_cycles: 0,
    avg_cleaning_minutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | SubscriptionError>('');

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!siteId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await fetchSiteCleaningAnalytics({
          site_id: siteId,
          startDate,
          endDate,
        });
        setSummary(result.summary);
        setRobots(result.robots);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load site analytics';
        if (/no cleaning data/i.test(message)) {
          setRobots([]);
          setSummary({
            total_robots: 0,
            total_cycles: 0,
            avg_cleaning_minutes: 0,
          });
          setError('');
        } else {
          setRobots([]);
          setError(asLoadError(err, message));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, siteId, startDate],
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );

  const sortedRobots = useMemo(() => {
    if (!sortConfig) return robots;
    return [...robots].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (typeof aVal === 'string' || typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }
      return sortConfig.direction === 'asc'
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });
  }, [robots, sortConfig]);

  const toggleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' };
      return {
        key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  const applyPickedDate = (picked?: Date) => {
    if (!picked || !dateField) return;
    const next = toDateInputValue(picked);
    if (dateField === 'start') {
      setStartDate(next);
      if (next > endDate) setEndDate(next);
    } else {
      setEndDate(next);
      if (next < startDate) setStartDate(next);
    }
  };

  const backBtn = (
    <Pressable
      onPress={() => navigation.goBack()}
      style={[styles.backBtn, { backgroundColor: colors.backgroundTertiary }]}
    >
      <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
    </Pressable>
  );

  if (isSubscriptionError(error)) {
    return (
      <SubscriptionBlockedPage
        title="Site Statistics"
        subtitle="Site cleaning analytics"
        error={error}
        onBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Site Statistics"
        subtitle="Cleaning analytics by robot"
        showMenu={false}
        leftAction={backBtn}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadAnalytics(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={[
            styles.filters,
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
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => {
                setPickerDate(new Date(startDate));
                setDateField('start');
              }}
              style={[
                styles.datePill,
                {
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
                Start
              </Text>
              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                {formatDisplayDate(startDate)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPickerDate(new Date(endDate));
                setDateField('end');
              }}
              style={[
                styles.datePill,
                {
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
                End
              </Text>
              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                {formatDisplayDate(endDate)}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <AnalyticsKpiCard
            label="Total Robots"
            value={summary.total_robots}
            accent="#f39c12"
          />
          <AnalyticsKpiCard
            label="Avg Cleaning Time"
            value={summary.avg_cleaning_minutes}
            unit="min"
            accent="#3498db"
          />
          <AnalyticsKpiCard
            label="Total Cycles"
            value={summary.total_cycles}
            accent="#2ecc71"
          />
        </View>

        {error && typeof error === 'string' ? (
          <ScreenError error={error} onRetry={() => void loadAnalytics()} />
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sortedRobots.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No data available
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              No data available for the selected date range.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View
                style={[
                  styles.headerRow,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.headerCell, { color: colors.textMuted, width: 36 }]}
                >
                  #
                </Text>
                {COLUMNS.map((col) => {
                  const active = sortConfig?.key === col.key;
                  return (
                    <Pressable
                      key={col.key}
                      onPress={() => toggleSort(col.key)}
                      style={{ width: col.width }}
                    >
                      <Text
                        style={[
                          styles.headerCell,
                          { color: active ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {col.label}
                        {active
                          ? sortConfig?.direction === 'asc'
                            ? ' ↑'
                            : ' ↓'
                          : ' ⇅'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {sortedRobots.map((robot, index) => (
                <View
                  key={robot.robot_no}
                  style={[
                    styles.bodyRow,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bodyCell,
                      { color: colors.textMuted, width: 36 },
                    ]}
                  >
                    {index + 1}
                  </Text>
                  {COLUMNS.map((col) => (
                    <Text
                      key={col.key}
                      style={[
                        styles.bodyCell,
                        {
                          color: colors.textPrimary,
                          width: col.width,
                          fontWeight: col.key === 'robot_no' ? '700' : '400',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cellValue(robot, col.key)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      {dateField && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onValueChange={(_event, picked) => {
            applyPickedDate(picked);
            setDateField(null);
          }}
          onDismiss={() => setDateField(null)}
        />
      ) : null}

      {dateField && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View style={styles.iosBackdrop}>
            <View style={[styles.iosSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.iosActions}>
                <Pressable onPress={() => setDateField(null)}>
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyPickedDate(pickerDate);
                    setDateField(null);
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onValueChange={(_event, date) => {
                  if (date) setPickerDate(date);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, gap: spacing.md },
  filters: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  datePill: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  pickerLabel: { ...typography.caption, fontSize: 10, fontWeight: '700' },
  pickerValue: { ...typography.label, fontSize: 13 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderTopWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  bodyCell: { ...typography.caption, fontSize: 12 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.label, fontSize: 16 },
  emptyBody: { ...typography.bodySmall, textAlign: 'center' },
  iosBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
