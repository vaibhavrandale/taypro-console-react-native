import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Navbar, Screen } from "../components/layout";
import { RobotBatterySummary } from "../components/dashboard/RobotBatterySummary";
import { GatewayMapCard } from "../components/dashboard/GatewayMapCard";
import { WeatherCard } from "../components/dashboard/WeatherCard";
import { Badge } from "../components/ui";
import { useSiteDetails } from "../context/SiteDetailsContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { getBatteryPercent, isRobotOnline } from "../utils/robot";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { MainTabParamList } from "../navigation/MainTabs";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { DrawerParamList } from "../navigation/types";

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Dashboard">,
  DrawerNavigationProp<DrawerParamList>
>;

const GATEWAY_PREVIEW_LIMIT = 5;

function normalizeGatewayStatus(status?: string | boolean | null): string {
  if (status === true) return "online";
  if (status === false) return "offline";
  if (typeof status === "string") return status.toLowerCase().trim();
  return "";
}

function getGatewayStatusLabel(status?: string | boolean | null): string {
  if (status === true) return "Online";
  if (status === false) return "Offline";
  if (typeof status === "string" && status.trim()) {
    const value = status.toLowerCase();
    if (value === "true" || value.includes("online") || value === "active") {
      return "Online";
    }
    if (
      value === "false" ||
      value.includes("offline") ||
      value === "inactive"
    ) {
      return "Offline";
    }
    return status;
  }
  return "Unknown";
}

function getGatewayStatusVariant(status?: string | boolean | null) {
  const value = normalizeGatewayStatus(status);
  if (!value) return "neutral" as const;
  if (value.includes("online") || value === "active" || value === "true") {
    return "success" as const;
  }
  if (value.includes("offline") || value === "inactive" || value === "false") {
    return "neutral" as const;
  }
  if (value.includes("error") || value.includes("fail"))
    return "error" as const;
  return "info" as const;
}

function formatUplink(date?: string) {
  if (!date) return "No uplink";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No uplink";
  return parsed.toLocaleString();
}

type StatCardProps = {
  label: string;
  value: string | number;
  badge: string;
  variant: "success" | "info" | "warning" | "error" | "neutral" | "purple";
};

function StatCard({ label, value, badge, variant }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Badge label={badge} variant={variant} size="sm" />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string | number;
  color: string;
};

function SummaryMetric({ label, value, color }: SummaryMetricProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.summaryMetric,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.summaryMetricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.summaryMetricValue, { color }]}>{value}</Text>
    </View>
  );
}

type TopSummaryCardsProps = {
  totalRobots: number;
  onlineRobots: number;
  offlineRobots: number;
  totalGateways: number;
  onlineGateways: number;
  cleaning: {
    completed: number;
    inprogress: number;
    failure: number;
  };
  onBlockwise: () => void;
  onCleaningLog: () => void;
};

