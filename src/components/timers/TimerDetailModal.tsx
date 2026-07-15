import React, { useMemo } from 'react';
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
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
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

function MetricTile({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.metricTile,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

function TimerSlotCard({
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
  const disabled = display == null;

  return (
    <View
      style={[
        styles.slotCard,
        {
          backgroundColor: disabled
            ? colors.badge.error.bg
            : colors.backgroundSecondary,
          borderColor: disabled ? colors.badge.error.text : colors.border,
        },
      ]}
    >
      <View style={styles.slotHeader}>
        <View
          style={[
            styles.slotIcon,
            {
              backgroundColor: disabled
                ? 'rgba(239,68,68,0.18)'
                : colors.badge.success.bg,
            },
          ]}
        >
          <Ionicons
            name={disabled ? 'close-circle' : 'time'}
            size={16}
            color={disabled ? colors.badge.error.text : colors.primary}
          />
        </View>
        <Text style={[styles.slotLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
      </View>

      {disabled ? (
        <Badge label="Disabled" variant="error" size="sm" />
      ) : (
        <Text style={[styles.slotTime, { color: colors.textPrimary }]}>
          {display}
        </Text>
      )}

      <View style={styles.slotDateRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
        <Text style={[styles.slotDate, { color: colors.textSecondary }]}>
          {date || 'No date set'}
        </Text>
      </View>
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
    <View
      style={[
        styles.activityCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <ActivityAvatar uri={item.profile_image} />
      <View style={styles.activityBody}>
        <View style={styles.activityTop}>
          <Text
            style={[styles.activityName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.name || item.email || 'Unknown'}
          </Text>
          <Text style={[styles.activityTime, { color: colors.textMuted }]}>
            {formatDateTimeIST(when)}
          </Text>
        </View>
        {item.email ? (
          <Text
            style={[styles.activityEmail, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {item.email}
          </Text>
        ) : null}
        <ActivityDetails
          html={item.details || item.message || item.action}
        />
      </View>
    </View>
  );
}

export function TimerDetailModal({ visible, timer, onClose }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useStatusBarOverlay(visible);

  const activities = useMemo(
    () => normalizeActivities(timer?.last_activity),
    [timer?.last_activity],
  );
  const editLocked = timer?.is_available_to_edit === false;
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
          <View
            style={[styles.accentBar, { backgroundColor: colors.primary }]}
          />

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.badge.success.bg },
                ]}
              >
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                  Block schedule
                </Text>
                <Text
                  style={[styles.title, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {timer.block || 'Timer details'}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge
                    label={timer.site_id || '—'}
                    variant="info"
                    size="sm"
                  />
                  <Badge
                    label={editLocked ? 'Edit locked' : 'Editable'}
                    variant={editLocked ? 'error' : 'success'}
                    size="sm"
                  />
                  {timer.is_timer_updated ? (
                    <Badge label="Updated" variant="warning" size="sm" />
                  ) : null}
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
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.metricsRow}>
              <MetricTile
                icon="hardware-chip-outline"
                label="Robots"
                value={String(timer.total_robots_in_block ?? 0)}
                color={colors.textPrimary}
              />
              <MetricTile
                icon="hourglass-outline"
                label="Max min"
                value={String(timer.max_cleaning_time ?? 0)}
                color={colors.primary}
              />
              <MetricTile
                icon="git-commit-outline"
                label="Changes"
                value={String(activities.length)}
                color={colors.badge.info.text}
              />
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Cleaning timers
              </Text>
              <View style={styles.slotsCol}>
                <TimerSlotCard
                  label="Timer 1"
                  time={timer.timer1}
                  date={timer.timer1_date}
                />
                <TimerSlotCard
                  label="Timer 2"
                  time={timer.timer2}
                  date={timer.timer2_date}
                />
                <TimerSlotCard
                  label="Timer 3"
                  time={timer.timer3}
                  date={timer.timer3_date}
                />
              </View>
            </View>

            {createdAt || updatedAt || timerUpdatedAt ? (
              <View
                style={[
                  styles.metaCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                {createdAt ? (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaKey, { color: colors.textMuted }]}>
                      Created
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDateTimeIST(createdAt)}
                    </Text>
                  </View>
                ) : null}
                {updatedAt ? (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaKey, { color: colors.textMuted }]}>
                      Updated
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDateTimeIST(updatedAt)}
                    </Text>
                  </View>
                ) : null}
                {timerUpdatedAt ? (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaKey, { color: colors.textMuted }]}>
                      Last timer change
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDateTimeIST(timerUpdatedAt)}
                    </Text>
                  </View>
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
                {activities.length > 0 ? (
                  <Badge
                    label={`${activities.length}`}
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
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Button
              title="Close"
              variant="outline"
              onPress={onClose}
              fullWidth
              icon="checkmark-outline"
            />
          </View>
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
    maxHeight: '92%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.label,
    fontSize: 18,
    fontWeight: '700',
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
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricTile: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  section: {
    gap: spacing.sm,
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
    fontWeight: '700',
  },
  slotsCol: {
    gap: spacing.sm,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slotTime: {
    ...typography.label,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  slotDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotDate: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  metaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaKey: {
    ...typography.caption,
    fontSize: 11,
  },
  metaValue: {
    ...typography.bodySmall,
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyActivity: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyActivityText: {
    ...typography.bodySmall,
    flex: 1,
  },
  activityCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  activityName: {
    ...typography.label,
    fontSize: 13,
    flex: 1,
  },
  activityTime: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'right',
    maxWidth: 110,
  },
  activityEmail: {
    ...typography.caption,
    fontSize: 11,
  },
  activityDetails: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
});
