import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  sub?: string | null;
  accent: string;
};

export function AnalyticsKpiCard({ label, value, unit, sub, accent }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
          borderTopColor: accent,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: accent }]}>
          {value == null || value === '' ? '—' : String(value)}
        </Text>
        {unit ? (
          <Text style={[styles.unit, { color: colors.textMuted }]}>{unit}</Text>
        ) : null}
      </View>
      {sub ? (
        <Text style={[styles.sub, { color: colors.textMuted }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    borderWidth: 1,
    borderTopWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 22, fontWeight: '700' },
  unit: { ...typography.caption, fontSize: 11 },
  sub: { ...typography.caption, fontSize: 11 },
});
