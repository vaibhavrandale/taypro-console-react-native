import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { RobotUptimeDay } from '../../types/robotUptime';
import {
  formatShortDate,
  getUptimeTone,
  isRainOrNoRunDay,
} from '../../utils/robotUptime';

type Props = {
  day: RobotUptimeDay;
  defaultExpanded?: boolean;
  onViewDpr?: () => void;
  onSubmitDpr?: () => void;
};

export function DailyUptimeCard({
  day,
  defaultExpanded = false,
  onViewDpr,
  onSubmitDpr,
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cleaningTone = getUptimeTone(day.cleaning_uptime_percentage, colors);
  const availabilityTone = getUptimeTone(
    day.availibility_uptime_percentage,
    colors,
  );
  const rainDay = isRainOrNoRunDay(day);
  const dprComment = day.dpr?.dpr_comment?.trim();
  const submittedBy = day.dpr?.submitted_by?.trim();
  const hasDpr = Boolean(dprComment && dprComment !== 'No Comments Available');

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
        <View style={styles.dateBlock}>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatShortDate(day.date)}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              label={`Clean ${day.cleaning_uptime_percentage}%`}
              variant={cleaningTone.variant}
              size="sm"
            />
            <Badge
              label={`Avail ${day.availibility_uptime_percentage}%`}
              variant={availabilityTone.variant}
              size="sm"
            />
            {rainDay ? (
              <Badge label="No Run" variant="warning" size="sm" />
            ) : null}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>

      <View style={styles.metricsRow}>
        <MetricPill
          label="Success"
          value={day.success_count}
          color={colors.primary}
        />
        <MetricPill
          label="Failure"
          value={day.failure_count}
          color={colors.danger}
        />
        <MetricPill
          label="Available"
          value={day.available_robots}
          color={colors.badge.info.text}
        />
        <MetricPill
          label="Total"
          value={day.total_robots}
          color={colors.textPrimary}
        />
      </View>

      {expanded ? (
        <View
          style={[
            styles.dprBlock,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.dprHeader}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.badge.info.text}
            />
            <Text style={[styles.dprTitle, { color: colors.textPrimary }]}>
              DPR Notes
            </Text>
          </View>
          <Text style={[styles.dprComment, { color: colors.textSecondary }]}>
            {hasDpr ? dprComment : 'No DPR comment submitted for this day.'}
          </Text>
          {submittedBy ? (
            <Text style={[styles.dprAuthor, { color: colors.textMuted }]}>
              — {submittedBy}
            </Text>
          ) : null}
          {hasDpr && onViewDpr ? (
            <Pressable onPress={onViewDpr} style={styles.dprLinkRow}>
              <Text style={[styles.dprLinkText, { color: colors.primary }]}>
                View DPR
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
          {!hasDpr && onSubmitDpr ? (
            <Pressable onPress={onSubmitDpr} style={styles.dprLinkRow}>
              <Text style={[styles.dprLinkText, { color: colors.primary }]}>
                Submit DPR
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : hasDpr ? (
        <Text
          style={[styles.preview, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {dprComment}
        </Text>
      ) : null}
    </Pressable>
  );
}

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dateBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.label,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricPill: {
    minWidth: '22%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  preview: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  dprBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dprHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dprTitle: {
    ...typography.label,
    fontSize: 12,
  },
  dprComment: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  dprAuthor: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  dprLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dprLinkText: {
    ...typography.label,
    fontSize: 12,
  },
});
