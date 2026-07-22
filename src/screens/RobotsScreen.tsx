import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Navbar } from "../components/layout";
import {
  RobotBatteryTableHeader,
  RobotBatteryTableRow,
} from "../components/robots/RobotBatteryTableRow";
import { Button, Input } from "../components/ui";
import { fetchBlockWiseRobotsBySite } from "../api/blockWiseRobots";
import { useSiteDetails } from "../context/SiteDetailsContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { BlockRobot, SiteManagementData } from "../types/blockWiseRobots";
import {
  getBatteryPercent,
  isRobotOnline,
  sortRobotsForDisplay,
} from "../utils/robot";

function SummaryStrip({
  avgBattery,
  online,
  lowBattery,
  total,
}: {
  avgBattery: number | null;
  online: number;
  lowBattery: number;
  total: number;
}) {
  const { colors } = useTheme();

  const items = [
    {
      label: "Avg Battery",
      value: avgBattery != null ? `${avgBattery}%` : "—",
      color: colors.badge.info.text,
    },
    { label: "Online", value: String(online), color: colors.primary },
    { label: "Low", value: String(lowBattery), color: colors.danger },
    { label: "Total", value: String(total), color: colors.textPrimary },
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
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />
          ) : null}
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: item.color }]}>
              {item.value}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function RobotsScreen() {
  const { colors } = useTheme();
  const { assignedSites, selectedSite, setSelectedSite } = useSiteDetails();

  const [data, setData] = useState<SiteManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadRobots = useCallback(async (siteId: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const result = await fetchBlockWiseRobotsBySite(siteId);
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load robots");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSite?.site_id) {
      setLoading(false);
      setData(null);
      return;
    }
    loadRobots(selectedSite.site_id);
  }, [selectedSite?.site_id, loadRobots]);

  const blockByRobotNo = useMemo(() => {
    const map = new Map<string, string>();
    for (const block of data?.blocks ?? []) {
      for (const robot of block.blockrobots) {
        map.set(robot.robot_no, block.block_name);
      }
    }
    return map;
  }, [data?.blocks]);

  const allRobots = useMemo(() => {
    return (data?.robots ?? []).map((robot) => ({
      ...robot,
      block: robot.block ?? blockByRobotNo.get(robot.robot_no),
    }));
  }, [data?.robots, blockByRobotNo]);

  const summary = useMemo(() => {
    const batteries = allRobots
      .map((robot) => getBatteryPercent(robot.battery_voltage))
      .filter((value): value is number => value != null);
    const avgBattery =
      batteries.length > 0
        ? Math.round(
            batteries.reduce((sum, value) => sum + value, 0) / batteries.length,
          )
        : null;
    const online = allRobots.filter((robot) =>
      isRobotOnline(robot.lora_state),
    ).length;
    const lowBattery = allRobots.filter((robot) => {
      const percent = getBatteryPercent(robot.battery_voltage);
      return percent != null && percent < 40;
    }).length;

    return {
      total: allRobots.length,
      online,
      offline: allRobots.length - online,
      lowBattery,
      avgBattery,
    };
  }, [allRobots]);

  const filteredRobots = useMemo(() => {
    const query = search.trim().toLowerCase();
    let robots = allRobots;

    if (query) {
      robots = robots.filter((robot) => {
        const robotNo = robot.robot_no.toLowerCase();
        const block = (robot.block ?? "").toLowerCase();
        const status = (robot.last_status ?? "").toLowerCase();
        return (
          robotNo.includes(query) ||
          block.includes(query) ||
          status.includes(query)
        );
      });
    }

    return sortRobotsForDisplay(
      robots as Parameters<typeof sortRobotsForDisplay>[0],
    ) as BlockRobot[];
  }, [allRobots, search]);

  const renderRobot = ({
    item,
    index,
  }: {
    item: BlockRobot;
    index: number;
  }) => (
    <View
      style={[
        styles.tableRowShell,
        {
          borderColor: colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
    >
      <RobotBatteryTableRow robot={item} block={item.block} index={index + 1} />
    </View>
  );

  const header = (
    <View style={styles.headerContent}>
      {assignedSites.length > 1 ? (
        <View style={styles.sitePickerRow}>
          {assignedSites.map((site) => {
            const active = site.site_id === selectedSite?.site_id;
            return (
              <Pressable
                key={site.site_id}
                onPress={() => setSelectedSite(site)}
                style={[
                  styles.siteChip,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.backgroundTertiary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.siteChipText,
                    { color: active ? "#101936" : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {site.site_id}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {data ? (
        <>
          <Text
            style={[styles.siteTitle, { color: colors.primary }]}
            numberOfLines={2}
          >
            {data.site_name}
          </Text>
          {data.location ? (
            <Text
              style={[styles.siteLocation, { color: colors.textSecondary }]}
            >
              {data.location}
            </Text>
          ) : null}
        </>
      ) : null}

      <SummaryStrip
        avgBattery={summary.avgBattery}
        online={summary.online}
        lowBattery={summary.lowBattery}
        total={summary.total}
      />

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Input
            placeholder="Search robot, block, or status..."
            value={search}
            onChangeText={setSearch}
            leftIcon="search-outline"
            style={styles.searchInput}
          />
        </View>
        <Button
          title="Refresh"
          onPress={() =>
            selectedSite?.site_id && loadRobots(selectedSite.site_id, true)
          }
          icon="refresh-outline"
          size="sm"
          variant="outline"
        />
      </View>

      <Text style={[styles.resultCount, { color: colors.textMuted }]}>
        {filteredRobots.length} of {allRobots.length} robots
      </Text>

      <View
        style={[
          styles.tableCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <RobotBatteryTableHeader />
      </View>
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Robot Battery"
        subtitle={selectedSite?.site_id || "Fleet"}
      />

      {assignedSites.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            No assigned site found.
          </Text>
        </View>
      ) : loading && !data ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading robot battery data...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Button
            title="Retry"
            onPress={() =>
              selectedSite?.site_id && loadRobots(selectedSite.site_id)
            }
            variant="outline"
          />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredRobots}
          keyExtractor={(item) => item._id ?? item.robot_no}
          renderItem={renderRobot}
          ListHeaderComponent={header}
          contentContainerStyle={[
            styles.listContent,
            filteredRobots.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                selectedSite?.site_id && loadRobots(selectedSite.site_id, true)
              }
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No robots match your search.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  sitePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  siteChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  siteChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  siteTitle: {
    ...typography.h3,
    textAlign: "center",
  },
  siteLocation: {
    ...typography.bodySmall,
    textAlign: "center",
    marginTop: -spacing.xs,
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
  summaryValue: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  resultCount: {
    ...typography.caption,
  },
  tableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: "hidden",
  },
  tableRowShell: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    ...typography.bodySmall,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
    padding: spacing.xl,
  },
});
