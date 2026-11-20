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
  listUsbPorts,
  openPcbLog,
  usbLogSupported,
  type UsbPort,
} from "../services/usbPcbLog";

const CAPTURE_MS = 60_000;

export function PcbLogScreen() {
  const { colors } = useTheme();
  const [robotNo, setRobotNo] = useState("");
  const [ports, setPorts] = useState<UsbPort[]>([]);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("Plug the TX RX DTR lead into the phone.");
  const [reading, setReading] = useState(false);
  const closeRef = useRef<(() => Promise<void>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void closeRef.current?.();
    };
  }, []);

  const readingNow: PcbReading = classifyPcbLog(log);

  async function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const close = closeRef.current;
    closeRef.current = null;
    if (close) await close();
    setReading(false);
  }

  async function start(deviceId: number) {
    await stop();
    setLog("");
    setStatus("Opening 115200. Reset the robot if the text does not start.");
    const opened = await openPcbLog(deviceId, (hex) => {
      const chunk = hexToText(hex);
      if (!chunk) return;
      setLog((prev) => (prev + chunk).slice(-12000));
    });
    if (opened === "permission") {
      setStatus("Allow USB access for the dongle, then tap the port again.");
      return;
    }
    closeRef.current = opened.close;
    setReading(true);
    setStatus("Reading for 60 seconds.");
    timerRef.current = setTimeout(() => {
      void stop().then(() => setStatus("Capture finished. Read the result below."));
    }, CAPTURE_MS);
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
            <Pressable onPress={() => void stop()} style={[styles.button, { backgroundColor: colors.danger }]}>
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
          ) : null}
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
          Firmware update will use this same lead after the main board can accept a file on this port. The ribbon programmer stays in the workshop.
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
