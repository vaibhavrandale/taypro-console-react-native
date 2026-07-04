import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui/Badge';
import { useLocationTracking } from '../../context/LocationTrackingContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';

type Props = {
  visible: boolean;
};

export function LocationSyncStatusCard({ visible }: Props) {
  const { colors } = useTheme();
  const { syncStatus, syncNow, syncingNow } = useLocationTracking();

  if (!visible) {
    return null;
  }

  const hasSynced = syncStatus.totalSynced > 0;
  const statusVariant = syncStatus.lastError
    ? 'error'
    : hasSynced
      ? 'success'
      : syncStatus.isTracking
        ? 'info'
        : 'warning';

  const statusLabel = syncStatus.lastError
    ? 'Upload failed'
    : hasSynced
      ? 'Saved to server'
      : syncStatus.isTracking
        ? syncStatus.queueCount > 0
          ? 'Waiting to upload'
          : 'Tracking active'
        : 'Tracking off';

  const statusMessage = syncStatus.lastError
    ? syncStatus.lastError
    : hasSynced && syncStatus.lastSyncedAt
      ? `Last saved: ${formatDateTimeIST(syncStatus.lastSyncedAt)}`
      : syncStatus.isTracking
        ? syncStatus.queueCount > 0
          ? `${syncStatus.queueCount} point(s) queued — tap Sync now to upload`
          : 'Capturing GPS — first save usually within 30 seconds'
        : 'Location tracking has not started yet';

  const coordsText =
    syncStatus.lastSyncedLat != null && syncStatus.lastSyncedLng != null
      ? `${syncStatus.lastSyncedLat.toFixed(6)}, ${syncStatus.lastSyncedLng.toFixed(6)}`
      : null;

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
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name={hasSynced ? 'checkmark-circle' : 'navigate-circle-outline'}
            size={20}
            color={hasSynced ? colors.badge.success.text : colors.primary}
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Location sync
          </Text>
        </View>
        <Badge label={statusLabel} variant={statusVariant} size="sm" />
      </View>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {statusMessage}
      </Text>

      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: colors.textMuted }]}>
          Captured: {syncStatus.totalCaptured}
        </Text>
        <Text style={[styles.stat, { color: colors.textMuted }]}>
          Uploaded: {syncStatus.totalSynced}
        </Text>
        <Text style={[styles.stat, { color: colors.textMuted }]}>
          Queued: {syncStatus.queueCount}
        </Text>
      </View>

      {coordsText ? (
        <Text style={[styles.coords, { color: colors.textSecondary }]}>
          Last coords: {coordsText}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void syncNow()}
        disabled={syncingNow || syncStatus.queueCount === 0}
        style={({ pressed }) => [
          styles.syncButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed || syncingNow || syncStatus.queueCount === 0 ? 0.6 : 1,
          },
        ]}
      >
        {syncingNow ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.syncButtonText}>Sync now</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.lg,
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
    ...typography.h3,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    ...typography.caption,
    fontSize: 12,
  },
  coords: {
    ...typography.caption,
    fontSize: 11,
  },
  syncButton: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  syncButtonText: {
    ...typography.label,
    color: '#fff',
  },
});
