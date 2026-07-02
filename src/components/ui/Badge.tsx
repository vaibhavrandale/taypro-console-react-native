import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'purple';

type Props = {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
};

export function Badge({ label, variant = 'neutral', size = 'md' }: Props) {
  const { colors } = useTheme();
  const badgeColors = colors.badge[variant];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: badgeColors.bg },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: badgeColors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  textSm: {
    fontSize: 9,
    lineHeight: 12,
  },
});
