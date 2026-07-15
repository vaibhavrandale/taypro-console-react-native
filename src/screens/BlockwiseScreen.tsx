import React, { useCallback, useEffect, useMemo, useState } from "react";
import { appAlert } from '../utils/appAlert';
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
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { Navbar, Screen } from "../components/layout";
import { CompactCommandButton } from "../components/ui";
import { fetchRobotsBySiteAndBlock, sendMqttMulticastDownlink } from "../api/robots";
import { fetchSiteManagement } from "../api/siteManagement";
import { useAuth } from "../context/AuthContext";
import { useSiteDetails } from "../context/SiteDetailsContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { RobotCommand } from "../types/robotOperating";
import { SiteBlock } from "../types/siteManagement";
import { formatRobotTileCompact, sortBlocksByName } from "../utils/blockSort";
import { getBatteryPercent, isRobotOnline } from "../utils/robot";
import type { DrawerParamList } from "../navigation/types";
import type { ThemeColors } from "../theme/colors";

type Route = RouteProp<DrawerParamList, "Blockwise">;
type Navigation = DrawerNavigationProp<DrawerParamList, "Blockwise">;

type BulkLoadingState = {
  blockName: string;
  command: RobotCommand;
} | null;

function getRobotTileTheme(online: boolean, colors: ThemeColors) {
  if (online) {
    return {
      backgroundColor: colors.badge.success.bg,
      borderColor: "rgba(0, 201, 167, 0.28)",
      textColor: colors.badge.success.text,
      dividerColor: "rgba(0, 201, 167, 0.22)",
    };
  }

  return {
    backgroundColor: colors.badge.error.bg,
    borderColor: "rgba(239, 68, 68, 0.22)",
    textColor: colors.badge.error.text,
    dividerColor: "rgba(239, 68, 68, 0.18)",
  };
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
    { label: "Online", value: online, color: colors.primary },
    { label: "Offline", value: offline, color: colors.danger },
    { label: "Progress", value: running, color: colors.badge.warning.text },
    { label: "Total", value: total, color: colors.badge.info.text },
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

function BlockCard({
  block,
  siteId,
  canSendCommands,
  bulkLoading,
  onBulkCommand,
  onRobotPress,
}: {
  block: SiteBlock;
  siteId: string;
  canSendCommands: boolean;
  bulkLoading: BulkLoadingState;
  onBulkCommand: (blockName: string, command: RobotCommand) => void;
  onRobotPress: (robotNo: string, blockName: string) => void;
}) {
  const { colors } = useTheme();
  const isThisBlockLoading = bulkLoading?.blockName === block.block_name;
  const loadingCommand = isThisBlockLoading ? bulkLoading?.command : null;

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
      <View style={styles.blockHeader}>
        <View style={styles.blockTitleWrap}>
          <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>
            {block.block_name}
          </Text>
          <Text style={[styles.blockSubtitle, { color: colors.textMuted }]}>
            {block.total_robot_count} robots
          </Text>
        </View>
        <View
          style={[
            styles.onlinePill,
            {
              backgroundColor: colors.badge.success.bg,
              borderColor: "rgba(0, 201, 167, 0.25)",
            },
          ]}
        >
          <View
            style={[styles.onlineDot, { backgroundColor: colors.primary }]}
          />
          <Text style={[styles.onlinePillText, { color: colors.primary }]}>
            {block.online} online
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.blockStatsPanel,
          {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <BlockStatCell
          label="Total"
          value={block.total_robot_count}
          color={colors.badge.info.text}
        />
        <BlockStatCell
          label="Online"
          value={block.online}
          color={colors.primary}
        />
        <BlockStatCell
          label="Running"
          value={block.running}
          color={colors.badge.warning.text}
        />
        <BlockStatCell
          label="Offline"
          value={block.offline}
          color={colors.danger}
        />
      </View>

      <View style={styles.robotGrid}>
        {block.blockrobots.map((robot) => {
          const online = isRobotOnline(robot.lora_state);
          const battery = getBatteryPercent(robot.battery_voltage);
          const tileTheme = getRobotTileTheme(online, colors);

          return (
            <Pressable
              key={robot._id}
              onPress={() => {
                if (robot.robot_no) {
                  onRobotPress(robot.robot_no, block.block_name);
                }
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
                {formatRobotTileCompact(robot.robot_no)}
              </Text>
              <View
                style={[
                  styles.robotTileDivider,
                  { backgroundColor: tileTheme.dividerColor },
                ]}
              />
              <Text
                style={[
                  styles.robotTileBattery,
                  { color: tileTheme.textColor },
                ]}
              >
                {battery != null ? `${battery}%` : "—"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[styles.commandDivider, { backgroundColor: colors.border }]}
      />

      <View style={styles.commandRow}>
        <CompactCommandButton
          label="Start"
          icon="play"
          onPress={() => onBulkCommand(block.block_name, "start")}
          loading={loadingCommand === "start"}
          disabled={!canSendCommands || bulkLoading !== null}
        />
        <CompactCommandButton
          label="Stop"
          icon="stop"
          tone="danger"
          onPress={() => onBulkCommand(block.block_name, "stop")}
          loading={loadingCommand === "stop"}
          disabled={!canSendCommands || bulkLoading !== null}
        />
        <CompactCommandButton
          label="Return"
          icon="return-down-back"
          onPress={() => onBulkCommand(block.block_name, "return")}
          loading={loadingCommand === "return"}
          disabled={!canSendCommands || bulkLoading !== null}
        />
      </View>
    </View>
  );
}

export function BlockwiseScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { selectedSite } = useSiteDetails();

  const siteId = route.params?.siteId ?? selectedSite?.site_id ?? "";
  const fallbackSiteName = route.params?.siteName ?? selectedSite?.site_name;

  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchSiteManagement>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [bulkLoading, setBulkLoading] = useState<BulkLoadingState>(null);

  const canSendCommands = user?.robot_command_access !== false;

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!siteId) {
        setData(null);
        setError("No site selected");
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await fetchSiteManagement(siteId);
        setData(result);
      } catch (err) {
        setData(null);
        setError(
          err instanceof Error ? err.message : "Failed to load blockwise data",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    if (!data?.blocks?.length) {
      return { online: 0, offline: 0, running: 0, total: 0 };
    }

    return data.blocks.reduce(
      (acc, block) => ({
        online: acc.online + block.online,
        offline: acc.offline + block.offline,
        running: acc.running + block.running,
        total: acc.total + block.total_robot_count,
      }),
      { online: 0, offline: 0, running: 0, total: 0 },
    );
  }, [data]);

  const filteredBlocks = useMemo(() => {
    const blocks = sortBlocksByName(data?.blocks ?? []);
    const query = search.trim().toLowerCase();
    if (!query) return blocks;
    return blocks.filter((block) =>
      block.block_name.toLowerCase().includes(query),
    );
  }, [data, search]);

  const siteTitle = useMemo(() => {
    const name = data?.site_name || fallbackSiteName || "Site";
    const location = data?.location?.replace(",", ", ") ?? "";
    return location ? `${name}, ${location}` : name;
  }, [data, fallbackSiteName]);

  const sendBlockBulkCommand = async (
    blockName: string,
    command: RobotCommand,
  ) => {
    setBulkLoading({ blockName, command });

    try {
      const robots = await fetchRobotsBySiteAndBlock(siteId, blockName);
      const commandable = robots.filter((robot) => robot.deveui && robot.robot_no);

      if (!commandable.length) {
        appAlert(
          "No robots",
          `No robots with command details in ${blockName}.`,
        );
        return;
      }

      const labels: Record<RobotCommand, string> = {
        start: "Start All",
        stop: "Stop All",
        return: "Return All",
      };

      const result = await sendMqttMulticastDownlink(command, {
        siteId,
        block: blockName,
        robots: commandable,
      });

      appAlert(
        "Command sent",
        result.message ||
          `${labels[command]} sent to ${commandable.length} robot${commandable.length === 1 ? "" : "s"}.`,
      );

      void loadData(true);
    } catch (err) {
      appAlert(
        "Command failed",
        err instanceof Error ? err.message : "Failed to send block commands",
      );
    } finally {
      setBulkLoading(null);
    }
  };

  const handleBulkCommand = (blockName: string, command: RobotCommand) => {
    if (!canSendCommands) {
      appAlert("Access denied", "You do not have robot command access.");
      return;
    }

    const labels: Record<RobotCommand, string> = {
      start: "Start All",
      stop: "Stop All",
      return: "Return All",
    };

    const block = data?.blocks.find((item) => item.block_name === blockName);
    const robotCount = block?.total_robot_count ?? 0;

    appAlert(
      `${labels[command]} · ${blockName}`,
      `Send ${labels[command].toLowerCase()} to robots in ${blockName}? (${robotCount} robots)`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: labels[command],
          style: command === "stop" ? "destructive" : "default",
          onPress: () => void sendBlockBulkCommand(blockName, command),
        },
      ],
    );
  };

  const handleRobotPress = (robotNo: string, blockName: string) => {
    navigation.navigate("RobotOperating", {
      robotNo,
      siteId,
      siteName: fallbackSiteName,
      block: blockName,
    });
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <View
        style={[
          styles.siteCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.siteIconWrap,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.siteCardText}>
          <Text style={[styles.siteTitle, { color: colors.textPrimary }]}>
            {siteTitle}
          </Text>
          <Text style={[styles.siteMeta, { color: colors.textMuted }]}>
            Site ID · {siteId}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate("Robots")}
        style={[
          styles.secondaryAction,
          {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="battery-half-outline" size={14} color={colors.primary} />
        <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
          View all robot battery data
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>

      <SummaryStrip
        online={summary.online}
        offline={summary.offline}
        running={summary.running}
        total={summary.total}
      />

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInputWrap,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Ionicons name="search" size={14} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search blocks..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={6}>
              <Ionicons
                name="close-circle"
                size={14}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => loadData(true)}
          style={[
            styles.refreshButton,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Blocks
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
          {filteredBlocks.length}
        </Text>
      </View>

      {!canSendCommands ? (
        <Text style={[styles.permissionHint, { color: colors.textMuted }]}>
          Robot command access is not enabled for your account.
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Blockwise"
        subtitle={siteId || undefined}
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <Screen scroll>
          {listHeader}
          <View
            style={[
              styles.messageCard,
              {
                backgroundColor: colors.badge.error.bg,
                borderColor: colors.danger,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.messageText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        </Screen>
      ) : (
        <FlatList
          data={filteredBlocks}
          keyExtractor={(item) => item.block_name}
          renderItem={({ item }) => (
            <BlockCard
              block={item}
              siteId={siteId}
              canSendCommands={canSendCommands}
              bulkLoading={bulkLoading}
              onBulkCommand={handleBulkCommand}
              onRobotPress={handleRobotPress}
            />
          )}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {search.trim()
                ? "No blocks match your search."
                : "No blocks found for this site."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerContent: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  siteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  siteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  siteCardText: {
    flex: 1,
    gap: 2,
  },
  siteTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  siteMeta: {
    ...typography.caption,
    fontSize: 11,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryActionText: {
    ...typography.label,
    fontSize: 12,
    flex: 1,
  },
  summaryStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
  },
  summaryCellLabel: {
    ...typography.caption,
    fontSize: 9,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 12,
    paddingVertical: spacing.xs,
  },
  refreshButton: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCount: {
    ...typography.caption,
    fontSize: 12,
  },
  permissionHint: {
    ...typography.caption,
    fontSize: 11,
    textAlign: "center",
  },
  blockCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  blockTitleWrap: {
    flex: 1,
    gap: 2,
  },
  blockTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "700",
  },
  blockSubtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlinePillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
  },
  blockStatsPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  blockStatCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  blockStatLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  blockStatValue: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
  },
  robotGrid: {
    flexDirection: "row",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  robotTile: {
    width: "19%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingTop: spacing.xs,
    paddingBottom: 3,
    paddingHorizontal: 0,
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },
  robotTileDivider: {
    width: "72%",
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  robotTileId: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  robotTileBattery: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },
  commandDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  commandRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  messageText: {
    ...typography.body,
    flex: 1,
    fontSize: 12,
  },
  emptyText: {
    ...typography.body,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