function TopSummaryCards({
  totalRobots,
  onlineRobots,
  offlineRobots,
  totalGateways,
  onlineGateways,
  cleaning,
  onBlockwise,
  onCleaningLog,
}: TopSummaryCardsProps) {
  const { colors } = useTheme();
  const gatewayPercent =
    totalGateways > 0 ? Math.round((onlineGateways / totalGateways) * 100) : 0;

  return (
    <View style={styles.topCardsStack}>
      <View
        style={[
          styles.topCard,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <View style={styles.topCardHeader}>
          <View style={styles.topCardTitleRow}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.topCardTitle, { color: colors.textSecondary }]}>
              Robots
            </Text>
          </View>
          <Pressable
            onPress={onBlockwise}
            style={[styles.topCardAction, { backgroundColor: colors.badge.info.bg }]}
          >
            <Text style={[styles.topCardActionText, { color: colors.badge.info.text }]}>
              Blockwise →
            </Text>
          </Pressable>
        </View>
        <View style={styles.summaryMetricsRow}>
          <SummaryMetric label="Total" value={totalRobots} color={colors.primary} />
          <SummaryMetric label="Online" value={onlineRobots} color={colors.primary} />
          <SummaryMetric label="Offline" value={offlineRobots} color={colors.danger} />
        </View>
      </View>

      <View
        style={[
          styles.topCard,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <View style={styles.topCardHeader}>
          <View style={styles.topCardTitleRow}>
            <Ionicons name="flash-outline" size={13} color={colors.badge.warning.text} />
            <Text style={[styles.topCardTitle, { color: colors.textSecondary }]}>
              Today's Cleaning
            </Text>
          </View>
          <Pressable
            onPress={onCleaningLog}
            style={[styles.topCardAction, { backgroundColor: colors.badge.info.bg }]}
          >
            <Text style={[styles.topCardActionText, { color: colors.badge.info.text }]}>
              Log →
            </Text>
          </Pressable>
        </View>
        <View style={styles.summaryMetricsRow}>
          <SummaryMetric
            label="Completed"
            value={cleaning.completed}
            color={colors.primary}
          />
          <SummaryMetric
            label="Running"
            value={cleaning.inprogress}
            color={colors.badge.warning.text}
          />
          <SummaryMetric label="Failed" value={cleaning.failure} color={colors.danger} />
        </View>
      </View>

      <View
        style={[
          styles.topCard,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <View style={styles.topCardHeader}>
          <View style={styles.topCardTitleRow}>
            <Ionicons name="radio-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.topCardTitle, { color: colors.textSecondary }]}>
              Gateways
            </Text>
          </View>
        </View>
        <View style={styles.gatewayStatusRow}>
          <Text style={[styles.gatewayOnlineValue, { color: colors.primary }]}>
            {onlineGateways}
          </Text>
          <Text style={[styles.gatewayTotalText, { color: colors.textSecondary }]}>
            / {totalGateways} online
          </Text>
        </View>
        <View style={[styles.gatewayTrack, { backgroundColor: colors.backgroundTertiary }]}>
          <View
            style={[
              styles.gatewayFill,
              { width: `${gatewayPercent}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();

  const {
    assignedSites,
    selectedSite,
    setSelectedSite,
    siteDetails,
    loading,
    refreshing,
    error,
    refresh,
  } = useSiteDetails();

  const onlineRobots =
    siteDetails?.robots.filter((r) => isRobotOnline(r.lora_state)).length ?? 0;
  const offlineRobots = (siteDetails?.robots.length ?? 0) - onlineRobots;
  const onlineGateways =
    siteDetails?.gateways.filter(
      (gateway) => getGatewayStatusVariant(gateway.gateway_status) === "success",
    ).length ?? 0;

  const avgBattery = (() => {
    if (!siteDetails?.robots?.length) return null;
    const values = siteDetails.robots
      .map((robot) => getBatteryPercent(robot.battery_voltage))
      .filter((value): value is number => value != null);
    if (!values.length) return null;
    return Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
  })();

  const siteTitle =
    selectedSite?.site_name || selectedSite?.site_id || "My Site";
  const gatewayPreview =
    siteDetails?.gateways.slice(0, GATEWAY_PREVIEW_LIMIT) ?? [];
  const hiddenGateways =
    (siteDetails?.gateways.length ?? 0) - gatewayPreview.length;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Dashboard"
        subtitle={`Welcome, ${user?.username ?? "Technician"}`}
      />

      <Screen
        scroll
        refreshControl={
          selectedSite?.site_id ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {assignedSites.length === 0 ? (
          <View
            style={[
              styles.messageCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Badge label="No Site Assigned" variant="warning" />
            <Text style={[styles.messageTitle, { color: colors.textPrimary }]}>
              No assigned site found
            </Text>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              Your account does not have an assigned site yet. Contact your
              admin to assign a site before viewing dashboard data.
            </Text>
          </View>
        ) : (
          <>
            {assignedSites.length > 0 ? (
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
                        {site.site_name || site.site_id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* <View style={styles.siteHeader}>
              <Text style={[styles.siteTitle, { color: colors.textPrimary }]}>
                {siteTitle}
              </Text>
              {selectedSite?.site_id ? (
                <Badge label={selectedSite.site_id} variant="info" size="sm" />
              ) : null}
            </View> */}

            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
               
              </View>
            ) : error ? (
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
                <Text style={[styles.messageTitle, { color: colors.danger }]}>
                  Could not load site data
                </Text>
                <Text
                  style={[styles.messageText, { color: colors.textSecondary }]}
                >
                  {error}
                </Text>
              </View>
            ) : siteDetails ? (
              <>
                <TopSummaryCards
                  totalRobots={siteDetails.robots.length}
                  onlineRobots={onlineRobots}
                  offlineRobots={offlineRobots}
                  totalGateways={siteDetails.gateways.length}
                  onlineGateways={onlineGateways}
                  cleaning={siteDetails.cleaning}
                  onBlockwise={() => {
                    if (!selectedSite?.site_id) return;
                    navigation.navigate("Blockwise", {
                      siteId: selectedSite.site_id,
                      siteName: selectedSite.site_name,
                    });
                  }}
                  onCleaningLog={() => {
                    if (!selectedSite?.site_id) return;
                    navigation.navigate("CleaningLogs", {
                      screen: "SiteCleaningLogs",
                      params: {
                        siteId: selectedSite.site_id,
                        siteName: selectedSite.site_name,
                      },
                    });
                  }}
                />
                {siteDetails.weather &&
                Object.keys(siteDetails.weather).length > 0 ? (
                  <WeatherCard weather={siteDetails.weather} />
                ) : null}
                <GatewayMapCard
                  gateways={siteDetails.gateways}
                  robots={siteDetails.robots}
                />

                <SectionCard
                  title={`Robots (${siteDetails.robots.length})`}
                  // subtitle="Summary only — open Robots tab for the full searchable list"
                >
                  <RobotBatterySummary
                    robots={siteDetails.robots}
                    onViewAll={() => navigation.navigate("Robots")}
                  />
                </SectionCard>

                <SectionCard
                  title={`Gateways (${siteDetails.gateways.length})`}
                >
                  {siteDetails.gateways.length === 0 ? (
                    <Text
                      style={[styles.emptyText, { color: colors.textMuted }]}
                    >
                      No gateways found for this site.
                    </Text>
                  ) : (
                    <>
                      {gatewayPreview.map((gateway) => (
                        <View
                          key={gateway.gateway_id_in_lns_server}
                          style={[
                            styles.listRow,
                            { borderBottomColor: colors.border },
                          ]}
                        >
                          <View style={styles.listRowTop}>
                            <Text
                              style={[
                                styles.listTitle,
                                { color: colors.textPrimary },
                              ]}
                            >
                              {gateway.gateway_name ||
                                gateway.gateway_name_in_lns_server}
                            </Text>
                            <Badge
                              label={getGatewayStatusLabel(
                                gateway.gateway_status,
                              )}
                              variant={getGatewayStatusVariant(
                                gateway.gateway_status,
                              )}
                              size="sm"
                            />
                          </View>
                          <Text
                            style={[
                              styles.listMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Robots: {gateway.robot_count ?? 0}
                            {gateway.battery_voltage != null
                              ? ` · Battery ${gateway.battery_voltage}%`
                              : ""}
                          </Text>
                          <Text
                            style={[
                              styles.listMeta,
                              { color: colors.textMuted },
                            ]}
                          >
                            Last uplink: {formatUplink(gateway.last_uplink)}
                          </Text>
                        </View>
                      ))}
                      {hiddenGateways > 0 ? (
                        <Text
                          style={[styles.moreText, { color: colors.textMuted }]}
                        >
                          +{hiddenGateways} more gateways
                        </Text>
                      ) : null}
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Block-wise Cleaning">
                  {siteDetails.blockWiseCleaning.length === 0 ? (
                    <Text
                      style={[styles.emptyText, { color: colors.textMuted }]}
                    >
                      No block cleaning data available.
                    </Text>
                  ) : (
                    siteDetails.blockWiseCleaning.map((block) => (
                      <View
                        key={block.block}
                        style={[
                          styles.listRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.listRowTop}>
                          <Text
                            style={[
                              styles.listTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Block {block.block}
                          </Text>
                          <Badge
                            label={`${block.cycles} cycles`}
                            variant="purple"
                            size="sm"
                          />
                        </View>
                        <Text
                          style={[
                            styles.listMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Area cleaned: {block.areaCleaned} m²
                        </Text>
                      </View>
                    ))
                  )}
                </SectionCard>
              </>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  sitePickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    margin: spacing.md,
  },
  siteChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  siteChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  topCardsStack: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  topCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  topCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  topCardTitle: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  topCardAction: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  topCardActionText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
  },
  summaryMetricsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  summaryMetric: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  summaryMetricLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  summaryMetricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  gatewayStatusRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  gatewayOnlineValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
  },
  gatewayTotalText: {
    ...typography.bodySmall,
    marginLeft: 3,
    fontWeight: "600",
  },
  gatewayTrack: {
    height: 5,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  gatewayFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  siteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  siteTitle: {
    ...typography.h3,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    padding: spacing.sm,
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h3,
  },
  statLabel: {
    textAlign: "center",
    ...typography.caption,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  listRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  listRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  listTitle: {
    ...typography.label,
    flex: 1,
  },
  listMeta: {
    ...typography.caption,
  },
  moreText: {
    ...typography.caption,
    textAlign: "center",
    paddingTop: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
  },
  messageCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageTitle: {
    ...typography.h3,
  },
  messageText: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  stateText: {
    ...typography.bodySmall,
  },
});
