import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SiteRobot } from '../../types/siteDetails';
import { getBatteryPercent, isRobotOnline } from '../../utils/robot';
import { Badge } from '../ui/Badge';

type Props = {
  robot: SiteRobot;
};

export function RobotListItem({ robot }: Props) {
  const { colors } = useTheme();
  const percent = getBatteryPercent(robot.battery_voltage);
  const online = isRobotOnline(robot.lora_state);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.robotNo, { color: colors.textPrimary }]} numberOfLines={1}>
          {robot.robot_no}
        </Text>
        <Badge
          label={online ? 'Online' : 'Offline'}
          variant={online ? 'success' : 'neutral'}
          size="sm"
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Battery: {percent != null ? `${percent}%` : '—'}
        </Text>
        {robot.row_length != null ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Row: {robot.row_length}m
          </Text>
        ) : null}
      </View>

      <View style={[styles.track, { backgroundColor: colors.backgroundTertiary }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent ?? 0}%`,
              backgroundColor:
                percent == null
                  ? colors.textMuted
                  : percent < 40
                    ? colors.danger
                    : percent < 70
                      ? colors.badge.warning.text
                      : colors.primary,
              opacity: online ? 1 : 0.45,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  robotNo: {
    ...typography.label,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  meta: {
    ...typography.caption,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
