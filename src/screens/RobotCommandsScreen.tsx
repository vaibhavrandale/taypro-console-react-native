import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Navbar } from '../components/layout';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { CompactCommandButton } from '../components/ui';
import {
  fetchRobotsBySite,
  sendMqttMulticastDownlink,
} from '../api/robots';
import { useAuth } from '../context/AuthContext';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import type { AssignedSite } from '../types/auth';
import type { RobotCommand } from '../types/robotOperating';
import type { BlockRobotSummary } from '../types/robotSearch';
import { useTheme } from '../theme';
import type { ThemeColors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { appAlert } from '../utils/appAlert';
import { isRobotOnline } from '../utils/robot';

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

function robotKey(robot: BlockRobotSummary) {
  return robot.deveui || robot.robot_no || '';
}

function getTileTheme(online: boolean, colors: ThemeColors) {
  if (online) {
    return {
      backgroundColor: colors.badge.success.bg,
      borderColor: 'rgba(0, 201, 167, 0.28)',
      textColor: colors.badge.success.text,
    };
  }
  return {
    backgroundColor: colors.badge.error.bg,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    textColor: colors.badge.error.text,
  };
}

const COMMAND_LABELS: Record<RobotCommand, string> = {
  start: 'START',
  stop: 'STOP',
  return: 'RETURN TO DOCK',
};

export function RobotCommandsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const bottomPad = useContentBottomPadding(spacing.xl);

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const canSendCommands = user?.robot_command_access !== false;

  const [siteId, setSiteId] = useState('');
  const [search, setSearch] = useState('');
  const [robots, setRobots] = useState<BlockRobotSummary[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState<RobotCommand | null>(null);
  const [error, setError] = useState('');

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );

  useEffect(() => {
    if (!siteId && assignedSites[0]?.site_id) {
      setSiteId(assignedSites[0].site_id);
    }
  }, [assignedSites, siteId]);

  const loadRobots = useCallback(
    async (isRefresh = false) => {
      if (!siteId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const data = await fetchRobotsBySite(siteId);
        setRobots(data);
        setSelectedKeys([]);
      } catch (err) {
        setRobots([]);
        setError(
          err instanceof Error ? err.message : 'Failed to load robots',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId],
  );

  useEffect(() => {
    void loadRobots();
  }, [loadRobots]);

  const filteredRobots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return robots;
    return robots.filter((robot) => {
      const no = (robot.robot_no ?? '').toLowerCase();
      const block = (robot.block ?? '').toLowerCase();
      return no.includes(q) || block.includes(q);
    });
  }, [robots, search]);

  const selectedRobots = useMemo(
    () =>
      robots.filter((robot) => selectedKeys.includes(robotKey(robot))),
    [robots, selectedKeys],
  );

  const toggleRobot = (robot: BlockRobotSummary) => {
    const key = robotKey(robot);
    if (!key) return;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const selectAllVisible = () => {
    const keys = filteredRobots
      .map(robotKey)
      .filter(Boolean);
    setSelectedKeys((prev) => Array.from(new Set([...prev, ...keys])));
  };

  const clearSelection = () => setSelectedKeys([]);

  const sendCommand = async (command: RobotCommand) => {
    if (!siteId || !selectedRobots.length) return;

    setSending(command);
    try {
      // Match web: site-wide multicast uses a placeholder block when selection spans blocks
      const result = await sendMqttMulticastDownlink(command, {
        siteId,
        block: 'Random Block',
        robots: selectedRobots,
      });
      appAlert(
        'Command sent',
        result.message ||
          `${COMMAND_LABELS[command]} sent to ${selectedRobots.length} robot${selectedRobots.length === 1 ? '' : 's'}.`,
      );
      setSelectedKeys([]);
    } catch (err) {
      appAlert(
        'Command failed',
        err instanceof Error ? err.message : 'Failed to send command',
      );
    } finally {
      setSending(null);
    }
  };

  const confirmCommand = (command: RobotCommand) => {
    if (!canSendCommands) {
      appAlert('Access denied', 'You do not have robot command access.');
      return;
    }
    if (!selectedRobots.length) {
      appAlert('Select robots', 'Please select at least one robot.');
      return;
    }

    appAlert(
      `Send ${COMMAND_LABELS[command]}?`,
      `Send ${COMMAND_LABELS[command]} to ${selectedRobots.length} robot${selectedRobots.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: command === 'stop' ? 'destructive' : 'default',
          onPress: () => void sendCommand(command),
        },
      ],
    );
  };

  const onlineCount = filteredRobots.filter((r) =>
    isRobotOnline(Number(r.lora_state)),
  ).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Navbar title="Robot Commands" showRobotActivity={false} />

      <View style={styles.filters}>
        <UptimeSelectField
          label="Site"
          value={siteId}
          options={siteOptions}
          onChange={(value) => {
            setSiteId(String(value));
            setSearch('');
            setSelectedKeys([]);
          }}
          compact
        />
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search robot no or block…"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.toolbar}>
        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {filteredRobots.length} robots · {onlineCount} online
          {selectedKeys.length > 0 ? ` · ${selectedKeys.length} selected` : ''}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable onPress={selectAllVisible} hitSlop={8}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Select all
            </Text>
          </Pressable>
          {selectedKeys.length > 0 ? (
            <Pressable onPress={clearSelection} hitSlop={8}>
              <Text style={[styles.link, { color: colors.danger }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {selectedKeys.length > 0 ? (
        <View
          style={[
            styles.commandBar,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.commandRow}>
            <CompactCommandButton
              label="START"
              icon="play"
              onPress={() => confirmCommand('start')}
              loading={sending === 'start'}
              disabled={sending != null}
              filled
            />
            <CompactCommandButton
              label="STOP"
              icon="stop"
              tone="danger"
              onPress={() => confirmCommand('stop')}
              loading={sending === 'stop'}
              disabled={sending != null}
            />
            <CompactCommandButton
              label="RETURN"
              icon="return-down-back"
              onPress={() => confirmCommand('return')}
              loading={sending === 'return'}
              disabled={sending != null}
            />
          </View>
          <View style={styles.chipWrap}>
            {selectedRobots.slice(0, 8).map((robot) => (
              <View
                key={robotKey(robot)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {robot.robot_no}
                </Text>
                {robot.block ? (
                  <Text style={[styles.chipBlock, { color: colors.textMuted }]}>
                    {robot.block}
                  </Text>
                ) : null}
              </View>
            ))}
            {selectedRobots.length > 8 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                +{selectedRobots.length - 8} more
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable onPress={() => void loadRobots()} style={styles.retry}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRobots}
          keyExtractor={(item, index) => robotKey(item) || String(index)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad },
            filteredRobots.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadRobots(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {siteId ? 'No robots found' : 'Select a site'}
            </Text>
          }
          renderItem={({ item }) => {
            const online = isRobotOnline(Number(item.lora_state));
            const theme = getTileTheme(online, colors);
            const selected = selectedKeys.includes(robotKey(item));

            return (
              <Pressable
                onPress={() => toggleRobot(item)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.backgroundColor,
                    borderColor: selected ? colors.primary : theme.borderColor,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.textColor,
                      backgroundColor: selected
                        ? colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  ) : null}
                </View>
                <Text
                  style={[styles.tileNo, { color: theme.textColor }]}
                  numberOfLines={1}
                >
                  {item.robot_no || '—'}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countText: {
    ...typography.caption,
    fontSize: 12,
    flexShrink: 1,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  commandBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  commandRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipBlock: {
    fontSize: 10,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNo: {
    ...typography.label,
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
