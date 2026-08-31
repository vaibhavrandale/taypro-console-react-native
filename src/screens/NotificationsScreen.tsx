import React, { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Navbar, Screen } from "../components/layout";
import { Badge } from "../components/ui";
import { useNotification } from "../context/NotificationContext";
import { useTimerExecutionNotification } from "../context/TimerExecutionNotificationContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatDateTimeIST } from "../utils/datetime";

export function NotificationsScreen() {
  const { colors } = useTheme();
  const {
    notification,
    loading,
    openNotification,
    refreshNotification,
  } = useNotification();
  const {
    notifications: timerNotifications,
    loading: timerLoading,
    openModal: openTimerModal,
    refresh: refreshTimers,
  } = useTimerExecutionNotification();
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    async (silent: boolean) => {
      await Promise.all([
        refreshNotification(false, silent),
        refreshTimers(false, silent),
      ]);
    },
    [refreshNotification, refreshTimers],
  );

  useFocusEffect(
    useCallback(() => {
      void reload(true);
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const timerBlockCount = timerNotifications.reduce(
    (sum, item) => sum + (item.block?.length ?? 0),
    0,
  );
  const isEmpty = !notification && timerNotifications.length === 0;
  const showSpinner =
    (loading || timerLoading) && isEmpty && !refreshing;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="Notifications" subtitle="Unread alerts" />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {showSpinner ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Loading notifications…
          </Text>
        ) : isEmpty ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="notifications-off-outline"
              size={28}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              You're all caught up
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              New announcements and timer alerts will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notification ? (
              <Pressable
                onPress={openNotification}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.badge.info.bg },
                    ]}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color={colors.badge.info.text}
                    />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text
                      style={[styles.cardEyebrow, { color: colors.textMuted }]}
                    >
                      Announcement
                    </Text>
                    <Badge label="Unread" variant="warning" size="sm" />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                <Text
                  style={[styles.cardTitle, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {notification.subject}
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                  numberOfLines={3}
                >
                  {notification.description}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {notification.posted_by?.name ?? "System"}
                  {notification.createdAt
                    ? ` · ${formatDateTimeIST(notification.createdAt)}`
                    : ""}
                </Text>
              </Pressable>
            ) : null}

            {timerNotifications.length > 0 ? (
              <Pressable
                onPress={openTimerModal}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.badge.warning.bg },
                    ]}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={colors.badge.warning.text}
                    />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text
                      style={[styles.cardEyebrow, { color: colors.textMuted }]}
                    >
                      Timer execution
                    </Text>
                    <Badge
                      label={`${timerNotifications.length} unread`}
                      variant="warning"
                      size="sm"
                    />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Sites waiting for acknowledgement
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                >
                  {timerNotifications.length} site
                  {timerNotifications.length === 1 ? "" : "s"} · {timerBlockCount}{" "}
                  block{timerBlockCount === 1 ? "" : "s"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  hint: {
    ...typography.bodySmall,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  emptyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyBody: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardEyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardTitle: {
    ...typography.label,
    fontSize: 14,
  },
  cardBody: {
    ...typography.bodySmall,
  },
  cardMeta: {
    ...typography.caption,
  },
  pressed: {
    opacity: 0.75,
  },
});
