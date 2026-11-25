import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { DISABLED_TIMER, type BlockTimer } from '../../types/timers';

type Props = {
  timer: BlockTimer;
  index: number;
  selectable?: boolean;
  selected?: boolean;
  canUpdate: boolean;
  onToggleSelect?: () => void;
  onView: () => void;
  onUpdate: () => void;
};

function formatTimerValue(value?: string) {
  if (!value || value === DISABLED_TIMER) return null;
  const [h = '0', m = '0'] = value.split(':');
  const hour24 = Number(h) || 0;
  const minute = Number(m) || 0;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
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
  const display = formatTimerValue(time);

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
        {date || '—'}
      </Text>
    </View>
  );
}

export function TimerCard({
  timer,
  index,
  selectable,
  selected,
  canUpdate,
  onToggleSelect,
  onView,
  onUpdate,
}: Props) {
  const { colors } = useTheme();
  const editLocked = timer.is_available_to_edit === false;
  const intelligent = timer.timer_command === '13';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        {selectable ? (
          <Pressable
            onPress={onToggleSelect}
            hitSlop={8}
            style={[
              styles.checkbox,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : 'transparent',
              },
            ]}
          >
            {selected ? (
              <Ionicons name="checkmark" size={14} color="#101936" />
            ) : null}
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          <View style={styles.titleLine}>
            <Text
              style={[styles.blockTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {index}. {timer.block || '—'}
            </Text>
            <Badge
              label={intelligent ? 'Intelligent' : 'Normal'}
              variant={intelligent ? 'warning' : 'success'}
              size="sm"
            />
          </View>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {timer.site_id || '—'}
            {' · '}
            {timer.total_robots_in_block ?? 0} robots
            {' · '}
            {timer.max_cleaning_time ?? 0} min
            {editLocked ? ' · Locked' : ''}
          </Text>
        </View>

        <Pressable onPress={onView} hitSlop={6} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>View</Text>
        </Pressable>
        <Pressable
          onPress={onUpdate}
          disabled={!canUpdate}
          hitSlop={6}
          style={styles.action}
        >
          <Text
            style={[
              styles.actionText,
              { color: canUpdate ? colors.primary : colors.textMuted },
            ]}
          >
            {canUpdate ? 'Update' : 'Locked'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.slotsRow, { borderTopColor: colors.border }]}>
        <TimerSlot label="T1" time={timer.timer1} date={timer.timer1_date} />
        <View style={[styles.slotDivider, { backgroundColor: colors.border }]} />
        <TimerSlot label="T2" time={timer.timer2} date={timer.timer2_date} />
        <View style={[styles.slotDivider, { backgroundColor: colors.border }]} />
        <TimerSlot label="T3" time={timer.timer3} date={timer.timer3_date} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  blockTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    ...typography.caption,
    fontSize: 11,
  },
  action: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  actionText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
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
    textTransform: 'uppercase',
  },
  slotTime: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  slotDate: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
});
