import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { appAlert } from "../utils/appAlert";
import { sendMqttMulticastDownlink } from "../api/robots";
import { hasUsableWeather } from "../api/weather";
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

function greetingFor() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

function Stat({
  label,
  value,
  tone,
  parts,
}: {
  label: string;
  value?: string | number;
  tone?: string;
  parts?: { text: string; tone?: string }[];
}) {
  const { colors, isDark } = useTheme();
  const countText = parts
    ? parts.map((part) => part.text).join("")
    : String(value ?? "");
  const valueSize =
    countText.length >= 9 ? 13 : countText.length >= 6 ? 15 : 17;
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: colors.backgroundSecondary,
          ...Platform.select({
            ios: {
              shadowColor: "#101936",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.18 : 0.04,
              shadowRadius: 2,
            },
            android: { elevation: 1 },
            default: {
              boxShadow: isDark
                ? "0 1px 2px rgba(0, 0, 0, 0.18)"
                : "0 1px 2px rgba(16, 25, 54, 0.04)",
            },
          }),
        },
      ]}
    >
      {parts ? (
        <Text
          style={[styles.statValue, { fontSize: valueSize, lineHeight: valueSize + 2 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {parts.map((part, index) => (
            <Text
              key={index}
              style={{ color: part.tone ?? colors.textPrimary }}
            >
              {part.text}
            </Text>
          ))}
        </Text>
      ) : (
        <Text
          style={[
            styles.statValue,
            { color: tone ?? colors.textPrimary, fontSize: valueSize, lineHeight: valueSize + 2 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
      )}
      <Text
        style={[styles.statLabel, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

export function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();
  const [commandSending, setCommandSending] = useState(false);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      if (!selectedSite?.site_id) return;
      const timer = setInterval(() => {
        refresh();
      }, 60_000);
      return () => clearInterval(timer);
    }, [refresh, selectedSite?.site_id]),
  );
  const siteRobots = siteDetails?.robots ?? [];
  const siteTitle = selectedSite ? getSiteLabel(selectedSite) : "My Site";

  const onlineRobots = siteRobots.filter((r) => isRobotOnline(r.lora_state)).length;
  const offlineRobots = siteRobots.length - onlineRobots;
  const onlineGateways =
    siteDetails?.gateways.filter(
      (gateway) => getGatewayStatusVariant(gateway.gateway_status) === "success",
    ).length ?? 0;
  const offlineGateways = (siteDetails?.gateways.length ?? 0) - onlineGateways;

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

  const weather = siteDetails?.weather;
  const weatherReady = weather != null && hasUsableWeather(weather);
  const batteryTone = (avg: number | null) => {
    if (avg == null) return undefined;
    if (avg > 75) return colors.badge.success.text;
    if (avg < 25) return colors.badge.error.text;
    return colors.badge.warning.text;
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Home"
        subtitle={user?.username || "Dashboard"}
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
              { backgroundColor: colors.backgroundSecondary },
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
            <View style={styles.greetRow}>
              <Text style={[styles.welcomeHello, { color: colors.textSecondary }]}>
                {greetingFor()}
              </Text>
              <Pressable
                onPress={() => setSiteMenuOpen(true)}
                style={[
                  styles.siteButton,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[styles.siteButtonText, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {selectedSite?.site_id ?? "Site"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View
                style={[
                  styles.messageCard,
                  { backgroundColor: colors.badge.error.bg },
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
                <View style={styles.statRow}>
                  <Stat
                    label="Cleaned"
                    value={siteDetails.cleaning.completed}
                    tone={colors.badge.success.text}
                  />
                  <Stat
                    label="Running"
                    value={siteDetails.cleaning.inprogress}
                    tone={colors.badge.warning.text}
                  />
                  <Stat
                    label="Failed"
                    value={siteDetails.cleaning.failure}
                    tone={colors.badge.error.text}
                  />
                </View>
                <View style={styles.statRow}>
                  <Stat
                    label="Online / offline"
                    parts={[
                      { text: String(onlineRobots), tone: colors.badge.success.text },
                      { text: "/", tone: colors.textSecondary },
                      { text: String(offlineRobots), tone: colors.badge.error.text },
                    ]}
                  />
                  <Stat
                    label="Gateways"
                    parts={[
                      { text: String(onlineGateways), tone: colors.badge.success.text },
                      { text: "/", tone: colors.textSecondary },
                      { text: String(offlineGateways), tone: colors.badge.error.text },
                    ]}
                  />
                  <Stat
                    label="Avg battery"
                    value={avgBattery != null ? `${avgBattery}%` : "—"}
                    tone={batteryTone(avgBattery)}
                  />
                </View>

                {weatherReady ? <WeatherCard weather={weather!} /> : null}

                <View style={styles.heroActions}>
                  <Pressable
                    onPress={openBlockwise}
                    style={[styles.heroPrimaryBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.heroPrimaryText}>View blocks</Text>
                  </Pressable>
                  <Pressable
                    onPress={openEmergencyStopConfirm}
                    disabled={!canSendCommands || commandSending}
                    style={[
                      styles.heroStopBtn,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        opacity: canSendCommands ? 1 : 0.45,
                      },
                    ]}
                  >
                    <Text style={[styles.heroStopText, { color: colors.danger }]}>
                      {commandSending ? "Sending…" : "Stop all"}
                    </Text>
                  </Pressable>
                </View>

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
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <RobotBatterySummary
                    robots={siteDetails.robots}
                    showTotals={false}
                  />
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
                    { backgroundColor: colors.backgroundSecondary },
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
                          style={styles.listRow}
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
                    { backgroundColor: colors.backgroundSecondary },
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

      <Modal
        visible={siteMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSiteMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSiteMenuOpen(false)}
          />
          <View
            style={[
              styles.siteSheet,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.siteSheetTitle, { color: colors.textPrimary }]}>
              Sites
            </Text>
            <ScrollView style={styles.siteList} bounces={false}>
              {assignedSites.map((site) => {
                const active = site.site_id === selectedSite?.site_id;
                return (
                  <Pressable
                    key={site.site_id}
                    onPress={() => {
                      setSelectedSite(site);
                      setSiteMenuOpen(false);
                    }}
                    style={[
                      styles.siteRow,
                      {
                        backgroundColor: active
                          ? colors.backgroundTertiary
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.siteRowText,
                        { color: colors.textPrimary, fontWeight: active ? "700" : "500" },
                      ]}
                    >
                      {site.site_id}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  welcomeHello: {
    ...typography.bodySmall,
    fontWeight: "600",
    flexShrink: 0,
  },
  siteButton: {
    flexShrink: 1,
    maxWidth: "62%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  siteButtonText: {
    ...typography.bodySmall,
    fontWeight: "600",
    flexShrink: 1,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.md,
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 0,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  statValue: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 25, 54, 0.45)",
  },
  siteSheet: {
    borderRadius: radius.md,
    padding: spacing.md,
    maxHeight: "70%",
  },
  siteSheetTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  siteList: {
    flexGrow: 0,
  },
  siteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  siteRowText: {
    ...typography.bodySmall,
    flex: 1,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroPrimaryBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  heroPrimaryText: {
    ...typography.label,
    color: "#042F2E",
    fontWeight: "700",
  },
  heroStopBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  heroStopText: {
    ...typography.label,
    fontWeight: "700",
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
  panel: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  listRow: {
    paddingVertical: spacing.sm,
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
