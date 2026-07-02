import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { Navbar, Screen } from "../components/layout";
import { fetchSiteManagement } from "../api/siteManagement";
import { useSiteDetails } from "../context/SiteDetailsContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { SiteBlock } from "../types/siteManagement";
import { formatRobotTileCompact, sortBlocksByName } from "../utils/blockSort";
import { getBatteryPercent, isRobotOnline } from "../utils/robot";
import type { DrawerParamList } from "../navigation/types";
import type { ThemeColors } from "../theme/colors";

type Route = RouteProp<DrawerParamList, "Blockwise">;
type Navigation = DrawerNavigationProp<DrawerParamList, "Blockwise">;

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
  onManage,
}: {
  block: SiteBlock;
  onManage: (blockName: string) => void;
}) {
  const { colors } = useTheme();

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
        {block.block_name}
      </Text>

      <View style={styles.blockStatsRow}>
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
            <View
              key={robot._id}
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
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={() => onManage(block.block_name)}
        style={[
          styles.manageButton,
          {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.manageButtonText, { color: colors.textPrimary }]}>
          MANAGE
        </Text>
      </Pressable>
    </View>
  );
}

export function BlockwiseScreen() {
  const { colors } = useTheme();
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

  const handleStopAll = () => {
    Alert.alert(
      "Stop All",
      "This action will stop all robots at the site. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop All", style: "destructive" },
      ],
    );
  };

  const handleManage = (blockName: string) => {
    Alert.alert(
      "Manage Block",
      `Block management for ${blockName} will be available soon.`,
    );
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <Text style={[styles.siteTitle, { color: colors.primary }]}>
        {siteTitle}
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => navigation.navigate("Robots")}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            All Robot Data
          </Text>
        </Pressable>
        <Pressable
          onPress={handleStopAll}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            Stop All
          </Text>
        </Pressable>
      </View>

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
            placeholder="Search Block..."
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
          <Text style={[styles.refreshButtonText, { color: colors.textPrimary }]}>
            Refresh
          </Text>
        </Pressable>
      </View>
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
            <BlockCard block={item} onManage={handleManage} />
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
    paddingBottom: spacing.md,
  },
  siteTitle: {
    ...typography.label,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionButtonText: {
    ...typography.label,
    fontSize: 11,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  refreshButtonText: {
    ...typography.label,
    fontSize: 11,
  },
  blockCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  blockTitle: {
    ...typography.label,
    fontSize: 13,
    textAlign: "center",
  },
  blockStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  },
  robotGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  robotTile: {
    width: "19%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingTop: spacing.xs,
    paddingBottom: 4,
    paddingHorizontal: 2,
    alignItems: "center",
    minHeight: 42,
    justifyContent: "center",
  },
  robotTileDivider: {
    width: "72%",
    height: StyleSheet.hairlineWidth,
    marginVertical: 3,
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
  manageButton: {
    alignSelf: "center",
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minWidth: 120,
    alignItems: "center",
  },
  manageButtonText: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 0.4,
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
