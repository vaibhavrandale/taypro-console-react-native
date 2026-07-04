import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getUptimeTone } from '../../utils/robotUptime';

type Props = {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
};

export function UptimeMetricCard({ label, value, suffix = '%', accent }: Props) {
  const { colors } = useTheme();
  const tone = getUptimeTone(value, colors);
  const barColor = accent ?? tone.color;

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
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: barColor }]}>
        {Math.round(value)}
        <Text style={styles.suffix}>{suffix}</Text>
      </Text>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.backgroundTertiary },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: `${Math.max(0, Math.min(100, value))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  value: {
    ...typography.h2,
    fontSize: 28,
    lineHeight: 32,
  },
  suffix: {
    fontSize: 16,
    fontWeight: '600',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
