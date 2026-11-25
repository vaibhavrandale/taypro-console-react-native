import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerParamList } from '../navigation/types';
import { Navbar } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { fetchRobotNotifications } from '../api/robotNotifications';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { RobotNotification } from '../types/robotNotifications';
import { resolveProfileImageUri } from '../utils/cleaningLogs';
import { formatDateTimeIST } from '../utils/datetime';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';

const PAGE_LIMIT = 10;

const COL = {
  sr: 28,
  user: 184,
  robot: 148,
  activity: 82,
} as const;

const TABLE_WIDTH = COL.sr + COL.user + COL.robot + COL.activity + 36;

function commandMeta(command?: string): {
  label: string;
  variant: 'success' | 'error' | 'neutral' | 'info';
} {
  if (command === '11' || command === 'Cleaning Start') {
    return { label: 'Cleaning Start', variant: 'success' };
  }
  if (command === '13') {
    return { label: 'Intelligent Cleaning Start', variant: 'success' };
  }
  if (command === '14' || command === 'Cleaning Stop') {
    return { label: 'Cleaning Stop', variant: 'error' };
  }
  if (command === '15') {
    return { label: 'Return To Dock', variant: 'info' };
  }
  return { label: command || 'Command', variant: 'neutral' };
}

function ActivityHeader() {
  const { colors } = useTheme();
  const labels = [
    ['Sr No', COL.sr],
    ['User', COL.user],
    ['Robot', COL.robot],
    ['Activity', COL.activity],
  ] as const;
  return (
    <View
      style={[
        styles.headerRow,
        {
          backgroundColor: colors.backgroundTertiary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {labels.map(([label, width]) => (
        <Text
          key={label}
          style={[styles.headerCell, { width, color: colors.textMuted }]}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

function ActivityRow({
  item,
  index,
}: {
  item: RobotNotification;
  index: number;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const command = commandMeta(item.command);
  const avatarUri = resolveProfileImageUri(item.last_activity?.profile_image);
  const name = item.last_activity?.name || '—';
  const email = item.last_activity?.email;
  const [stampDate, stampTime = ''] = formatDateTimeIST(item.createdAt).split(', ');

  return (
    <View style={[styles.dataRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.cell, { width: COL.sr, color: colors.textSecondary }]}>
        {index}
      </Text>
      <View style={[styles.userCell, { width: COL.user }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="person" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.userText}>
          <Text
            style={[styles.userName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {email ? (
            <Text
              style={[styles.userEmail, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {email}
            </Text>
          ) : null}
          <Text
            style={[styles.userEmail, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.site_id || '—'}
          </Text>
        </View>
      </View>
      <View style={[styles.robotCell, { width: COL.robot }]}>
        <Pressable
          disabled={!item.robot_no}
          onPress={() => {
            if (!item.robot_no) return;
            navigation.navigate('RobotOperating', {
              robotNo: item.robot_no,
              siteId: item.site_id ?? '',
            });
          }}
        >
          <Text style={[styles.cell, styles.robotLink, { color: colors.primary }]}>
            {item.robot_no || '—'}
          </Text>
        </Pressable>
        <Text style={[styles.loraText, { color: colors.textMuted }]}>
          {item.lora_no ? `LoRa ${item.lora_no}` : '—'}
        </Text>
        <Badge label={command.label} variant={command.variant} size="sm" />
      </View>
      <View style={{ width: COL.activity }}>
        <Text style={[styles.cell, { color: colors.textPrimary }]}>
          {stampDate}
        </Text>
        {stampTime ? (
          <Text style={[styles.loraText, { color: colors.textSecondary }]}>
            {stampTime}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function RobotActivityScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const today = toDateInputValue(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [items, setItems] = useState<RobotNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const loadPage = useCallback(
    async (targetPage: number, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await fetchRobotNotifications({
          page: targetPage,
          limit: PAGE_LIMIT,
          startDate,
          endDate,
        });
        setItems(result.data);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasNextPage(result.hasNextPage);
        setHasPrevPage(result.hasPrevPage);
      } catch (err) {
        setItems([]);
        setError(
          err instanceof Error ? err.message : 'Failed to load robot commands',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, startDate],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        (item.robot_no ?? '').toLowerCase().includes(term) ||
        (item.lora_no ?? '').toLowerCase().includes(term) ||
        (item.command ?? '').toLowerCase().includes(term) ||
        commandMeta(item.command).label.toLowerCase().includes(term) ||
        (item.site_id ?? '').toLowerCase().includes(term) ||
        (item.last_activity?.name ?? '').toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  const openDatePicker = (kind: 'start' | 'end') => {
    const value = kind === 'start' ? startDate : endDate;
    setPickerDate(new Date(`${value}T12:00:00`));
    setDatePicker(kind);
  };

  const applyPickedDate = (picked?: Date) => {
    if (!picked || !datePicker) return;
    const next = toDateInputValue(picked);
    if (datePicker === 'start') {
      setStartDate(next);
      if (next > endDate) setEndDate(next);
    } else {
      setEndDate(next);
      if (next < startDate) setStartDate(next);
    }
    setPage(1);
    if (Platform.OS === 'ios') setPickerDate(picked);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Command Activity"
        subtitle="Command activity log"
        showRobotActivity={false}
      />

      <View style={styles.filters}>
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => openDatePicker('start')}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundSecondary,
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
            {Platform.OS === 'web'
              ? React.createElement('input', {
                  type: 'date',
                  value: startDate,
                  max: today,
                  'aria-label': 'Start date',
                  onChange: (event: { target: { value: string } }) => {
                    const next = event.target.value;
                    if (!next) return;
                    setStartDate(next);
                    if (next > endDate) setEndDate(next);
                    setPage(1);
                  },
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
            onPress={() => openDatePicker('end')}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundSecondary,
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
            {Platform.OS === 'web'
              ? React.createElement('input', {
                  type: 'date',
                  value: endDate,
                  max: today,
                  'aria-label': 'End date',
                  onChange: (event: { target: { value: string } }) => {
                    const next = event.target.value;
                    if (!next) return;
                    setEndDate(next);
                    if (next < startDate) setStartDate(next);
                    setPage(1);
                  },
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
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search robot, command, site, user..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            {error}
          </Text>
          <Button title="Retry" size="sm" onPress={() => void loadPage(page)} />
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <ActivityHeader />
              {filtered.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  No robot activity found
                </Text>
              ) : (
                filtered.map((item, index) => (
                  <ActivityRow
                    key={item._id}
                    item={item}
                    index={(page - 1) * PAGE_LIMIT + index + 1}
                  />
                ))
              )}
            </View>
          </ScrollView>
          <View style={styles.pager}>
            <Button
              title="Prev"
              size="sm"
              variant="outline"
              disabled={!hasPrevPage || loading}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Text style={[styles.pageLabel, { color: colors.textMuted }]}>
              Page {page} / {totalPages}
            </Text>
            <Button
              title="Next"
              size="sm"
              variant="outline"
              disabled={!hasNextPage || loading}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        </ScrollView>
      )}

      {datePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onValueChange={(_event, picked) => {
            applyPickedDate(picked);
            setDatePicker(null);
          }}
          onDismiss={() => setDatePicker(null)}
        />
      ) : null}

      {datePicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <View
              style={[
                styles.iosPickerSheet,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.iosPickerActions}>
                <Pressable onPress={() => setDatePicker(null)}>
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyPickedDate(pickerDate);
                    setDatePicker(null);
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
                themeVariant={isDark ? 'dark' : 'light'}
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
  filters: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
    position: 'relative',
  },
  dateLabel: { ...typography.caption, fontSize: 10 },
  dateValue: { ...typography.bodySmall, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
  },
  listScroll: { flex: 1 },
  table: {
    width: TABLE_WIDTH,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerCell: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'left',
    lineHeight: 14,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  cell: {
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'left',
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userText: { flex: 1, gap: 1 },
  userName: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    ...typography.caption,
    fontSize: 11,
  },
  robotCell: {
    gap: 2,
    alignItems: 'flex-start',
  },
  robotLink: {
    textDecorationLine: 'underline',
  },
  loraText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
  empty: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  pageLabel: { ...typography.caption },
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
