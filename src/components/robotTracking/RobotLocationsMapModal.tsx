import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRobotOnlyLocations } from '../../api/robotTracking';
import type { RobotLocationItem } from '../../types/robotTracking';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
import { getRobotMarkerColor, isRobotOnline } from '../../utils/robot';
import {
  buildClearSelectionScript,
  buildRobotLocationsLeafletHtml,
  buildSelectRobotScript,
} from './robotLocationsMapHtml';

type Props = {
  visible: boolean;
  siteId: string;
  onClose: () => void;
};

export function RobotLocationsMapModal({ visible, siteId, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webRef = useRef<{ injectJavaScript: (script: string) => void } | null>(
    null,
  );
  const mapReadyRef = useRef(false);
  const pendingFlyId = useRef<string | null>(null);

  const [robots, setRobots] = useState<RobotLocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RobotLocationItem | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError('');
    setMapReady(false);
    mapReadyRef.current = false;
    try {
      const data = await fetchRobotOnlyLocations(siteId);
      setRobots(data);
    } catch (err) {
      setRobots([]);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelected(null);
      setShowSuggest(false);
      setMapReady(false);
      mapReadyRef.current = false;
      pendingFlyId.current = null;
      return;
    }
    setQuery('');
    setSelected(null);
    setShowSuggest(false);
    void load();
  }, [visible, load]);

  // HTML only rebuilds when robot list changes — not on every select
  const html = useMemo(
    () => buildRobotLocationsLeafletHtml(robots),
    [robots],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return robots
      .filter((r) => {
        const no = (r.robot_no || '').toLowerCase();
        const block = (r.block || '').toLowerCase();
        const deveui = (r.deveui || '').toLowerCase();
        return no.includes(q) || block.includes(q) || deveui.includes(q);
      })
      .slice(0, 12);
  }, [query, robots]);

  const flyToRobot = useCallback((id: string) => {
    if (!mapReadyRef.current) {
      pendingFlyId.current = id;
      return;
    }
    webRef.current?.injectJavaScript(buildSelectRobotScript(id));
  }, []);

  const selectRobot = useCallback(
    (robot: RobotLocationItem) => {
      setSelected(robot);
      setQuery(robot.robot_no || '');
      setShowSuggest(false);
      flyToRobot(robot._id);
    },
    [flyToRobot],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    setQuery('');
    pendingFlyId.current = null;
    if (mapReadyRef.current) {
      webRef.current?.injectJavaScript(buildClearSelectionScript());
    }
  }, []);

  const selectedLat = Number(selected?.location?.latitude);
  const selectedLng = Number(selected?.location?.longitude);
  const showMap = visible && !loading && !error && robots.length >= 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: '#0b1220',
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Robot Locations</Text>
            <Text style={styles.headerSub}>
              {siteId} · {robots.length} robots
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={20} color="#ff4d4d" />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#8899bb" />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            placeholder="Search robot no, block, DevEUI…"
            placeholderTextColor="#667799"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (suggestions[0]) selectRobot(suggestions[0]);
            }}
          />
          {selected ? (
            <Pressable onPress={clearSelection}>
              <Ionicons name="close-circle" size={18} color="#8899bb" />
            </Pressable>
          ) : null}
        </View>

        {showSuggest && suggestions.length > 0 ? (
          <View style={styles.suggestBox}>
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={suggestions}
              keyExtractor={(item) => item._id}
              initialNumToRender={8}
              renderItem={({ item }) => {
                const color = getRobotMarkerColor(
                  item.lora_state ?? undefined,
                  item.last_status,
                );
                return (
                  <Pressable
                    style={styles.suggestItem}
                    onPress={() => selectRobot(item)}
                  >
                    <View style={styles.suggestLeft}>
                      <View
                        style={[styles.suggestDot, { backgroundColor: color }]}
                      />
                      <Text style={styles.suggestNo}>{item.robot_no}</Text>
                    </View>
                    <Text style={styles.suggestBlock}>{item.block || '—'}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}

        <View style={styles.body}>
          <View style={styles.mapPane}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#38bdf8" />
                <Text style={styles.muted}>Loading locations…</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.error}>{error}</Text>
                <Pressable onPress={() => void load()} style={styles.retry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : showMap ? (
              <>
                {!mapReady ? (
                  <View style={styles.mapLoadingOverlay} pointerEvents="none">
                    <ActivityIndicator color="#38bdf8" />
                    <Text style={styles.muted}>Preparing map…</Text>
                  </View>
                ) : null}
                <WebView
                  ref={webRef}
                  originWhitelist={['*']}
                  source={{ html }}
                  style={styles.map}
                  javaScriptEnabled
                  domStorageEnabled
                  cacheEnabled
                  setSupportMultipleWindows={false}
                  nestedScrollEnabled
                  androidLayerType="hardware"
                  onShouldStartLoadWithRequest={() => true}
                  onMessage={(event) => {
                    try {
                      const msg = JSON.parse(event.nativeEvent.data) as {
                        type?: string;
                        id?: string;
                      };
                      if (msg.type === 'ready') {
                        mapReadyRef.current = true;
                        setMapReady(true);
                        if (pendingFlyId.current) {
                          const id = pendingFlyId.current;
                          pendingFlyId.current = null;
                          webRef.current?.injectJavaScript(
                            buildSelectRobotScript(id),
                          );
                        }
                        return;
                      }
                      if (msg.type === 'select' && msg.id) {
                        const found = robots.find((r) => r._id === msg.id);
                        if (found) {
                          setSelected(found);
                          setQuery(found.robot_no || '');
                          setShowSuggest(false);
                        }
                      }
                    } catch {
                      // ignore
                    }
                  }}
                />
              </>
            ) : null}
          </View>

          {selected ? (
            <View
              style={[
                styles.detail,
                { borderColor: colors.border, backgroundColor: '#0f172a' },
              ]}
            >
              <Text style={styles.detailEyebrow}>SELECTED ROBOT</Text>
              <View style={styles.detailTitleRow}>
                <Text style={styles.detailTitle}>{selected.robot_no}</Text>
                {(() => {
                  const color = getRobotMarkerColor(
                    selected.lora_state ?? undefined,
                    selected.last_status,
                  );
                  const inProgress =
                    (selected.last_status ?? '').trim().toLowerCase() ===
                    'cleaning in progress';
                  const label = inProgress
                    ? 'IN PROGRESS'
                    : isRobotOnline(selected.lora_state ?? undefined)
                      ? 'ONLINE'
                      : 'OFFLINE';
                  return (
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: `${color}22`, borderColor: color },
                      ]}
                    >
                      <View
                        style={[styles.statusDot, { backgroundColor: color }]}
                      />
                      <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.detailLine}>
                Last status: {selected.last_status || '—'}
              </Text>
              <Text style={styles.detailLine}>
                Last uplink: {formatDateTimeIST(selected.last_uplink)}
              </Text>
              <Text style={styles.detailLine}>
                Block: {selected.block || '—'}
              </Text>
              <Text style={styles.detailLine}>
                DevEUI: {selected.deveui || '—'}
              </Text>
              <Text style={styles.detailLine}>
                LoRa No: {selected.lora_no ?? '—'}
              </Text>
              <Text style={styles.detailLine}>
                Last Gateway: {selected.last_gateway || '—'}
              </Text>
              <Text style={styles.detailLine}>
                Lat/Lng:{' '}
                {Number.isFinite(selectedLat) && Number.isFinite(selectedLng)
                  ? `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
                  : '—'}
              </Text>
              <View style={styles.detailActions}>
                <Pressable
                  style={styles.mapLink}
                  onPress={() => {
                    const url =
                      selected.location?.map_url ||
                      (Number.isFinite(selectedLat) &&
                      Number.isFinite(selectedLng)
                        ? `https://www.google.com/maps?q=${selectedLat},${selectedLng}`
                        : null);
                    if (url) void Linking.openURL(url);
                  }}
                >
                  <Text style={styles.mapLinkText}>Google Maps</Text>
                </Pressable>
                <Pressable
                  style={styles.recenter}
                  onPress={() => flyToRobot(selected._id)}
                >
                  <Text style={styles.recenterText}>Re-center</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a3a60',
  },
  headerTitle: {
    ...typography.h3,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  headerSub: {
    ...typography.caption,
    color: '#8899bb',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#ff4d4d',
    backgroundColor: 'rgba(255,77,77,.1)',
  },
  searchWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#101936',
    borderWidth: 1,
    borderColor: '#2a3a60',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
    paddingVertical: 0,
  },
  suggestBox: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    maxHeight: 180,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#2a3a60',
    borderRadius: radius.md,
    zIndex: 20,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(42,58,96,.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  suggestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestNo: { color: '#facc15', fontWeight: '700', fontSize: 13 },
  suggestBlock: { color: '#8899bb', fontSize: 13 },
  body: { flex: 1, flexDirection: 'column', minHeight: 0 },
  mapPane: { flex: 1, minHeight: 0 },
  map: { flex: 1, backgroundColor: '#0b1220' },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: 'rgba(11,18,32,.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  muted: { color: '#8899bb', fontSize: 13 },
  error: { color: '#ff4d4d', textAlign: 'center' },
  retry: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(56,189,248,.15)',
  },
  retryText: { color: '#38bdf8', fontWeight: '600' },
  detail: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailEyebrow: {
    fontSize: 11,
    color: '#8899bb',
    letterSpacing: 0.6,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38bdf8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailLine: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  mapLink: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,.4)',
    backgroundColor: 'rgba(56,189,248,.1)',
    alignItems: 'center',
  },
  mapLinkText: { color: '#38bdf8', fontWeight: '600', fontSize: 13 },
  recenter: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(250,204,21,.12)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,.35)',
    alignItems: 'center',
  },
  recenterText: { color: '#facc15', fontWeight: '600', fontSize: 13 },
});
