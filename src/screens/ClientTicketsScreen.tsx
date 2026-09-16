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
import { ClientTicketDetailModal } from '../components/clientTickets/ClientTicketDetailModal';
import { Badge, Button } from '../components/ui';
import { fetchClientTickets } from '../api/clientTickets';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ClientTicket } from '../types/clientTickets';
import type { ClientTicketsStackParamList } from '../navigation/ClientTicketsStack';
import { formatDateTimeIST } from '../utils/datetime';

type Navigation = NativeStackNavigationProp<
  ClientTicketsStackParamList,
  'ClientTicketsList'
>;

const PAGE_LIMIT = 10;

function statusVariant(status?: string): 'success' | 'error' | 'warning' {
  if (status === 'Resolved' || status === 'Closed') return 'success';
  if (status === 'Open') return 'error';
  return 'warning';
}

export function ClientTicketsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const bottomPad = useContentBottomPadding();

  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTicket, setViewTicket] = useState<ClientTicket | null>(null);

  const loadPage = useCallback(async (nextPage: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await fetchClientTickets({
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
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const hay = [
        ticket.ticket_id,
        ticket.subject,
        ticket.status,
        ticket.site_id,
        ticket.created_by?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [searchTerm, tickets]);

  const renderItem = ({ item }: { item: ClientTicket }) => (
    <Pressable
      onPress={() => setViewTicket(item)}
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.ticketId, { color: colors.primary }]} numberOfLines={1}>
          {item.ticket_id || item._id}
        </Text>
        <Badge
          label={item.status || 'Open'}
          variant={statusVariant(item.status)}
          size="sm"
        />
      </View>
      <Text style={[styles.subject, { color: colors.textPrimary }]} numberOfLines={2}>
        {item.subject || '—'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
        {item.site_id || '—'}
        {item.created_by?.name ? ` · ${item.created_by.name}` : ''}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {formatDateTimeIST(item.createdAt)}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Client Tickets" subtitle="Support tickets" />

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
            placeholder="Search ticket, subject, or status"
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
          onPress={() => navigation.navigate('CreateClientTicket')}
        />
      </View>

      {loading && tickets.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
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
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {searchTerm ? 'No tickets match this search.' : 'No tickets found.'}
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
                <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
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
        />
      )}

      <ClientTicketDetailModal
        visible={viewTicket != null}
        ticket={viewTicket}
        onClose={() => setViewTicket(null)}
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
    paddingBottom: spacing.sm,
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
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ticketId: { ...typography.label, fontSize: 13, fontWeight: '700', flex: 1 },
  subject: { ...typography.bodySmall, fontSize: 13 },
  meta: { ...typography.caption, fontSize: 11 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  empty: { ...typography.bodySmall, textAlign: 'center' },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  pageLabel: { ...typography.caption, fontSize: 12, fontWeight: '600' },
});
