import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function commandMeta(command?: string): {
  label: string;
  variant: 'success' | 'error' | 'neutral' | 'info';
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (command === '11' || command === 'Cleaning Start') {
    return {
      label: 'Cleaning Start',
      variant: 'success',
      accent: '#00C9A7',
      icon: 'play-circle',
    };
  }
  if (command === '14' || command === 'Cleaning Stop') {
    return {
      label: 'Cleaning Stop',
      variant: 'error',
      accent: '#EF4444',
      icon: 'stop-circle',
    };
  }
  if (command === '15') {
    return {
      label: 'Return To Dock',
      variant: 'info',
      accent: '#3B82F6',
      icon: 'home',
    };
  }
  return {
    label: command || 'Command',
    variant: 'neutral',
    accent: '#94A3B8',
    icon: 'flash',
  };
}

function truncateMiddle(value: string, max = 18) {
  if (value.length <= max) return value;
  const keep = Math.floor((max - 1) / 2);
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

function ActivityCard({
  item,
  index,
}: {
  item: RobotNotification;
  index: number;
}) {
  const { colors } = useTheme();
  const command = commandMeta(item.command);
  const avatarUri = resolveProfileImageUri(item.last_activity?.profile_image);
  const details = stripHtml(item.last_activity?.details);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: command.accent }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.commandIconWrap,
                { backgroundColor: `${command.accent}22` },
              ]}
            >
              <Ionicons name={command.icon} size={16} color={command.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.robotNo, { color: colors.textPrimary }]}>
                {item.robot_no || '—'}
              </Text>
              <Text style={[styles.indexLabel, { color: colors.textMuted }]}>
                #{index}
                {item.site_id ? ` · ${item.site_id}` : ''}
              </Text>
            </View>
          </View>
          <Badge label={command.label} variant={command.variant} size="sm" />
        </View>

        {item.deveui ? (
          <View
            style={[
              styles.chipRow,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons
              name="radio-outline"
              size={12}
              color={colors.textMuted}
            />
            <Text
              style={[styles.chipText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {truncateMiddle(item.deveui, 22)}
            </Text>
          </View>
        ) : null}

        <View style={styles.senderRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="person" size={14} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.senderText}>
            <Text style={[styles.senderName, { color: colors.textPrimary }]}>
              {item.last_activity?.name || 'Unknown sender'}
            </Text>
            {item.last_activity?.email ? (
              <Text
                style={[styles.senderEmail, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {item.last_activity.email}
              </Text>
            ) : null}
          </View>
          {item.createdAt ? (
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatDateTimeIST(item.createdAt)}
            </Text>
          ) : null}
        </View>

        {details ? (
          <View
            style={[
              styles.detailsBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.details, { color: colors.textSecondary }]}>
              {details}
            </Text>
          </View>
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
      const details = stripHtml(item.last_activity?.details).toLowerCase();
      return (
        (item.robot_no ?? '').toLowerCase().includes(term) ||
        (item.command ?? '').toLowerCase().includes(term) ||
        (item.site_id ?? '').toLowerCase().includes(term) ||
        (item.last_activity?.name ?? '').toLowerCase().includes(term) ||
        details.includes(term)
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
        title="Robot Commands"
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
            placeholder="Search robot, command, site, sender..."
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
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.textMuted }}>
                No robot activity found
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ActivityCard
              item={item}
              index={(page - 1) * PAGE_LIMIT + index + 1}
            />
          )}
          ListFooterComponent={
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
          }
        />
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
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  accentBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  robotNo: { ...typography.label, fontSize: 15, fontWeight: '700' },
  indexLabel: { ...typography.caption, fontSize: 11 },
  chipRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: { ...typography.caption, fontSize: 10 },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderText: { flex: 1, gap: 1 },
  senderName: { ...typography.bodySmall, fontWeight: '600' },
  senderEmail: { ...typography.caption, fontSize: 10 },
  detailsBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  details: { ...typography.bodySmall, lineHeight: 18 },
  timestamp: {
    ...typography.caption,
    fontSize: 10,
    maxWidth: 88,
    textAlign: 'right',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
