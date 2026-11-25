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
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  CleaningLogTableHeader,
  CleaningLogTableRow,
  getTableWidth,
} from '../components/cleaningLogs/CleaningLogTableRow';
import { Navbar } from '../components/layout';
import { ScreenError, SubscriptionBlockedPage } from '../components/subscription/SubscriptionExpiryCard';
import { fetchCleaningLogsForDay } from '../api/cleaningLogs';
import { asLoadError, isSubscriptionError, type SubscriptionError } from '../utils/subscription';
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
  getDprTechnicianEmail,
  getDprTechnicianName,
  matchesCleaningSearch,
} from '../utils/cleaningLogs';
import { exportCleaningLogsPdf } from '../utils/cleaningLogsPdf';
import { appAlert } from '../utils/appAlert';
import { SitesStackParamList } from '../navigation/SitesStack';

type Route = RouteProp<SitesStackParamList, 'SiteCleaningLogs'>;
type LogRow = CleaningLogRecord | NotStartedRobot | OfflineRobotLog | DprRecord;

const TABLE_TABS: { id: CleaningLogCategory; label: string }[] = [
  { id: 'completed', label: 'Completed' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'failure', label: 'Failed' },
  { id: 'not_started', label: 'Not Started' },
  { id: 'offline', label: 'Offline' },
  { id: 'dpr', label: 'DPR' },
];

function rowsFor(data: CleaningLogsForDay, category: CleaningLogCategory): LogRow[] {
  if (category === 'completed') return data.cleaning_completed || [];
  if (category === 'inprogress') return data.cleaning_in_progress || [];
  if (category === 'failure') return data.cleaning_failures || [];
  if (category === 'not_started') return data.not_started_robots || [];
  if (category === 'dpr') return data.dpr || [];
  return data.offline_robots_at_time_of_cleaning || [];
}

