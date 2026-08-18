import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Constants from 'expo-constants';
import { Navbar, Screen } from '../components/layout';
import { fetchCallContacts, fetchVoiceCallHistory } from '../api/voiceCalls';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useVoiceCall } from '../context/VoiceCallContext';
import { getSocket } from '../lib/socket';
import { isWebRtcNativeAvailable } from '../services/webrtcVoice';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { VoiceCall, VoiceCallContact } from '../types/voiceCall';

function getServerRoot() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

function getProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${getServerRoot()}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatWhen(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function formatDuration(startedAt?: string | null, endedAt?: string | null) {
  if (!startedAt || !endedAt) return '—';
  const seconds = Math.max(
    0,
    Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function UsersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { startCall, phase, submitting } = useVoiceCall();
  const [webrtcReady, setWebRtcReady] = useState(
    () => Constants.executionEnvironment !== 'storeClient',
  );
  const [contacts, setContacts] = useState<VoiceCallContact[]>([]);
  const [history, setHistory] = useState<VoiceCall[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'users' | 'history'>('users');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [callingId, setCallingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const rows = await fetchCallContacts();
      setContacts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await fetchVoiceCallHistory());
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : 'Failed to load call history',
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (phase === 'idle') void loadHistory();
  }, [loadHistory, phase]);

  useEffect(() => {
    if (!user?._id) return;
    let cancelled = false;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const onOnlineUsers = (rows: unknown) => {
      if (!Array.isArray(rows)) return;
      setOnlineUserIds(
        new Set(
          rows
            .filter(
              (row): row is { id: unknown; socketIds: unknown[] } =>
                typeof row === 'object' &&
                row !== null &&
                'id' in row &&
                'socketIds' in row &&
                Array.isArray(row.socketIds) &&
                row.socketIds.length > 0,
            )
            .map((row) => String(row.id)),
        ),
      );
    };
    const joinPresence = () => {
      socket?.emit('join', {
        _id: user._id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
      });
    };

    void getSocket().then((instance) => {
      if (cancelled) return;
      socket = instance;
      socket.on('updateOnlineUsers', onOnlineUsers);
      socket.on('connect', joinPresence);
      if (socket.connected) joinPresence();
    });

    return () => {
      cancelled = true;
      socket?.off('updateOnlineUsers', onOnlineUsers);
      socket?.off('connect', joinPresence);
    };
  }, [user]);

  useEffect(() => {
    // Defer native probe so Expo Go / old clients don't crash on first paint.
    const id = setTimeout(() => {
      setWebRtcReady(isWebRtcNativeAvailable());
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => c._id !== user?._id)
      .filter((c) => {
        if (!q) return true;
        return (
          c.username.toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.role || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [contacts, search, user?._id]);

  const onCall = async (contact: VoiceCallContact) => {
    if (!webrtcReady) return;
    if (phase !== 'idle' || submitting) return;
    setCallingId(contact._id);
    try {
      await startCall(contact._id);
    } finally {
      setCallingId(null);
    }
  };

  return (
    <Screen>
      <Navbar
        title="Users"
        subtitle="Call works even if they are offline but have the app"
      />
      {!webrtcReady ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.badge.warning.bg },
          ]}
        >
          <Text style={[styles.bannerText, { color: colors.badge.warning.text }]}>
            Voice calls need a rebuilt development build with WebRTC (not Expo
            Go). Run eas build --profile development --platform android and
            install that APK.
          </Text>
        </View>
      ) : null}
      <View style={[styles.tabs, { backgroundColor: colors.backgroundTertiary }]}>
        {(['users', 'history'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setView(tab)}
            style={[
              styles.tab,
              view === tab && { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={{
                color: view === tab ? colors.textPrimary : colors.textMuted,
                fontWeight: '600',
              }}
            >
              {tab === 'users' ? 'Users' : 'Call history'}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === 'users' ? (
        <View
          style={[
            styles.searchWrap,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      ) : null}

      {view === 'users' ? (
        loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.danger }}>{error}</Text>
          <Pressable onPress={() => void load()} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No users found
            </Text>
          }
          renderItem={({ item }) => {
            const imageUri = getProfileImageUri(item.profile_image);
            const busy = callingId === item._id;
            const online = onlineUserIds.has(item._id);
            return (
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.badge.info.bg },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.badge.info.text}
                    />
                  </View>
                )}
                <View style={styles.meta}>
                  <Text
                    style={[styles.name, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.username}
                  </Text>
                  <Text
                    style={[
                      styles.role,
                      {
                        color: online
                          ? colors.badge.success.text
                          : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {online ? 'Online' : 'Offline'} ·{' '}
                    {item.role || item.designation || item.email || '—'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void onCall(item)}
                  disabled={!webrtcReady || phase !== 'idle' || submitting}
                  style={[
                    styles.callBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity:
                        !webrtcReady || phase !== 'idle' || submitting
                          ? 0.35
                          : 1,
                    },
                  ]}
                  accessibilityLabel={`Call ${item.username}`}
                >
                  {busy ? (
                    <ActivityIndicator color="#04120F" size="small" />
                  ) : (
                    <Ionicons name="call" size={18} color="#04120F" />
                  )}
                </Pressable>
              </View>
            );
          }}
        />
        )
      ) : historyLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : historyError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.danger }}>{historyError}</Text>
          <Pressable
            onPress={() => void loadHistory()}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={historyLoading}
              onRefresh={() => void loadHistory()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No past calls yet
            </Text>
          }
          renderItem={({ item }) => {
            const outgoing = String(item.caller_id) === String(user?._id);
            const peer = outgoing ? item.callee_snapshot : item.caller_snapshot;
            return (
              <View
                style={[
                  styles.historyRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.meta}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>
                    {outgoing ? '↗ Outgoing' : '↙ Incoming'} ·{' '}
                    {peer?.username || 'User'}
                  </Text>
                  <Text style={[styles.role, { color: colors.textMuted }]}>
                    {formatWhen(item.started_at || item.createdAt)} ·{' '}
                    {formatDuration(item.started_at, item.ended_at)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyStatus,
                    {
                      color:
                        item.status === 'ended'
                          ? colors.badge.success.text
                          : item.status === 'rejected'
                            ? colors.danger
                            : colors.textMuted,
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 3,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  banner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  bannerText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  historyStatus: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 2 },
  name: {
    ...typography.label,
    fontWeight: '600',
  },
  role: {
    ...typography.caption,
    fontSize: 11,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    ...typography.bodySmall,
  },
});
