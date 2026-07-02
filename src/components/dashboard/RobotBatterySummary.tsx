import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { SiteRobot } from "../../types/siteDetails";
import {
  getBatteryPercent,
  isRobotOnline,
  sortRobotsForDisplay,
} from "../../utils/robot";
import { Badge } from "../ui/Badge";

const PREVIEW_LIMIT = 5;

type Bucket = {
  label: string;
  count: number;
  color: string;
};

type Props = {
  robots: SiteRobot[];
  onViewAll?: () => void;
};

export function RobotBatterySummary({ robots, onViewAll }: Props) {
  const { colors } = useTheme();

  const summary = useMemo(() => {
    const online = robots.filter((r) => isRobotOnline(r.lora_state)).length;
    const batteries = robots
      .map((r) => getBatteryPercent(r.battery_voltage))
      .filter((v): v is number => v != null);
    const avg =
      batteries.length > 0
        ? Math.round(
            batteries.reduce((sum, v) => sum + v, 0) / batteries.length,
          )
        : null;
    const low = robots.filter((r) => {
      const p = getBatteryPercent(r.battery_voltage);
      return p != null && p < 40;
    }).length;

    return { online, offline: robots.length - online, avg, low };
  }, [robots]);

  const buckets = useMemo<Bucket[]>(() => {
    const counts = { high: 0, medium: 0, low: 0, unknown: 0 };
    for (const robot of robots) {
      const percent = getBatteryPercent(robot.battery_voltage);
      if (percent == null) counts.unknown += 1;
      else if (percent >= 70) counts.high += 1;
      else if (percent >= 40) counts.medium += 1;
      else counts.low += 1;
    }
    return [
      { label: "≥70%", count: counts.high, color: colors.primary },
      {
        label: "40–69%",
        count: counts.medium,
        color: colors.badge.warning.text,
      },
      { label: "<40%", count: counts.low, color: colors.danger },
      { label: "N/A", count: counts.unknown, color: colors.textMuted },
    ];
  }, [robots, colors]);

  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  const attentionRobots = useMemo(() => {
    return sortRobotsForDisplay(robots)
      .filter((robot) => {
        const online = isRobotOnline(robot.lora_state);
        const percent = getBatteryPercent(robot.battery_voltage);
        return !online || (percent != null && percent < 40);
      })
      .slice(0, PREVIEW_LIMIT);
  }, [robots]);

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryItem,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {summary.avg != null ? `${summary.avg}%` : "—"}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Avg battery
          </Text>
        </View>
        <View
          style={[
            styles.summaryItem,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {summary.online}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Online
          </Text>
        </View>
        <View
          style={[
            styles.summaryItem,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {summary.low}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Low battery
          </Text>
        </View>
      </View>

      <Text style={[styles.distributionTitle, { color: colors.textSecondary }]}>
        Battery distribution
      </Text>
      <View style={styles.distribution}>
        {buckets.map((bucket) => (
          <View key={bucket.label} style={styles.bucketRow}>
            <Text style={[styles.bucketLabel, { color: colors.textMuted }]}>
              {bucket.label}
            </Text>
            <View
              style={[
                styles.bucketTrack,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <View
                style={[
                  styles.bucketFill,
                  {
                    width: `${(bucket.count / maxBucket) * 100}%`,
                    backgroundColor: bucket.color,
                    minWidth: bucket.count > 0 ? 4 : 0,
                  },
                ]}
              />
            </View>
            <Text style={[styles.bucketCount, { color: colors.textPrimary }]}>
              {bucket.count}
            </Text>
          </View>
        ))}
      </View>

      {attentionRobots.length > 0 ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
            Needs attention ({Math.min(attentionRobots.length, PREVIEW_LIMIT)}{" "}
            shown)
          </Text>
          {attentionRobots.map((robot) => {
            const percent = getBatteryPercent(robot.battery_voltage);
            const online = isRobotOnline(robot.lora_state);
            return (
              <View
                key={robot.robot_no}
                style={[
                  styles.previewRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.previewId, { color: colors.textPrimary }]}>
                  {robot.robot_no}
                </Text>

                <View style={styles.previewBadges}>
                  {!online ? (
                    <Badge label="Offline" variant="neutral" size="sm" />
                  ) : null}
                  {percent != null && percent < 40 ? (
                    <Badge label={`${percent}%`} variant="error" size="sm" />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.allGood, { color: colors.textMuted }]}>
          All robots are online with healthy battery levels.
        </Text>
      )}

      {robots.length > 0 && onViewAll ? (
        <Pressable
          onPress={onViewAll}
          accessibilityRole="button"
          accessibilityLabel={`View all ${robots.length} robots`}
          style={({ pressed }) => [
            styles.viewAllButton,
            { borderColor: colors.primary },
            pressed && styles.viewAllPressed,
          ]}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View all {robots.length} robots
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  summaryItem: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
  },
  summaryValue: {
    ...typography.label,
    fontSize: 14,
  },
  summaryLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  distributionTitle: {
    ...typography.caption,
    fontWeight: "600",
  },
  distribution: {
    gap: spacing.xs,
  },
  bucketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bucketLabel: {
    ...typography.caption,
    width: 48,
  },
  bucketTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  bucketFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  bucketCount: {
    ...typography.caption,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
  previewSection: {
    gap: spacing.xs,
  },
  previewTitle: {
    ...typography.caption,
    fontWeight: "600",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewId: {
    ...typography.bodySmall,
    fontWeight: "600",
    flex: 1,
  },
  previewBadges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  allGood: {
    ...typography.bodySmall,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  viewAllPressed: {
    opacity: 0.75,
  },
  viewAllText: {
    ...typography.label,
  },
});
