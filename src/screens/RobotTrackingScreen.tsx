import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { SolarPanelRow } from '../components/robotTracking/SolarPanelRow';
import { RobotLocationsMapModal } from '../components/robotTracking/RobotLocationsMapModal';
import { RobotTrackingDetailModal } from '../components/robotTracking/RobotTrackingDetailModal';
import {
  fetchRobotTrackingBySiteAndDate,
  RobotTrackingApiError,
} from '../api/robotTracking';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import type { DrawerParamList } from '../navigation/types';
import type { AssignedSite } from '../types/auth';
import type { RobotTracking } from '../types/robotTracking';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { appAlert } from '../utils/appAlert';
import { mergeRobotTrackingUpdate } from '../utils/robotTrackingHelpers';

type Route = RouteProp<DrawerParamList, 'RobotTracking'>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

const LEGEND = [
  { color: '#FFA000', label: 'Running' },
  { color: '#4CAF50', label: 'At Dock / Completed' },
  { color: '#ff0000ab', label: 'Cancelled / Battery Dead' },
  { color: '#ffffff', label: 'No Cleaning' },
] as const;

export function RobotTrackingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const initialSiteId = route.params?.siteId;

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const [siteId, setSiteId] = useState('');
  const [date, setDate] = useState(todayIsoDate);
  const [block, setBlock] = useState('');
  const [search, setSearch] = useState('');
  const [robots, setRobots] = useState<RobotTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RobotTracking | null>(null);
  const [showMap, setShowMap] = useState(false);

  const robotsRef = useRef<RobotTracking[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    robotsRef.current = robots;
  }, [robots]);

  useEffect(() => {
    if (assignedSites.length === 0) {
      setSiteId('');
      return;
    }
    setSiteId((current) => {
      if (
        initialSiteId &&
        assignedSites.some((site) => site.site_id === initialSiteId)
      ) {
        return initialSiteId;
      }
      if (current && assignedSites.some((site) => site.site_id === current)) {
        return current;
      }
      return assignedSites[0].site_id;
    });
  }, [assignedSites, initialSiteId]);

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );

  const uniqueBlocks = useMemo(() => {
    const set = new Set<string>();
    robots.forEach((r) => {
      if (r.block) set.add(r.block);
    });
    return Array.from(set).sort();
  }, [robots]);

  const blockOptions = useMemo(
    () => [
      { value: '', label: 'All Blocks' },
      ...uniqueBlocks.map((b) => ({ value: b, label: b })),
    ],
    [uniqueBlocks],
  );

  const filteredRobots = useMemo(() => {
    const q = search.trim().toLowerCase();
    return robots.filter((r) => {
      if (block && r.block !== block) return false;
      if (!q) return true;
      return (r.robot_no || '').toLowerCase().includes(q);
    });
  }, [robots, block, search]);

  const maxRowLength = useMemo(() => {
    if (!filteredRobots.length) return 1;
    return Math.max(
      1,
      ...filteredRobots.map((r) => Number(r.row_length) || 1),
    );
  }, [filteredRobots]);

  const loadTracking = useCallback(
    async (isRefresh = false) => {
      if (!siteId) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const data = await fetchRobotTrackingBySiteAndDate({
          siteId,
          date,
          signal: controller.signal,
        });
        setRobots(data);
        setSelected((prev) => {
          if (!prev) return null;
          return (
            data.find(
              (r) => r._id === prev._id || r.robot_no === prev.robot_no,
            ) ?? null
          );
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setRobots([]);
        if (err instanceof RobotTrackingApiError) {
          setError(err.message);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to load tracking',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [siteId, date],
  );

  useEffect(() => {
    void loadTracking();
    return () => abortRef.current?.abort();
  }, [loadTracking]);

  // Live socket updates for selected site
  useEffect(() => {
    if (!siteId) return;
    let active = true;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    const onUpdate = (payload: { tracking?: RobotTracking }) => {
      const tracking = payload?.tracking;
      if (!tracking) return;
      setRobots((prev) => mergeRobotTrackingUpdate(prev, tracking));
      setSelected((prev) => {
        if (!prev) return null;
        if (prev._id === tracking._id || prev.robot_no === tracking.robot_no) {
          const merged = mergeRobotTrackingUpdate([prev], tracking)[0];
          return merged;
        }
        return prev;
      });
    };

    void (async () => {
      try {
        socket = await getSocket();
        if (!active) return;
        const join = () => socket?.emit('join_site_id_room', siteId);
        if (socket.connected) join();
        else socket.once('connect', join);
        socket.on('robotPositionUpdate', onUpdate);
      } catch {
        // REST still works without live updates
      }
    })();

    return () => {
      active = false;
      if (socket) {
        socket.emit('leave_site_id_room', siteId);
        socket.off('robotPositionUpdate', onUpdate);
      }
    };
  }, [siteId]);

  const isInternal = user?.type === 'Internal';
  const canCommand =
    Boolean(user?.robot_command_access) ||
    ['Master Admin', 'Service Admin', 'Project Admin', 'Site Technician'].includes(
      user?.role ?? '',
    );

  const openMap = () => {
    if (!siteId) {
      appAlert('Select a site', 'Please select a site first.');
      return;
    }
    setShowMap(true);
  };

  const shiftDate = (delta: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Navbar title="Robot Tracking" />

      <View
        style={[
          styles.filtersCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Row 1: Site + Block + Map */}
        <View style={styles.topRow}>
          <View style={styles.selectHalf}>
            <UptimeSelectField
              label="Site"
              value={siteId}
              options={siteOptions}
              onChange={(value) => setSiteId(String(value))}
              icon="business-outline"
              compact
            />
          </View>
          <View style={styles.selectHalf}>
            <UptimeSelectField
              label="Block"
              value={block}
              options={blockOptions}
              onChange={(value) => setBlock(String(value))}
              icon="grid-outline"
              compact
            />
          </View>
          <Pressable
            onPress={openMap}
            disabled={!siteId}
            style={[
              styles.mapBtn,
              {
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}18`,
                opacity: siteId ? 1 : 0.5,
              },
            ]}
          >
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text style={[styles.mapBtnText, { color: colors.primary }]}>
              Map
            </Text>
          </Pressable>
        </View>

        {/* Row 2: Date + Today + Search */}
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => shiftDate(-1)}
            style={[
              styles.dateBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </Pressable>

          <View
            style={[
              styles.dateBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {date}
            </Text>
          </View>

          <Pressable
            onPress={() => shiftDate(1)}
            style={[
              styles.dateBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onPress={() => setDate(todayIsoDate())}
            style={[
              styles.todayBtn,
              {
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}18`,
              },
            ]}
          >
            <Text style={[styles.todayText, { color: colors.primary }]}>
              Today
            </Text>
          </Pressable>

          <View
            style={[
              styles.searchBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons name="search" size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Robot no…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.listWrap, { backgroundColor: colors.background }]}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: colors.danger, textAlign: 'center', paddingHorizontal: 24 }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadTracking()}
              style={[styles.retry, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredRobots}
            keyExtractor={(item) => item._id || item.robot_no}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadTracking(true)}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={
              filteredRobots.length === 0
                ? styles.emptyContent
                : { paddingBottom: spacing.sm }
            }
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                No Robots Tracking Found on {date}
              </Text>
            }
            renderItem={({ item }) => (
              <SolarPanelRow
                robot={item}
                maxRowLength={maxRowLength}
                onPress={setSelected}
              />
            )}
          />
        )}
      </View>

      <View
        style={[
          styles.legend,
          {
            backgroundColor: colors.backgroundSecondary,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        {LEGEND.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: item.color,
                  borderWidth: item.color === '#ffffff' ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <RobotTrackingDetailModal
        visible={selected != null}
        robot={
          selected
            ? robots.find(
                (r) =>
                  r._id === selected._id || r.robot_no === selected.robot_no,
              ) ?? selected
            : null
        }
        isInternal={isInternal}
        canCommand={canCommand}
        onClose={() => setSelected(null)}
      />

      <RobotLocationsMapModal
        visible={showMap}
        siteId={siteId}
        onClose={() => setShowMap(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filtersCard: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  selectHalf: {
    flex: 1,
    minWidth: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateBtn: {
    width: 32,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBox: {
    minWidth: 108,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  dateText: {
    fontWeight: '700',
    fontSize: 12,
  },
  todayBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontWeight: '700',
    fontSize: 12,
  },
  mapBtn: {
    width: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  mapBtnText: {
    fontWeight: '700',
    fontSize: 11,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderWidth: 1,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  legend: {
    flexShrink: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    zIndex: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
