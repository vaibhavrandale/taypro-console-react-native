import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DprRecordCard } from '../components/dpr/DprRecordCard';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Navbar } from '../components/layout';
import { Button } from '../components/ui';
import { fetchAssignedSitesDpr } from '../api/technicianDpr';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import type { TechnicianDprRecord } from '../types/technicianDpr';
import {
  flattenDprGroups,
  formatDisplayDate,
  getCurrentMonthRange,
  getPreviousMonthRange,
  toDateInputValue,
} from '../utils/dprHistory';
import type { DprStackParamList } from '../navigation/DprStack';

type Navigation = NativeStackNavigationProp<DprStackParamList, 'DprHistory'>;

type DateField = 'start' | 'end' | null;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

function SummaryStrip({
  total,
  sites,
  rangeLabel,
}: {
  total: number;
  sites: number;
  rangeLabel: string;
}) {
  const { colors } = useTheme();

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
      <View style={styles.summaryCell}>
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {total}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
          DPR Records
        </Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryCell}>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
          {sites}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
          Sites
        </Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryCellWide}>
        <Text
          style={[styles.summaryRange, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {rangeLabel}
        </Text>
      </View>
    </View>
  );
}

export function AssignedSitesDprScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const initialRange = getCurrentMonthRange();
  const [siteId, setSiteId] = useState('');
  const [startDate, setStartDate] = useState(initialRange.start_date);
  const [endDate, setEndDate] = useState(initialRange.end_date);
  const [records, setRecords] = useState<TechnicianDprRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [siteCount, setSiteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dateField, setDateField] = useState<DateField>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    if (assignedSites.length === 0) {
      setSiteId('');
      setLoading(false);
      return;
    }

    setSiteId((current) => {
      if (current && assignedSites.some((site) => site.site_id === current)) {
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

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      if (!siteId) {
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
        const result = await fetchAssignedSitesDpr({
          siteId,
          startDate,
          endDate,
        });

        const flat = flattenDprGroups(result.groups);
        setRecords(flat);
        setTotalCount(result.count);
        setSiteCount(result.groups.filter((group) => group.count > 0).length);
      } catch (err) {
        setRecords([]);
        setTotalCount(0);
        setSiteCount(0);
        setError(err instanceof Error ? err.message : 'Failed to load DPR history');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId, startDate, endDate],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openDatePicker = (field: 'start' | 'end') => {
    setDateField(field);
    setPickerDate(new Date(`${field === 'start' ? startDate : endDate}T12:00:00`));
  };

  const onDateChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') {
      setDateField(null);
    }

    if (event.type === 'dismissed') {
      setDateField(null);
      return;
    }

    if (!picked || !dateField) return;

    const next = toDateInputValue(picked);
    if (dateField === 'start') {
      setStartDate(next);
      if (next > endDate) setEndDate(next);
    } else {
      setEndDate(next);
      if (next < startDate) setStartDate(next);
    }

    if (Platform.OS === 'ios') {
      setPickerDate(picked);
    }
  };

  const applyPreset = (range: { start_date: string; end_date: string }) => {
    setStartDate(range.start_date);
    setEndDate(range.end_date);
  };

  const rangeLabel = `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;

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

        <View style={styles.dateRow}>
          <Pressable
            onPress={() => openDatePicker('start')}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              Start
            </Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
              {formatDisplayDate(startDate)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => openDatePicker('end')}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              End
            </Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
              {formatDisplayDate(endDate)}
            </Text>
          </Pressable>
        </View>

        <View style={styles.presetRow}>
          <Pressable
            onPress={() => applyPreset(getCurrentMonthRange())}
            style={[
              styles.presetChip,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.presetText, { color: colors.textSecondary }]}>
              This month
            </Text>
          </Pressable>
          <Pressable
            onPress={() => applyPreset(getPreviousMonthRange())}
            style={[
              styles.presetChip,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.presetText, { color: colors.textSecondary }]}>
              Last month
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate('DprSubmit')}
        style={[
          styles.submitLink,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        ]}
      >
        <View style={styles.submitLinkIcon}>
          <Ionicons name="add" size={18} color="#101936" />
        </View>
        <View style={styles.submitLinkTextBlock}>
          <Text style={styles.submitLinkTitle}>Submit new DPR</Text>
          <Text style={styles.submitLinkSubtitle}>
            Create today's daily progress report
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="#101936" />
      </Pressable>

      {!loading && !error ? (
        <SummaryStrip
          total={totalCount}
          sites={siteCount}
          rangeLabel={rangeLabel}
        />
      ) : null}

      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}

      {!loading && !error && records.length > 0 ? (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Reports ({records.length})
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="DPR History"
        subtitle="Assigned sites daily reports"
      />

      {assignedSites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No assigned sites found for your account.
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item._id ?? `${item.site_id}-${index}`}
          renderItem={({ item, index }) => (
            <DprRecordCard record={item} defaultExpanded={index === 0} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} />
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.inlineEmpty}>
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No DPR records
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No reports found for the selected site and date range.
                </Text>
                <Button
                  title="Submit DPR"
                  size="sm"
                  onPress={() => navigation.navigate('DprSubmit')}
                />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {dateField && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible>
          <View style={styles.pickerOverlay}>
            <Pressable
              style={styles.pickerBackdrop}
              onPress={() => setDateField(null)}
            />
            <View
              style={[
                styles.pickerSheet,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                  {dateField === 'start' ? 'Start date' : 'End date'}
                </Text>
                <Pressable onPress={() => setDateField(null)}>
                  <Text style={[styles.pickerDone, { color: colors.primary }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {dateField && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
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
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  datePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  dateLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dateValue: {
    ...typography.label,
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  presetText: {
    ...typography.caption,
    fontWeight: '600',
  },
  submitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  submitLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  submitLinkTextBlock: {
    flex: 1,
    gap: 2,
  },
  submitLinkTitle: {
    ...typography.label,
    color: '#101936',
    fontSize: 14,
  },
  submitLinkSubtitle: {
    ...typography.caption,
    color: 'rgba(16, 25, 54, 0.72)',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  summaryCell: {
    alignItems: 'center',
    minWidth: 72,
    gap: 2,
  },
  summaryCellWide: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  summaryValue: {
    ...typography.h3,
    fontSize: 18,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  summaryRange: {
    ...typography.caption,
    lineHeight: 16,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
  },
  separator: {
    height: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  inlineEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  pickerSheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerTitle: {
    ...typography.label,
  },
  pickerDone: {
    ...typography.label,
  },
});
