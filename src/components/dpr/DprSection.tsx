import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  title: string;
  hint?: string;
  children: React.ReactNode;
};

export function DprSection({ title, hint, children }: Props) {
  const { colors } = useTheme();

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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
        {hint ? (
          <Text style={[styles.hint, { color: colors.badge.warning.text }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function DprReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.field,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    minWidth: '45%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  fieldValue: {
    ...typography.label,
    fontSize: 14,
  },
});
