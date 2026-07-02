import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BlockRobot } from '../../types/blockWiseRobots';
import { getBatteryPercent, isRobotOnline } from '../../utils/robot';

type Props = {
  robot: BlockRobot;
};

export function RobotTile({ robot }: Props) {
  const { colors } = useTheme();
  const online = isRobotOnline(robot.lora_state);
  const percent = getBatteryPercent(robot.battery_voltage);

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: online ? 'rgba(0, 201, 167, 0.18)' : 'rgba(239, 68, 68, 0.18)',
          borderColor: online ? colors.primary : colors.danger,
        },
      ]}
    >
      <Text
        style={[styles.robotNo, { color: online ? colors.primary : colors.danger }]}
        numberOfLines={1}
      >
        {robot.robot_no}
      </Text>
      <Text style={[styles.percent, { color: colors.textPrimary }]}>
        {percent != null ? `${percent}%` : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '18%',
    minWidth: 54,
    maxWidth: 72,
    aspectRatio: 1.05,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  robotNo: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  percent: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
});
