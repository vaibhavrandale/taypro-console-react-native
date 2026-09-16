import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Navbar, Screen } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { fetchMySubscription } from '../api/subscription';
import type { DrawerParamList } from '../navigation/types';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ClientSubscription } from '../types/subscription';

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

export function MySubscriptionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setSubscription(await fetchMySubscription());
    } catch (err) {
      setSubscription(null);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const invoices = subscription?.invoice ?? [];
  const latest = invoices[invoices.length - 1];
  const paid = latest?.status === 'paid';

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="My Subscription" subtitle="Plan and invoices" />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }
      >
        {loading && !subscription ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : !subscription ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Please subscribe
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              You do not have an active subscription yet.
            </Text>
            <Button
              title="View Pricing"
              onPress={() => navigation.navigate('Pricing')}
            />
          </View>
        ) : (
          <View style={styles.list}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.client, { color: colors.textPrimary }]}>
                {subscription.client_name || subscription.client_id || 'Subscription'}
              </Text>
              <View style={styles.badgeRow}>
                {subscription.plan_id ? (
                  <Badge
                    label={subscription.plan_id.toUpperCase()}
                    variant="success"
                    size="sm"
                  />
                ) : null}
                {subscription.subscription_status ? (
                  <Badge
                    label={subscription.subscription_status.toUpperCase()}
                    variant={
                      subscription.subscription_status === 'expired'
                        ? 'error'
                        : 'success'
                    }
                    size="sm"
                  />
                ) : null}
                {latest?.status ? (
                  <Badge
                    label={paid ? 'Paid' : 'Pending'}
                    variant={paid ? 'success' : 'warning'}
                    size="sm"
                  />
                ) : null}
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {formatDate(subscription.subscription_start_date)} →{' '}
                {formatDate(subscription.subscription_end_date)}
              </Text>
              {subscription.frequency ? (
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {(subscription.frequency ?? '').toUpperCase()}
                </Text>
              ) : null}
            </View>

            {invoices.length > 0 ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.section, { color: colors.textPrimary }]}>
                  Invoices
                </Text>
                {invoices.map((invoice, index) => (
                  <View
                    key={invoice.invoice_id ?? `${invoice.start_date}-${index}`}
                    style={[styles.invoiceRow, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.invoiceId, { color: colors.textPrimary }]}>
                      {invoice.invoice_id || `Invoice ${index + 1}`}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {(invoice.frequency ?? '—').toUpperCase()} ·{' '}
                      {formatDate(invoice.start_date)} → {formatDate(invoice.end_date)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Button
              title="View Pricing"
              variant="outline"
              onPress={() => navigation.navigate('Pricing')}
            />
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  loader: { marginTop: spacing.xl },
  error: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h3, textAlign: 'center' },
  emptyBody: { ...typography.bodySmall, textAlign: 'center' },
  client: { ...typography.h3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { ...typography.bodySmall },
  section: { ...typography.label },
  invoiceRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    gap: 2,
  },
  invoiceId: { ...typography.label, fontSize: 13 },
});
