import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AttendanceHistoryCard } from "../components/attendance/AttendanceHistoryCard";
import { Navbar, Screen } from "../components/layout";
import { fetchUserAttendance } from "../api/attendance";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { AttendanceRecord } from "../types/attendance";
import type { AttendanceStackParamList } from "../navigation/types";

const PAGE_LIMIT = 10;

export function AttendanceHistoryScreen() {
  const { colors, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AttendanceStackParamList>>();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadPage = useCallback(
    async (targetPage: number, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await fetchUserAttendance({
          page: targetPage,
          limit: PAGE_LIMIT,
        });
        setRecords(result.records);
        setTotal(result.total);
        setHasNextPage(result.hasNextPage);
        setHasPrevPage(result.hasPrevPage);
        setPage(result.page);
      } catch (err) {
        setRecords([]);
        setTotal(0);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load attendance history",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const onRefresh = useCallback(() => {
    void loadPage(page, true);
  }, [loadPage, page]);

  return (
    <View style={styles.wrapper}>
      <Navbar
        title="Attendance History"
        subtitle={`${total} record${total === 1 ? "" : "s"}`}
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </Pressable>
        }
      />

      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons
              name="calendar-outline"
              size={36}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No attendance records found.
            </Text>
          </View>
        ) : (
          <View style={styles.recordsList}>
            {records.map((record) => (
              <AttendanceHistoryCard
                key={record._id}
                record={record}
                isDark={isDark}
                onImagePress={setViewerImage}
              />
            ))}

            <View
              style={[
                styles.pagination,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => void loadPage(page - 1)}
                disabled={!hasPrevPage || loading}
                style={[
                  styles.pageButton,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    opacity: hasPrevPage && !loading ? 1 : 0.4,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.textPrimary}
                />
              </Pressable>

              <Text style={[styles.pageText, { color: colors.textSecondary }]}>
                Page {page} of {totalPages}
              </Text>

              <Pressable
                onPress={() => void loadPage(page + 1)}
                disabled={!hasNextPage || loading}
                style={[
                  styles.pageButton,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    opacity: hasNextPage && !loading ? 1 : 0.4,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>
        )}
      </Screen>

      <Modal
        visible={viewerImage != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => setViewerImage(null)}
        >
          {viewerImage ? (
            <Image
              source={{ uri: viewerImage }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  recordsList: {
    gap: spacing.md,
    margin: spacing.md,
  },
  pagination: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pageText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
});
