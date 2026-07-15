import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  title: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
};

export function DprSection({ title, hint, required, children }: Props) {
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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          {required ? (
            <Text style={[styles.requiredMark, { color: colors.danger }]}>
              *
            </Text>
          ) : null}
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  requiredMark: {
    ...typography.label,
    fontSize: 16,
    lineHeight: 18,
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
