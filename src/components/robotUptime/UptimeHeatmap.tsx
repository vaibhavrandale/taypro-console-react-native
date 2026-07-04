import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { RobotUptimeDay } from '../../types/robotUptime';
import { getDayOfMonth, getHeatmapColor, isRainOrNoRunDay } from '../../utils/robotUptime';

type Props = {
  days: RobotUptimeDay[];
};

const CELL_SIZE = 14;
const GAP = 4;

export function UptimeHeatmap({ days }: Props) {
  const { colors } = useTheme();

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
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Month Overview
      </Text>
      <View style={styles.grid}>
        {days.map((day) => {
          const rainDay = isRainOrNoRunDay(day);
          const fill = rainDay
            ? colors.badge.warning.bg
            : getHeatmapColor(day.cleaning_uptime_percentage, colors);

          return (
            <View
              key={day.date}
              style={[
                styles.cell,
                {
                  backgroundColor: fill,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  {
                    color:
                      day.cleaning_uptime_percentage >= 50 || rainDay
                        ? colors.textPrimary
                        : colors.textMuted,
                  },
                ]}
              >
                {getDayOfMonth(day.date)}
              </Text>
            </View>
          );
        })}
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
  title: {
    ...typography.label,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: {
    width: CELL_SIZE + 8,
    height: CELL_SIZE + 8,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '700',
  },
});
