import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendRobotMqttDownlink } from '../../api/robotTracking';
import type { RobotTracking } from '../../types/robotTracking';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { appAlert } from '../../utils/appAlert';
import { formatDateTimeIST } from '../../utils/datetime';
import { isRobotOnline } from '../../utils/robot';
import {
  formatSeconds,
  getCleaningPercentage,
  getHighestTrackPoint,
  getRobotPhase,
} from '../../utils/robotTrackingHelpers';

type Props = {
  visible: boolean;
  robot: RobotTracking | null;
  isInternal: boolean;
  canCommand: boolean;
  onClose: () => void;
};

const COMMANDS = [
  { label: 'START', payload: '11', color: '#22c55e' },
  { label: 'STOP', payload: '14', color: '#ef4444' },
  { label: 'RETURN', payload: '15', color: '#38bdf8' },
] as const;

function badgeTone(badgeColor: string) {
  switch (badgeColor) {
    case 'success':
      return { bg: 'rgba(34,197,94,.15)', fg: '#22c55e' };
    case 'warning':
      return { bg: 'rgba(251,191,36,.15)', fg: '#fbbf24' };
    case 'danger':
      return { bg: 'rgba(239,68,68,.15)', fg: '#ef4444' };
    case 'primary':
      return { bg: 'rgba(56,189,248,.15)', fg: '#38bdf8' };
    default:
      return { bg: 'rgba(148,163,184,.15)', fg: '#94a3b8' };
  }
}

