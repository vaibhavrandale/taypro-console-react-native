import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { fetchSitewiseServiceInventory } from '../api/serviceTickets';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ServiceInventoryItem } from '../types/serviceTickets';
import { resolveProfileImageUri } from '../utils/cleaningLogs';
import {
  formatDateTimeIST,
  formatRelativeTime,
} from '../utils/datetime';

type StockTone = 'success' | 'warning' | 'error' | 'neutral';

function stockTone(quantity?: number, threshold?: number): StockTone {
  if (quantity == null) return 'neutral';
  if (quantity <= 0) return 'error';
  const lowAt = threshold != null && threshold > 0 ? threshold : 5;
  if (quantity <= lowAt) return 'warning';
  return 'success';
}

function stockLabel(quantity?: number, threshold?: number) {
  if (quantity == null) return '—';
  if (quantity <= 0) return 'Out of stock';
  const lowAt = threshold != null && threshold > 0 ? threshold : 5;
  if (quantity <= lowAt) return 'Low stock';
  return 'In stock';
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

type ActivityDetailPart = {
  text: string;
  tone?: 'success' | 'danger' | 'warning' | 'info';
};

function parseActivityDetails(html?: string): ActivityDetailPart[] {
  if (!html) return [];
  const parts: ActivityDetailPart[] = [];
  const re = /<span\s+class=['"]([^'"]*)['"]>([\s\S]*?)<\/span>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const plain = decodeEntities(
        html.slice(lastIndex, match.index).replace(/<[^>]+>/g, ''),
      );
      if (plain) parts.push({ text: plain });
    }

    const className = match[1].toLowerCase();
    const inner = decodeEntities(match[2].replace(/<[^>]+>/g, ''));
    let tone: ActivityDetailPart['tone'];
    if (className.includes('success')) tone = 'success';
    else if (className.includes('danger') || className.includes('error'))
      tone = 'danger';
    else if (className.includes('warning')) tone = 'warning';
    else if (className.includes('info') || className.includes('primary'))
      tone = 'info';

    if (inner) parts.push({ text: inner, tone });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    const plain = decodeEntities(
      html.slice(lastIndex).replace(/<[^>]+>/g, ''),
    );
    if (plain) parts.push({ text: plain });
  }

  return parts.length
    ? parts
    : [{ text: decodeEntities(html.replace(/<[^>]+>/g, '')) }];
}

