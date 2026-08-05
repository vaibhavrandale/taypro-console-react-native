import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Navbar } from "../components/layout";
import { ServiceTicketDetailModal } from "../components/serviceTickets/ServiceTicketDetailModal";
import { ServiceTicketDashboardStatsCard } from "../components/serviceTickets/ServiceTicketDashboardStats";
import { Button } from "../components/ui";
import {
  fetchServiceTicketById,
  fetchServiceTicketDashboardStats,
  fetchSitewiseServiceTickets,
} from "../api/serviceTickets";
import { useContentBottomPadding } from "../hooks/useContentBottomPadding";
import { useTheme } from "../theme";
import type { ThemeColors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type {
  ServiceTicket,
  ServiceTicketDashboardStats,
} from "../types/serviceTickets";
import type { ServiceTicketsStackParamList } from "../navigation/ServiceTicketsStack";
import { formatDateTimeIST } from "../utils/datetime";

type Navigation = NativeStackNavigationProp<
  ServiceTicketsStackParamList,
  "TicketsList"
>;

const PAGE_LIMIT = 10;

const COL = {
  no: 44,
  ticket: 150,
  status: 72,
  site: 120,
  robot: 120,
  fault: 160,
  created: 120,
  actions: 130,
} as const;

const TABLE_WIDTH =
  COL.no +
  COL.ticket +
  COL.status +
  COL.site +
  COL.robot +
  COL.fault +
  COL.created +
  COL.actions;

function Cell({
  width,
  children,
  colors,
  bold,
  small,
}: {
  width: number;
  children: React.ReactNode;
  colors: ThemeColors;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <Text
      style={[
        styles.cell,
        { width, color: bold ? colors.textPrimary : colors.textSecondary },
        bold && styles.cellBold,
        small && styles.cellSmall,
      ]}
      numberOfLines={2}
    >
      {children}
    </Text>
  );
}

function HeaderCell({
  width,
  label,
  colors,
}: {
  width: number;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <Text style={[styles.headerCell, { width, color: colors.textMuted }]}>
      {label}
    </Text>
  );
}

function TicketTableHeader({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.tableHeader,
        {
          width: TABLE_WIDTH,
          backgroundColor: colors.backgroundTertiary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <HeaderCell width={COL.no} label="#" colors={colors} />
      <HeaderCell width={COL.ticket} label="Ticket" colors={colors} />
      <HeaderCell width={COL.status} label="Status" colors={colors} />
      <HeaderCell width={COL.site} label="Site" colors={colors} />
      <HeaderCell width={COL.robot} label="Robot" colors={colors} />
      <HeaderCell width={COL.fault} label="Problem" colors={colors} />
      <HeaderCell width={COL.created} label="Created" colors={colors} />
      <HeaderCell width={COL.actions} label="Action" colors={colors} />
    </View>
  );
}

function TicketTableRow({
  ticket,
  index,
  colors,
  onView,
  onResolve,
}: {
  ticket: ServiceTicket;
  index: number;
  colors: ThemeColors;
  onView: () => void;
  onResolve?: () => void;
}) {
  const resolved = Boolean(ticket.ticket_resolved);

  return (
    <View
      style={[
        styles.tableRow,
        {
          width: TABLE_WIDTH,
          borderBottomColor: colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
    >
      <Cell width={COL.no} colors={colors}>
        {index}
      </Cell>
      <Cell width={COL.ticket} colors={colors} bold small>
        {ticket.ticket_id || ticket._id}
      </Cell>
      <View style={[styles.statusCell, { width: COL.status }]}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: resolved
                ? colors.badge.success.bg
                : colors.badge.warning.bg,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: resolved
                  ? colors.badge.success.text
                  : colors.badge.warning.text,
              },
            ]}
          >
            {resolved ? "Closed" : "Open"}
          </Text>
        </View>
      </View>
      <Cell width={COL.site} colors={colors}>
        {ticket.site_id || "—"}
      </Cell>
      <Cell width={COL.robot} colors={colors}>
        {ticket.robot_no || "—"}
      </Cell>
      <Cell width={COL.fault} colors={colors}>
        {ticket.fault_type?.replace(/-/g, " ").trim() || "—"}
      </Cell>
      <Cell width={COL.created} colors={colors}>
        {ticket.createdAt ? formatDateTimeIST(ticket.createdAt) : "—"}
      </Cell>
      <View style={[styles.actionsCell, { width: COL.actions }]}>
        <Pressable
          onPress={onView}
          style={[styles.actionBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            View
          </Text>
        </Pressable>
        {!resolved && onResolve ? (
          <Pressable
            onPress={onResolve}
            style={[
              styles.actionBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.badge.success.bg,
              },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>
              Resolve
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ServiceTicketsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const bottomPad = useContentBottomPadding(spacing.xl);

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [stats, setStats] = useState<ServiceTicketDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const [viewVisible, setViewVisible] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTicket, setViewTicket] = useState<ServiceTicket | null>(null);

  const loadPage = useCallback(async (nextPage: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [result, dashboard] = await Promise.all([
        fetchSitewiseServiceTickets({
          page: nextPage,
          limit: PAGE_LIMIT,
        }),
        fetchServiceTicketDashboardStats().catch(() => null),
      ]);
      setTickets(result.data);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPrevPage(result.hasPrevPage);
      if (dashboard) setStats(dashboard);
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPage(page);
    }, [loadPage, page]),
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tickets.filter((item) => {
      if (filter === "open" && item.ticket_resolved) return false;
      if (filter === "resolved" && !item.ticket_resolved) return false;
      if (!term) return true;
      return (
        (item.ticket_id ?? "").toLowerCase().includes(term) ||
        (item.robot_no ?? "").toLowerCase().includes(term) ||
        (item.deveui ?? "").toLowerCase().includes(term) ||
        (item.site_id ?? "").toLowerCase().includes(term) ||
        (item.fault_type ?? "").toLowerCase().includes(term)
      );
    });
  }, [tickets, searchTerm, filter]);

  const openCount =
    stats?.summary.pending ?? tickets.filter((t) => !t.ticket_resolved).length;
  const raisedCount = stats?.summary.raised ?? tickets.length;
  const resolvedCount = stats?.summary.resolved;

  const openViewModal = async (id: string) => {
    setViewVisible(true);
    setViewTicket(null);
    setViewLoading(true);
    try {
      const ticket = await fetchServiceTicketById(id);
      setViewTicket(ticket);
    } catch (err) {
      setViewVisible(false);
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setViewLoading(false);
    }
  };

  const goResolve = (id: string) => {
    setViewVisible(false);
    navigation.navigate("ResolveTicket", { ticketId: id });
  };

  const filterChips = (
    <View style={styles.filters}>
      {(["all", "open", "resolved"] as const).map((key) => {
        const active = filter === key;
        return (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.chip,
              {
                backgroundColor: active
                  ? colors.primary
                  : colors.backgroundSecondary,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? "#101936" : colors.textSecondary },
              ]}
            >
              {key === "all"
                ? `All (${raisedCount})`
                : key === "open"
                  ? `Open (${openCount})`
                  : resolvedCount != null
                    ? `Closed (${resolvedCount})`
                    : "Closed"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const pagination = (
    <View style={styles.pagination}>
      <Pressable
        onPress={() => setPage((p) => Math.max(1, p - 1))}
        disabled={!hasPrevPage || loading}
        style={[
          styles.pageButton,
          {
            backgroundColor: colors.backgroundTertiary,
            opacity: hasPrevPage && !loading ? 1 : 0.4,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
      </Pressable>
      <Text style={[styles.pageText, { color: colors.textSecondary }]}>
        Page {page} of {totalPages}
      </Text>
      <Pressable
        onPress={() => setPage((p) => p + 1)}
        disabled={!hasNextPage || loading}
        style={[
          styles.pageButton,
          {
            backgroundColor: colors.backgroundTertiary,
            opacity: hasNextPage && !loading ? 1 : 0.4,
          },
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Service Tickets" subtitle="All site tickets" />

      <View style={styles.toolbar}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search ticket, robot, site, problem"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        <Button
          title="New"
          size="sm"
          icon="add-outline"
          onPress={() => navigation.navigate("CreateTicket")}
        />
      </View>

      {loading && tickets.length === 0 && !stats ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.dashboardPad}>
            {stats ? <ServiceTicketDashboardStatsCard stats={stats} /> : null}
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.badge.error.bg,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Text style={{ color: colors.danger }}>{error}</Text>
                <Button
                  title="Retry"
                  size="sm"
                  variant="outline"
                  onPress={() => void loadPage(page)}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.tableBlock}>
            {filterChips}

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.tableScrollContent}
            >
              <View
                style={[
                  styles.tableCard,
                  {
                    width: TABLE_WIDTH,
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
              >
                <TicketTableHeader colors={colors} />
                {filtered.length === 0 ? (
                  <View style={styles.emptyTable}>
                    <Text
                      style={[styles.emptyBody, { color: colors.textMuted }]}
                    >
                      {searchTerm || filter !== "all"
                        ? "No tickets match this filter."
                        : "No tickets on this page."}
                    </Text>
                  </View>
                ) : (
                  filtered.map((item, index) => (
                    <TicketTableRow
                      key={item._id}
                      ticket={item}
                      index={(page - 1) * PAGE_LIMIT + index + 1}
                      colors={colors}
                      onView={() => void openViewModal(item._id)}
                      onResolve={
                        item.ticket_resolved
                          ? undefined
                          : () => goResolve(item._id)
                      }
                    />
                  ))
                )}
              </View>
            </ScrollView>

            {tickets.length > 0 ? pagination : null}
          </View>
        </ScrollView>
      )}

      <ServiceTicketDetailModal
        visible={viewVisible}
        ticket={viewTicket}
        loading={viewLoading}
        onClose={() => setViewVisible(false)}
        onResolve={
          viewTicket && !viewTicket.ticket_resolved
            ? () => goResolve(viewTicket._id)
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.xs,
  },
  dashboardPad: {
    paddingHorizontal: spacing.md,
  },
  tableBlock: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  tableScrollContent: {
    paddingHorizontal: spacing.md,
  },
  tableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  headerCell: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  cell: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  cellBold: {
    fontWeight: "700",
  },
  cellSmall: {
    fontSize: 9,
    lineHeight: 12,
  },
  statusCell: {
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
  },
  actionsCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyTable: {
    padding: spacing.lg,
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pageText: { ...typography.bodySmall, fontWeight: "600" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyBody: { ...typography.bodySmall, textAlign: "center" },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