export function RobotTrackingDetailModal({
  visible,
  robot,
  isInternal,
  canCommand,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState<string | null>(null);

  const highestPoint = getHighestTrackPoint(robot?.track_details);
  const phaseInfo = useMemo(() => {
    if (!robot) {
      return { phase: '—', badgeColor: 'secondary' };
    }
    return getRobotPhase(
      highestPoint,
      Number(robot.row_length) || 1,
      robot.cleaning,
      robot.track_details || [],
    );
  }, [robot, highestPoint]);

  const progress = useMemo(() => {
    if (!robot) return { percentage: 0, distanceCovered: 0, totalDistance: 20 };
    return getCleaningPercentage(highestPoint, robot);
  }, [robot, highestPoint]);

  if (!robot) return null;

  const tone = badgeTone(phaseInfo.badgeColor);
  const cleaning = robot.cleaning || {};
  const online = isRobotOnline(robot.lora_state);
  const lastUplink = formatDateTimeIST(robot.last_uplink);

  const sendCommand = async (payload: string, label: string) => {
    if (!robot.deveui) {
      appAlert('Missing DevEUI', 'This robot has no DevEUI configured.');
      return;
    }
    setSending(payload);
    try {
      const message = await sendRobotMqttDownlink({
        deveui: robot.deveui,
        robot_no: robot.robot_no,
        site_id: robot.site_id,
        payload,
        lora_no: robot.lora_no,
      });
      appAlert('Command sent', message);
    } catch (err) {
      appAlert(
        'Command failed',
        err instanceof Error ? err.message : `Failed to send ${label}`,
      );
    } finally {
      setSending(null);
    }
  };

  const confirmSendCommand = (payload: string, label: string) => {
    if (sending != null) return;
    appAlert(
      `Send ${label}?`,
      `Are you sure you want to send ${label} to ${robot.robot_no}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: label === 'STOP' ? 'destructive' : 'default',
          onPress: () => {
            void sendCommand(payload, label);
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {robot.robot_no}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: online
                        ? 'rgba(34,197,94,.15)'
                        : 'rgba(239,68,68,.15)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: online ? '#22c55e' : '#ef4444' },
                    ]}
                  />
                  <Text
                    style={{
                      color: online ? '#22c55e' : '#ef4444',
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {robot.block || '—'} · {robot.site_id}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                Last uplink: {lastUplink}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, { color: tone.fg }]}>
                {phaseInfo.phase}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: 8 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Cleaning progress
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.backgroundTertiary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, progress.percentage))}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                {progress.percentage}%
                {isInternal
                  ? ` · ${progress.distanceCovered}/${progress.totalDistance}`
                  : ''}
              </Text>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textMuted }}>Status</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  {cleaning.finish
                    ? 'Finished'
                    : cleaning.cleaning_cancelled
                      ? 'Cancelled'
                      : cleaning.battery_dead
                        ? 'Battery Issue'
                        : cleaning.start
                          ? 'In Progress'
                          : 'At Dock'}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textMuted }}>Start</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
                  {cleaning.startAt
                    ? new Date(cleaning.startAt).toLocaleString()
                    : '—'}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textMuted }}>Finish</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
                  {cleaning.finishAt
                    ? new Date(cleaning.finishAt).toLocaleString()
                    : '—'}
                </Text>
              </View>
            </View>

            {canCommand && (
              <View style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Cleaning cycle control
                </Text>
                <View style={styles.commands}>
                  {COMMANDS.map((cmd) => (
                    <Pressable
                      key={cmd.payload}
                      style={[
                        styles.cmdBtn,
                        { borderColor: cmd.color, backgroundColor: `${cmd.color}22` },
                      ]}
                      disabled={sending != null}
                      onPress={() => confirmSendCommand(cmd.payload, cmd.label)}
                    >
                      {sending === cmd.payload ? (
                        <ActivityIndicator size="small" color={cmd.color} />
                      ) : (
                        <Text style={[styles.cmdText, { color: cmd.color }]}>
                          {cmd.label}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Robot info
              </Text>
              {[
                ['Status', online ? 'Online' : 'Offline'],
                ['Last uplink', lastUplink],
                ['DevEUI', robot.deveui || '—'],
                ['LoRa No', String(robot.lora_no ?? '—')],
                ['Row', String(robot.row_no ?? '—')],
                ['Length', `${(Number(robot.row_length) || 0) * 2} m`],
                ['Type', robot.robot_type || '—'],
              ].map(([label, value]) => (
                <View key={label} style={styles.rowBetween}>
                  <Text style={{ color: colors.textMuted }}>{label}</Text>
                  <Text
                    style={{
                      color:
                        label === 'Status'
                          ? online
                            ? '#22c55e'
                            : '#ef4444'
                          : colors.textPrimary,
                      fontWeight: label === 'Status' ? '700' : '400',
                      flexShrink: 1,
                      textAlign: 'right',
                    }}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            {cleaning.cleaning_mertic && (
              <View style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Cleaning metrics
                </Text>
                {[
                  ['Total time', formatSeconds(Number(cleaning.total_cleaning_time))],
                  ['Forward', formatSeconds(Number(cleaning.forward_cleaning_time))],
                  ['Reverse', formatSeconds(Number(cleaning.reverse_cleaning_time))],
                  ['Batt before', cleaning.battery_before_cleaning != null ? `${cleaning.battery_before_cleaning}%` : '—'],
                  ['Batt reverse', cleaning.battery_at_reverse_station != null ? `${cleaning.battery_at_reverse_station}%` : '—'],
                  ['Batt after', cleaning.battery_after_cleaning != null ? `${cleaning.battery_after_cleaning}%` : '—'],
                  ['Cycles', String(cleaning.cycle_count ?? '—')],
                ].map(([label, value]) => (
                  <View key={label} style={styles.rowBetween}>
                    <Text style={{ color: colors.textMuted }}>{label}</Text>
                    <Text style={{ color: colors.textPrimary }}>{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {isInternal && (robot.track_details?.length ?? 0) > 0 && (
              <View style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Track details
                </Text>
                {[...new Map(
                  (robot.track_details || []).map((t) => [t.point, t]),
                ).values()]
                  .sort((a, b) => a.point - b.point)
                  .map((td) => (
                    <View key={`${td.point}-${td.timestamp}`} style={styles.rowBetween}>
                      <Text style={{ color: colors.textPrimary }}>Point {td.point}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {new Date(td.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,.4)',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    maxWidth: 140,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  commands: {
    flexDirection: 'row',
    gap: 8,
  },
  cmdBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cmdText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
