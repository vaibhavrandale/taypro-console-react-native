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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { AnalyticsKpiCard } from '../components/analytics/AnalyticsKpiCard';
import { AnalyticsSparkBars } from '../components/analytics/AnalyticsSparkBars';
import {
  TicketSearchSheet,
  type SearchSheetItem,
} from '../components/serviceTickets/TicketSearchSheet';
import { ScreenError, SubscriptionBlockedPage } from '../components/subscription/SubscriptionExpiryCard';
import { Badge } from '../components/ui';
import {
  fetchRobotCleaningAnalytics,
  fetchRobotNos,
} from '../api/robotAnalytics';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { asLoadError, isSubscriptionError, type SubscriptionError } from '../utils/subscription';
import {
  avgByKey,
  countOutcomes,
  deriveCycleRecords,
  last7AndToday,
  OUTCOME_META,
} from '../utils/robotAnalytics';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';
import type { ServiceTicketRobot } from '../types/serviceTickets';
import type { AnalyticsStackParamList } from '../navigation/AnalyticsStack';

type Navigation = NativeStackNavigationProp<
  AnalyticsStackParamList,
  'RobotAnalytics'
>;
type DateField = 'start' | 'end' | null;

function drainHint(drain: number | null) {
  if (drain == null) return 'completed cycles only';
  if (drain <= 2) return '✓ Efficient';
  if (drain <= 5) return 'Moderate';
  return '⚠ High drain';
}

function spikeHint(val: number) {
  if (val <= 1.1) return '✓ Smooth';
  if (val <= 1.5) return 'Moderate spikes';
  return '⚠ High spikes';
}

