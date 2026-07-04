import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../ui";
import { useTheme } from "../../theme";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type {
  TechnicianDprRecord,
  TechnicianPresentEntry,
} from "../../types/technicianDpr";
import { resolveProfileImageUri } from "../../utils/cleaningLogs";
import {
  formatDprReportDate,
  getDprSubmittedBy,
  getDprSubmitter,
} from "../../utils/dprHistory";

type Props = {
  record: TechnicianDprRecord;
  defaultExpanded?: boolean;
};

function ProfileAvatar({
  profileImage,
  size = 32,
}: {
  profileImage?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const imageUri = resolveProfileImageUri(profileImage);
  const radiusValue = size / 2;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: radiusValue },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: radiusValue,
          backgroundColor: colors.backgroundTertiary,
        },
      ]}
    >
      <Ionicons name="person" size={size * 0.45} color={colors.textMuted} />
    </View>
  );
}

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.metricPill,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export function DprRecordCard({ record, defaultExpanded = false }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const ops = record.robots_operational_details;
  const pm = record.preventive_maintenance_status;
  const tickets = record.ticket_details;
  const breakdowns = record.breakdown_reasons ?? [];
  const breakdownCount = breakdowns.reduce(
    (sum, item) => sum + (item.robots?.length || item.count || 0),
    0,
  );
  const submitter = getDprSubmitter(record);
  const technicians = record.technician_present ?? [];

  return (
    <Pressable
      onPress={() => setExpanded((value) => !value)}
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: expanded ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatDprReportDate(record.new_report_date ?? record.report_date)}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={record.site_id ?? "—"} variant="info" size="sm" />
            <Badge
              label={`Uptime ${ops?.robots_uptime ?? 0}`}
              variant="success"
              size="sm"
            />
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </View>

      <View style={styles.submitterRow}>
        <ProfileAvatar profileImage={submitter?.profile_image} size={36} />
        <View style={styles.submitterInfo}>
          <Text style={[styles.submittedByLabel, { color: colors.textMuted }]}>
            Submitted by
          </Text>
          <Text style={[styles.submittedByName, { color: colors.textPrimary }]}>
            {getDprSubmittedBy(record)}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricPill
          label="Ready"
          value={ops?.ready_for_operational ?? 0}
          color={colors.textPrimary}
        />
        <MetricPill
          label="Online"
          value={ops?.online_operational ?? 0}
          color={colors.primary}
        />
        <MetricPill
          label="Manual"
          value={ops?.manual_operational ?? 0}
          color={colors.badge.info.text}
        />
        <MetricPill
          label="Unop"
          value={ops?.unoperational ?? 0}
          color={colors.danger}
        />
      </View>

      {expanded ? (
        <View style={styles.details}>
          <DetailBlock title="Comments" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {record.comments?.trim() || "No comments"}
            </Text>
          </DetailBlock>

          <DetailBlock title="Technicians Present" colors={colors}>
            {technicians.length === 0 ? (
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                —
              </Text>
            ) : (
              <View style={styles.technicianList}>
                {technicians.map((tech) => (
                  <TechnicianChip key={tech._id ?? tech.technician_id} tech={tech} />
                ))}
              </View>
            )}
          </DetailBlock>

          <DetailBlock title="Preventive Maintenance" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              Auto {pm?.automatic.completed ?? 0}/{pm?.automatic.attempted ?? 0}
              {" · "}
              Semi {pm?.semi_automatic.completed ?? 0}/
              {pm?.semi_automatic.attempted ?? 0}
              {" · "}
              Total {pm?.total_pm_done ?? 0}
            </Text>
          </DetailBlock>

          <DetailBlock title="Tickets" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              Raised {tickets?.total_raised ?? 0} · Closed{" "}
              {tickets?.total_closed ?? 0} · Pending{" "}
              {tickets?.total_pending ?? 0}
            </Text>
          </DetailBlock>

          <DetailBlock
            title={`Breakdown Reasons (${breakdownCount})`}
            colors={colors}
          >
            {breakdowns.length === 0 ? (
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                No breakdown reasons recorded
              </Text>
            ) : (
              breakdowns.map((item, index) => (
                <View
                  key={`${item.reason}-${index}`}
                  style={[
                    styles.breakdownRow,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.breakdownReason, { color: colors.danger }]}
                  >
                    {item.reason}
                  </Text>
                  <Text
                    style={[styles.bodyText, { color: colors.textSecondary }]}
                  >
                    {item.robots?.length
                      ? item.robots
                          .map((robot) => `${robot.robot_no} (${robot.block})`)
                          .join(", ")
                      : "No robots listed"}
                  </Text>
                </View>
              ))
            )}
          </DetailBlock>
        </View>
      ) : record.comments ? (
        <Text
          style={[styles.preview, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {record.comments}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TechnicianChip({ tech }: { tech: TechnicianPresentEntry }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.technicianChip,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <ProfileAvatar profileImage={tech.profile_image} size={28} />
      <Text
        style={[styles.technicianChipName, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {tech.name ?? tech.email ?? "Unknown"}
      </Text>
    </View>
  );
}

function DetailBlock({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>["colors"];
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.detailBlock,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.label,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  submitterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  submitterInfo: {
    flex: 1,
    gap: 2,
  },
  submittedByLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  submittedByName: {
    ...typography.label,
    fontSize: 13,
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.25)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  technicianList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  technicianChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingRight: spacing.sm,
    paddingLeft: 4,
    maxWidth: "100%",
  },
  technicianChipName: {
    ...typography.bodySmall,
    flexShrink: 1,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metricPill: {
    minWidth: "22%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: "uppercase",
  },
  preview: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  details: {
    gap: spacing.sm,
  },
  detailBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  detailTitle: {
    ...typography.label,
    fontSize: 12,
  },
  bodyText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  breakdownRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  breakdownReason: {
    ...typography.label,
    fontSize: 12,
  },
});
