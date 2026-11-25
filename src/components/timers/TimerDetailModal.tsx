import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button } from '../ui';
import { fetchTimerActivity } from '../../api/timers';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatApiDateLabel, formatDateTimeIST } from '../../utils/datetime';
import { resolveProfileImageUri } from '../../utils/cleaningLogs';
import {
  DISABLED_TIMER,
  type BlockTimer,
  type TimerLastActivity,
} from '../../types/timers';

type Props = {
  visible: boolean;
  timer: BlockTimer | null;
  onClose: () => void;
};

type DetailPart = {
  text: string;
  highlight?: boolean;
};

function resolveDateValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const nested = (value as { $date?: unknown }).$date;
    if (typeof nested === 'string' || typeof nested === 'number') {
      return String(nested);
    }
  }
  return undefined;
}

function formatTimerDisplay(value?: string) {
  if (!value || value === DISABLED_TIMER) return null;
  const [h = '0', m = '0'] = value.split(':');
  const hour24 = Number(h) || 0;
  const minute = Number(m) || 0;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function normalizeActivities(
  last?: TimerLastActivity | TimerLastActivity[],
): TimerLastActivity[] {
  if (!last) return [];
  const list = Array.isArray(last) ? last : [last];
  return [...list].sort((a, b) => {
    const aTime = Date.parse(resolveDateValue(a.timestamp ?? a.createdAt) ?? '') || 0;
    const bTime = Date.parse(resolveDateValue(b.timestamp ?? b.createdAt) ?? '') || 0;
    return bTime - aTime;
  });
}

/** Turn backend HTML details into plain + highlighted text parts. */
function parseDetailsHtml(html?: string): DetailPart[] {
  if (!html?.trim()) return [];

  const parts: DetailPart[] = [];
  const pattern =
    /<span[^>]*class=["']text-success["'][^>]*>(.*?)<\/span>|([^<]+)|<[^>]+>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    if (match[1] != null) {
      const text = decodeEntities(match[1]).trim();
      if (text) parts.push({ text, highlight: true });
      continue;
    }
    if (match[2] != null) {
      const text = decodeEntities(match[2]);
      if (text) parts.push({ text });
    }
  }

  if (parts.length === 0) {
    return [{ text: decodeEntities(html.replace(/<[^>]+>/g, '')) }];
  }

  return parts;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function TimerSlot({
  label,
  time,
  date,
}: {
  label: string;
  time?: string;
  date?: string;
}) {
  const { colors } = useTheme();
  const display = formatTimerDisplay(time);

  return (
    <View style={styles.slot}>
      <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.slotTime,
          { color: display ? colors.textPrimary : colors.badge.error.text },
        ]}
      >
        {display || 'Disabled'}
      </Text>
      <Text style={[styles.slotDate, { color: colors.textSecondary }]}>
        {date ? formatApiDateLabel(date) : '—'}
      </Text>
    </View>
  );
}

function ActivityAvatar({ uri }: { uri?: string }) {
  const { colors } = useTheme();
  const imageUri = resolveProfileImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.activityAvatar} />;
  }

  return (
    <View
      style={[
        styles.activityAvatar,
        styles.activityAvatarFallback,
        { backgroundColor: colors.badge.info.bg },
      ]}
    >
      <Ionicons name="person" size={16} color={colors.badge.info.text} />
    </View>
  );
}

