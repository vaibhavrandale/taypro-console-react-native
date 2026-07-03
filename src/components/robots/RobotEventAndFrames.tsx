import React, { useCallback, useEffect, useReducer, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchMqttEventLogs } from "../../api/mqttEventLogs";
import { Badge } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../lib/socket";
import { useTheme } from "../../theme";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { MqttEventFrame } from "../../types/mqttEventLogs";
import {
  base64ToAscii,
  base64ToHex,
  decodeRobotPayload,
  getDecodedBadgeVariant,
  getTopicBadgeLabel,
  getTopicBadgeVariant,
  resolveEventType,
} from "../../utils/robotPayloadDecoder";

const MAX_FRAMES = 20;

type Props = {
  robotNo: string;
  deveui: string;
  active: boolean;
};

type State = {
  frames: MqttEventFrame[];
  loading: boolean;
  error: string;
};

type Action =
  | { type: "FETCH_REQUEST" }
  | {
      type: "FETCH_SUCCESS";
      payload:
        | MqttEventFrame[]
        | ((prev: MqttEventFrame[]) => MqttEventFrame[]);
    }
  | { type: "FETCH_FAIL"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        frames:
          typeof action.payload === "function"
            ? action.payload(state.frames)
            : action.payload,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

function getFramePayload(frame: MqttEventFrame) {
  return frame.payload ?? frame.data;
}

function getFrameDevEui(frame: MqttEventFrame) {
  return getFramePayload(frame)?.deviceInfo?.devEui;
}

function formatFrameTime(frame: MqttEventFrame) {
  const raw = frame.createdAt ?? frame.time;
  if (!raw) return "—";

  return new Date(raw).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function FrameDetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.detailSection,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.detailSectionHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text
          style={[styles.detailSectionTitle, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.detailRow, { color: colors.textSecondary }]}>
      <Text style={{ color: colors.textMuted }}>{label}: </Text>
      {value ?? "—"}
    </Text>
  );
}

