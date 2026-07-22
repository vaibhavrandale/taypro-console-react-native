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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PmRobotCard } from '../components/pm/PmRobotCard';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Navbar } from '../components/layout';
import { Button } from '../components/ui';
import { fetchPreventiveMaintenances } from '../api/preventiveMaintenance';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import {
  flattenPmRobots,
  type PmRobotRecord,
  type PreventiveMaintenanceResult,
} from '../types/preventiveMaintenance';
import {
  formatDisplayDate,
  getCurrentMonthRange,
  getPreviousMonthRange,
  toDateInputValue,
} from '../utils/dprHistory';
import type { PreventiveMaintenanceStackParamList } from '../navigation/PreventiveMaintenanceStack';

type DateField = 'start' | 'end' | null;
type Navigation = NativeStackNavigationProp<
  PreventiveMaintenanceStackParamList,
  'PmList'
>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

export function PreventiveMaintenanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const siteOptions = useMemo(() => {
    const options = assignedSites.map((site) => ({
      value: site.site_id,
      label: getSiteLabel(site),
    }));
    if (options.length > 1) {
      return [{ value: 'all', label: 'All assigned sites' }, ...options];
    }
    return options;
  }, [assignedSites]);

  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [siteId, setSiteId] = useState(
    () => (assignedSites.length === 1 ? assignedSites[0].site_id : 'all'),
  );
  const [startDate, setStartDate] = useState(defaultRange.start_date);
  const [endDate, setEndDate] = useState(defaultRange.end_date);
  const [dateField, setDateField] = useState<DateField>(null);
  const [pickerDate, setPickerDate] = useState(() => new Date());

  const [result, setResult] = useState<PreventiveMaintenanceResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const robots = useMemo(() => flattenPmRobots(result), [result]);

  const siteCount = useMemo(() => {
    if (result?.site_count != null) return result.site_count;
    if (siteId !== 'all') return robots.length ? 1 : 0;
    return new Set(robots.map((r) => r.site_id).filter(Boolean)).size;
  }, [result?.site_count, robots, siteId]);

  const recordCount = result?.record_count ?? robots.length;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!siteId) {
        setResult({ data: [] });
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await fetchPreventiveMaintenances({
          startDate,
          endDate,
          siteId,
        });
        setResult(data);
      } catch (err) {
        setResult(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load preventive maintenance',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, siteId, startDate],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (assignedSites.length === 1) {
      setSiteId(assignedSites[0].site_id);
    }
  }, [assignedSites]);

  const openDatePicker = (field: 'start' | 'end') => {
    setPickerDate(new Date(field === 'start' ? startDate : endDate));
    setDateField(field);
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

  const resetFilters = () => {
    const today = toDateInputValue(new Date());
    setSiteId(assignedSites.length === 1 ? assignedSites[0].site_id : 'all');
    setStartDate(today);
    setEndDate(today);
  };

  const applyPreset = (range: { start_date: string; end_date: string }) => {
    setStartDate(range.start_date);
    setEndDate(range.end_date);
  };

  const rangeLabel = `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.headerTop}>
        <Text style={[styles.docLine, { color: colors.textMuted, flex: 1 }]}>
          Doc No: TPL-12 · Rev: 1 · Revised by: Abhay Singh
        </Text>
        <Button
          title="New"
          size="sm"
          icon="add-outline"
          onPress={() => navigation.navigate('PmCreate')}
        />
      </View>

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
              From
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
              To
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
          <Pressable
            onPress={resetFilters}
            style={[
              styles.presetChip,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="filter-outline"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={[styles.presetText, { color: colors.textSecondary }]}>
              Reset
            </Text>
          </Pressable>
        </View>
      </View>

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
            {siteCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Sites
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {recordCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            PM records
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryCellWide}>
          <Text
            style={[styles.summaryRange, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {rangeLabel}
          </Text>
        </View>
      </View>

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
          <Text style={{ color: colors.danger }}>{error}</Text>
          <Button
            title="Retry"
            size="sm"
            variant="outline"
            onPress={() => void load()}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Preventive Maintenance"
        subtitle="Quarterly checklist records"
      />

      {loading && robots.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={robots}
          keyExtractor={(item: PmRobotRecord) => item._id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="construct-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No PM records found
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                Try adjusting the date range or selecting a different site.
              </Text>
              <Button
                title="Reset filters"
                size="sm"
                variant="outline"
                onPress={resetFilters}
              />
            </View>
          }
          renderItem={({ item }) => <PmRobotCard record={item} />}
        />
      )}

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
          <View style={styles.iosPickerBackdrop}>
            <View
              style={[
                styles.iosPickerSheet,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.iosPickerActions}>
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
  list: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerContent: { gap: spacing.md, marginBottom: spacing.sm },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docLine: { ...typography.caption, fontSize: 11 },
  filtersCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  datePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  dateLabel: { ...typography.caption, fontSize: 10, fontWeight: '700' },
  dateValue: { ...typography.label, fontSize: 13 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  presetText: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  summaryStrip: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
  summaryCellWide: { flex: 1.4, paddingHorizontal: spacing.xs },
  summaryValue: { ...typography.label, fontSize: 22, fontWeight: '700' },
  summaryLabel: { ...typography.caption, fontSize: 10 },
  summaryRange: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.label, fontSize: 16 },
  emptyBody: { ...typography.bodySmall, textAlign: 'center' },
  iosPickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
