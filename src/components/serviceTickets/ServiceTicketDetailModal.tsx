import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button } from '../ui';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
import { resolveProfileImageUri } from '../../utils/cleaningLogs';
import {
  formatFieldLabel,
  type ServiceTicket,
  type ServiceTicketLastActivity,
} from '../../types/serviceTickets';

type Props = {
  visible: boolean;
  ticket: ServiceTicket | null;
  loading?: boolean;
  onClose: () => void;
  onResolve?: () => void;
};

function collectImages(
  ticket: ServiceTicket,
  keys: (keyof ServiceTicket)[],
): string[] {
  return keys
    .map((key) => ticket[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDateValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const nested = (value as { $date?: unknown }).$date;
    if (typeof nested === 'string' || typeof nested === 'number') {
      return String(nested);
    }
  }
  return undefined;
}

function normalizeActivities(
  last?: ServiceTicketLastActivity | ServiceTicketLastActivity[],
): ServiceTicketLastActivity[] {
  if (!last) return [];
  const list = Array.isArray(last) ? last : [last];
  return [...list].sort((a, b) => {
    const aTime =
      Date.parse(resolveDateValue(a.timestamp ?? a.createdAt) ?? '') || 0;
    const bTime =
      Date.parse(resolveDateValue(b.timestamp ?? b.createdAt) ?? '') || 0;
    return bTime - aTime;
  });
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const { colors } = useTheme();
  const display = value && String(value).trim() ? value : '—';
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
        {display}
      </Text>
    </View>
  );
}

