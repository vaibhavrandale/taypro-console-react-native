import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Navbar, Screen } from '../components/layout';
import { Badge, Logo } from '../components/ui';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  description: string;
  badgeLabel?: string;
};

export function PlaceholderScreen({
  title,
  subtitle,
  description,
  badgeLabel = 'Coming Soon',
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Navbar title={title} subtitle={subtitle} />
      <Screen>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Logo size="lg" />
          <Badge label={badgeLabel} variant="info" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
  },
  description: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
});
