import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Navbar, Screen } from '../components/layout';
import { fetchSubscriptionPlans } from '../api/subscription';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { SubscriptionPlan } from '../types/subscription';

const FEATURE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Robot Operating': 'hardware-chip-outline',
  'Battery Status': 'battery-charging-outline',
  'Cleaning Log': 'list-outline',
  'Site Management': 'location-outline',
  'Statistics/Reports': 'stats-chart-outline',
  'Preventive Maintenance': 'build-outline',
  'Prev. Maintenance': 'build-outline',
  'Live Chat': 'chatbubbles-outline',
  'Robot Position Tracking': 'navigate-outline',
  'Robot Pos. Tracking': 'navigate-outline',
  'Forecast Weather Alert': 'cloud-outline',
};

export function PricingScreen() {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const rows = await fetchSubscriptionPlans();
      setPlans(rows.filter((plan) => plan.plan_id !== 'free_trial'));
    } catch (err) {
      setPlans([]);
      setError(err instanceof Error ? err.message : 'Failed to load plans');
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

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="Pricing" subtitle="Subscription plans" />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }
      >
        {loading && plans.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : (
          <View style={styles.list}>
            {plans.map((plan) => (
              <View
                key={plan._id ?? plan.plan_id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.planName, { color: colors.textPrimary }]}>
                  {plan.name}
                </Text>
                {plan.description ? (
                  <Text style={[styles.planDesc, { color: colors.textSecondary }]}>
                    {plan.description}
                  </Text>
                ) : null}
                {(plan.features ?? []).map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name={FEATURE_ICONS[feature] ?? 'checkmark-circle-outline'}
                      size={14}
                      color={colors.badge.warning.text}
                    />
                    <Text style={[styles.feature, { color: colors.textSecondary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
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
    gap: spacing.xs,
  },
  planName: {
    ...typography.h3,
  },
  planDesc: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  feature: {
    ...typography.bodySmall,
    flex: 1,
  },
});
