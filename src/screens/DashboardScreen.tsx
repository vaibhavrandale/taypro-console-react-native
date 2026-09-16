import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { appAlert } from "../utils/appAlert";
import { sendMqttMulticastDownlink } from "../api/robots";
import { hasUsableWeather } from "../api/weather";
import {
  canAccessAnalytics,
  canAccessClientTickets,
  canAccessPreventiveMaintenance,
} from "../utils/roles";
import type { AssignedSite } from "../types/auth";
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

function getSiteLabel(site: AssignedSite) {
  const extra = site as AssignedSite & { site_name?: string };
  return extra.site_name || site.siteName || site.site_id;
}

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${hello}, ${name}`;
}

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

function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? (
          <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type KpiTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint: string;
  accent: string;
  valueColor?: string;
  hintNode?: React.ReactNode;
};

function KpiTile({
  icon,
  label,
  value,
  hint,
  accent,
  valueColor,
  hintNode,
}: KpiTileProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.kpiTile,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.kpiIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: valueColor ?? colors.textPrimary }]}>
        {value}
      </Text>
      {hintNode ?? (
        <Text style={[styles.kpiHint, { color: colors.textSecondary }]} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </View>
  );
}

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  onPress: () => void;
};

function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickRow}
    >
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          style={[
            styles.quickTile,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.quickIcon, { backgroundColor: `${action.accent}22` }]}>
            <Ionicons name={action.icon} size={18} color={action.accent} />
          </View>
          <Text
            style={[styles.quickLabel, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();
  const [commandSending, setCommandSending] = useState(false);

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

  const canSendCommands = user?.robot_command_access !== false;
  const siteRobots = siteDetails?.robots ?? [];
  const siteTitle = selectedSite ? getSiteLabel(selectedSite) : "My Site";

  const onlineRobots = siteRobots.filter((r) => isRobotOnline(r.lora_state)).length;
  const offlineRobots = siteRobots.length - onlineRobots;
  const onlineGateways =
    siteDetails?.gateways.filter(
      (gateway) => getGatewayStatusVariant(gateway.gateway_status) === "success",
    ).length ?? 0;

  const avgBattery = useMemo(() => {
    if (!siteRobots.length) return null;
    const values = siteRobots
      .map((robot) => getBatteryPercent(robot.battery_voltage))
      .filter((value): value is number => value != null);
    if (!values.length) return null;
    return Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
  }, [siteRobots]);

  const gatewayPreview =
    siteDetails?.gateways.slice(0, GATEWAY_PREVIEW_LIMIT) ?? [];
  const hiddenGateways =
    (siteDetails?.gateways.length ?? 0) - gatewayPreview.length;

  const sendEmergencyStopAll = async () => {
    if (!selectedSite?.site_id) return;

    const commandable = siteRobots.filter(
      (robot) => robot.deveui && robot.robot_no,
    );

    if (!commandable.length) {
      appAlert("No robots", "No robots with command details at this site.");
      return;
    }

    setCommandSending(true);
    try {
      const result = await sendMqttMulticastDownlink("stop", {
        siteId: selectedSite.site_id,
        block: "All",
        robots: commandable,
      });
      appAlert(
        "Command sent",
        result.message ||
          `Emergency stop sent to ${commandable.length} robot${
            commandable.length === 1 ? "" : "s"
          }.`,
      );
    } catch (err) {
      appAlert(
        "Command failed",
        err instanceof Error ? err.message : "Failed to send emergency stop",
      );
    } finally {
      setCommandSending(false);
    }
  };

  const openEmergencyStopConfirm = () => {
    if (!canSendCommands) {
      appAlert("Access denied", "You do not have robot command access.");
      return;
    }
    if (!siteRobots.length) {
      appAlert("No robots", "No robots found for this site.");
      return;
    }

    appAlert(
      "Emergency Stop All",
      `Stop all robots at ${siteTitle}? This sends command 14 to ${siteRobots.length} robot${
        siteRobots.length === 1 ? "" : "s"
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop All", onPress: () => void sendEmergencyStopAll() },
      ],
    );
  };

  const openBlockwise = () => {
    if (!selectedSite?.site_id) return;
    navigation.navigate("Blockwise", {
      siteId: selectedSite.site_id,
      siteName: getSiteLabel(selectedSite),
    });
  };

  const openCleaningLog = () => {
    if (!selectedSite?.site_id) return;
    navigation.navigate("CleaningLogs", {
      screen: "SiteCleaningLogs",
      params: {
        siteId: selectedSite.site_id,
        siteName: getSiteLabel(selectedSite),
      },
    });
  };

  const quickActions = useMemo<QuickAction[]>(() => {
    const items: QuickAction[] = [
      {
        key: "blocks",
        label: "Blocks",
        icon: "grid-outline",
        accent: "#4F7CFF",
        onPress: openBlockwise,
      },
      {
        key: "logs",
        label: "Logs",
        icon: "list-outline",
        accent: "#00C9A7",
        onPress: openCleaningLog,
      },
      {
        key: "tracking",
        label: "Tracking",
        icon: "navigate-outline",
        accent: "#F59E0B",
        onPress: () =>
          navigation.navigate("RobotTracking", {
            siteId: selectedSite?.site_id,
            siteName: selectedSite ? getSiteLabel(selectedSite) : undefined,
          }),
      },
      {
        key: "robots",
        label: "Robots",
        icon: "hardware-chip-outline",
        accent: "#8B5CF6",
        onPress: () => navigation.navigate("Robots"),
      },
      {
        key: "gateways",
        label: "Gateways",
        icon: "wifi-outline",
        accent: "#3B82F6",
        onPress: () => navigation.navigate("Gateways"),
      },
    ];
    if (canAccessAnalytics(user?.role)) {
      items.push({
        key: "analytics",
        label: "Analytics",
        icon: "bar-chart-outline",
        accent: "#E11D48",
        onPress: () => navigation.navigate("Analytics"),
      });
    }
    if (canAccessClientTickets(user?.role)) {
      items.push({
        key: "tickets",
        label: "Tickets",
        icon: "ticket-outline",
        accent: "#0EA5E9",
        onPress: () => navigation.navigate("ClientTickets"),
      });
    }
    if (canAccessPreventiveMaintenance(user?.role)) {
      items.push({
        key: "pm",
        label: "PM",
        icon: "build-outline",
        accent: "#14B8A6",
        onPress: () => navigation.navigate("PreventiveMaintenance"),
      });
    }
    return items;
  }, [navigation, selectedSite, user?.role]);

  const heroColors: [string, string] = isDark
    ? ["#12203F", "#1B2C55"]
    : ["#0F766E", "#14B8A6"];

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Home"
        subtitle={selectedSite ? getSiteLabel(selectedSite) : "Dashboard"}
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
            <LinearGradient
              colors={heroColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroHello}>
                {greetingFor(user?.username ?? "there")}
              </Text>
              <Text style={styles.heroSite} numberOfLines={1}>
                {siteTitle}
              </Text>
              {siteDetails ? (
                <Text style={styles.heroMeta}>
                  {onlineRobots}/{siteRobots.length} robots online
                  {siteDetails.cleaning
                    ? ` · ${siteDetails.cleaning.completed} cleaned today`
                    : ""}
                </Text>
              ) : null}
              <View style={styles.heroActions}>
                <Pressable
                  onPress={openBlockwise}
                  style={styles.heroPrimaryBtn}
                >
                  <Text style={styles.heroPrimaryText}>View blocks</Text>
                  <Ionicons name="arrow-forward" size={14} color="#042F2E" />
                </Pressable>
                <Pressable
                  onPress={openEmergencyStopConfirm}
                  disabled={!canSendCommands || commandSending}
                  style={[
                    styles.heroStopBtn,
                    { opacity: canSendCommands ? 1 : 0.45 },
                  ]}
                >
                  <Ionicons name="stop" size={12} color="#FECACA" />
                  <Text style={styles.heroStopText}>
                    {commandSending ? "Sending…" : "Stop all"}
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>

            {assignedSites.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sitePickerRow}
              >
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
                      <Ionicons
                        name="location"
                        size={11}
                        color={active ? "#101936" : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.siteChipText,
                          { color: active ? "#101936" : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {getSiteLabel(site)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

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
                <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                  {error}
                </Text>
              </View>
            ) : siteDetails ? (
              <>
                {hasUsableWeather(siteDetails.weather) ? (
                  <WeatherCard weather={siteDetails.weather} />
                ) : null}

                <View style={styles.kpiGrid}>
                  <KpiTile
                    icon="hardware-chip-outline"
                    label="Robots"
                    value={`${onlineRobots}/${siteDetails.robots.length}`}
                    hint={`${offlineRobots} offline`}
                    accent={colors.primary}
                  />
                  <KpiTile
                    icon="sparkles-outline"
                    label="Cleaning"
                    value={siteDetails.cleaning.completed}
                    hint=""
                    accent={colors.primary}
                    valueColor={colors.primary}
                    hintNode={
                      <Text style={styles.kpiHint} numberOfLines={1}>
                        <Text style={{ color: colors.badge.warning.text }}>
                          {siteDetails.cleaning.inprogress} running
                        </Text>
                        <Text style={{ color: colors.textMuted }}> · </Text>
                        <Text style={{ color: colors.danger }}>
                          {siteDetails.cleaning.failure} failed
                        </Text>
                      </Text>
                    }
                  />
                  <KpiTile
                    icon="wifi-outline"
                    label="Gateways"
                    value={`${onlineGateways}/${siteDetails.gateways.length}`}
                    hint="online now"
                    accent={colors.badge.info.text}
                  />
                  <KpiTile
                    icon="battery-charging-outline"
                    label="Battery"
                    value={avgBattery != null ? `${avgBattery}%` : "—"}
                    hint="site average"
                    accent="#8B5CF6"
                  />
                </View>

                <QuickActions actions={quickActions} />

                <GatewayMapCard
                  gateways={siteDetails.gateways}
                  robots={siteDetails.robots}
                />

                <SectionHeader
                  eyebrow="Fleet"
                  title="Robot health"
                  actionLabel="See all"
                  onAction={() => navigation.navigate("Robots")}
                />
                <View
                  style={[
                    styles.panel,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <RobotBatterySummary robots={siteDetails.robots} />
                </View>

                <SectionHeader
                  eyebrow="Network"
                  title="Gateways"
                  actionLabel="See all"
                  onAction={() => navigation.navigate("Gateways")}
                />
                <View
                  style={[
                    styles.panel,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {siteDetails.gateways.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
                              style={[styles.listTitle, { color: colors.textPrimary }]}
                            >
                              {gateway.gateway_name ||
                                gateway.gateway_name_in_lns_server}
                            </Text>
                            <Badge
                              label={getGatewayStatusLabel(gateway.gateway_status)}
                              variant={getGatewayStatusVariant(
                                gateway.gateway_status,
                              )}
                              size="sm"
                            />
                          </View>
                          <Text
                            style={[styles.listMeta, { color: colors.textSecondary }]}
                          >
                            Robots: {gateway.robot_count ?? 0}
                            {gateway.battery_voltage != null
                              ? ` · Battery ${gateway.battery_voltage}%`
                              : ""}
                          </Text>
                          <Text style={[styles.listMeta, { color: colors.textMuted }]}>
                            Last uplink: {formatUplink(gateway.last_uplink)}
                          </Text>
                        </View>
                      ))}
                      {hiddenGateways > 0 ? (
                        <Text style={[styles.moreText, { color: colors.textMuted }]}>
                          +{hiddenGateways} more gateways
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>

                <SectionHeader eyebrow="Today" title="Block-wise cleaning" />
                <View
                  style={[
                    styles.panel,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {siteDetails.blockWiseCleaning.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
                            style={[styles.listTitle, { color: colors.textPrimary }]}
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
                          style={[styles.listMeta, { color: colors.textSecondary }]}
                        >
                          Area cleaned: {block.areaCleaned} m²
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  heroHello: {
    ...typography.caption,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroSite: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroMeta: {
    ...typography.bodySmall,
    color: "rgba(255,255,255,0.82)",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#5EEAD4",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  heroPrimaryText: {
    ...typography.label,
    color: "#042F2E",
    fontWeight: "800",
  },
  heroStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(254,202,202,0.45)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  heroStopText: {
    ...typography.caption,
    color: "#FECACA",
    fontWeight: "700",
  },
  sitePickerRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  siteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    maxWidth: 180,
  },
  siteChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiTile: {
    minWidth: "47%",
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kpiLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  kpiHint: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderCopy: { flex: 1 },
  sectionEyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionHeading: {
    ...typography.h3,
    fontSize: 16,
  },
  sectionAction: {
    ...typography.caption,
    fontWeight: "700",
  },
  quickRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  quickTile: {
    width: 84,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: 6,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  },
});
