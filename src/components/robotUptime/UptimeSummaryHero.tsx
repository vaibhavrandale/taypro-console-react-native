import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { RobotUptimeSummary } from '../../types/robotUptime';

type Props = {
  summary: RobotUptimeSummary;
};

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function UptimeSummaryHero({ summary }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.metricRow}>
        <UptimeMetricInline
          label="Cleaning Uptime"
          value={summary.monthlyCleaningUptime}
          color={colors.primary}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <UptimeMetricInline
          label="Availability"
          value={summary.monthlyAvailabilityUptime}
          color={colors.badge.info.text}
        />
      </View>

      <View
        style={[
          styles.statsStrip,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.backgroundTertiary,
          },
        ]}
      >
        <MiniStat
          label="Assigned"
          value={summary.totalAssignedRobots}
          color={colors.textPrimary}
        />
        <MiniStat
          label="Avg Success"
          value={summary.averageSuccess}
          color={colors.primary}
        />
        <MiniStat
          label="Avg Failure"
          value={summary.averageFailure}
          color={colors.danger}
        />
        <MiniStat
          label="Perfect Days"
          value={summary.perfectDays}
          color={colors.badge.purple.text}
        />
        <MiniStat
          label="No-Run Days"
          value={summary.rainDays}
          color={colors.badge.warning.text}
        />
      </View>
    </View>
  );
}

function UptimeMetricInline({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.inlineMetric}>
      <Text style={[styles.inlineLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.inlineValue, { color }]}>
        {Number.isFinite(value) ? Math.round(value) : 0}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: spacing.lg,
  },
  inlineMetric: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineLabel: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
  },
  inlineValue: {
    ...typography.h1,
    fontSize: 34,
    lineHeight: 38,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.sm,
  },
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  miniStat: {
    width: '20%',
    minWidth: 68,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  miniValue: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  miniLabel: {
    ...typography.caption,
    fontSize: 9,
    textAlign: 'center',
  },
});
