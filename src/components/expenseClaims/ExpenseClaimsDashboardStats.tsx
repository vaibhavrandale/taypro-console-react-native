import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ExpenseClaim } from '../../types/expenseClaims';

const BAR_MAX_HEIGHT = 110;
const BAR_WIDTH = 28;

type BarItem = {
  key: string;
  label: string;
  value: number;
  color: string;
  detail?: string;
};

export type ExpenseDashboardStats = {
  totalClaims: number;
  approved: number;
  pending: number;
  draft: number;
  rejected: number;
  totalAmount: number;
  byType: { type: string; count: number; amount: number }[];
};

function isApproved(claim: ExpenseClaim) {
  const status = String(
    claim.console_status ?? claim.status ?? claim.workflow_state ?? '',
  ).toLowerCase();
  return status.includes('approved') || status === 'paid';
}

function isRejected(claim: ExpenseClaim) {
  const status = String(
    claim.console_status ?? claim.status ?? claim.workflow_state ?? '',
  ).toLowerCase();
  return status.includes('reject') || status.includes('cancel');
}

function isDraft(claim: ExpenseClaim) {
  const status = String(
    claim.console_status ?? claim.status ?? claim.workflow_state ?? '',
  ).toLowerCase();
  return !status || status === 'draft';
}

export function buildExpenseDashboardStats(
  claims: ExpenseClaim[],
  knownTotal?: number,
): ExpenseDashboardStats {
  const typeMap = new Map<string, { count: number; amount: number }>();
  let approved = 0;
  let pending = 0;
  let draft = 0;
  let rejected = 0;
  let totalAmount = 0;

  for (const claim of claims) {
    const amount = Number(
      claim.grand_total ??
        claim.total_claimed_amount ??
        claim.total_sanctioned_amount ??
        0,
    );
    totalAmount += Number.isFinite(amount) ? amount : 0;

    if (isRejected(claim)) rejected += 1;
    else if (isApproved(claim)) approved += 1;
    else if (isDraft(claim)) draft += 1;
    else pending += 1;

    for (const line of claim.expenses ?? []) {
      const type = (line.expense_type || 'Other').trim() || 'Other';
      const lineAmount = Number(line.amount ?? line.sanctioned_amount ?? 0);
      const prev = typeMap.get(type) ?? { count: 0, amount: 0 };
      typeMap.set(type, {
        count: prev.count + 1,
        amount: prev.amount + (Number.isFinite(lineAmount) ? lineAmount : 0),
      });
    }
  }

  const byType = [...typeMap.entries()]
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count);

  return {
    totalClaims: knownTotal && knownTotal > claims.length ? knownTotal : claims.length,
    approved,
    pending,
    draft,
    rejected,
    totalAmount,
    byType,
  };
}

function formatMoney(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

function VerticalBars({ items, max }: { items: BarItem[]; max: number }) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>No data</Text>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chartRow}
    >
      {items.map((item) => {
        const height = Math.max(
          4,
          max > 0 ? Math.round((item.value / max) * BAR_MAX_HEIGHT) : 4,
        );
        return (
          <View key={item.key} style={styles.barColumn}>
            <Text style={[styles.barValueTop, { color: colors.textPrimary }]}>
              {item.detail ?? String(item.value)}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height,
                    width: BAR_WIDTH,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.barLabel, { color: colors.textMuted }]}
              numberOfLines={3}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
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

export function ExpenseClaimsDashboardStats({
  stats,
}: {
  stats: ExpenseDashboardStats;
}) {
  const { colors } = useTheme();

  const statusItems: BarItem[] = useMemo(
    () =>
      [
        {
          key: 'approved',
          label: 'Approved',
          value: stats.approved,
          color: colors.primary,
        },
        {
          key: 'pending',
          label: 'Waiting',
          value: stats.pending,
          color: colors.badge.warning.text,
        },
        {
          key: 'draft',
          label: 'Draft',
          value: stats.draft,
          color: colors.badge.info.text,
        },
        {
          key: 'rejected',
          label: 'Rejected',
          value: stats.rejected,
          color: colors.danger,
        },
      ].filter((item) => item.value > 0),
    [stats, colors],
  );
  const statusMax = Math.max(...statusItems.map((i) => i.value), 1);

  const typeItems: BarItem[] = useMemo(
    () =>
      stats.byType.slice(0, 6).map((row) => ({
        key: row.type,
        label: row.type,
        value: row.count,
        color: colors.badge.info.text,
        detail: String(row.count),
      })),
    [stats.byType, colors],
  );
  const typeMax = Math.max(...typeItems.map((i) => i.value), 1);

  const amountItems: BarItem[] = useMemo(
    () =>
      stats.byType.slice(0, 6).map((row) => ({
        key: `amt-${row.type}`,
        label: row.type,
        value: row.amount,
        color: colors.badge.warning.text,
        detail: formatMoney(row.amount),
      })),
    [stats.byType, colors],
  );
  const amountMax = Math.max(...amountItems.map((i) => i.value), 1);

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
            {stats.totalClaims}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Total claims
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
            {stats.approved}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Approved
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
            {stats.pending + stats.draft}
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
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
            {formatMoney(stats.totalAmount)}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
            Total amount
          </Text>
        </View>
      </View>

      <Section
        title="Claim status"
        hint="How many claims are approved, waiting, or draft."
      >
        <VerticalBars items={statusItems} max={statusMax} />
      </Section>

      <Section
        title="Expense types"
        hint="How many times each type was claimed (Food, Travel, etc)."
      >
        <VerticalBars items={typeItems} max={typeMax} />
      </Section>

      <Section
        title="Amount by type"
        hint="Taller bar = more money claimed for that type."
      >
        <VerticalBars items={amountItems} max={amountMax} />
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  barColumn: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  barValueTop: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    height: 14,
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
  empty: {
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
