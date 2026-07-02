import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  CleaningLogTableHeader,
  CleaningLogTableRow,
  getTableWidth,
} from '../components/cleaningLogs/CleaningLogTableRow';
import { Navbar } from '../components/layout';
import { Input } from '../components/ui';
import { fetchCleaningLogsForDay } from '../api/cleaningLogs';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  CleaningLogCategory,
  CleaningLogRecord,
  CleaningLogsForDay,
  DprRecord,
  NotStartedRobot,
  OfflineRobotLog,
} from '../types/cleaningLogs';
import {
  formatTechnicianNames,
  getDprTechnicianName,
  matchesCleaningSearch,
} from '../utils/cleaningLogs';
import { SitesStackParamList } from '../navigation/SitesStack';

type Route = RouteProp<SitesStackParamList, 'CleaningLogs'>;

type ListItem = CleaningLogRecord | NotStartedRobot | OfflineRobotLog | DprRecord;

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SummaryStrip({
  assigned,
  completed,
  inProgress,
  failed,
  notStarted,
  offline,
}: {
  assigned: number;
  completed: number;
  inProgress: number;
  failed: number;
  notStarted: number;
  offline: number;
}) {
  const { colors } = useTheme();

  const items = [
    { label: 'Assigned', value: assigned, color: colors.textPrimary },
    { label: 'Completed', value: completed, color: colors.primary },
    { label: 'Progress', value: inProgress, color: colors.badge.warning.text },
    { label: 'Failed', value: failed, color: colors.danger },
    { label: 'Not Started', value: notStarted, color: colors.badge.info.text },
    { label: 'Offline', value: offline, color: colors.textMuted },
  ];

  const rows = [items.slice(0, 3), items.slice(3)];

  return (
    <View
      style={[
        styles.summaryStrip,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.summaryRow,
            rowIndex > 0 && {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            },
          ]}
        >
          {row.map((item) => (
            <View key={item.label} style={styles.summaryCell}>
              <Text style={[styles.summaryValue, { color: item.color }]}>
                {item.value}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function CleaningLogsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { siteId, siteName } = route.params;

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [data, setData] = useState<CleaningLogsForDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<CleaningLogCategory>('completed');
  const [search, setSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDateValue = useMemo(
    () => new Date(`${date}T12:00:00`),
    [date],
  );

  const loadLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const result = await fetchCleaningLogsForDay(siteId, date);
        setData(result);
      } catch (err) {
        setData(null);
        setError(
          err instanceof Error ? err.message : 'Failed to load cleaning logs',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId, date],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const categories = useMemo(
    () => [
      {
        id: 'completed' as const,
        label: 'Completed',
        count: data?.total_cleaning_completed ?? 0,
      },
      {
        id: 'inprogress' as const,
        label: 'In Progress',
        count: data?.total_cleaning_in_progress ?? 0,
      },
      {
        id: 'failure' as const,
        label: 'Failed',
        count: data?.total_failure_logs ?? 0,
      },
      {
        id: 'not_started' as const,
        label: 'Not Started',
        count: data?.total_not_started_robots ?? 0,
      },
      {
        id: 'offline' as const,
        label: 'Offline',
        count: data?.total_offline_robots_at_time_of_cleaning ?? 0,
      },
      {
        id: 'dpr' as const,
        label: 'Technician DPR',
        count: data?.dpr?.length ?? 0,
      },
    ],
    [data],
  );

  const rawListData = useMemo((): ListItem[] => {
    if (!data) return [];
    if (category === 'completed') return data.cleaning_completed;
    if (category === 'inprogress') return data.cleaning_in_progress;
    if (category === 'failure') return data.cleaning_failures;
    if (category === 'not_started') return data.not_started_robots;
    if (category === 'dpr') return data.dpr;
    return data.offline_robots_at_time_of_cleaning;
  }, [category, data]);

  const tableWidth = getTableWidth(category);

  const filteredListData = useMemo(() => {
    const query = search.trim();
    if (!query) return rawListData;

    return rawListData.filter((item) => {
      if (category === 'dpr') {
        const record = item as DprRecord;
        return matchesCleaningSearch(query, [
          record.site_id,
          record.comments,
          getDprTechnicianName(record),
          formatTechnicianNames(record.technician_present),
          record.report_date,
          record.new_report_date,
          record.robots_operational_details?.ready_for_operational,
          record.robots_operational_details?.online_operational,
          record.robots_operational_details?.manual_operational,
          record.robots_operational_details?.unoperational,
          record.robots_operational_details?.robots_uptime,
        ]);
      }

      if ('cleaning' in item || ('comments' in item && 'row_length' in item)) {
        const record = item as CleaningLogRecord;
        return matchesCleaningSearch(query, [
          record.robot_no,
          record.block,
          record.comments,
          record.row_no,
          record.row_length,
          record.cleaning?.battery_before_cleaning,
          record.cleaning?.battery_after_cleaning,
          record.cleaning?.startAt,
          record.cleaning?.finishAt,
        ]);
      }

      if ('last_uplink' in item) {
        const robot = item as NotStartedRobot;
        return matchesCleaningSearch(query, [
          robot.robot_no,
          robot.block,
          robot.last_uplink,
          robot.lora_state,
        ]);
      }

      const offline = item as OfflineRobotLog;
      return matchesCleaningSearch(query, [
        offline.robot_no,
        offline.block,
        offline.error_type,
        offline.createdAt,
      ]);
    });
  }, [rawListData, search, category]);

  const onDatePickerChange = useCallback(
    (event: DateTimePickerEvent, pickedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }

      if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }

      if (pickedDate) {
        setDate(toDateInputValue(pickedDate));
      }
    },
    [],
  );

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => (
    <CleaningLogTableRow
      item={item}
      index={index + 1}
      category={category}
    />
  );

  const dateSelector = (
    <View style={styles.dateBar}>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setDate((current) => shiftDate(current, -1))}
          style={[
            styles.dateButton,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[
            styles.datePill,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <View style={styles.datePillText}>
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatDisplayDate(date)}
            </Text>
            <Text style={[styles.dateSubText, { color: colors.textMuted }]}>
              Tap to pick date · {data?.total_cleaning_logs ?? 0} logs
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => {
            const next = shiftDate(date, 1);
            if (next <= toDateInputValue(new Date())) {
              setDate(next);
            }
          }}
          style={[
            styles.dateButton,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );

  const controlsHeader = (
    <View style={styles.headerContent}>
      {data ? (
        <SummaryStrip
          assigned={data.total_robots_assigned}
          completed={data.total_cleaning_completed}
          inProgress={data.total_cleaning_in_progress}
          failed={data.total_failure_logs}
          notStarted={data.total_not_started_robots}
          offline={data.total_offline_robots_at_time_of_cleaning}
        />
      ) : null}

      <Input
        placeholder={
          category === 'dpr'
            ? 'Search site, remarks, technician...'
            : 'Search robot, block, status...'
        }
        value={search}
        onChangeText={setSearch}
        leftIcon="search-outline"
        style={styles.searchInput}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {categories.map((item) => {
          const active = category === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active
                    ? colors.backgroundTertiary
                    : 'transparent',
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.categoryCount,
                  { color: active ? colors.primary : colors.textMuted },
                ]}
              >
                {item.count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.resultCount, { color: colors.textMuted }]}>
        {filteredListData.length} of {rawListData.length} records
      </Text>
    </View>
  );

  const datePicker = showDatePicker ? (
    Platform.OS === 'ios' ? (
      <Modal transparent animationType="slide" visible={showDatePicker}>
        <View style={styles.datePickerOverlay}>
          <Pressable
            style={styles.datePickerBackdrop}
            onPress={() => setShowDatePicker(false)}
          />
          <View
            style={[
              styles.datePickerSheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>
                Select Date
              </Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.datePickerDone, { color: colors.primary }]}>
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={selectedDateValue}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={onDatePickerChange}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </Modal>
    ) : (
      <DateTimePicker
        value={selectedDateValue}
        mode="date"
        display="default"
        maximumDate={new Date()}
        onChange={onDatePickerChange}
      />
    )
  ) : null;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Cleaning Logs"
        subtitle={siteName || siteId}
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.navButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {dateSelector}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading cleaning logs...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.badge.error.bg },
            ]}
          >
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <Text style={[styles.errorTitle, { color: colors.danger }]}>
              Could not load cleaning logs
            </Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.controls}>{controlsHeader}</View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
            contentContainerStyle={styles.tableScrollContent}
          >
            <FlatList
              style={{ width: tableWidth }}
              data={filteredListData}
              keyExtractor={(item, index) =>
                item._id ||
                ('robot_no' in item ? item.robot_no : undefined) ||
                `${category}-${index}`
              }
              renderItem={renderItem}
              ListHeaderComponent={
                <View
                  style={[
                    styles.tableCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                      width: tableWidth,
                    },
                  ]}
                >
                  <CleaningLogTableHeader category={category} />
                </View>
              }
              contentContainerStyle={[
                filteredListData.length === 0 && styles.emptyListContent,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadLogs(true)}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              ListEmptyComponent={
                <View style={{ width: tableWidth }}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No records found for this category on the selected date.
                  </Text>
                </View>
              }
            />
          </ScrollView>
        </View>
      )}
      {datePicker}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  dateBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  controls: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tableScroll: {
    flex: 1,
  },
  tableScrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    flex: 1,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  datePillText: {
    flex: 1,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  datePickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingBottom: spacing.lg,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  datePickerTitle: {
    ...typography.label,
    fontSize: 14,
  },
  datePickerDone: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    ...typography.label,
    fontSize: 12,
  },
  dateSubText: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 1,
  },
  summaryStrip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  summaryValue: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dprCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dprTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontSize: 10,
  },
  dprRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dprMeta: {
    ...typography.caption,
    fontSize: 10,
  },
  dprComment: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoryRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    minWidth: 88,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  categoryCount: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  resultCount: {
    ...typography.caption,
  },
  tableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
  },
  tableRowShell: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateText: {
    ...typography.bodySmall,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
  },
  errorText: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
