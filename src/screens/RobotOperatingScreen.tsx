import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { Navbar, Screen } from "../components/layout";
import { Badge, Button, CompactCommandButton } from "../components/ui";
import { fetchRobotByRobotNo, sendMqttDownlink } from "../api/robots";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { ThemeColors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { RobotCommand, RobotOperatingDetails } from "../types/robotOperating";
import { formatDateTimeIST } from "../utils/datetime";
import { getBatteryPercent, isRobotOnline } from "../utils/robot";
import type { DrawerParamList } from "../navigation/types";

type Route = RouteProp<DrawerParamList, "RobotOperating">;
type Navigation = DrawerNavigationProp<DrawerParamList, "RobotOperating">;

function InfoCard({
  title,
  children,
  colors,
}: {
  title?: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {title ? (
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  colors,
  wide,
}: {
  label: string;
  value: string | number;
  colors: ThemeColors;
  wide?: boolean;
}) {
  return (
    <View style={[styles.field, wide && styles.fieldWide]}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.fieldValue, { color: colors.textPrimary }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function BatteryBar({
  percent,
  online,
  colors,
}: {
  percent: number | null;
  online: boolean;
  colors: ThemeColors;
}) {
  const width = percent ?? 0;
  const barColor = !online
    ? colors.textMuted
    : percent != null && percent < 40
      ? colors.danger
      : percent != null && percent < 70
        ? colors.badge.warning.text
        : colors.primary;

  return (
    <View style={styles.batteryWrap}>
      <View
        style={[
          styles.batteryTrack,
          { backgroundColor: colors.backgroundTertiary },
        ]}
      >
        <View
          style={[
            styles.batteryFill,
            {
              width: `${Math.max(0, Math.min(100, width))}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.batteryText, { color: colors.textPrimary }]}>
        {percent != null ? `${percent}%` : "—"}
      </Text>
    </View>
  );
}

export function RobotOperatingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { robotNo, siteId, block, siteName } = route.params;

  const [robot, setRobot] = useState<RobotOperatingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [commandLoading, setCommandLoading] = useState<
    RobotCommand | null
  >(null);

  const canSendCommands = user?.robot_command_access !== false;

  const loadRobot = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const data = await fetchRobotByRobotNo(robotNo);
        setRobot(data);
      } catch (err) {
        setRobot(null);
        setError(err instanceof Error ? err.message : "Failed to load robot");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [robotNo],
  );

  useEffect(() => {
    void loadRobot();
  }, [loadRobot]);

  const online = isRobotOnline(robot?.lora_state);
  const batteryPercent = getBatteryPercent(robot?.battery_voltage);
  const firmwareVersion = robot?.firmware_version ?? robot?.version ?? "—";
  const pcbVersion = robot?.pcb_version ?? "—";

  const sendCommand = async (command: RobotCommand) => {
    if (!robot) return;

    const labels: Record<RobotCommand, string> = {
      start: "Start",
      stop: "Stop",
      return: "Return",
    };

    setCommandLoading(command);
    try {
      const result = await sendMqttDownlink(command, {
        deveui: robot.deveui,
        lora_no: robot.lora_no,
        robot_no: robot.robot_no ?? robotNo,
        site_id: robot.site_id ?? siteId,
      });

      Alert.alert(
        "Command sent",
        result.message || `${labels[command]} command sent to ${robotNo}.`,
      );
      void loadRobot(true);
    } catch (err) {
      Alert.alert(
        "Command failed",
        err instanceof Error ? err.message : "Failed to send robot command",
      );
    } finally {
      setCommandLoading(null);
    }
  };

  const handleCommand = (command: RobotCommand) => {
    if (!canSendCommands) {
      Alert.alert("Access denied", "You do not have robot command access.");
      return;
    }

    if (!robot) {
      Alert.alert("Robot not loaded", "Please refresh and try again.");
      return;
    }

    if (!robot.deveui || robot.lora_no == null) {
      Alert.alert(
        "Missing details",
        "Robot DevEUI or LoRa number is missing, so the command cannot be sent.",
      );
      return;
    }

    const labels: Record<RobotCommand, string> = {
      start: "Start",
      stop: "Stop",
      return: "Return",
    };

    Alert.alert(
      `${labels[command]} robot`,
      `Send ${labels[command].toLowerCase()} command to ${robotNo}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: labels[command],
          style: command === "stop" ? "destructive" : "default",
          onPress: () => void sendCommand(command),
        },
      ],
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Robot Operating"
        subtitle={`${robotNo} · ${block}`}
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
          onPress={() => navigation.navigate("Blockwise", { siteId, siteName })}
          style={styles.breadcrumbLink}
        >
          <Ionicons name="grid-outline" size={14} color={colors.primary} />
          <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
            Blockwise
          </Text>
        </Pressable>
        <Text style={[styles.breadcrumbSep, { color: colors.textMuted }]}>
          /
        </Text>
        <Text style={[styles.breadcrumbCurrent, { color: colors.textSecondary }]}>
          {block}
        </Text>
      </View>

      <View style={styles.refreshRow}>
        <Button
          title="Refresh"
          icon="refresh-outline"
          size="sm"
          variant="outline"
          onPress={() => void loadRobot(true)}
          loading={refreshing}
          disabled={refreshing || loading}
        />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading robot details...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable onPress={() => void loadRobot()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <Screen
          scroll
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadRobot(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.cards}>
            <InfoCard colors={colors}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.robotNo, { color: colors.textPrimary }]}>
                  {robot?.robot_no ?? robotNo}
                </Text>
                <Badge
                  label={online ? "Online" : "Offline"}
                  variant={online ? "success" : "error"}
                />
              </View>

              <View style={styles.fieldGrid}>
                <View style={styles.fieldWide}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textMuted }]}
                  >
                    Battery
                  </Text>
                  <BatteryBar
                    percent={batteryPercent}
                    online={online}
                    colors={colors}
                  />
                </View>
                <Field
                  label="DevEUI"
                  value={robot?.deveui ?? "—"}
                  colors={colors}
                  wide
                />
                <Field
                  label="LoRa No"
                  value={robot?.lora_no != null ? robot.lora_no : "—"}
                  colors={colors}
                />
                <Field
                  label="LoRa State"
                  value={online ? "Online" : "Offline"}
                  colors={colors}
                />
                <Field
                  label="Firmware"
                  value={firmwareVersion}
                  colors={colors}
                />
                <Field label="PCB Version" value={pcbVersion} colors={colors} />
              </View>
            </InfoCard>

            <InfoCard title="Last Activity" colors={colors}>
              <Field
                label="Last Update (IST)"
                value={formatDateTimeIST(robot?.last_uplink)}
                colors={colors}
                wide
              />
              <View style={styles.spacer} />
              <Field
                label="Last Status"
                value={robot?.last_status ?? "—"}
                colors={colors}
                wide
              />
            </InfoCard>

            <InfoCard title="Motor Speeds" colors={colors}>
              <View style={styles.speedRow}>
                <View
                  style={[
                    styles.speedBox,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="disc-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.speedLabel, { color: colors.textMuted }]}
                  >
                    Wheel
                  </Text>
                  <Text
                    style={[styles.speedValue, { color: colors.textPrimary }]}
                  >
                    {robot?.wheel_motor_speed != null
                      ? robot.wheel_motor_speed
                      : "—"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.speedBox,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="brush-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.speedLabel, { color: colors.textMuted }]}
                  >
                    Brush
                  </Text>
                  <Text
                    style={[styles.speedValue, { color: colors.textPrimary }]}
                  >
                    {robot?.brush_motor_speed != null
                      ? robot.brush_motor_speed
                      : "—"}
                  </Text>
                </View>
              </View>
            </InfoCard>

            <InfoCard title="Commands" colors={colors}>
              <View style={styles.commandRow}>
                <CompactCommandButton
                  label="Start"
                  icon="play"
                  onPress={() => handleCommand("start")}
                  loading={commandLoading === "start"}
                  disabled={!canSendCommands || commandLoading !== null}
                />
                <CompactCommandButton
                  label="Stop"
                  icon="stop"
                  tone="danger"
                  onPress={() => handleCommand("stop")}
                  loading={commandLoading === "stop"}
                  disabled={!canSendCommands || commandLoading !== null}
                />
                <CompactCommandButton
                  label="Return"
                  icon="return-down-back"
                  onPress={() => handleCommand("return")}
                  loading={commandLoading === "return"}
                  disabled={!canSendCommands || commandLoading !== null}
                />
              </View>
              {!canSendCommands ? (
                <Text style={[styles.commandHint, { color: colors.textMuted }]}>
                  Robot command access is not enabled for your account.
                </Text>
              ) : null}
            </InfoCard>
          </View>
        </Screen>
      )}
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
    alignItems: "center",
    justifyContent: "center",
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexWrap: "wrap",
  },
  breadcrumbLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbText: {
    ...typography.caption,
    fontSize: 16,
    fontWeight: "600",
  },
  breadcrumbSep: {
    ...typography.caption,
  },
  breadcrumbCurrent: {
    ...typography.caption,
    fontSize: 16,
    fontWeight: "600",
  },
  refreshRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: "flex-end",
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
  retryText: {
    ...typography.label,
  },
  cards: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  robotNo: {
    ...typography.h3,
    fontSize: 18,
    flex: 1,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  field: {
    width: "47%",
    gap: 4,
  },
  fieldWide: {
    width: "100%",
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldValue: {
    ...typography.label,
    fontSize: 13,
  },
  spacer: {
    height: spacing.xs,
  },
  batteryWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  batteryTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  batteryFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  batteryText: {
    ...typography.label,
    fontSize: 12,
    minWidth: 36,
    textAlign: "right",
  },
  speedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  speedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  speedLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  speedValue: {
    ...typography.h3,
    fontSize: 22,
    fontWeight: "700",
  },
  commandRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  commandHint: {
    ...typography.caption,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
