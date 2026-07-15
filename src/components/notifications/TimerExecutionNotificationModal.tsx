import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Logo } from '../ui';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTimerExecutionNotification } from '../../context/TimerExecutionNotificationContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { TimerExecutionNotification } from '../../types/timerExecutionNotification';
import { formatDateTimeIST } from '../../utils/datetime';

function SiteCard({ item }: { item: TimerExecutionNotification }) {
  const { colors } = useTheme();
  const blocks = item.block ?? [];

  return (
    <View
      style={[
        styles.siteCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.siteHeader,
          {
            backgroundColor: colors.backgroundTertiary,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Badge label={item.site_id} variant="success" size="sm" />
        <Text style={[styles.blockCount, { color: colors.textMuted }]}>
          {blocks.length} block{blocks.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.siteBody}>
        {blocks.length === 0 ? (
          <Text style={[styles.emptyBlocks, { color: colors.textMuted }]}>
            No blocks listed
          </Text>
        ) : (
          blocks.map((blockItem, index) => (
            <View
              key={`${item._id}-${blockItem}-${index}`}
              style={[
                styles.blockRow,
                {
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Badge label={blockItem} variant="warning" size="sm" />
              <Text
                style={[styles.timestamp, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {formatDateTimeIST(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function TimerExecutionNotificationModal() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    notifications,
    loading,
    submitting,
    error,
    visible,
    markAllRead,
  } = useTimerExecutionNotification();

  useStatusBarOverlay(visible);

  const siteCount = useMemo(
    () => new Set(notifications.map((item) => item.site_id)).size,
    [notifications],
  );

  const blockCount = useMemo(
    () =>
      notifications.reduce((sum, item) => sum + (item.block?.length ?? 0), 0),
    [notifications],
  );

  if (!visible) {
    return null;
  }

  const panelWidth = Math.min(windowWidth - spacing.lg * 2, 440);
  const maxPanelHeight =
    windowHeight - insets.top - insets.bottom - spacing.xl * 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        // Acknowledgement required before dismiss (web backdrop="static").
      }}
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlay,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              maxHeight: maxPanelHeight,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : '#101936',
            },
          ]}
        >
          <View
            style={[styles.accentBar, { backgroundColor: colors.primary }]}
          />

          {loading && notifications.length === 0 ? (
            <View style={styles.loader}>
              <Logo size="xl" background={isDark ? 'dark' : 'light'} />
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textMuted }]}>
                Checking timer executions…
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.badge.success.bg },
                    ]}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.headerText}>
                    <Text
                      style={[styles.eyebrow, { color: colors.textMuted }]}
                    >
                      Timer execution
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={`${siteCount} site${siteCount === 1 ? '' : 's'}`}
                        variant="success"
                        size="sm"
                      />
                      <Badge
                        label={`${blockCount} block${blockCount === 1 ? '' : 's'}`}
                        variant="warning"
                        size="sm"
                      />
                      <Badge label="Unread" variant="error" size="sm" />
                    </View>
                  </View>
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Cleaning timer executed for the sites & blocks below
                </Text>
              </View>

              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator
              >
                {error ? (
                  <View
                    style={[
                      styles.errorBanner,
                      { backgroundColor: colors.badge.error.bg },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={colors.badge.error.text}
                    />
                    <Text
                      style={[
                        styles.errorText,
                        { color: colors.badge.error.text },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                {notifications.map((item) => (
                  <SiteCard key={item._id} item={item} />
                ))}
              </ScrollView>

              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.hint,
                    { backgroundColor: colors.badge.info.bg },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.badge.info.text}
                  />
                  <Text
                    style={[
                      styles.hintText,
                      { color: colors.badge.info.text },
                    ]}
                  >
                    Mark all as read to dismiss this alert.
                  </Text>
                </View>

                <Button
                  title={submitting ? 'Please wait…' : 'Mark all as read'}
                  onPress={() => void markAllRead()}
                  loading={submitting}
                  disabled={submitting || notifications.length === 0}
                  fullWidth
                  icon="checkmark-done-outline"
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  panel: {
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  loader: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  loaderText: {
    ...typography.bodySmall,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  siteCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  blockCount: {
    ...typography.caption,
    fontSize: 11,
  },
  siteBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  emptyBlocks: {
    ...typography.bodySmall,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 11,
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  hintText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    fontSize: 11,
    flex: 1,
    fontWeight: '600',
  },
});