function ActivityDetailsText({ html }: { html?: string }) {
  const { colors } = useTheme();
  const parts = useMemo(() => parseActivityDetails(html), [html]);

  const toneColor = (tone?: ActivityDetailPart['tone']) => {
    switch (tone) {
      case 'success':
        return colors.badge.success.text;
      case 'danger':
        return colors.danger;
      case 'warning':
        return colors.badge.warning.text;
      case 'info':
        return colors.badge.info.text;
      default:
        return colors.textSecondary;
    }
  };

  if (!parts.length) {
    return (
      <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
        —
      </Text>
    );
  }

  return (
    <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
      {parts.map((part, index) => (
        <Text
          key={`${index}-${part.text.slice(0, 12)}`}
          style={{
            color: toneColor(part.tone),
            fontWeight: part.tone ? '700' : '400',
          }}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function InventoryCard({
  item,
  index,
  onView,
}: {
  item: ServiceInventoryItem;
  index: number;
  onView: () => void;
}) {
  const { colors } = useTheme();
  const qty = item.quantity;
  const tone = stockTone(qty, item.threshold);
  const imageUri = resolveProfileImageUri(item.item_image ?? undefined);
  const accent =
    tone === 'success'
      ? colors.primary
      : tone === 'warning'
        ? colors.badge.warning.text
        : tone === 'error'
          ? colors.danger
          : colors.textMuted;

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
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.itemImage} />
          ) : (
            <View
              style={[
                styles.itemImageFallback,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={20}
                color={colors.textMuted}
              />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.indexLabel, { color: colors.textMuted }]}>
              #{index}
              {item.site_id ? ` · ${item.site_id}` : ''}
            </Text>
            <Text
              style={[styles.itemName, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {item.item_name || '—'}
            </Text>
            <Text style={[styles.itemCode, { color: colors.textSecondary }]}>
              {item.item_code || item.item_id || '—'}
            </Text>
          </View>
          <View style={styles.qtyBlock}>
            <Text style={[styles.qtyValue, { color: accent }]}>
              {qty != null ? qty : '—'}
            </Text>
            <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
              qty
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Badge
            label={stockLabel(qty, item.threshold)}
            variant={tone}
            size="sm"
          />
          {item.threshold != null ? (
            <Badge
              label={`Threshold ${item.threshold}`}
              variant="neutral"
              size="sm"
            />
          ) : null}
          <Pressable
            onPress={onView}
            hitSlop={6}
            style={[
              styles.viewChip,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="eye-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={[styles.viewChipText, { color: colors.textSecondary }]}>
              View
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function InventoryDetailModal({
  item,
  onClose,
}: {
  item: ServiceInventoryItem | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!item) return null;

  const imageUri = resolveProfileImageUri(item.item_image ?? undefined);
  const tone = stockTone(item.quantity, item.threshold);
  const activity = [...(item.last_activity ?? [])].reverse();

  const rows: Array<[string, string]> = [
    ['Item name', item.item_name || '—'],
    ['Item code', item.item_code || '—'],
    ['Item ID', item.item_id || '—'],
    ['Record ID', item._id || '—'],
    ['Site', item.site_id || '—'],
    ['Company', item.company || '—'],
    ['Quantity', item.quantity != null ? String(item.quantity) : '—'],
    ['Threshold', item.threshold != null ? String(item.threshold) : '—'],
    ['Deleted', item.is_delete ? 'Yes' : 'No'],
    [
      'Created',
      item.createdAt ? formatDateTimeIST(item.createdAt) : '—',
    ],
    [
      'Updated',
      item.updatedAt ? formatDateTimeIST(item.updatedAt) : '—',
    ],
  ];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: colors.border }]}
            />
          </View>

          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalEyebrow, { color: colors.textMuted }]}>
                Inventory item
              </Text>
              <Text
                style={[styles.modalTitle, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {item.item_name || 'Details'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.sheetClose,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.imageStage,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.modalImageFull}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalImageEmpty}>
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.modalImageEmptyText, { color: colors.textMuted }]}
                  >
                    No item image
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalHeroText}>
              <Badge
                label={stockLabel(item.quantity, item.threshold)}
                variant={tone}
                size="sm"
              />
              <Text style={[styles.modalQty, { color: colors.textPrimary }]}>
                Qty {item.quantity != null ? item.quantity : '—'}
                {item.threshold != null
                  ? ` · Threshold ${item.threshold}`
                  : ''}
              </Text>
            </View>

            <View
              style={[
                styles.metaCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              {rows.map(([label, value]) => (
                <View key={label} style={styles.metaRow}>
                  <Text style={[styles.metaKey, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                  <Text
                    style={[styles.metaVal, { color: colors.textPrimary }]}
                    selectable
                  >
                    {value}
                  </Text>
                </View>
              ))}
              {item.item_description ? (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaKey, { color: colors.textMuted }]}>
                    Description
                  </Text>
                  <Text
                    style={[styles.metaVal, { color: colors.textPrimary }]}
                  >
                    {item.item_description}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.activityCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.activityCardHeader}>
                <Text
                  style={[styles.sectionHeading, { color: colors.textPrimary }]}
                >
                  Activity
                </Text>
                <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                  {activity.length}
                </Text>
              </View>

              {activity.length === 0 ? (
                <Text style={[styles.activityEmpty, { color: colors.textMuted }]}>
                  No activity yet
                </Text>
              ) : (
                activity.map((act, i) => {
                  const avatar = resolveProfileImageUri(act.profile_image);
                  return (
                    <View
                      key={`${act.email ?? act.name ?? 'a'}-${i}`}
                      style={[
                        styles.activityRow,
                        {
                          backgroundColor: colors.backgroundTertiary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View
                          style={[
                            styles.avatarFallback,
                            {
                              backgroundColor: colors.backgroundSecondary,
                            },
                          ]}
                        >
                          <Ionicons
                            name="person"
                            size={14}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                      <View style={styles.activityBody}>
                        <Text
                          style={[
                            styles.activityName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {act.name || '—'}
                        </Text>
                        {act.email ? (
                          <Text
                            style={[
                              styles.activityEmail,
                              { color: colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {act.email}
                          </Text>
                        ) : null}
                        <ActivityDetailsText html={act.details} />
                        {act.timestamp ? (
                          <Text
                            style={[
                              styles.activityTime,
                              { color: colors.textMuted },
                            ]}
                          >
                            {formatRelativeTime(act.timestamp)}
                            {' · '}
                            {formatDateTimeIST(act.timestamp)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          <Button title="Close" onPress={onClose} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

export function ServiceInventoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [items, setItems] = useState<ServiceInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<ServiceInventoryItem | null>(null);

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchSitewiseServiceInventory();
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error ? err.message : 'Failed to load inventory',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const siteOptions = useMemo(() => {
    const fromData = items
      .map((item) => item.site_id)
      .filter((id): id is string => Boolean(id));
    const fromUser = assignedSites.map((site) => site.site_id);
    return [...new Set([...fromUser, ...fromData])].sort();
  }, [assignedSites, items]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (siteFilter && item.site_id !== siteFilter) return false;
      if (!term) return true;
      return (
        (item.item_name ?? '').toLowerCase().includes(term) ||
        (item.item_code ?? '').toLowerCase().includes(term) ||
        (item.item_id ?? '').toLowerCase().includes(term) ||
        (item.site_id ?? '').toLowerCase().includes(term) ||
        (item.company ?? '').toLowerCase().includes(term) ||
        (item.item_description ?? '').toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, siteFilter]);

  const summary = useMemo(() => {
    const totalQty = filtered.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );
    const low = filtered.filter((item) => {
      if (item.quantity == null || item.quantity <= 0) return false;
      return stockTone(item.quantity, item.threshold) === 'warning';
    }).length;
    const out = filtered.filter(
      (item) => item.quantity != null && item.quantity <= 0,
    ).length;
    const sites = new Set(
      filtered.map((item) => item.site_id).filter(Boolean),
    ).size;
    return { totalQty, low, out, sites, count: filtered.length };
  }, [filtered]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Service Inventory" subtitle="Site stock on hand" />

      <View style={styles.filters}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search item, code, site..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {siteOptions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.siteChips}
          >
            <Pressable
              onPress={() => setSiteFilter(null)}
              style={[
                styles.siteChip,
                {
                  backgroundColor:
                    siteFilter == null
                      ? colors.primary
                      : colors.backgroundSecondary,
                  borderColor:
                    siteFilter == null ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    siteFilter == null ? '#FFFFFF' : colors.textSecondary,
                  ...typography.caption,
                  fontWeight: '600',
                }}
              >
                All sites
              </Text>
            </Pressable>
            {siteOptions.map((siteId) => {
              const active = siteFilter === siteId;
              return (
                <Pressable
                  key={siteId}
                  onPress={() =>
                    setSiteFilter((prev) => (prev === siteId ? null : siteId))
                  }
                  style={[
                    styles.siteChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.backgroundSecondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      ...typography.caption,
                      fontWeight: '600',
                    }}
                  >
                    {siteId}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.summaryStrip,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {[
            ['Items', String(summary.count), colors.textPrimary],
            ['Sites', String(summary.sites), colors.badge.info.text],
            ['Total qty', String(summary.totalQty), colors.primary],
            ['Low', String(summary.low), colors.badge.warning.text],
            ['Out', String(summary.out), colors.danger],
          ].map(([label, value, color]) => (
            <View key={label} style={styles.summaryCell}>
              <Text style={[styles.summaryValue, { color: String(color) }]}>
                {value}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            {error}
          </Text>
          <Pressable onPress={() => void load()}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) =>
            item._id || item.item_id || `${item.item_code}-${index}`
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="cube-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                {assignedSites.length === 0
                  ? 'No sites assigned to your account'
                  : 'No inventory found for your sites'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <InventoryCard
              item={item}
              index={index + 1}
              onView={() => setViewItem(item)}
            />
          )}
        />
      )}

      <InventoryDetailModal
        item={viewItem}
        onClose={() => setViewItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filters: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
  },
  siteChips: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  siteChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  summaryStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  list: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 180,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  accentBar: { width: 4 },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  itemImageFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  indexLabel: { ...typography.caption, fontSize: 10 },
  itemName: { ...typography.label, fontSize: 14, fontWeight: '700' },
  itemCode: { ...typography.bodySmall, fontWeight: '600' },
  qtyBlock: { alignItems: 'flex-end', minWidth: 44 },
  qtyValue: { ...typography.label, fontSize: 20, fontWeight: '700' },
  qtyLabel: { ...typography.caption, fontSize: 10 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  viewChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handleRow: { alignItems: 'center', paddingBottom: spacing.xs },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  modalHeaderText: { flex: 1, gap: 2 },
  modalEyebrow: { ...typography.caption, fontSize: 10 },
  modalTitle: { ...typography.label, fontSize: 16, fontWeight: '700' },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { flexShrink: 1 },
  modalScrollContent: { gap: spacing.md, paddingBottom: spacing.sm },
  imageStage: {
    width: '100%',
    height: Math.round(Dimensions.get('window').height * 0.42),
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageFull: {
    width: '100%',
    height: '100%',
  },
  modalImageEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  modalImageEmptyText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  modalHeroText: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalQty: { ...typography.bodySmall, fontWeight: '700' },
  metaCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaRow: { gap: 2 },
  metaKey: { ...typography.caption, fontSize: 10 },
  metaVal: { ...typography.bodySmall, fontWeight: '600' },
  activityCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: { ...typography.label, fontSize: 13, fontWeight: '700' },
  sectionCount: { ...typography.caption },
  activityEmpty: { ...typography.bodySmall },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: { flex: 1, gap: 2 },
  activityName: { ...typography.bodySmall, fontWeight: '700' },
  activityEmail: { ...typography.caption, fontSize: 10 },
  activityDetails: { ...typography.bodySmall, lineHeight: 18 },
  activityTime: { ...typography.caption, fontSize: 10, marginTop: 2 },
});
