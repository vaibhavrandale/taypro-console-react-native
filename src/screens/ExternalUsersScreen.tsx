import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { Badge, Button } from '../components/ui';
import { ExternalUserUpdateModal } from '../components/externalUsers/ExternalUserUpdateModal';
import { ScreenError, SubscriptionBlockedPage } from '../components/subscription/SubscriptionExpiryCard';
import { fetchExternalUsers } from '../api/externalUsers';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { resolveProfileImageUri } from '../utils/cleaningLogs';
import { asLoadError, isSubscriptionError, type SubscriptionError } from '../utils/subscription';
import type { ExternalUser } from '../types/externalUsers';
import type { ExternalUsersStackParamList } from '../navigation/ExternalUsersStack';

type Navigation = NativeStackNavigationProp<
  ExternalUsersStackParamList,
  'ExternalUsersList'
>;

const PAGE_LIMIT = 10;

export function ExternalUsersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const bottomPad = useContentBottomPadding();

  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | SubscriptionError>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<ExternalUser | null>(null);

  const loadPage = useCallback(async (nextPage: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await fetchExternalUsers({
        page: nextPage,
        limit: PAGE_LIMIT,
      });
      setUsers(result.data);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPrevPage(result.hasPrevPage);
    } catch (err) {
      setUsers([]);
      setError(asLoadError(err, 'Failed to load users'));
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
    if (!q) return users;
    return users.filter((user) =>
      [user.username, user.email, user.role, user.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [searchTerm, users]);

  if (isSubscriptionError(error)) {
    return (
      <SubscriptionBlockedPage
        title="Manage Users"
        subtitle="External users"
        error={error}
      />
    );
  }

  const renderItem = ({ item }: { item: ExternalUser }) => {
    const avatar = resolveProfileImageUri(item.profile_image);
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: item.is_delete ? colors.danger : colors.border,
          },
        ]}
      >
        <View style={styles.cardTop}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="person" size={18} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.username}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          {item.is_delete ? (
            <Badge label="Inactive" variant="error" size="sm" />
          ) : item.role ? (
            <Badge label={item.role} variant="info" size="sm" />
          ) : null}
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {[item.department, item.phone].filter(Boolean).join(' · ') || '—'}
        </Text>
        <View style={styles.cardActions}>
          <Button
            title="Update"
            size="sm"
            variant="outline"
            onPress={() => setEditUser(item)}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Manage Users" subtitle="External users" />

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
            placeholder="Search name, email, role, or department"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        <Button
          title="Add User"
          size="sm"
          icon="add-outline"
          onPress={() => navigation.navigate('CreateExternalUser')}
        />
      </View>

      {loading && users.length === 0 ? (
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
            error && typeof error === 'string' ? (
              <ScreenError error={error} onRetry={() => void loadPage(page)} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {searchTerm ? 'No users match this search.' : 'No users found.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            users.length > 0 ? (
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

      <ExternalUserUpdateModal
        visible={editUser != null}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={(updated) => {
          setUsers((current) =>
            current.map((row) => (row._id === updated._id ? updated : row)),
          );
        }}
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
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.label, fontSize: 14, fontWeight: '700' },
  meta: { ...typography.caption, fontSize: 12 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  empty: { ...typography.bodySmall, textAlign: 'center' },
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