function ImageStrip({
  title,
  uris,
  onPress,
}: {
  title: string;
  uris: string[];
  onPress: (uri: string) => void;
}) {
  const { colors } = useTheme();

  if (uris.length === 0) {
    return (
      <Text style={[styles.emptyImages, { color: colors.textMuted }]}>
        No {title.toLowerCase()} available
      </Text>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.imageRow}>
          {uris.map((uri) => (
            <Pressable key={uri} onPress={() => onPress(uri)}>
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function ServiceTicketDetailModal({
  visible,
  ticket,
  loading,
  onClose,
  onResolve,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useStatusBarOverlay(visible);

  const activities = useMemo(
    () => normalizeActivities(ticket?.last_activity),
    [ticket?.last_activity],
  );

  const generatedImages = useMemo(
    () =>
      ticket
        ? collectImages(ticket, [
            'ticket_generated_images1',
            'ticket_generated_images2',
            'ticket_generated_images3',
            'ticket_generated_images4',
            'ticket_generated_images5',
          ])
        : [],
    [ticket],
  );

  const resolvedImages = useMemo(
    () =>
      ticket
        ? collectImages(ticket, [
            'ticket_resolved_images1',
            'ticket_resolved_images2',
            'ticket_resolved_images3',
            'ticket_resolved_images4',
            'ticket_resolved_images5',
          ])
        : [],
    [ticket],
  );

  const partsList = useMemo(() => {
    if (!ticket) return [];
    if (Array.isArray(ticket.parts_replaced) && ticket.parts_replaced.length > 0) {
      return ticket.parts_replaced;
    }
    if (ticket.part_replaced) {
      return [
        {
          part_replaced: ticket.part_replaced,
          part_replaced_id: ticket.part_replaced_id,
          replaced_part_quantity: Number(ticket.replaced_part_quantity) || null,
          item_image: ticket.part_replaced_image,
          item_code: null,
          checklist:
            ticket.part_checklist?.find(
              (c) => c.part_id === ticket.part_replaced_id,
            )?.checklist || null,
        },
      ];
    }
    return [];
  }, [ticket]);

  const hasParts =
    Boolean(ticket?.service_part_replaced) || partsList.length > 0;

  const resolved = Boolean(ticket?.ticket_resolved);

  const fmtSite = (id?: string) =>
    (id || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlay,
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <View
            style={[
              styles.panel,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: isDark ? '#000' : '#101936',
              },
            ]}
          >
            <View
              style={[styles.accentBar, { backgroundColor: colors.primary }]}
            />

            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: resolved
                        ? colors.badge.success.bg
                        : colors.badge.warning.bg,
                    },
                  ]}
                >
                  <Ionicons
                    name="construct-outline"
                    size={18}
                    color={
                      resolved
                        ? colors.badge.success.text
                        : colors.badge.warning.text
                    }
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                    Service ticket
                  </Text>
                  <Text
                    style={[styles.title, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {ticket?.ticket_id || 'Details'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={resolved ? 'Resolved' : 'Open'}
                      variant={resolved ? 'success' : 'warning'}
                      size="sm"
                    />
                    {ticket?.fault_type ? (
                      <Badge
                        label={ticket.fault_type.replace(/-/g, ' ')}
                        variant="info"
                        size="sm"
                      />
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: colors.backgroundTertiary },
                  ]}
                >
                  <Ionicons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            {loading || !ticket ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.bodyScroll}
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Ticket details
                  </Text>
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <DetailRow label="Ticket ID" value={ticket.ticket_id} />
                    <DetailRow
                      label="Status"
                      value={resolved ? 'Resolved' : 'Open'}
                    />
                    <DetailRow
                      label="Fault type"
                      value={ticket.fault_type?.replace(/-/g, ' ')}
                    />
                    <DetailRow label="Site" value={fmtSite(ticket.site_id)} />
                    <DetailRow label="Company" value={ticket.company} />
                    <DetailRow
                      label="Opened at"
                      value={formatDateTimeIST(ticket.createdAt)}
                    />
                    <DetailRow
                      label="Opened by"
                      value={ticket.ticket_generated_by}
                    />
                    <DetailRow
                      label="Opened email"
                      value={ticket.ticket_generated_by_email}
                    />
                    <DetailRow
                      label="Generating notes"
                      value={ticket.ticket_generating_notes}
                    />
                    <DetailRow
                      label="Resolved at"
                      value={
                        resolved
                          ? formatDateTimeIST(
                              ticket.ticket_resolved_at || ticket.updatedAt,
                            )
                          : '—'
                      }
                    />
                    <DetailRow
                      label="Resolved by"
                      value={ticket.ticket_resolved_by || '—'}
                    />
                    <DetailRow
                      label="Resolved email"
                      value={ticket.ticket_resolved_by_email || '—'}
                    />
                    <DetailRow
                      label="Resolving notes"
                      value={ticket.ticket_resolving_notes || '—'}
                    />
                    <DetailRow
                      label="Part replaced"
                      value={hasParts ? 'Yes' : 'No'}
                    />
                  </View>

                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Robot details
                  </Text>
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <DetailRow label="Robot No" value={ticket.robot_no} />
                    <DetailRow label="Robot type" value={ticket.robot_type} />
                    <DetailRow label="Block" value={ticket.block} />
                    <DetailRow label="LoRa No" value={ticket.lora_no || '—'} />
                    <DetailRow label="DevEUI" value={ticket.deveui} />
                  </View>

                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Parts replaced ({partsList.length})
                  </Text>
                  {partsList.length === 0 ? (
                    <Text style={[styles.emptyImages, { color: colors.textMuted }]}>
                      No parts replaced
                    </Text>
                  ) : (
                    partsList.map((part, index) => {
                      const checklist =
                        part.checklist && typeof part.checklist === 'object'
                          ? Object.entries(part.checklist)
                          : [];
                      return (
                        <View
                          key={part._id || part.part_replaced_id || index}
                          style={[
                            styles.partCard,
                            {
                              backgroundColor: colors.backgroundSecondary,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.partTop}>
                            {part.item_image ? (
                              <Pressable
                                onPress={() => setViewerUri(part.item_image!)}
                              >
                                <Image
                                  source={{ uri: part.item_image }}
                                  style={styles.partImage}
                                />
                              </Pressable>
                            ) : (
                              <View
                                style={[
                                  styles.partImageFallback,
                                  {
                                    backgroundColor: colors.backgroundTertiary,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="cube-outline"
                                  size={16}
                                  color={colors.textMuted}
                                />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.activityName,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {index + 1}. {part.part_replaced || '—'}
                              </Text>
                              <Text
                                style={[
                                  styles.activityMeta,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {part.item_code
                                  ? `Code: ${part.item_code} · `
                                  : ''}
                                Qty: {part.replaced_part_quantity ?? '—'}
                              </Text>
                            </View>
                          </View>
                          {checklist.length > 0 ? (
                            <View style={styles.checklistWrap}>
                              {checklist.map(([key, value]) =>
                                value ? (
                                  <Text
                                    key={key}
                                    style={[
                                      styles.checklistLine,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        color: colors.textPrimary,
                                        fontWeight: '700',
                                      }}
                                    >
                                      {formatFieldLabel(key)}:{' '}
                                    </Text>
                                    {String(value)}
                                  </Text>
                                ) : null,
                              )}
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}

                  <ImageStrip
                    title="Raised attachments"
                    uris={generatedImages}
                    onPress={setViewerUri}
                  />
                  <ImageStrip
                    title="Resolved attachments"
                    uris={resolvedImages}
                    onPress={setViewerUri}
                  />

                  {activities.length > 0 ? (
                    <View style={styles.section}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Activity
                      </Text>
                      {activities.map((item, index) => {
                        const avatar = resolveProfileImageUri(
                          item.profile_image,
                        );
                        const when = formatDateTimeIST(
                          resolveDateValue(item.timestamp ?? item.createdAt),
                        );
                        const details = stripHtml(
                          item.details || item.message || item.action,
                        );
                        return (
                          <View
                            key={`${item.email ?? item.name ?? 'a'}-${index}`}
                            style={[
                              styles.activityCard,
                              {
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.activityTop}>
                              {avatar ? (
                                <Image
                                  source={{ uri: avatar }}
                                  style={styles.avatar}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.avatarFallback,
                                    {
                                      backgroundColor:
                                        colors.backgroundTertiary,
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
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.activityName,
                                    { color: colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.name || 'Unknown'}
                                </Text>
                                {item.email ? (
                                  <Text
                                    style={[
                                      styles.activityMeta,
                                      { color: colors.textMuted },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.email}
                                  </Text>
                                ) : null}
                              </View>
                              <Text
                                style={[
                                  styles.activityMeta,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {when}
                              </Text>
                            </View>
                            {details ? (
                              <Text
                                style={[
                                  styles.activityDetails,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {details}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </ScrollView>

                <View
                  style={[styles.footer, { borderTopColor: colors.border }]}
                >
                  <Button
                    title="Close"
                    variant="outline"
                    size="sm"
                    onPress={onClose}
                    style={{ flex: 1 }}
                  />
                  {!resolved && onResolve ? (
                    <Button
                      title="Resolve"
                      size="sm"
                      icon="checkmark-circle-outline"
                      onPress={onResolve}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewerUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => setViewerUri(null)}
        >
          {viewerUri ? (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  panel: {
    flex: 1,
    maxHeight: '96%',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  accentBar: { height: 3 },
  header: { padding: spacing.md, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { ...typography.caption, fontSize: 11, textTransform: 'uppercase' },
  title: { ...typography.label, fontSize: 17 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  bodyScroll: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  rowLabel: { ...typography.caption, fontSize: 11 },
  rowValue: { ...typography.bodySmall, fontSize: 13 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, fontSize: 14 },
  emptyImages: { ...typography.bodySmall, textAlign: 'center' },
  imageRow: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
  },
  checklistCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  checklistLine: { ...typography.bodySmall, fontSize: 12 },
  partCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  partTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  partImageFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistWrap: { gap: 4 },
  activityCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: { ...typography.label, fontSize: 13 },
  activityMeta: { ...typography.caption, fontSize: 10 },
  activityDetails: { ...typography.bodySmall, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  viewerImage: { width: '100%', height: '80%' },
});
