import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button } from '../ui';
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
    <View
      style={[
        styles.slot,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.slotLabel, { color: colors.textMuted }]}>{label}</Text>
      {display ? (
        <Text style={[styles.slotTime, { color: colors.textPrimary }]}>
          {display}
        </Text>
      ) : (
        <Badge label="Disabled" variant="error" size="sm" />
      )}
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
          <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>
            {timer.block || '—'}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={timer.site_id || '—'} variant="info" size="sm" />
            <Badge label={`#${index}`} variant="neutral" size="sm" />
            {editLocked ? (
              <Badge label="Edit locked" variant="error" size="sm" />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View
          style={[
            styles.metric,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {timer.total_robots_in_block ?? 0}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            Robots
          </Text>
        </View>
        <View
          style={[
            styles.metric,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {timer.max_cleaning_time ?? 0}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            Max min
          </Text>
        </View>
      </View>

      <View style={styles.slotsRow}>
        <TimerSlot label="T1" time={timer.timer1} date={timer.timer1_date} />
        <TimerSlot label="T2" time={timer.timer2} date={timer.timer2_date} />
        <TimerSlot label="T3" time={timer.timer3} date={timer.timer3_date} />
      </View>

      <View style={styles.actions}>
        <Button title="View" size="sm" variant="outline" onPress={onView} />
        <Button
          title={canUpdate ? 'Update' : 'Locked'}
          size="sm"
          variant={canUpdate ? 'primary' : 'ghost'}
          disabled={!canUpdate}
          onPress={onUpdate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  blockTitle: {
    ...typography.label,
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metric: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
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
  slotsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slot: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
    alignItems: 'flex-start',
  },
  slotLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slotTime: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
  },
  slotDate: {
    ...typography.caption,
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
