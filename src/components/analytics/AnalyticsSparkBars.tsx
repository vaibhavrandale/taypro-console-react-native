import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Series = {
  label: string;
  color: string;
  values: Array<number | null>;
};

type Props = {
  title: string;
  subtitle?: string;
  labels: string[];
  series: Series[];
  height?: number;
};

export function AnalyticsSparkBars({
  title,
  subtitle,
  labels,
  series,
  height = 110,
}: Props) {
  const { colors } = useTheme();
  const max = Math.max(
    0.001,
    ...series.flatMap((s) => s.values.map((v) => v ?? 0)),
  );

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
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          {labels.map((label, i) => (
            <View key={`${label}-${i}`} style={styles.col}>
              <View style={[styles.bars, { height }]}>
                {series.map((s) => {
                  const v = s.values[i];
                  const h =
                    v == null ? 0 : Math.max(2, (v / max) * (height - 4));
                  return (
                    <View
                      key={s.label}
                      style={[
                        styles.bar,
                        {
                          height: h,
                          backgroundColor: v == null ? colors.border : s.color,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={[styles.tick, { color: colors.textMuted }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  title: { ...typography.label, fontSize: 13, fontWeight: '700' },
  subtitle: { ...typography.caption, fontSize: 11 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 },
  col: { alignItems: 'center', gap: 4, minWidth: 28 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: { width: 8, borderRadius: 2 },
  tick: { ...typography.caption, fontSize: 9 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, fontSize: 10 },
});
