import React, { useMemo, useState } from 'react';
import {
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
import { Badge } from '../ui';
import { PmImageLightbox } from '../pm/PmImageLightbox';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
import { resolveProfileImageUri } from '../../utils/cleaningLogs';
import type { ClientTicket } from '../../types/clientTickets';

type Props = {
  visible: boolean;
  ticket: ClientTicket | null;
  onClose: () => void;
};

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHttpUrl(value?: string | null): value is string {
  return typeof value === 'string' && value.startsWith('http');
}

function statusVariant(status?: string): 'success' | 'error' | 'warning' {
  if (status === 'Resolved' || status === 'Closed') return 'success';
  if (status === 'Open') return 'error';
  return 'warning';
}

export function ClientTicketDetailModal({ visible, ticket, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [lightbox, setLightbox] = useState<{
    images: { src: string; label: string }[];
    index: number;
  } | null>(null);

  const images = useMemo(() => {
    if (!ticket) return [];
    return [
      { src: ticket.creation_image1, label: 'Creation image 1' },
      { src: ticket.creation_image2, label: 'Creation image 2' },
      { src: ticket.resolution_image1, label: 'Resolution image 1' },
      { src: ticket.resolution_image2, label: 'Resolution image 2' },
    ].filter((img): img is { src: string; label: string } => isHttpUrl(img.src));
  }, [ticket]);

  const rows = useMemo(() => {
    if (!ticket) return [];
    const resolved = ticket.status === 'Resolved';
    return [
      ['Ticket ID', ticket.ticket_id || '—'],
      ['Site ID', ticket.site_id || '—'],
      ['Subject', ticket.subject || '—'],
      ['Description', ticket.description || '—'],
      ['Status', ticket.status || '—'],
      ['Resolution notes', ticket.resolution_notes || '—'],
      ['Created by', ticket.created_by?.name || '—'],
      ['Created by email', ticket.created_by?.email || '—'],
      ['Created at', formatDateTimeIST(ticket.createdAt)],
      ...(resolved
        ? [
            ['Resolved by', ticket.resolved_by?.name || '—'],
            ['Resolved by email', ticket.resolved_by?.email || '—'],
            ['Resolved at', formatDateTimeIST(ticket.resolved_at)],
          ]
        : []),
    ] as [string, string][];
  }, [ticket]);

  const activities = ticket?.last_activity ?? [];

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
              },
            ]}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                  Client ticket
                </Text>
                <Text
                  style={[styles.title, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {ticket?.ticket_id || 'Details'}
                </Text>
                {ticket?.status ? (
                  <Badge
                    label={ticket.status}
                    variant={statusVariant(ticket.status)}
                    size="sm"
                  />
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              {rows.map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                  <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
                    {value}
                  </Text>
                </View>
              ))}

              {images.length > 0 ? (
                <View style={styles.photos}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                    Images
                  </Text>
                  <View style={styles.photoRow}>
                    {images.map((img, index) => (
                      <Pressable
                        key={`${img.src}-${index}`}
                        onPress={() => setLightbox({ images, index })}
                      >
                        <Image source={{ uri: img.src }} style={styles.thumb} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {activities.length > 0 ? (
                <View style={styles.activity}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                    Activity
                  </Text>
                  {activities.map((act, i) => {
                    const avatar = resolveProfileImageUri(act.profile_image);
                    return (
                      <View
                        key={`${act.email ?? 'a'}-${i}`}
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
                              { backgroundColor: colors.backgroundSecondary },
                            ]}
                          >
                            <Ionicons
                              name="person"
                              size={14}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[
                              styles.activityDetails,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {stripHtml(act.details) || act.name || 'Activity'}
                          </Text>
                          <Text
                            style={[styles.meta, { color: colors.textMuted }]}
                            numberOfLines={1}
                          >
                            {[act.email, formatDateTimeIST(act.timestamp)]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {lightbox ? (
        <PmImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  panel: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: { ...typography.h3, fontWeight: '700', marginBottom: 6 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: 10 },
  row: { gap: 2 },
  rowLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowValue: { ...typography.bodySmall, fontSize: 13 },
  photos: { gap: spacing.sm, marginTop: spacing.xs },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  activity: { gap: spacing.sm, marginTop: spacing.xs },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: { ...typography.bodySmall, fontSize: 12 },
  meta: { ...typography.caption, fontSize: 11 },
});
