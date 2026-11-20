import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Navbar, Screen } from "../components/layout";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { classifyPcbLog, hexToText, type PcbReading } from "../utils/pcbLog";
import {
  createPcbLogSender,
  pcbLogRobotNo,
  type PcbLogEvent,
  type PcbLogOpen,
} from "../utils/pcbLogStream";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { fetchRobotByRobotNo } from "../api/robots";
import {
  listUsbPorts,
  openPcbLog,
  usbLogSupported,
  type UsbPort,
} from "../services/usbPcbLog";

type RoomCard = PcbLogOpen & { phase: "opening" | "live" | "stopped" };

export function PcbLogScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [robotNo, setRobotNo] = useState("");
  const [ports, setPorts] = useState<UsbPort[]>([]);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("Plug the TX RX DTR lead into the phone.");
  const [reading, setReading] = useState(false);
  const [room, setRoom] = useState<RoomCard | null>(null);
  const closeRef = useRef<(() => Promise<void>) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const streamFailedRef = useRef(false);
  const roomRobotRef = useRef("");
  const generationRef = useRef(0);
  const senderRef = useRef<ReturnType<typeof createPcbLogSender> | null>(null);
  if (!senderRef.current) {
    senderRef.current = createPcbLogSender((event: PcbLogEvent) => {
      const generation = generationRef.current;
      void getSocket()
        .then((socket) => {
          if (generation !== generationRef.current) return;
          if (event.type === "start") {
            socket.emit("pcb-log-start", event.session);
            setRoom((prev) =>
              prev && prev.robotNo === event.session.robotNo ? { ...prev, phase: "live" } : prev,
            );
          } else if (event.type === "chunk") {
            socket.emit("pcb-log-chunk", { robotNo: event.robotNo, text: event.text });
          } else {
            socket.emit("pcb-log-stop", { robotNo: event.robotNo });
            setRoom((prev) =>
              prev && prev.robotNo === event.robotNo ? { ...prev, phase: "stopped" } : prev,
            );
          }
        })
        .catch(() => {
          if (streamFailedRef.current) return;
          streamFailedRef.current = true;
          setRoom((prev) => (prev ? { ...prev, phase: "stopped" } : prev));
          setStatus("Reading on this phone. The console room did not open.");
        });
    });
  }

  const stopRef = useRef<(reason?: "user") => Promise<void>>(async () => {});

  useEffect(() => {
    return () => {
      void stopRef.current();
    };
  }, []);

  const readingNow: PcbReading = classifyPcbLog(log);

  async function stop(reason?: "user") {
    senderRef.current?.stop();
    const close = closeRef.current;
    closeRef.current = null;
    if (close) await close();
    setReading(false);
    setRoom((prev) => (prev ? { ...prev, phase: "stopped" } : prev));
    if (reason === "user") setStatus("Stopped. The console room is no longer live.");
  }
  stopRef.current = stop;

  async function start(deviceId: number) {
    await stop();
    generationRef.current += 1;
    streamFailedRef.current = false;
    const robot = pcbLogRobotNo(robotNo);
    let deveui = "";
    let loraNo = "";
    if (robot) {
      try {
        const details = await fetchRobotByRobotNo(robot);
        deveui = details.deveui ?? "";
        loraNo = details.lora_no == null ? "" : String(details.lora_no);
      } catch {
        deveui = "";
        loraNo = "";
      }
    }
    const session: PcbLogOpen | null = robot
      ? {
          robotNo: robot,
          deveui,
          loraNo,
          room: `pcb-log:${robot}`,
          user: user
            ? { username: user.username, role: user.role, email: user.email }
            : null,
        }
      : null;
    roomRobotRef.current = session?.robotNo ?? "";
    setRoom(session ? { ...session, phase: "opening" } : null);
    senderRef.current?.start(session ?? "");
    setStatus("Opening 115200. Reset the robot if the text does not start.");
    const opened = await openPcbLog(deviceId, (hex) => {
      const chunk = hexToText(hex);
      if (!chunk) return;
      setLog((prev) => (prev + chunk).slice(-200000));
      senderRef.current?.push(chunk);
    });
    if (opened === "permission") {
      senderRef.current?.stop();
      setStatus("Allow USB access for the dongle, then tap the port again.");
      return;
    }
    closeRef.current = opened.close;
    setReading(true);
    setStatus(
      robot
        ? "Reading. This room stays live until you tap Stop."
        : "Reading on this phone only. Enter the robot number, then read again, to show Live serial log.",
    );
  }

  async function refreshPorts() {
    if (Platform.OS !== "android") {
      setStatus("PCB log capture runs on the Android app.");
      return;
    }
    if (!usbLogSupported()) {
      setStatus("This install has no USB serial. Ship a new Android build, then try again.");
      return;
    }
    const found = await listUsbPorts();
    setPorts(found);
    if (found.length === 0) {
      setStatus("No serial dongle found. Plug the TX RX DTR lead in and tap Find port.");
      return;
    }
    if (found.length === 1) {
      await start(found[0].deviceId);
      return;
    }
    setStatus("More than one USB device. Choose the TX RX DTR dongle.");
  }

  async function shareLog() {
    const name = (robotNo.trim() || "pcb") + "-" + Date.now() + ".txt";
    const path = `${FileSystem.cacheDirectory}${name}`;
    const body = `robot ${robotNo.trim() || "-"}\n${readingNow.title}\n${readingNow.detail}\n\n${log}`;
    await FileSystem.writeAsStringAsync(path, body);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/plain", dialogTitle: "PCB log" });
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Navbar title="PCB log" subtitle="TX RX DTR · 115200" />
      <Screen scroll>
        <Text style={[styles.status, { color: colors.textSecondary }]}>{status}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>Robot number</Text>
        <TextInput
          value={robotNo}
          onChangeText={setRobotNo}
          editable={!reading}
          autoCapitalize="characters"
          placeholder="ABD-2324694"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
        />
        <View style={styles.row}>
          <Pressable
            onPress={() => void refreshPorts().catch((error: Error) => setStatus(error.message))}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>{reading ? "Read again" : "Find port"}</Text>
          </Pressable>
          {reading ? (
            <Pressable onPress={() => void stop("user")} style={[styles.button, { backgroundColor: colors.danger }]}>
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setLog("")}
            disabled={!log}
            style={[styles.button, { backgroundColor: log ? colors.primary : colors.primaryDisabled }]}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
        {ports.length > 1 && !reading
          ? ports.map((port) => (
              <Pressable
                key={port.deviceId}
                onPress={() => void start(port.deviceId).catch((error: Error) => setStatus(error.message))}
                style={[styles.port, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textPrimary }}>
                  Port {port.deviceId} · {port.vendorId}:{port.productId}
                </Text>
              </Pressable>
            ))
          : null}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{readingNow.title}</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{readingNow.detail}</Text>
        </View>
        {room ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {room.phase === "live" ? "Room live" : room.phase === "opening" ? "Opening room" : "Room stopped"}
            </Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Room {room.room}</Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Robot no {room.robotNo}</Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              DevEUI {room.deveui || "—"}
            </Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              LoRa no {room.loraNo || "—"}
            </Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              User {room.user?.username || "—"}
              {room.user?.role ? ` · ${room.user.role}` : ""}
              {room.user?.email ? ` · ${room.user.email}` : ""}
            </Text>
          </View>
        ) : null}
        <ScrollView
          ref={scrollRef}
          style={[styles.log, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Text style={[styles.logText, { color: colors.textPrimary }]} selectable>
            {log || "Log text appears here."}
          </Text>
        </ScrollView>
        <Pressable
          onPress={() => void shareLog().catch((error: Error) => setStatus(error.message))}
          disabled={!log}
          style={[styles.button, { backgroundColor: log ? colors.primary : colors.primaryDisabled }]}
        >
          <Text style={styles.buttonText}>Share log</Text>
        </Pressable>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          With this robot number, the same text streams to Live serial log in Events and queues. Firmware update will use this lead after the main board can accept a file on this port. The ribbon programmer stays in the workshop.
        </Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  status: { ...typography.body, marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body,
  },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  button: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  buttonText: { color: "#101936", ...typography.label },
  port: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.h3, marginBottom: spacing.xs },
  cardBody: { ...typography.body },
  log: {
    borderWidth: 1,
    borderRadius: radius.md,
    maxHeight: 280,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  logText: { fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  note: { ...typography.caption, marginTop: spacing.md },
});
