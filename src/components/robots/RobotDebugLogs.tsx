import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchDebugLogs } from "../../api/debugLogs";
import { Badge } from "../ui";
import type { BadgeVariant } from "../ui/Badge";
import { useTheme } from "../../theme";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { DebugLog } from "../../types/debugLogs";
import {
  formatApiDateLabel,
  formatDateTimeIST,
  getDefaultRawLogsDateRange,
  toApiDateString,
} from "../../utils/datetime";

const PAGE_LIMIT = 10;

type Props = {
  robotNo: string;
  active: boolean;
};

type DateField = "start" | "end";

function getTopicVariant(topic: string): BadgeVariant {
  const value = topic.toLowerCase();
  if (value.includes("battery")) return "success";
  if (value.includes("debug")) return "info";
  if (value.includes("temperature")) return "warning";
  if (value.includes("fault") || value.includes("error")) return "error";
  return "neutral";
}

function parseApiDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function LogCard({ log }: { log: DebugLog }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.logCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.logHeader}>
        <Badge
          label={log.topic}
          variant={getTopicVariant(log.topic)}
          size="sm"
        />
        <Text style={[styles.logTime, { color: colors.textMuted }]}>
          {formatDateTimeIST(log.createdAt)}
        </Text>
      </View>

      <Text
        style={[styles.dataText, { color: colors.textPrimary }]}
        numberOfLines={3}
      >
        {log.data || "—"}
      </Text>

      <View style={styles.logMetrics}>
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            RSSI
          </Text>
          <Text style={[styles.metricValue, { color: colors.danger }]}>
            {log.rssi || "—"}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            SNR
          </Text>
          <Text
            style={[styles.metricValue, { color: colors.badge.warning.text }]}
          >
            {log.snr || "—"}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            DevEUI
          </Text>
          <Text
            style={[styles.metricValueSmall, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {log.deveui || "—"}
          </Text>
        </View>
      </View>

      <View style={styles.logFooter}>
        <Ionicons name="radio-outline" size={12} color={colors.textMuted} />
        <Text
          style={[styles.gatewayText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {log.gateway_id || "—"}
        </Text>
      </View>
    </View>
  );
}

export function RobotDebugLogs({ robotNo, active }: Props) {
  const { colors, isDark } = useTheme();
  const defaultRange = useMemo(() => getDefaultRawLogsDateRange(), []);

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateField, setDateField] = useState<DateField | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadLogs = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");

      try {
        const result = await fetchDebugLogs({
          robotNo,
          page: targetPage,
          limit: PAGE_LIMIT,
          startDate,
          endDate,
        });

        setLogs(result.logs);
        setTotal(result.total);
        setHasNextPage(result.hasNextPage);
        setHasPrevPage(result.hasPrevPage);
      } catch (err) {
        setLogs([]);
        setTotal(0);
        setError(
          err instanceof Error ? err.message : "Failed to load debug logs",
        );
      } finally {
        setLoading(false);
      }
    },
    [robotNo, startDate, endDate],
  );

  useEffect(() => {
    if (!active || !robotNo) return;
    void loadLogs(page);
  }, [active, robotNo, startDate, endDate, page, loadLogs]);

  const openDatePicker = (field: DateField) => {
    setDateField(field);
    setPickerDate(parseApiDate(field === "start" ? startDate : endDate));
  };

  const applyPickedDate = useCallback(
    (picked: Date) => {
      if (!dateField) return;

      const next = toApiDateString(picked);

      if (dateField === "start") {
        setStartDate(next);
        if (next > endDate) {
          setEndDate(next);
        }
      } else {
        setEndDate(next);
        if (next < startDate) {
          setStartDate(next);
        }
      }

      setPage(1);
      setDateField(null);
    },
    [dateField, endDate, startDate],
  );

  const datePicker =
    dateField && Platform.OS === "android" ? (
      <DateTimePicker
        value={pickerDate}
        mode="date"
        display="default"
        onValueChange={(_event, picked) => {
          applyPickedDate(picked);
        }}
        onDismiss={() => setDateField(null)}
      />
    ) : null;

  const iosDatePickerModal =
    dateField && Platform.OS === "ios" ? (
      <Modal
        transparent
        animationType="slide"
        visible
        onRequestClose={() => setDateField(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDateField(null)}
        />
        <View
          style={[
            styles.datePickerSheet,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.datePickerHeader}>
            <Text
              style={[styles.datePickerTitle, { color: colors.textPrimary }]}
            >
              {dateField === "start" ? "Start date" : "End date"}
            </Text>
            <Pressable onPress={() => applyPickedDate(pickerDate)}>
              <Text style={[styles.datePickerDone, { color: colors.primary }]}>
                Done
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="spinner"
            onValueChange={(_event, picked) => setPickerDate(picked)}
            themeVariant={isDark ? "dark" : "light"}
          />
        </View>
      </Modal>
    ) : null;

  if (!active) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.filterCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.filterTitle, { color: colors.textPrimary }]}>
          Date range
        </Text>
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => openDatePicker("start")}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={colors.primary}
            />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatApiDateLabel(startDate)}
            </Text>
          </Pressable>
          <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
          <Pressable
            onPress={() => openDatePicker("end")}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={colors.primary}
            />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatApiDateLabel(endDate)}
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.summaryStrip,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {total}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Total
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {page}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Page
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {logs.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Showing
          </Text>
        </View>
      </View>

      {datePicker}
      {iosDatePickerModal}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading debug logs...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Pressable onPress={() => void loadLogs(page)}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons
            name="document-text-outline"
            size={28}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No debug logs for {robotNo} in this date range.
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Try widening the start and end dates.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {logs.map((log) => (
            <LogCard key={log._id} log={log} />
          ))}
        </View>
      )}

      <View style={styles.pagination}>
        <Pressable
          onPress={() =>
            hasPrevPage && setPage((current) => Math.max(1, current - 1))
          }
          disabled={!hasPrevPage || loading}
          style={[
            styles.pageButton,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
              opacity: !hasPrevPage || loading ? 0.45 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.pageButtonText, { color: colors.textPrimary }]}>
            Prev
          </Text>
        </Pressable>

        <Text style={[styles.pageMeta, { color: colors.textMuted }]}>
          {page} / {totalPages}
        </Text>

        <Pressable
          onPress={() => hasNextPage && setPage((current) => current + 1)}
          disabled={!hasNextPage || loading}
          style={[
            styles.pageButton,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
              opacity: !hasNextPage || loading ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.pageButtonText, { color: colors.textPrimary }]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  filterCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterTitle: {
    ...typography.label,
    fontSize: 12,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  datePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  dateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
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
  summaryValue: {
    ...typography.label,
    fontSize: 16,
    fontWeight: "700",
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.2,
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
  },
  emptyHint: {
    ...typography.caption,
    fontSize: 11,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  datePickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.lg,
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  datePickerTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
  },
  datePickerDone: {
    ...typography.label,
    fontSize: 14,
  },
  list: {
    gap: spacing.sm,
  },
  logCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dataText: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 17,
  },
  logTime: {
    ...typography.caption,
    fontSize: 10,
    flexShrink: 1,
    textAlign: "right",
  },
  logMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCell: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  metricValue: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "700",
  },
  metricValueSmall: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: "600",
  },
  logFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  gatewayText: {
    ...typography.caption,
    fontSize: 10,
    flex: 1,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 34,
  },
  pageButtonText: {
    ...typography.label,
    fontSize: 11,
  },
  pageMeta: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
  },
});
