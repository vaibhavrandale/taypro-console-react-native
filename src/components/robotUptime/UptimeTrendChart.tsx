import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { RobotUptimeDay } from '../../types/robotUptime';
import {
  formatShortDate,
  getDayOfMonth,
  getHeatmapColor,
  getUptimeTone,
  isRainOrNoRunDay,
} from '../../utils/robotUptime';

type Props = {
  days: RobotUptimeDay[];
};

const BAR_MAX_HEIGHT = 96;
const BAR_WIDTH = 18;

export function UptimeTrendChart({ days }: Props) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    days[days.length - 1]?.date ?? null,
  );

  const selectedDay = useMemo(
    () => days.find((day) => day.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  if (days.length === 0) return null;

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
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Daily Cleaning Trend
        </Text>
        {selectedDay ? (
          <Text style={[styles.selectedHint, { color: colors.textMuted }]}>
            {formatShortDate(selectedDay.date)}
          </Text>
        ) : null}
      </View>

      {selectedDay ? (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <TooltipMetric
            label="Cleaning"
            value={`${selectedDay.cleaning_uptime_percentage}%`}
            color={getUptimeTone(selectedDay.cleaning_uptime_percentage, colors).color}
          />
          <TooltipMetric
            label="Availability"
            value={`${selectedDay.availibility_uptime_percentage}%`}
            color={getUptimeTone(selectedDay.availibility_uptime_percentage, colors).color}
          />
          <TooltipMetric
            label="Success"
            value={String(selectedDay.success_count)}
            color={colors.primary}
          />
          <TooltipMetric
            label="Failure"
            value={String(selectedDay.failure_count)}
            color={colors.danger}
          />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContent}
      >
        {days.map((day) => {
          const height = Math.max(
            4,
            (day.cleaning_uptime_percentage / 100) * BAR_MAX_HEIGHT,
          );
          const selected = day.date === selectedDate;
          const rainDay = isRainOrNoRunDay(day);
          const barColor = rainDay
            ? colors.badge.warning.text
            : getHeatmapColor(day.cleaning_uptime_percentage, colors);

          return (
            <Pressable
              key={day.date}
              onPress={() => setSelectedDate(day.date)}
              style={styles.barColumn}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: barColor,
                      opacity: selected ? 1 : 0.72,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: selected ? colors.primary : colors.textMuted,
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {getDayOfMonth(day.date)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.legendRow}>
        <LegendDot color={colors.primary} label="95%+" />
        <LegendDot color={colors.badge.info.text} label="80%+" />
        <LegendDot color={colors.badge.warning.text} label="50%+" />
        <LegendDot color={colors.danger} label="<50%" />
        <LegendDot color={colors.badge.warning.text} label="No run" />
      </View>
    </View>
  );
}

function TooltipMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.tooltipMetric}>
      <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.tooltipValue, { color }]}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>
        {label}
      </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  selectedHint: {
    ...typography.caption,
  },
  tooltip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tooltipMetric: {
    minWidth: '22%',
    gap: 2,
  },
  tooltipLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  tooltipValue: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
  },
  chartContent: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignItems: 'flex-end',
    gap: 6,
  },
  barColumn: {
    width: BAR_WIDTH + 4,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: radius.sm,
  },
  dayLabel: {
    ...typography.caption,
    fontSize: 9,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    fontSize: 10,
  },
});
