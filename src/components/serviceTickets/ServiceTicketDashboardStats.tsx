import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ServiceTicketDashboardStats as Stats } from '../../types/serviceTickets';

const BAR_MAX_HEIGHT = 110;
const BAR_WIDTH = 28;
const Y_AXIS_WIDTH = 32;

function fmtSite(id = '') {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysText(n?: number | null) {
  const days = Math.max(0, Math.round(Number(n) || 0));
  if (days === 1) return '1 day';
  return `${days} days`;
}

function yTicks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max));
  if (top <= 2) return [top, Math.max(0, Math.floor(top / 2)), 0];
  const mid = Math.round(top / 2);
  return [top, mid, 0];
}

type BarItem = {
  key: string;
  label: string;
  value: number;
  color: string;
  detail?: string;
};

function VerticalBars({ items, max }: { items: BarItem[]; max: number }) {
  const { colors } = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const ticks = useMemo(() => yTicks(max), [max]);
  const selected = items.find((item) => item.key === selectedKey);

  if (items.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>No data</Text>
    );
  }

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBody}>
        <View style={[styles.yAxis, { height: BAR_MAX_HEIGHT }]}>
          {ticks.map((tick, index) => (
            <Text
              key={`${tick}-${index}`}
              style={[styles.yTick, { color: colors.textMuted }]}
            >
              {tick}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartRow}
          style={styles.chartScroll}
        >
          {items.map((item) => {
            const height = Math.max(
              4,
              max > 0 ? Math.round((item.value / max) * BAR_MAX_HEIGHT) : 4,
            );
            const isSelected = selectedKey === item.key;
            return (
              <Pressable
                key={item.key}
                style={styles.barColumn}
                onPress={() =>
                  setSelectedKey((prev) =>
                    prev === item.key ? null : item.key,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${item.detail ?? item.value}`}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height,
                        width: BAR_WIDTH,
                        backgroundColor: item.color,
                        opacity: selectedKey && !isSelected ? 0.45 : 1,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    {
                      color: isSelected
                        ? colors.textPrimary
                        : colors.textMuted,
                      fontWeight: isSelected ? '700' : '400',
                    },
                  ]}
                  numberOfLines={3}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[styles.barHint, { color: colors.textMuted }]}>
        {selected
          ? `${selected.label}: ${selected.detail ?? selected.value}`
          : 'Tap a bar to see its value'}
      </Text>
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {hint ? (
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function ServiceTicketDashboardStatsCard({ stats }: { stats: Stats }) {
  const { colors } = useTheme();
  const { summary, by_site, recurring_faults, pending_aging, oldest_pending } =
    stats;

  const statusItems: BarItem[] = [
    {
      key: 'fixed',
      label: 'Fixed / closed',
      value: summary.resolved,
      color: colors.primary,
    },
    {
      key: 'open',
      label: 'Still open',
      value: summary.pending,
      color: colors.badge.warning.text,
    },
  ];
  const statusMax = Math.max(summary.resolved, summary.pending, 1);

  const agingItems: BarItem[] = pending_aging.map((bucket) => ({
    key: bucket.label,
    label: bucket.label,
    value: bucket.count,
    color: bucket.label.includes('30+')
      ? colors.danger
      : colors.badge.info.text,
  }));
  const agingMax = Math.max(...pending_aging.map((b) => b.count), 1);

  const siteItems: BarItem[] = by_site.slice(0, 8).map((site) => ({
    key: site.site_id,
    label: fmtSite(site.site_id),
    value: site.pending,
    color: colors.badge.warning.text,
    detail: String(site.pending),
  }));
  const siteMax = Math.max(...by_site.slice(0, 8).map((s) => s.pending), 1);

  const faultItems: BarItem[] = recurring_faults.slice(0, 6).map((fault) => ({
    key: fault.fault_type,
    label: fault.fault_type.trim() || '—',
    value: fault.count,
    color: colors.badge.info.text,
    detail: String(fault.count),
  }));
  const faultMax = Math.max(
    ...recurring_faults.slice(0, 6).map((f) => f.count),
    1,
  );

  const waitHint = useMemo(() => {
    const days = summary.avg_pending_days;
    if (summary.pending <= 0) return 'No open tickets right now';
    if (days <= 3) return 'Open tickets are closing quickly';
    if (days <= 14) return 'Some tickets are waiting more than a week';
    return 'Many tickets are waiting a long time — please close soon';
  }, [summary.avg_pending_days, summary.pending]);

  return (
    <View style={styles.wrap}>
      <View style={styles.kpiRow}>
        <View
          style={[
            styles.kpi,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.kpiValue, { color: colors.badge.info.text }]}>
            {summary.raised}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Total tickets
          </Text>
        </View>
        <View
          style={[
            styles.kpi,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.kpiValue, { color: colors.primary }]}>
            {summary.resolved}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Fixed / closed
          </Text>
        </View>
        <View
          style={[
            styles.kpi,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.kpiValue, { color: colors.badge.warning.text }]}>
            {summary.pending}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Still open
          </Text>
        </View>
        <View
          style={[
            styles.kpi,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.kpiValue, { color: colors.danger }]}>
            {daysText(summary.avg_pending_days)}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Open tickets wait
          </Text>
          <Text style={[styles.kpiHint, { color: colors.textMuted }]}>
            {waitHint}
          </Text>
        </View>
      </View>

      <Section
        title="Fixed vs still open"
        hint="Green = fixed. Orange = still open."
      >
        <VerticalBars items={statusItems} max={statusMax} />
      </Section>

      <Section
        title="How long are open tickets waiting?"
        hint="Shows count of tickets in each waiting period."
      >
        {pending_aging.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No open tickets
          </Text>
        ) : (
          <VerticalBars items={agingItems} max={agingMax} />
        )}
      </Section>

      <Section
        title="Sites with open tickets"
        hint="Taller bar = more tickets still open at that site."
      >
        {by_site.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No site data
          </Text>
        ) : (
          <VerticalBars items={siteItems} max={siteMax} />
        )}
      </Section>

      <Section
        title="Common problems"
        hint="Problems that come again and again."
      >
        {recurring_faults.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No fault data
          </Text>
        ) : (
          <VerticalBars items={faultItems} max={faultMax} />
        )}
      </Section>

      <Section
        title="Oldest open tickets"
        hint="These tickets are waiting the longest. Close them first."
      >
        {oldest_pending.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No open tickets
          </Text>
        ) : (
          oldest_pending.slice(0, 5).map((ticket) => (
            <View key={ticket._id} style={styles.oldRow}>
              <View style={styles.oldLeft}>
                <Text
                  style={[styles.oldId, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {ticket.ticket_id || ticket._id}
                </Text>
                <Text
                  style={[styles.oldMeta, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {ticket.robot_no || '—'} · {fmtSite(ticket.site_id)}
                </Text>
              </View>
              <Text style={[styles.oldDays, { color: colors.danger }]}>
                waiting {daysText(ticket.days_pending)}
              </Text>
            </View>
          ))
        )}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  kpi: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  kpiValue: {
    ...typography.h3,
    fontSize: 16,
  },
  kpiLabel: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
  kpiHint: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 4,
    fontWeight: '400',
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
  },
  sectionHint: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 13,
    marginTop: -4,
    fontWeight: '400',
  },
  chartWrap: {
    gap: spacing.xs,
  },
  chartBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yTick: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  chartScroll: {
    flex: 1,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: BAR_MAX_HEIGHT + 40,
  },
  barColumn: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    width: BAR_WIDTH,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  barLabel: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    width: '100%',
    height: 33,
  },
  barHint: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    paddingLeft: Y_AXIS_WIDTH,
  },
  oldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  oldLeft: {
    flex: 1,
    minWidth: 0,
  },
  oldId: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  oldMeta: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 1,
  },
  oldDays: {
    ...typography.label,
    fontSize: 11,
  },
  empty: {
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
