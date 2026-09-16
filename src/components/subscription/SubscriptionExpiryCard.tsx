import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Navbar } from '../layout';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/api';
import type { DrawerParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge, Button } from '../ui';
import type { SubscriptionStatusCode } from '../../types/subscription';
import {
  SubscriptionError,
  isSubscriptionError,
} from '../../utils/subscription';

const STATUS_META: Record<
  SubscriptionStatusCode,
  { label: string; variant: 'warning' | 'error' | 'info' | 'neutral' }
> = {
  subscriptionSitesAssigned: { label: 'Sites Assigned Issue', variant: 'warning' },
  subscriptionFound: { label: 'Subscription Not Found', variant: 'error' },
  subscriptionaRenewStatus: { label: 'Renewal Required', variant: 'info' },
  subscriptionPaymentStatus: { label: 'Payment Pending', variant: 'error' },
  subscriptionPlanAccess: { label: 'Access Restricted', variant: 'neutral' },
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function logoUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const root = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${root}${path.startsWith('/') ? path : `/${path}`}`;
}

type CardProps = {
  error: SubscriptionError;
};

export function SubscriptionExpiryCard({ error }: CardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const data = error.data;
  const meta = STATUS_META[error.subscriptionStatus] ?? {
    label: 'Subscription Alert',
    variant: 'error' as const,
  };

  const goPricing = () => navigation.navigate('Pricing');
  const goMine = () => navigation.navigate('MySubscription');

  if (!data) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <Ionicons name="warning" size={28} color={colors.badge.warning.text} />
        <Text style={[styles.unlockTitle, { color: colors.textPrimary }]}>
          Please Subscribe to Unlock this Feature!
        </Text>
        <Button title="View Pricing" size="sm" onPress={goPricing} />
      </View>
    );
  }

  const latest = data.invoice?.[data.invoice.length - 1];
  const pill =
    latest?.status === 'pending'
      ? 'Payment Pending'
      : latest?.status === 'paid'
        ? 'Upgrade Plan'
        : 'Subscribe Now';
  const logo = logoUri(data.client_logo);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="warning" size={18} color={colors.badge[meta.variant].text} />
        <Text style={[styles.headerLabel, { color: colors.textPrimary }]}>
          {meta.label}
        </Text>
        <Badge label={pill} variant={meta.variant} size="sm" />
      </View>

      <View style={styles.clientRow}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: colors.backgroundTertiary }]}>
            <Ionicons name="business-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.clientCopy}>
          <Text style={[styles.clientName, { color: colors.textPrimary }]}>
            {data.client_name || 'Client'}
          </Text>
          {data.plan_id ? (
            <Badge
              label={String(data.plan_id).toUpperCase()}
              variant="success"
              size="sm"
            />
          ) : null}
        </View>
      </View>

      <View style={styles.metaGrid}>
        <Meta label="Start" value={formatDate(data.subscription_start_date)} />
        <Meta label="End" value={formatDate(data.subscription_end_date)} />
        <Meta
          label="Frequency"
          value={String(data.frequency ?? '—').toUpperCase()}
        />
        <Meta
          label="Status"
          value={String(data.subscription_status ?? '—').toUpperCase()}
        />
      </View>

      {error.message ? (
        <Text style={[styles.message, { color: colors.badge.warning.text }]}>{error.message}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button title="My Subscription" size="sm" variant="outline" onPress={goMine} />
        <Button title="View Pricing" size="sm" onPress={goPricing} />
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Full-page takeover: navbar + expiry card, nothing else. */
export function SubscriptionBlockedPage({
  title,
  subtitle,
  error,
  onBack,
}: {
  title: string;
  subtitle?: string;
  error: SubscriptionError;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const leftAction = onBack ? (
    <Pressable
      onPress={onBack}
      style={[styles.backBtn, { backgroundColor: colors.backgroundTertiary }]}
    >
      <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.blocked, { backgroundColor: colors.background }]}>
      <Navbar
        title={title}
        subtitle={subtitle}
        showMenu={!onBack}
        leftAction={leftAction}
      />
      <ScrollView
        contentContainerStyle={styles.blockedBody}
        keyboardShouldPersistTaps="handled"
      >
        <SubscriptionExpiryCard error={error} />
      </ScrollView>
    </View>
  );
}

/** Renders the subscription card or a plain retry error. */
export function ScreenError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  if (error == null || error === '') return null;
  if (isSubscriptionError(error)) {
    return (
      <View style={styles.screenPad}>
        <SubscriptionExpiryCard error={error} />
      </View>
    );
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Something went wrong';

  return (
    <View
      style={[
        styles.plainError,
        { backgroundColor: colors.badge.error.bg, borderColor: colors.danger },
      ]}
    >
      <Text style={{ color: colors.danger }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1 },
  blockedBody: {
    flexGrow: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenPad: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  unlockTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerLabel: {
    ...typography.label,
    flex: 1,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientCopy: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    ...typography.label,
    fontSize: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    width: '47%',
    gap: 2,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  message: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  plainError: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