function ActivityDetails({ html }: { html?: string }) {
  const { colors } = useTheme();
  const parts = useMemo(() => parseDetailsHtml(html), [html]);

  if (parts.length === 0) return null;

  return (
    <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
      {parts.map((part, index) => (
        <Text
          key={`${index}-${part.text.slice(0, 8)}`}
          style={
            part.highlight
              ? { color: colors.primary, fontWeight: '700' }
              : undefined
          }
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function ActivityCard({ item }: { item: TimerLastActivity }) {
  const { colors } = useTheme();
  const when = resolveDateValue(item.timestamp ?? item.createdAt);

  return (
    <View style={[styles.activityRow, { borderBottomColor: colors.border }]}>
      <ActivityAvatar uri={item.profile_image} />
      <View style={styles.activityBody}>
        <Text
          style={[styles.activityName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.name || item.email || 'Unknown'}
        </Text>
        {item.email ? (
          <Text
            style={[styles.activityMeta, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {item.email}
          </Text>
        ) : null}
        <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>
          {formatDateTimeIST(when)}
        </Text>
        <ActivityDetails html={item.details || item.message || item.action} />
      </View>
    </View>
  );
}

export function TimerDetailModal({ visible, timer, onClose }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useStatusBarOverlay(visible);

  const [older, setOlder] = useState<TimerLastActivity[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');

  useEffect(() => {
    setOlder([]);
    setMoreError('');
  }, [timer?._id]);

  const initialActivities = useMemo(
    () => normalizeActivities(timer?.last_activity),
    [timer?.last_activity],
  );
  const activities = useMemo(
    () => normalizeActivities([...initialActivities, ...older]),
    [initialActivities, older],
  );
  const activityTotal = timer?.activity_count ?? activities.length;
  const hasMore = activityTotal > activities.length;

  const loadEarlier = async () => {
    if (!timer || loadingMore) return;
    setLoadingMore(true);
    setMoreError('');
    try {
      const page = await fetchTimerActivity(timer._id, activities.length);
      const next = Array.isArray(page.last_activity) ? page.last_activity : [];
      setOlder((prev) => [...prev, ...next]);
    } catch (err) {
      setMoreError(
        err instanceof Error ? err.message : 'Failed to load activity',
      );
    } finally {
      setLoadingMore(false);
    }
  };
  const editLocked = timer?.is_available_to_edit === false;
  const intelligent = timer?.timer_command === '13';
  const createdAt = resolveDateValue(timer?.createdAt);
  const updatedAt = resolveDateValue(timer?.updatedAt);
  const timerUpdatedAt = resolveDateValue(timer?.timer_updated_at);

  if (!timer) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlay,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : '#101936',
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text
                style={[styles.title, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {timer.block || 'Timer'}
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {timer.site_id || '—'}
                {' · '}
                {timer.total_robots_in_block ?? 0} robots
                {' · '}
                {timer.max_cleaning_time ?? 0} min
                {' · '}
                {activityTotal} changes
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={intelligent ? 'Intelligent' : 'Normal'}
                  variant={intelligent ? 'warning' : 'success'}
                  size="sm"
                />
                <Badge
                  label={editLocked ? 'Locked' : 'Editable'}
                  variant={editLocked ? 'error' : 'success'}
                  size="sm"
                />
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.slotsRow,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TimerSlot label="T1" time={timer.timer1} date={timer.timer1_date} />
              <View style={[styles.slotDivider, { backgroundColor: colors.border }]} />
              <TimerSlot label="T2" time={timer.timer2} date={timer.timer2_date} />
              <View style={[styles.slotDivider, { backgroundColor: colors.border }]} />
              <TimerSlot label="T3" time={timer.timer3} date={timer.timer3_date} />
            </View>

            {createdAt || updatedAt || timerUpdatedAt ? (
              <View style={styles.metaBlock}>
                {createdAt ? (
                  <Text style={[styles.metaLine, { color: colors.textMuted }]}>
                    Created {formatDateTimeIST(createdAt)}
                  </Text>
                ) : null}
                {timerUpdatedAt ? (
                  <Text style={[styles.metaLine, { color: colors.textMuted }]}>
                    Last change {formatDateTimeIST(timerUpdatedAt)}
                  </Text>
                ) : updatedAt ? (
                  <Text style={[styles.metaLine, { color: colors.textMuted }]}>
                    Updated {formatDateTimeIST(updatedAt)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Activity history
                </Text>
                {activityTotal > 0 ? (
                  <Badge
                    label={
                      hasMore
                        ? `${activities.length}/${activityTotal}`
                        : `${activityTotal}`
                    }
                    variant="neutral"
                    size="sm"
                  />
                ) : null}
              </View>

              {activities.length === 0 ? (
                <View
                  style={[
                    styles.emptyActivity,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.emptyActivityText, { color: colors.textMuted }]}
                  >
                    No activity recorded for this block yet.
                  </Text>
                </View>
              ) : (
                activities.map((item, index) => (
                  <ActivityCard
                    key={`${resolveDateValue(item.timestamp) ?? index}-${item.email ?? index}`}
                    item={item}
                  />
                ))
              )}
              {hasMore ? (
                <Button
                  title={loadingMore ? 'Loading...' : 'Load earlier activity'}
                  variant="outline"
                  size="sm"
                  onPress={() => void loadEarlier()}
                  loading={loadingMore}
                />
              ) : null}
              {moreError ? (
                <Text style={[styles.moreError, { color: colors.danger }]}>
                  {moreError}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  panel: {
    height: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  slotDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  slotLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  slotTime: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  slotDate: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  metaBlock: {
    gap: 2,
  },
  metaLine: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyActivity: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moreError: {
    ...typography.caption,
    textAlign: 'center',
  },
  emptyActivityText: {
    ...typography.bodySmall,
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  activityAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  activityMeta: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
  },
  activityDetails: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
