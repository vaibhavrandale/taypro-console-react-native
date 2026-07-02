import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BlockRobot } from '../../types/blockWiseRobots';
import { ThemeColors } from '../../theme/colors';
import { getBatteryPercent, isRobotOnline } from '../../utils/robot';
import { Badge } from '../ui/Badge';

type Props = {
  robot: BlockRobot;
  block?: string;
  index: number;
};

function getBatteryColor(
  percent: number | null,
  online: boolean,
  colors: ThemeColors,
) {
  if (percent == null) return colors.textMuted;
  if (!online) return colors.textMuted;
  if (percent < 40) return colors.danger;
  if (percent < 70) return colors.badge.warning.text;
  return colors.primary;
}

export function RobotBatteryTableRow({ robot, block, index }: Props) {
  const { colors } = useTheme();
  const percent = getBatteryPercent(robot.battery_voltage);
  const online = isRobotOnline(robot.lora_state);
  const batteryColor = getBatteryColor(percent, online, colors);
  const blockLabel = block ?? robot.block ?? '—';

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.colIndex, { color: colors.textMuted }]}>
        {index}
      </Text>

      <Text
        style={[styles.colRobot, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {robot.robot_no}
      </Text>

      <Text
        style={[styles.colBlock, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {blockLabel}
      </Text>

      <View style={styles.colBattery}>
        <Text style={[styles.batteryValue, { color: batteryColor }]}>
          {percent != null ? `${percent}%` : '—'}
        </Text>
        <View
          style={[styles.batteryTrack, { backgroundColor: colors.backgroundTertiary }]}
        >
          <View
            style={[
              styles.batteryFill,
              {
                width: `${percent ?? 0}%`,
                backgroundColor: batteryColor,
                opacity: online ? 1 : 0.4,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.colStatus}>
        <Badge
          label={online ? 'Online' : 'Offline'}
          variant={online ? 'success' : 'neutral'}
          size="sm"
        />
      </View>
    </View>
  );
}

export function RobotBatteryTableHeader() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.backgroundTertiary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.colIndex, styles.headerText, { color: colors.textMuted }]}>
        #
      </Text>
      <Text style={[styles.colRobot, styles.headerText, { color: colors.textMuted }]}>
        Robot
      </Text>
      <Text style={[styles.colBlock, styles.headerText, { color: colors.textMuted }]}>
        Block
      </Text>
      <Text style={[styles.colBattery, styles.headerText, { color: colors.textMuted }]}>
        Battery
      </Text>
      <Text style={[styles.colStatus, styles.headerText, { color: colors.textMuted }]}>
        Status
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  colIndex: {
    width: 24,
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  colRobot: {
    flex: 2,
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  colBlock: {
    flex: 1.3,
    ...typography.caption,
    fontSize: 10,
  },
  colBattery: {
    flex: 1.5,
    gap: 4,
  },
  batteryValue: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  batteryTrack: {
    height: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  colStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