export function RobotAnalyticsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const bottomPad = useContentBottomPadding(spacing.xxxl);
  const defaults = useMemo(() => last7AndToday(), []);

  const [robots, setRobots] = useState<ServiceTicketRobot[]>([]);
  const [robotNo, setRobotNo] = useState('');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [dateField, setDateField] = useState<DateField>(null);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [robotSheet, setRobotSheet] = useState(false);

  const [avgCleaning, setAvgCleaning] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [maxWheel, setMaxWheel] = useState<string | number>('—');
  const [avgWheel, setAvgWheel] = useState<string | number>('—');
  const [maxBrush, setMaxBrush] = useState<string | number>('—');
  const [avgBrush, setAvgBrush] = useState<string | number>('—');
  const [records, setRecords] = useState(deriveCycleRecords([]));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | SubscriptionError>('');

  const robotItems: SearchSheetItem[] = useMemo(
    () =>
      robots.map((r, i) => ({
        id: `${r.robot_no}-${i}`,
        title: r.robot_no,
        subtitle: [r.site_id, r.block, r.robot_type].filter(Boolean).join(' · '),
      })),
    [robots],
  );

  const loadRobots = useCallback(async () => {
    try {
      const list = await fetchRobotNos();
      setRobots(list);
      if (list[0]?.robot_no) {
        setRobotNo((current) => current || list[0].robot_no);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(asLoadError(err, 'Failed to load robots'));
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!robotNo) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await fetchRobotCleaningAnalytics({
          robot_no: robotNo,
          startDate,
          endDate,
        });
        setRecords(deriveCycleRecords(result.data));
        setAvgCleaning(result.avg_cleaning_minutes);
        setTotalCycles(result.total_cycles);
        setMaxWheel(result.maxWheelCurrent ?? '—');
        setAvgWheel(result.avgWheelCurrent ?? '—');
        setMaxBrush(result.maxBrushCurrent ?? '—');
        setAvgBrush(result.avgBrushCurrent ?? '—');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load analytics';
        if (/no cleaning data/i.test(message)) {
          setRecords([]);
          setError('');
        } else {
          setRecords([]);
          setError(asLoadError(err, message));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, robotNo, startDate],
  );

  useEffect(() => {
    void loadRobots();
  }, [loadRobots]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const outcomes = useMemo(() => countOutcomes(records), [records]);
  const completed = useMemo(
    () => records.filter((r) => r.outcome === 'completed'),
    [records],
  );
  const successRate = records.length
    ? Math.round((outcomes.completed / records.length) * 100)
    : 0;
  const avgBatDrain = avgByKey(completed, 'batDrain');
  const avgOverhead = Math.round(avgByKey(completed, 'overheadSec') || 0);
  const avgTemp = avgByKey(completed, 'temp');
  const avgBrushSpike = avgByKey(completed, 'brushSpike');
  const avgWheelSpike = avgByKey(completed, 'wheelSpike');
  const labels = records.map((r) => r.dateLabel);
  const cLabels = completed.map((r) => r.dateLabel);

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

  if (isSubscriptionError(error)) {
    return (
      <SubscriptionBlockedPage
        title="Analytics"
        subtitle="Robot cleaning statistics"
        error={error}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Analytics" subtitle="Robot cleaning statistics" />

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
          <View style={styles.filterHeader}>
            <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
              Robot Analytics
            </Text>
            <Pressable onPress={() => navigation.navigate('SiteAnalytics')}>
              <Text style={[styles.link, { color: colors.primary }]}>
                View Site Statistics →
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setRobotSheet(true)}
            style={[
              styles.picker,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
              Robot
            </Text>
            <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
              {robotNo || 'Select robot'}
            </Text>
          </Pressable>

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

          {records[0]?.block ? (
            <Badge label={records[0].block} variant="info" size="sm" />
          ) : null}
        </View>

        {error && typeof error === 'string' ? (
          <ScreenError error={error} onRetry={() => void loadAnalytics()} />
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : records.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No cleaning data found
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              Try adjusting the date range or selecting a different robot.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Cycle Outcomes
            </Text>
            <View style={styles.kpiGrid}>
              <AnalyticsKpiCard
                label="Total Cycles"
                value={totalCycles}
                accent="#3498db"
                sub={`in selected range: ${records.length}`}
              />
              <AnalyticsKpiCard
                label="Completed"
                value={outcomes.completed}
                accent="#2ecc71"
                sub={`${successRate}% success rate`}
              />
              <AnalyticsKpiCard
                label="Manually Stopped"
                value={outcomes.cancelled}
                accent="#e74c3c"
                sub={`${records.length ? Math.round((outcomes.cancelled / records.length) * 100) : 0}% of cycles`}
              />
              <AnalyticsKpiCard
                label="Stuck on Row"
                value={outcomes.stuck}
                accent="#f39c12"
              />
              <AnalyticsKpiCard
                label="Battery Dead"
                value={outcomes.battery_dead}
                accent="#9b59b6"
              />
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                  Overall Success Rate
                </Text>
                <Text
                  style={{
                    fontWeight: '700',
                    color:
                      successRate >= 80
                        ? '#2ecc71'
                        : successRate >= 50
                          ? '#f39c12'
                          : '#e74c3c',
                  }}
                >
                  {successRate}%
                </Text>
              </View>
              <View style={styles.successBar}>
                {outcomes.completed > 0 ? (
                  <View style={[styles.successSeg, { flex: outcomes.completed, backgroundColor: '#2ecc71' }]} />
                ) : null}
                {outcomes.cancelled > 0 ? (
                  <View style={[styles.successSeg, { flex: outcomes.cancelled, backgroundColor: '#e74c3c' }]} />
                ) : null}
                {outcomes.stuck > 0 ? (
                  <View style={[styles.successSeg, { flex: outcomes.stuck, backgroundColor: '#f39c12' }]} />
                ) : null}
                {outcomes.battery_dead > 0 ? (
                  <View style={[styles.successSeg, { flex: outcomes.battery_dead, backgroundColor: '#9b59b6' }]} />
                ) : null}
              </View>
              <View style={styles.legendRow}>
                {(
                  [
                    ['completed', outcomes.completed],
                    ['cancelled', outcomes.cancelled],
                    ['stuck', outcomes.stuck],
                    ['battery_dead', outcomes.battery_dead],
                  ] as const
                )
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <Text key={key} style={{ color: OUTCOME_META[key].color, fontSize: 10, fontWeight: '600' }}>
                      ● {OUTCOME_META[key].label}: {count}
                    </Text>
                  ))}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Performance Summary
            </Text>
            <View style={styles.kpiGrid}>
              <AnalyticsKpiCard
                label="Avg Cleaning Time"
                value={avgCleaning ? avgCleaning.toFixed(1) : 0}
                unit="min"
                accent="#3498db"
                sub="active cleaning only"
              />
              <AnalyticsKpiCard
                label="Avg Battery Drain"
                value={avgBatDrain}
                unit="%"
                accent="#f39c12"
                sub={drainHint(avgBatDrain)}
              />
              <AnalyticsKpiCard
                label="Avg Overhead / Cycle"
                value={avgOverhead || '—'}
                unit="sec"
                accent="#8e44ad"
                sub="boot + positioning time"
              />
              <AnalyticsKpiCard
                label="Avg Temperature"
                value={avgTemp}
                unit="°C"
                accent="#e67e22"
                sub="at cycle start"
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Motor Current Summary
            </Text>
            <View style={styles.kpiGrid}>
              <AnalyticsKpiCard label="Max Brush Current" value={maxBrush} unit="A" accent="#e74c3c" />
              <AnalyticsKpiCard label="Avg Brush Current" value={avgBrush} unit="A" accent="#c0392b" />
              <AnalyticsKpiCard label="Max Wheel Current" value={maxWheel} unit="A" accent="#2980b9" />
              <AnalyticsKpiCard label="Avg Wheel Current" value={avgWheel} unit="A" accent="#1a6fa0" />
            </View>

            {avgBrushSpike != null || avgWheelSpike != null ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                  Motor Stress Index (max ÷ avg)
                </Text>
                {avgBrushSpike != null ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Brush spike {avgBrushSpike}× · {spikeHint(avgBrushSpike)}
                  </Text>
                ) : null}
                {avgWheelSpike != null ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Wheel spike {avgWheelSpike}× · {spikeHint(avgWheelSpike)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Cleaning Time Analysis
            </Text>
            <AnalyticsSparkBars
              title="Cleaning Duration per Cycle"
              subtitle="Active vs actual duration (min)"
              labels={labels}
              series={[
                { label: 'Cleaning', color: '#3498db', values: records.map((r) => r.cleaningMin) },
                { label: 'Actual', color: '#8e44ad', values: records.map((r) => r.actualDurationMin) },
              ]}
            />
            {completed.length > 0 ? (
              <AnalyticsSparkBars
                title="Forward vs Reverse"
                subtitle="Seconds per completed cycle"
                labels={cLabels}
                series={[
                  { label: 'Forward', color: '#16a085', values: completed.map((r) => r.fwdTime) },
                  { label: 'Reverse', color: '#8e44ad', values: completed.map((r) => r.revTime) },
                ]}
              />
            ) : null}

            {completed.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  Battery Analysis
                </Text>
                <AnalyticsSparkBars
                  title="3-Point Battery Tracking"
                  subtitle="Before → Mid → After"
                  labels={cLabels}
                  series={[
                    { label: 'Before', color: '#2ecc71', values: completed.map((r) => r.batBefore) },
                    { label: 'Mid', color: '#f39c12', values: completed.map((r) => r.batMid) },
                    { label: 'After', color: '#e74c3c', values: completed.map((r) => r.batAfter) },
                  ]}
                />
                <AnalyticsSparkBars
                  title="Battery Drain per Cycle"
                  labels={cLabels}
                  series={[
                    { label: 'Drain %', color: '#f39c12', values: completed.map((r) => r.batDrain) },
                  ]}
                />

                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  Motor Current Trends
                </Text>
                <AnalyticsSparkBars
                  title="Brush Current"
                  labels={cLabels}
                  series={[
                    { label: 'Max', color: '#e74c3c', values: completed.map((r) => r.maxBrush) },
                    { label: 'Avg', color: '#e74c3c88', values: completed.map((r) => r.avgBrush) },
                  ]}
                />
                <AnalyticsSparkBars
                  title="Wheel Current"
                  labels={cLabels}
                  series={[
                    { label: 'Max', color: '#2980b9', values: completed.map((r) => r.maxWheel) },
                    { label: 'Avg', color: '#2980b988', values: completed.map((r) => r.avgWheel) },
                  ]}
                />
                <AnalyticsSparkBars
                  title="Temperature"
                  subtitle="At cycle start (°C)"
                  labels={cLabels}
                  series={[
                    { label: 'Temp', color: '#e67e22', values: completed.map((r) => r.temp) },
                  ]}
                />
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Per-Cycle Detail
            </Text>
            {records.map((r) => {
              const meta = OUTCOME_META[r.outcome];
              return (
                <View
                  key={r._id}
                  style={[
                    styles.cycleCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={[styles.cycleDate, { color: colors.textPrimary }]}>
                      {r.dateLabel}
                    </Text>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}44` },
                      ]}
                    >
                      <Text style={{ color: meta.color, fontSize: 11, fontWeight: '700' }}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cycleMeta, { color: colors.textMuted }]}>
                    {r.cleaningMin != null ? `${r.cleaningMin} min` : '—'}
                    {r.actualDurationMin != null ? ` · Actual ${r.actualDurationMin} min` : ''}
                    {r.overheadSec != null ? ` · Overhead ${r.overheadSec}s` : ''}
                  </Text>
                  <Text style={[styles.cycleMeta, { color: colors.textMuted }]}>
                    {r.batBefore != null ? `Bat ${r.batBefore}` : ''}
                    {r.batMid != null ? ` → ${r.batMid}` : ''}
                    {r.batAfter != null ? ` → ${r.batAfter}` : ''}
                    {r.batDrain != null ? ` · Drain ${r.batDrain}%` : ''}
                    {r.avgBrush != null ? ` · Brush ${r.avgBrush}A` : ''}
                    {r.temp != null ? ` · ${r.temp}°C` : ''}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <TicketSearchSheet
        visible={robotSheet}
        title="Select robot"
        placeholder="Search robot no."
        items={robotItems}
        onClose={() => setRobotSheet(false)}
        onSelect={(item) => {
          setRobotNo(item.title);
          setRobotSheet(false);
        }}
      />

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
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Done</Text>
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
  content: { padding: spacing.md, gap: spacing.md },
  filters: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionEyebrow: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  link: { ...typography.caption, fontSize: 12, fontWeight: '600' },
  picker: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  pickerLabel: { ...typography.caption, fontSize: 10, fontWeight: '700' },
  pickerValue: { ...typography.label, fontSize: 13 },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  datePill: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  successSeg: { borderRadius: 4 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cycleCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  cycleDate: { ...typography.label, fontSize: 13 },
  cycleMeta: { ...typography.caption, fontSize: 11 },
  pill: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.label, fontSize: 16 },
  emptyBody: { ...typography.bodySmall, textAlign: 'center' },
  iosBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosSheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.lg },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
