import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Gateway } from '../../types/gateway';
import {
  formatGatewayUplink,
  getGatewayStatusLabel,
  getGatewayStatusVariant,
  isGatewayOnline,
} from '../../utils/gatewayStatus';

type Props = {
  gateway: Gateway;
  onPress?: () => void;
};

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.metaValue, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function GatewayCard({ gateway, onPress }: Props) {
  const { colors } = useTheme();
  const online = isGatewayOnline(gateway.gateway_status);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: online
                ? colors.badge.success.bg
                : colors.backgroundTertiary,
            },
          ]}
        >
          <Ionicons
            name="radio-outline"
            size={18}
            color={online ? colors.badge.success.text : colors.textMuted}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {gateway.gateway_name || gateway.gateway_name_in_lns_server}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {gateway.gateway_id_in_lns_server}
          </Text>
        </View>

        <Badge
          label={getGatewayStatusLabel(gateway.gateway_status)}
          variant={getGatewayStatusVariant(gateway.gateway_status)}
          size="sm"
        />
      </View>

      <View style={styles.chipRow}>
        <View
          style={[
            styles.typeChip,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Text style={[styles.typeChipText, { color: colors.primary }]}>
            {gateway.gateway_type}
          </Text>
        </View>
        {gateway.gateway_robot_no ? (
          <View
            style={[
              styles.typeChip,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Text style={[styles.typeChipText, { color: colors.textSecondary }]}>
              Robot {gateway.gateway_robot_no}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaBlock}>
        <MetaRow
          icon="time-outline"
          label="Last uplink"
          value={formatGatewayUplink(gateway.last_uplink)}
        />
        <MetaRow
          icon="call-outline"
          label="SIM"
          value={gateway.gateway_simnumber?.trim() || 'Not set'}
        />
        {gateway.gateway_lora_deveui ? (
          <MetaRow
            icon="hardware-chip-outline"
            label="DevEUI"
            value={gateway.gateway_lora_deveui}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeChip: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  typeChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  metaBlock: {
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    width: 72,
  },
  metaValue: {
    ...typography.caption,
    flex: 1,
  },
});
