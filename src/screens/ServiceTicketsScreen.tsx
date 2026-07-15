import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { ServiceTicketDetailModal } from '../components/serviceTickets/ServiceTicketDetailModal';
import { Badge, Button } from '../components/ui';
import {
  fetchServiceTicketById,
  fetchSitewiseServiceTickets,
} from '../api/serviceTickets';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ServiceTicket } from '../types/serviceTickets';
import type { ServiceTicketsStackParamList } from '../navigation/ServiceTicketsStack';
import {
  formatDateTimeIST,
  formatRelativeTime,
} from '../utils/datetime';

type Navigation = NativeStackNavigationProp<
  ServiceTicketsStackParamList,
  'TicketsList'
>;

const PAGE_LIMIT = 10;

function TicketCard({
  ticket,
  index,
  onView,
  onResolve,
}: {
  ticket: ServiceTicket;
  index: number;
  onView: () => void;
  onResolve?: () => void;
}) {
  const { colors } = useTheme();
  const resolved = Boolean(ticket.ticket_resolved);

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
      <View style={styles.cardTop}>
        <Text style={[styles.serial, { color: colors.textMuted }]}>
          #{index}
        </Text>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.ticketId, { color: colors.textPrimary }]}>
            {ticket.ticket_id || ticket._id}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              label={resolved ? 'Resolved' : 'Open'}
              variant={resolved ? 'success' : 'warning'}
              size="sm"
            />
            {ticket.site_id ? (
              <Badge label={ticket.site_id} variant="info" size="sm" />
            ) : null}
          </View>
        </View>
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {ticket.robot_no || '—'}
        {ticket.block ? ` · ${ticket.block}` : ''}
      </Text>
      {ticket.fault_type ? (
        <Text
          style={[styles.fault, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {ticket.fault_type.replace(/-/g, ' ')}
        </Text>
      ) : null}
      {ticket.createdAt ? (
        <Text
          style={[styles.created, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {formatRelativeTime(ticket.createdAt)}
          {' · '}
          {formatDateTimeIST(ticket.createdAt)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button title="View" size="sm" variant="outline" onPress={onView} />
        {!resolved && onResolve ? (
          <Button
            title="Resolve"
            size="sm"
            icon="checkmark-circle-outline"
            onPress={onResolve}
          />
        ) : null}
      </View>
    </View>
  );
}

export function ServiceTicketsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
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
    setError('');
    try {
      const result = await fetchSitewiseServiceTickets({
        page: nextPage,
        limit: PAGE_LIMIT,
      });
      setTickets(result.data);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPrevPage(result.hasPrevPage);
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
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
      if (filter === 'open' && item.ticket_resolved) return false;
      if (filter === 'resolved' && !item.ticket_resolved) return false;
      if (!term) return true;
      return (
        (item.ticket_id ?? '').toLowerCase().includes(term) ||
        (item.robot_no ?? '').toLowerCase().includes(term) ||
        (item.deveui ?? '').toLowerCase().includes(term) ||
        (item.site_id ?? '').toLowerCase().includes(term)
      );
    });
  }, [tickets, searchTerm, filter]);

  const openCount = tickets.filter((t) => !t.ticket_resolved).length;

  const openViewModal = async (id: string) => {
    setViewVisible(true);
    setViewTicket(null);
    setViewLoading(true);
    try {
      const ticket = await fetchServiceTicketById(id);
      setViewTicket(ticket);
    } catch (err) {
      setViewVisible(false);
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setViewLoading(false);
    }
  };

  const goResolve = (id: string) => {
    setViewVisible(false);
    navigation.navigate('ResolveTicket', { ticketId: id });
  };

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
            placeholder="Search ticket, robot, deveui, site"
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
          onPress={() => navigation.navigate('CreateTicket')}
        />
      </View>

      <View style={styles.filters}>
        {(['all', 'open', 'resolved'] as const).map((key) => {
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
                  { color: active ? '#101936' : colors.textSecondary },
                ]}
              >
                {key === 'all'
                  ? `All (${tickets.length})`
                  : key === 'open'
                    ? `Open (${openCount})`
                    : 'Resolved'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && tickets.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            error ? (
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
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="construct-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No tickets found
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                {searchTerm
                  ? 'Try a different search on this page.'
                  : 'Create a service ticket to get started.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            tickets.length > 0 ? (
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
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textPrimary}
                  />
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <TicketCard
              ticket={item}
              index={(page - 1) * PAGE_LIMIT + index + 1}
              onView={() => void openViewModal(item._id)}
              onResolve={
                item.ticket_resolved
                  ? undefined
                  : () => goResolve(item._id)
              }
            />
          )}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  serial: { ...typography.caption, fontWeight: '700', marginTop: 2 },
  cardTitleBlock: { flex: 1, gap: spacing.xs },
  ticketId: { ...typography.label, fontSize: 15 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { ...typography.bodySmall },
  fault: { ...typography.caption, fontSize: 11 },
  created: { ...typography.caption, fontSize: 10, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: { ...typography.bodySmall, fontWeight: '600' },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.label, fontSize: 16 },
  emptyBody: { ...typography.bodySmall, textAlign: 'center' },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