function FrameDetailModal({
  frame,
  visible,
  onClose,
  showRawJson,
}: {
  frame: MqttEventFrame | null;
  visible: boolean;
  onClose: () => void;
  showRawJson: boolean;
}) {
  const { colors } = useTheme();

  if (!frame) return null;

  const payload = getFramePayload(frame);
  const data = payload?.data;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
        >
          <View style={styles.modalHeaderText}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {payload?.deviceInfo?.deviceName ?? "Frame"}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              {payload?.deviceInfo?.devEui}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <FrameDetailSection title="General" icon="information-circle-outline">
            <DetailRow label="Topic" value={frame.topic} />
            <DetailRow
              label="Event Type"
              value={resolveEventType(frame.topic)}
            />
            <DetailRow
              label="Frame Time"
              value={frame.createdAt ?? frame.time}
            />
            <DetailRow
              label="Deduplication ID"
              value={payload?.deduplicationId}
            />
            <DetailRow label="Region Config" value={payload?.regionConfigId} />
          </FrameDetailSection>

          <FrameDetailSection title="Device Info" icon="hardware-chip-outline">
            <DetailRow
              label="Device Name"
              value={payload?.deviceInfo?.deviceName}
            />
            <DetailRow label="DevEUI" value={payload?.deviceInfo?.devEui} />
            <DetailRow
              label="Device Profile"
              value={payload?.deviceInfo?.deviceProfileName}
            />
            <DetailRow
              label="Device Class"
              value={payload?.deviceInfo?.deviceClassEnabled}
            />
          </FrameDetailSection>

          {frame.topic?.endsWith("/up") ? (
            <FrameDetailSection
              title="Frame Info"
              icon="arrow-down-circle-outline"
            >
              <DetailRow label="DevAddr" value={payload?.devAddr} />
              <DetailRow label="ADR" value={String(payload?.adr ?? "—")} />
              <DetailRow label="DR" value={payload?.dr} />
              <DetailRow label="FCnt" value={payload?.fCnt} />
              <DetailRow label="FPort" value={payload?.fPort} />
              <DetailRow
                label="Confirmed"
                value={String(payload?.confirmed ?? "—")}
              />

              <Text style={[styles.payloadTitle, { color: colors.primary }]}>
                Payload
              </Text>
              <View
                style={[
                  styles.codeBlock,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
              >
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                  Base64
                </Text>
                <Text
                  style={[
                    styles.codeValue,
                    { color: colors.badge.warning.text },
                  ]}
                >
                  {data ?? "—"}
                </Text>
              </View>
              <View
                style={[
                  styles.codeBlock,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
              >
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                  HEX
                </Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>
                  {base64ToHex(data)}
                </Text>
              </View>
              <View
                style={[
                  styles.codeBlock,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
              >
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                  ASCII
                </Text>
                <Text
                  style={[styles.codeValue, { color: colors.badge.info.text }]}
                >
                  {base64ToAscii(data)}
                </Text>
              </View>
            </FrameDetailSection>
          ) : null}

          {payload?.rxInfo?.map((gw, index) => (
            <FrameDetailSection
              key={`${gw.gatewayId ?? "gw"}-${index}`}
              title={`Gateway #${index + 1}`}
              icon="radio-outline"
            >
              <DetailRow label="Gateway ID" value={gw.gatewayId} />
              <DetailRow label="RSSI" value={gw.rssi} />
              <DetailRow label="SNR" value={gw.snr} />
              <DetailRow label="Channel" value={gw.channel} />
              {gw.location?.latitude != null &&
              gw.location?.longitude != null ? (
                <Pressable
                  onPress={() =>
                    void Linking.openURL(
                      `https://maps.google.com/?q=${gw.location?.latitude},${gw.location?.longitude}`,
                    )
                  }
                >
                  <Text style={[styles.mapLink, { color: colors.primary }]}>
                    Open location on map
                  </Text>
                </Pressable>
              ) : null}
            </FrameDetailSection>
          ))}

          <FrameDetailSection title="TX Info" icon="cellular-outline">
            <DetailRow label="Frequency" value={payload?.txInfo?.frequency} />
            <DetailRow
              label="Bandwidth"
              value={payload?.txInfo?.modulation?.lora?.bandwidth}
            />
            <DetailRow
              label="Spreading Factor"
              value={payload?.txInfo?.modulation?.lora?.spreadingFactor}
            />
          </FrameDetailSection>

          {showRawJson ? (
            <FrameDetailSection title="Raw JSON" icon="code-slash-outline">
              <ScrollView horizontal>
                <Text style={[styles.rawJson, { color: colors.textSecondary }]}>
                  {JSON.stringify(frame, null, 2)}
                </Text>
              </ScrollView>
            </FrameDetailSection>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function RobotEventAndFrames({ robotNo, deveui, active }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [{ loading, error, frames }, dispatch] = useReducer(reducer, {
    frames: [],
    loading: false,
    error: "",
  });
  const [selectedFrame, setSelectedFrame] = useState<MqttEventFrame | null>(
    null,
  );
  const [detailVisible, setDetailVisible] = useState(false);

  const showRawJson = user?.role?.toLowerCase().includes("admin") ?? false;

  const loadFrames = useCallback(async () => {
    dispatch({ type: "FETCH_REQUEST" });

    try {
      const result = await fetchMqttEventLogs(robotNo, deveui);
      dispatch({ type: "FETCH_SUCCESS", payload: result });
    } catch (err) {
      dispatch({
        type: "FETCH_FAIL",
        payload: err instanceof Error ? err.message : "Failed to load frames",
      });
    }
  }, [robotNo, deveui]);

  useEffect(() => {
    if (!active || !deveui) return;

    void loadFrames();
  }, [active, deveui, loadFrames]);

  useEffect(() => {
    if (!active || !deveui) return;

    let cancelled = false;
    let socketInstance: Awaited<ReturnType<typeof getSocket>> | null = null;

    const connect = async () => {
      try {
        socketInstance = await getSocket();
        if (cancelled) return;

        socketInstance.emit("join_device", deveui);

        const handleEvent = (msg: MqttEventFrame) => {
          const eventDevEui =
            getFrameDevEui(msg) ??
            (msg as { data?: { deviceInfo?: { devEui?: string } } }).data
              ?.deviceInfo?.devEui;

          if (eventDevEui?.toLowerCase() === deveui.toLowerCase()) {
            dispatch({
              type: "FETCH_SUCCESS",
              payload: (prev) => [msg, ...prev].slice(0, MAX_FRAMES),
            });
          }
        };

        socketInstance.on("deveui-event", handleEvent);

        return () => {
          socketInstance?.off("deveui-event", handleEvent);
        };
      } catch {
        /* socket optional — list still works from REST */
      }
    };

    const cleanupPromise = connect();

    return () => {
      cancelled = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [active, deveui]);

  if (!active) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Loading frames...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {error}
        </Text>
        <Pressable onPress={() => void loadFrames()}>
          <Text style={[styles.retryText, { color: colors.primary }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
        {robotNo} · {deveui}
      </Text>

      {frames.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No frames yet...
        </Text>
      ) : (
        <View style={styles.list}>
          {frames.map((frame, index) => {
            const payload = getFramePayload(frame);
            const decoded = decodeRobotPayload(payload?.data);
            const isUp = frame.topic?.endsWith("/up");

            return (
              <Pressable
                key={frame._id ?? `${frame.topic}-${frame.createdAt}-${index}`}
                onPress={() => {
                  setSelectedFrame(frame);
                  setDetailVisible(true);
                }}
                style={[
                  styles.frameCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.frameTopRow}>
                  <Text
                    style={[styles.frameTime, { color: colors.textSecondary }]}
                  >
                    {formatFrameTime(frame)}
                  </Text>
                  <Badge
                    label={getTopicBadgeLabel(frame.topic)}
                    variant={getTopicBadgeVariant(frame.topic)}
                    size="sm"
                  />
                </View>

                {isUp ? (
                  <View style={styles.frameMetaRow}>
                    <Badge
                      label={
                        decoded.dynamic && decoded.value != null
                          ? `${decoded.description} ${decoded.value}${decoded.unit ?? ""}`
                          : decoded.description
                      }
                      variant={getDecodedBadgeVariant(decoded.type)}
                      size="sm"
                    />
                    <Text
                      style={[styles.metaChip, { color: colors.textMuted }]}
                    >
                      DR {payload?.dr ?? "—"}
                    </Text>
                    <Text
                      style={[styles.metaChip, { color: colors.textMuted }]}
                    >
                      FCnt {payload?.fCnt ?? "—"}
                    </Text>
                    <Text
                      style={[styles.metaChip, { color: colors.textMuted }]}
                    >
                      fPort {payload?.fPort ?? "—"}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <FrameDetailModal
        frame={selectedFrame}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        showRawJson={showRawJson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  headerMeta: {
    margin: spacing.xs,
    ...typography.h3,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  list: {
    gap: spacing.sm,
  },
  frameCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  frameTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  frameTime: {
    ...typography.caption,
    fontSize: 11,
    flex: 1,
  },
  frameMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaChip: {
    ...typography.caption,
    fontSize: 10,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 2,
  },
  modalTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "700",
  },
  modalSubtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  detailSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailSectionTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
  },
  payloadTitle: {
    ...typography.label,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  codeBlock: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
    marginBottom: spacing.xs,
  },
  codeLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: "uppercase",
  },
  codeValue: {
    ...typography.caption,
    fontSize: 11,
  },
  mapLink: {
    ...typography.label,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  rawJson: {
    ...typography.caption,
    fontSize: 10,
    fontFamily: "monospace",
  },
});
