import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SiteRobot } from '../../types/siteDetails';
import {
  getBatteryLevel,
  getBatteryPercent,
  isRobotOnline,
  sortRobotsForDisplay,
} from '../../utils/robot';
import { Badge } from '../ui/Badge';

type Filter = 'all' | 'online' | 'low';

type Props = {
  robots: SiteRobot[];
};

function getBarColor(
  level: ReturnType<typeof getBatteryLevel>,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  if (level === 'good') return colors.primary;
  if (level === 'medium') return colors.badge.warning.text;
  if (level === 'low') return colors.danger;
  return colors.textMuted;
}

export function RobotBatteryChart({ robots }: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const summary = useMemo(() => {
    const online = robots.filter((r) => isRobotOnline(r.lora_state)).length;
    const batteries = robots
      .map((r) => getBatteryPercent(r.battery_voltage))
      .filter((v): v is number => v != null);
    const avg =
      batteries.length > 0
        ? Math.round(batteries.reduce((sum, v) => sum + v, 0) / batteries.length)
        : null;
    const low = robots.filter((r) => {
      const p = getBatteryPercent(r.battery_voltage);
      return p != null && p < 40;
    }).length;

    return { online, offline: robots.length - online, avg, low };
  }, [robots]);

  const filteredRobots = useMemo(() => {
    const sorted = sortRobotsForDisplay(robots);
    if (filter === 'online') {
      return sorted.filter((robot) => isRobotOnline(robot.lora_state));
    }
    if (filter === 'low') {
      return sorted.filter((robot) => {
        const percent = getBatteryPercent(robot.battery_voltage);
        return percent != null && percent < 40;
      });
    }
    return sorted;
  }, [robots, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${robots.length})` },
    { id: 'online', label: `Online (${summary.online})` },
    { id: 'low', label: `Low (${summary.low})` },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: colors.backgroundTertiary }]}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {summary.avg != null ? `${summary.avg}%` : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Avg battery</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.backgroundTertiary }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {summary.online}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Online</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.backgroundTertiary }]}>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {summary.low}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Low battery</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.backgroundTertiary,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#101936' : colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>≥70%</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.badge.warning.text }]}
          />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>40–69%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>&lt;40%</Text>
        </View>
      </View>

      {filteredRobots.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No robots match this filter.
        </Text>
      ) : (
        <View style={styles.chartList}>
          {filteredRobots.map((robot) => {
            const percent = getBatteryPercent(robot.battery_voltage);
            const level = getBatteryLevel(percent);
            const barColor = getBarColor(level, colors);
            const online = isRobotOnline(robot.lora_state);

            return (
              <View
                key={robot.robot_no}
                style={[styles.chartRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.chartRowHeader}>
                  <Text
                    style={[styles.robotId, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {robot.robot_no}
                  </Text>
                  <View style={styles.chartRowBadges}>
                    <Badge
                      label={online ? 'Online' : 'Offline'}
                      variant={online ? 'success' : 'neutral'}
                      size="sm"
                    />
                    <Text style={[styles.percentText, { color: colors.textPrimary }]}>
                      {percent != null ? `${percent}%` : '—'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.track, { backgroundColor: colors.backgroundTertiary }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${percent ?? 0}%`,
                        backgroundColor: barColor,
                        opacity: online ? 1 : 0.45,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.h3,
  },
  summaryLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
  },
  chartList: {
    gap: spacing.xs,
  },
  chartRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  chartRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  robotId: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  chartRowBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  percentText: {
    ...typography.caption,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
