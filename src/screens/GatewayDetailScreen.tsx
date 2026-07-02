import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Navbar, Screen } from '../components/layout';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { DrawerParamList } from '../navigation/types';

type Route = RouteProp<DrawerParamList, 'GatewayDetail'>;
type Navigation = DrawerNavigationProp<DrawerParamList, 'GatewayDetail'>;

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.detailRow,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

export function GatewayDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { gatewayId, gatewayName, gatewayType } = route.params;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Gateway"
        subtitle={gatewayName ?? gatewayId}
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.navButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />

      <Screen scroll>
        <View style={styles.grid}>
          <DetailRow label="Gateway Name" value={gatewayName ?? '—'} />
          <DetailRow label="Gateway Type" value={gatewayType ?? '—'} />
          <DetailRow label="Gateway ID" value={gatewayId ?? '—'} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    gap: spacing.sm,
  },
  detailRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    ...typography.label,
    fontSize: 13,
  },
});
