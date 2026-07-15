import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button } from '../ui';
import { useLocationTracking } from '../../context/LocationTrackingContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
import { resetLocationDebugStats } from '../../utils/locationActivityQueue';

type Props = {
  visible?: boolean;
};

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statCell,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

/** Testing-only panel for location queue / upload breakdown. */
export function LocationSyncStatusCard({ visible = true }: Props) {
  const { colors } = useTheme();
  const { syncStatus, syncNow, syncingNow } = useLocationTracking();

  if (!visible) {
    return null;
  }

  const pending =
    syncStatus.totalCaptured -
    syncStatus.uploadedDirect -
    syncStatus.uploadedFromMemory;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.badge.warning.text,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name="bug-outline"
            size={18}
            color={colors.badge.warning.text}
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Location debug
          </Text>
        </View>
        <Badge
          label={syncStatus.isTracking ? 'Tracking' : 'Idle'}
          variant={syncStatus.isTracking ? 'success' : 'neutral'}
          size="sm"
        />
      </View>

      <Text style={[styles.hint, { color: colors.badge.warning.text }]}>
        Testing only — shows queue vs upload breakdown
      </Text>

      <View style={styles.grid}>
        <StatCell
          label="In queue (device)"
          value={syncStatus.queueCount}
          color={colors.badge.warning.text}
        />
        <StatCell
          label="Direct upload"
          value={syncStatus.uploadedDirect}
          color={colors.primary}
        />
        <StatCell
          label="From memory"
          value={syncStatus.uploadedFromMemory}
          color={colors.badge.info.text}
        />
        <StatCell
          label="Total captured"
          value={syncStatus.totalCaptured}
          color={colors.textPrimary}
        />
      </View>

      <View style={styles.metaBlock}>
        <Text style={[styles.metaLine, { color: colors.textSecondary }]}>
          Total uploaded: {syncStatus.totalSynced}
          {pending > 0 ? ` · Unaccounted/pending: ${pending}` : ''}
        </Text>
        {syncStatus.lastFlushOrigin ? (
          <Text style={[styles.metaLine, { color: colors.textMuted }]}>
            Last flush: {syncStatus.lastFlushOrigin}
            {syncStatus.lastSyncedAt
              ? ` · ${formatDateTimeIST(syncStatus.lastSyncedAt)}`
              : ''}
          </Text>
        ) : null}
        {syncStatus.lastCapturedAt ? (
          <Text style={[styles.metaLine, { color: colors.textMuted }]}>
            Last captured: {formatDateTimeIST(syncStatus.lastCapturedAt)}
          </Text>
        ) : null}
        {syncStatus.lastSyncedLat != null &&
        syncStatus.lastSyncedLng != null ? (
          <Text style={[styles.metaLine, { color: colors.textMuted }]}>
            Last coords: {syncStatus.lastSyncedLat.toFixed(6)},{' '}
            {syncStatus.lastSyncedLng.toFixed(6)}
          </Text>
        ) : null}
        {syncStatus.lastError ? (
          <Text style={[styles.metaLine, { color: colors.danger }]}>
            Error: {syncStatus.lastError}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void syncNow()}
          disabled={syncingNow}
          style={({ pressed }) => [
            styles.syncButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || syncingNow ? 0.65 : 1,
            },
          ]}
        >
          {syncingNow ? (
            <ActivityIndicator color="#101936" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={16} color="#101936" />
              <Text style={styles.syncButtonText}>Flush queue now</Text>
            </>
          )}
        </Pressable>

        <Button
          title="Reset counters"
          size="sm"
          variant="outline"
          onPress={() => void resetLocationDebugStats()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  statValue: {
    ...typography.label,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaBlock: {
    gap: 2,
  },
  metaLine: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  syncButtonText: {
    ...typography.label,
    fontSize: 12,
    color: '#101936',
    fontWeight: '700',
  },
});
