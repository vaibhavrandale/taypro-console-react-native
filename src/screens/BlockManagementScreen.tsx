import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Navbar } from '../components/layout';
import { CompactCommandButton } from '../components/ui';
import { fetchRobotsBySiteAndBlock, sendMqttMulticastDownlink } from '../api/robots';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import type { ThemeColors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { RobotCommand } from '../types/robotOperating';
import { BlockRobotSummary } from '../types/robotSearch';
import { formatRobotTileCompact } from '../utils/blockSort';
import { getBatteryPercent, isRobotOnline } from '../utils/robot';
import type { DrawerParamList } from '../navigation/types';

type Route = RouteProp<DrawerParamList, 'BlockManagement'>;
type Navigation = DrawerNavigationProp<DrawerParamList, 'BlockManagement'>;

function getRobotTileTheme(online: boolean, colors: ThemeColors) {
  if (online) {
    return {
      backgroundColor: colors.badge.success.bg,
      borderColor: 'rgba(0, 201, 167, 0.28)',
      textColor: colors.badge.success.text,
      dividerColor: 'rgba(0, 201, 167, 0.22)',
    };
  }

  return {
    backgroundColor: colors.badge.error.bg,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    textColor: colors.badge.error.text,
    dividerColor: 'rgba(239, 68, 68, 0.18)',
  };
}

function isRobotRunning(lastStatus?: string) {
  const status = (lastStatus ?? '').toLowerCase();
  return (
    status.includes('clean') ||
    status.includes('run') ||
    status.includes('progress')
  );
}

function BlockStatCell({
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
    <View style={styles.blockStatCell}>
      <Text style={[styles.blockStatLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.blockStatValue, { color }]}>{value}</Text>
    </View>
  );
}

function SummaryStrip({
  online,
  offline,
  running,
  total,
}: {
  online: number;
  offline: number;
  running: number;
  total: number;
}) {
  const { colors } = useTheme();

  const items = [
    { label: 'Online', value: online, color: colors.primary },
    { label: 'Offline', value: offline, color: colors.danger },
    { label: 'Progress', value: running, color: colors.badge.warning.text },
    { label: 'Total', value: total, color: colors.badge.info.text },
  ];

  return (
    <View
      style={[
        styles.summaryStrip,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? (
            <View
              style={[styles.summaryDivider, { backgroundColor: colors.border }]}
            />
          ) : null}
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryCellValue, { color: item.color }]}>
              {item.value}
            </Text>
            <Text style={[styles.summaryCellLabel, { color: colors.textMuted }]}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function BlockManagementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { siteId, siteName, block } = route.params;

  const [robots, setRobots] = useState<BlockRobotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [bulkCommandLoading, setBulkCommandLoading] = useState<RobotCommand | null>(
    null,
  );

  const canSendCommands = user?.robot_command_access !== false;

  const loadRobots = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const data = await fetchRobotsBySiteAndBlock(siteId, block);
        setRobots(data);
      } catch (err) {
        setRobots([]);
        setError(err instanceof Error ? err.message : 'Failed to load robots');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId, block],
  );

  useEffect(() => {
    void loadRobots();
  }, [loadRobots]);

  const summary = useMemo(() => {
    const online = robots.filter((robot) => isRobotOnline(robot.lora_state)).length;
    const running = robots.filter((robot) => isRobotRunning(robot.last_status)).length;

    return {
      total: robots.length,
      online,
      offline: robots.length - online,
      running,
    };
  }, [robots]);

  const sortedRobots = useMemo(() => {
    return [...robots].sort((a, b) => {
      const onlineDiff =
        Number(isRobotOnline(b.lora_state)) - Number(isRobotOnline(a.lora_state));
      if (onlineDiff !== 0) return onlineDiff;

      return (a.robot_no ?? '').localeCompare(b.robot_no ?? '', undefined, {
        numeric: true,
      });
    });
  }, [robots]);

  const commandableRobots = useMemo(
    () => robots.filter((robot) => robot.deveui && robot.robot_no),
    [robots],
  );

  const sendBulkCommand = async (command: RobotCommand) => {
    const labels: Record<RobotCommand, string> = {
      start: 'Start All',
      stop: 'Stop All',
      return: 'Return All',
    };

    if (!commandableRobots.length) {
      Alert.alert(
        'No robots',
        'There are no robots with command details in this block.',
      );
      return;
    }

    setBulkCommandLoading(command);

    try {
      const result = await sendMqttMulticastDownlink(command, {
        siteId,
        block,
        robots: commandableRobots,
      });

      Alert.alert(
        'Command sent',
        result.message ||
          `${labels[command]} sent to ${commandableRobots.length} robot${commandableRobots.length === 1 ? '' : 's'}.`,
      );

      void loadRobots(true);
    } catch (err) {
      Alert.alert(
        'Command failed',
        err instanceof Error ? err.message : 'Failed to send block commands',
      );
    } finally {
      setBulkCommandLoading(null);
    }
  };

  const handleBulkCommand = (command: RobotCommand) => {
    if (!canSendCommands) {
      Alert.alert('Access denied', 'You do not have robot command access.');
      return;
    }

    const labels: Record<RobotCommand, string> = {
      start: 'Start All',
      stop: 'Stop All',
      return: 'Return All',
    };

    Alert.alert(
      labels[command],
      `Send ${labels[command].toLowerCase()} to ${commandableRobots.length} robot${commandableRobots.length === 1 ? '' : 's'} in ${block}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: labels[command],
          style: command === 'stop' ? 'destructive' : 'default',
          onPress: () => void sendBulkCommand(command),
        },
      ],
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <Pressable onPress={() => void loadRobots()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!robots.length) {
      return (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No robots found for this block.
        </Text>
      );
    }

    return (
      <View
        style={[
          styles.blockCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>
          {block}
        </Text>

        <View style={styles.blockStatsRow}>
          <BlockStatCell
            label="Total"
            value={summary.total}
            color={colors.badge.info.text}
          />
          <BlockStatCell
            label="Online"
            value={summary.online}
            color={colors.primary}
          />
          <BlockStatCell
            label="Running"
            value={summary.running}
            color={colors.badge.warning.text}
          />
          <BlockStatCell
            label="Offline"
            value={summary.offline}
            color={colors.danger}
          />
        </View>

        <View style={styles.robotGrid}>
          {sortedRobots.map((robot, index) => {
            const online = isRobotOnline(robot.lora_state);
            const battery = getBatteryPercent(robot.battery_voltage);
            const tileTheme = getRobotTileTheme(online, colors);
            const robotKey = robot.robot_no ?? robot.deveui ?? `robot-${index}`;

            return (
              <Pressable
                key={robotKey}
                onPress={() => {
                  if (!robot.robot_no) return;
                  navigation.navigate('RobotOperating', {
                    robotNo: robot.robot_no,
                    siteId,
                    siteName,
                    block,
                  });
                }}
                style={[
                  styles.robotTile,
                  {
                    backgroundColor: tileTheme.backgroundColor,
                    borderColor: tileTheme.borderColor,
                  },
                ]}
              >
                <Text
                  style={[styles.robotTileId, { color: tileTheme.textColor }]}
                  numberOfLines={1}
                >
                  {robot.robot_no
                    ? formatRobotTileCompact(robot.robot_no)
                    : '—'}
                </Text>
                <View
                  style={[
                    styles.robotTileDivider,
                    { backgroundColor: tileTheme.dividerColor },
                  ]}
                />
                <Text
                  style={[styles.robotTileBattery, { color: tileTheme.textColor }]}
                >
                  {battery != null ? `${battery}%` : '—'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.commandRow}>
          <CompactCommandButton
            label="Start"
            icon="play"
            onPress={() => handleBulkCommand('start')}
            loading={bulkCommandLoading === 'start'}
            disabled={!canSendCommands || bulkCommandLoading !== null}
          />
          <CompactCommandButton
            label="Stop"
            icon="stop"
            tone="danger"
            onPress={() => handleBulkCommand('stop')}
            loading={bulkCommandLoading === 'stop'}
            disabled={!canSendCommands || bulkCommandLoading !== null}
          />
          <CompactCommandButton
            label="Return"
            icon="return-down-back"
            onPress={() => handleBulkCommand('return')}
            loading={bulkCommandLoading === 'return'}
            disabled={!canSendCommands || bulkCommandLoading !== null}
          />
        </View>

        {!canSendCommands ? (
          <Text style={[styles.commandHint, { color: colors.textMuted }]}>
            Robot command access is not enabled for your account.
          </Text>
        ) : commandableRobots.length < robots.length ? (
          <Text style={[styles.commandHint, { color: colors.textMuted }]}>
            {robots.length - commandableRobots.length} robot
            {robots.length - commandableRobots.length === 1 ? '' : 's'} missing
            command details.
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Block Management"
        subtitle={`${block} · ${siteName ?? siteId}`}
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.navButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />

      <View style={styles.breadcrumbBar}>
        <Pressable
          onPress={() =>
            navigation.navigate('Blockwise', {
              siteId,
              siteName,
            })
          }
          style={styles.breadcrumbLink}
        >
          <Ionicons name="grid-outline" size={14} color={colors.primary} />
          <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
            All Blocks · {siteId}
          </Text>
        </Pressable>
      </View>

      <SummaryStrip
        online={summary.online}
        offline={summary.offline}
        running={summary.running}
        total={summary.total}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadRobots(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  breadcrumbLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  summaryCellValue: {
    ...typography.label,
    fontSize: 17,
    fontWeight: '700',
  },
  summaryCellLabel: {
    ...typography.caption,
    fontSize: 9,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    minHeight: 240,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  retryText: {
    ...typography.label,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingTop: spacing.xl,
  },
  blockCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  blockTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  blockStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockStatCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  blockStatLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  blockStatValue: {
    ...typography.label,
    fontSize: 14,
  },
  robotGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  robotTile: {
    width: '19%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingTop: spacing.xs,
    paddingBottom: 3,
    paddingHorizontal: 0,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  robotTileDivider: {
    width: '72%',
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  robotTileId: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  robotTileBattery: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  commandRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  commandHint: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
  },
});