function sortRows(rows: LogRow[], category: CleaningLogCategory) {
  if (category === 'dpr') return rows;
  return [...rows].sort((a, b) => {
    const aNo = 'robot_no' in a && a.robot_no ? String(a.robot_no) : '';
    const bNo = 'robot_no' in b && b.robot_no ? String(b.robot_no) : '';
    return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function duplicateRobotNos(rows: LogRow[]) {
  const counts = new Map<string, number>();
  for (const item of rows) {
    if (!('robot_no' in item) || !item.robot_no) continue;
    const key = String(item.robot_no).trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [robotNo, count] of counts) {
    if (count > 1) duplicates.add(robotNo);
  }
  return duplicates;
}

function rowMatches(item: LogRow, category: CleaningLogCategory, query: string) {
  if (category === 'dpr') {
    const record = item as DprRecord;
    return matchesCleaningSearch(query, [
      record.site_id,
      record.comments,
      getDprTechnicianName(record),
      getDprTechnicianEmail(record),
      formatTechnicianNames(record.technician_present),
      record.report_date,
      record.new_report_date,
    ]);
  }
  if ('last_uplink' in item && !('error_type' in item)) {
    const robot = item as NotStartedRobot;
    return matchesCleaningSearch(query, [
      robot.robot_no,
      robot.block,
      robot.last_uplink,
      robot.lora_state,
    ]);
  }
  if ('error_type' in item) {
    const offline = item as OfflineRobotLog;
    return matchesCleaningSearch(query, [
      offline.robot_no,
      offline.block,
      offline.error_type,
    ]);
  }
  const record = item as CleaningLogRecord;
  return matchesCleaningSearch(query, [
    record.robot_no,
    record.block,
    record.comments,
    record.row_no,
    record.row_length,
  ]);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export function CleaningLogsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { siteId, siteName } = route.params;

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [data, setData] = useState<CleaningLogsForDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | SubscriptionError>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('completed');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const selectedDateValue = useMemo(
    () => new Date(`${date}T12:00:00`),
    [date],
  );

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const result = await fetchCleaningLogsForDay(siteId, date);
      setData(result);
    } catch (err) {
      setData(null);
      setError(asLoadError(err, 'Failed to load cleaning logs'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId, date]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useFocusEffect(
    useCallback(() => {
      if (!autoRefresh) return;
      const timer = setInterval(() => {
        void loadLogs(true);
      }, 60_000);
      return () => clearInterval(timer);
    }, [autoRefresh, loadLogs]),
  );

  const tabs = useMemo(
    () => [
      {
        id: 'assigned',
        label: 'Assigned',
        count: data?.total_robots_assigned ?? 0,
        color: colors.textPrimary,
      },
      {
        id: 'completed',
        label: 'Completed',
        count: data?.total_cleaning_completed ?? 0,
        color: colors.primary,
      },
      {
        id: 'inprogress',
        label: 'In Progress',
        count: data?.total_cleaning_in_progress ?? 0,
        color: colors.badge.warning.text,
      },
      {
        id: 'failure',
        label: 'Failed',
        count: data?.total_failure_logs ?? 0,
        color: colors.danger,
      },
      {
        id: 'not_started',
        label: 'Not Started',
        count: data?.total_not_started_robots ?? 0,
        color: colors.badge.info.text,
      },
      {
        id: 'offline',
        label: 'Offline',
        count: data?.total_offline_robots_at_time_of_cleaning ?? 0,
        color: colors.textMuted,
      },
      {
        id: 'dpr',
        label: 'DPR',
        count: data?.dpr?.length ?? 0,
        color: colors.textSecondary,
      },
    ],
    [colors, data],
  );

  const tables = useMemo(() => {
    if (!data) return [];
    return TABLE_TABS.map((tab) => {
      const rows = sortRows(rowsFor(data, tab.id), tab.id);
      return {
        ...tab,
        rows,
        duplicates: duplicateRobotNos(rows),
        width: getTableWidth(tab.id),
      };
    });
  }, [data]);

  const applyPickedDate = useCallback((picked?: Date) => {
    if (!picked) return;
    setDate(toDateInputValue(picked));
  }, []);

  const closeDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const hasExportableData = useMemo(() => {
    if (!data) return false;
    return (
      (data.cleaning_completed?.length || 0) +
        (data.cleaning_in_progress?.length || 0) +
        (data.cleaning_failures?.length || 0) +
        (data.not_started_robots?.length || 0) +
        (data.offline_robots_at_time_of_cleaning?.length || 0) +
        (data.dpr?.length || 0) >
      0
    );
  }, [data]);

  const onExportPdf = useCallback(async () => {
    if (exporting || !data) return;
    if (!hasExportableData) {
      appAlert('Download PDF', 'No records to download for this date.');
      return;
    }
    setExporting(true);
    try {
      const result = await exportCleaningLogsPdf({
        siteId,
        siteName: siteName || siteId,
        date,
      });
      if (result.method === 'downloads') {
        appAlert(
          'Downloaded',
          `${result.fileName} saved to your Downloads folder.`,
        );
      }
    } catch (err) {
      appAlert(
        'Download failed',
        err instanceof Error ? err.message : 'Could not download PDF',
      );
    } finally {
      setExporting(false);
    }
  }, [data, date, exporting, hasExportableData, siteId, siteName]);

  const datePicker = showDatePicker ? (
    Platform.OS === 'ios' ? (
      <Modal transparent animationType="slide" visible={showDatePicker}>
        <View style={styles.datePickerOverlay}>
          <Pressable
            style={styles.datePickerBackdrop}
            onPress={closeDatePicker}
          />
          <View
            style={[
              styles.datePickerSheet,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>
                Select date
              </Text>
              <Pressable onPress={closeDatePicker}>
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
              onValueChange={(_event, picked) => applyPickedDate(picked)}
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
        onValueChange={(_event, picked) => {
          applyPickedDate(picked);
          closeDatePicker();
        }}
        onDismiss={closeDatePicker}
      />
    )
  ) : null;

  if (isSubscriptionError(error)) {
    return (
      <SubscriptionBlockedPage
        title="Cleaning Logs"
        subtitle={siteName || siteId}
        error={error}
        onBack={() => navigation.goBack()}
      />
    );
  }

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadLogs(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.dateRow}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') setShowDatePicker(true);
          }}
          style={[
            styles.dateField,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatDisplayDate(date)}
          </Text>
          {Platform.OS === 'web'
            ? React.createElement('input', {
                type: 'date',
                value: date,
                max: toDateInputValue(new Date()),
                onChange: (event: { target: { value: string } }) => {
                  if (event.target.value) setDate(event.target.value);
                },
                'aria-label': 'Select date',
                style: {
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  border: 'none',
                },
              })
            : null}
        </Pressable>
        <Pressable
          onPress={() => void onExportPdf()}
          disabled={exporting || !hasExportableData}
          style={[
            styles.exportBtn,
            {
              backgroundColor: colors.primary,
              opacity: exporting || !hasExportableData ? 0.45 : 1,
            },
          ]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#04120F" />
          ) : (
            <Ionicons name="download-outline" size={16} color="#04120F" />
          )}
          <Text style={styles.exportBtnText}>
            {exporting ? 'Downloading…' : 'Download PDF'}
          </Text>
        </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <ScreenError error={error} onRetry={() => void loadLogs()} />
        ) : (
          <>
            <View style={styles.tabGrid}>
              {tabs.map((tab) => {
                const selectable = tab.id !== 'assigned';
                const active = selectable && activeTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    disabled={!selectable}
                    onPress={() => {
                      if (selectable) setActiveTab(tab.id);
                    }}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCount,
                        { color: active ? '#04120F' : tab.color },
                      ]}
                    >
                      {tab.count}
                    </Text>
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: active ? '#04120F' : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setAutoRefresh((on) => !on)}
              style={styles.autoRefreshRow}
            >
              <View
                style={[
                  styles.autoRefreshBox,
                  {
                    borderColor: autoRefresh ? colors.primary : colors.border,
                    backgroundColor: autoRefresh ? colors.primary : 'transparent',
                  },
                ]}
              >
                {autoRefresh ? (
                  <Ionicons name="checkmark" size={14} color="#04120F" />
                ) : null}
              </View>
              <Text style={[styles.autoRefreshLabel, { color: colors.textSecondary }]}>
                Auto refresh
              </Text>
            </Pressable>

            {tables
              .filter((table) => table.id === activeTab)
              .map((table) => {
              const visibleRows = table.rows.filter((item) =>
                rowMatches(item, table.id, search),
              );
              return (
              <View key={table.id} style={styles.tableSection}>
                <View style={styles.tableHeading}>
                  <Text
                    style={[styles.tableTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {table.label}
                  </Text>
                  <View
                    style={[
                      styles.searchField,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.searchInput, { color: colors.textPrimary }]}
                    />
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ width: table.width }}>
                    <CleaningLogTableHeader category={table.id} />
                    {visibleRows.length === 0 ? (
                      <Text style={[styles.emptyRow, { color: colors.textMuted }]}>
                        No records
                      </Text>
                    ) : (
                      visibleRows.map((item, index) => {
                        const robotNo =
                          'robot_no' in item && item.robot_no
                            ? String(item.robot_no).trim()
                            : '';
                        return (
                          <CleaningLogTableRow
                            key={`${table.id}-${item._id || robotNo || index}`}
                            item={item}
                            index={index + 1}
                            category={table.id}
                            highlightRobotNo={Boolean(robotNo && table.duplicates.has(robotNo))}
                          />
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              </View>
              );
            })}
          </>
        )}
      </ScrollView>
      {datePicker}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tableSection: {
    gap: spacing.xs,
  },
  tableHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchField: {
    width: 148,
    minHeight: 40,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.label,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
  tableTitle: {
    ...typography.h2,
    flexShrink: 0,
    fontWeight: '700',
  },
  emptyRow: {
    ...typography.caption,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateField: {
    position: 'relative',
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dateText: {
    ...typography.label,
    fontSize: 15,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  datePickerSheet: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
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
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  autoRefreshBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoRefreshLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tab: {
    width: '22%',
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  tabCount: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  exportBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 36,
  },
  exportBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#04120F',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});
