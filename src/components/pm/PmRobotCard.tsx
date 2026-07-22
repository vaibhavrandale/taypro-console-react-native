import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Button } from '../ui';
import { PmImageLightbox } from './PmImageLightbox';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDateTimeIST } from '../../utils/datetime';
import { resolveProfileImageUri } from '../../utils/cleaningLogs';
import {
  collectPmImages,
  getPmAlignmentChecks,
  getPmOilingChecks,
  getPmPhysicalChecks,
  pmRecordHasIssue,
  type PmCheckItem,
  type PmRobotRecord,
} from '../../types/preventiveMaintenance';
import type { PreventiveMaintenanceStackParamList } from '../../navigation/PreventiveMaintenanceStack';

type Props = {
  record: PmRobotRecord;
};

type Navigation = NativeStackNavigationProp<
  PreventiveMaintenanceStackParamList,
  'PmList'
>;

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function CondBadge({
  value,
  isBool,
}: {
  value?: string | boolean;
  isBool?: boolean;
}) {
  if (value == null || value === '') {
    return <Badge label="N/A" variant="neutral" size="sm" />;
  }

  if (isBool) {
    const yes =
      value === true ||
      value === 'Yes' ||
      value === 'yes' ||
      value === 'true';
    return (
      <Badge
        label={yes ? 'Yes' : 'No'}
        variant={yes ? 'error' : 'success'}
        size="sm"
      />
    );
  }

  const v = String(value).toLowerCase();
  if (v === 'ok') return <Badge label="OK" variant="success" size="sm" />;
  if (v === 'yes') return <Badge label="Yes" variant="warning" size="sm" />;
  if (v === 'no') return <Badge label="No" variant="neutral" size="sm" />;
  return <Badge label={String(value)} variant="neutral" size="sm" />;
}

function CheckSection({
  title,
  icon,
  checks,
  onImagePress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  checks: PmCheckItem[];
  onImagePress: (src: string, label: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {title}
        </Text>
      </View>
      <View style={styles.checkList}>
        {checks.map((check) => (
          <View
            key={check.label}
            style={[
              styles.checkRow,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.checkLabel, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {check.label}
            </Text>
            <CondBadge value={check.condition} isBool={check.isBool} />
            {check.image ? (
              <Pressable onPress={() => onImagePress(check.image!, check.label)}>
                <Image source={{ uri: check.image }} style={styles.thumb} />
              </Pressable>
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function PmRobotCard({ record }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const [showActivity, setShowActivity] = useState(false);
  const [lightbox, setLightbox] = useState<{
    images: { src: string; label: string }[];
    index: number;
  } | null>(null);

  const hasIssue = pmRecordHasIssue(record);
  const physical = useMemo(() => getPmPhysicalChecks(record), [record]);
  const oiling = useMemo(() => getPmOilingChecks(record), [record]);
  const alignment = useMemo(() => getPmAlignmentChecks(record), [record]);
  const images = useMemo(() => collectPmImages(record), [record]);
  const activities = record.last_activity ?? [];

  const openImage = (src: string, label: string) => {
    const index = images.findIndex((img) => img.src === src);
    setLightbox({
      images: images.length ? images : [{ src, label }],
      index: index >= 0 ? index : 0,
    });
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: hasIssue
                  ? colors.badge.error.bg
                  : colors.badge.success.bg,
              },
            ]}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={
                hasIssue ? colors.badge.error.text : colors.badge.success.text
              }
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.badgeRow}>
              <Badge
                label={record.robot_no || '—'}
                variant="success"
                size="sm"
              />
              {record.robot_type ? (
                <Badge label={record.robot_type} variant="info" size="sm" />
              ) : null}
              {record.pm_id ? (
                <Badge label={record.pm_id} variant="neutral" size="sm" />
              ) : null}
            </View>
            <Text
              style={[styles.meta, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {record.site_name || record.site_id || '—'}
              {record.site_location ? ` · ${record.site_location}` : ''}
            </Text>
            {record.createdAt ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Created: {formatDateTimeIST(record.createdAt)}
              </Text>
            ) : null}
          </View>
          <Button
            title="Edit"
            size="sm"
            variant="outline"
            icon="create-outline"
            onPress={() => navigation.navigate('PmUpdate', { id: record._id })}
          />
        </View>

        <CheckSection
          title="Physical condition"
          icon="construct-outline"
          checks={physical}
          onImagePress={openImage}
        />
        <CheckSection
          title="Oiling status"
          icon="water-outline"
          checks={oiling}
          onImagePress={openImage}
        />
        <CheckSection
          title="Alignment & fasteners"
          icon="git-compare-outline"
          checks={alignment}
          onImagePress={openImage}
        />

        {images.length > 0 ? (
          <View style={styles.photosBlock}>
            <Text style={[styles.photosTitle, { color: colors.textMuted }]}>
              Photos ({images.length})
            </Text>
            <View style={styles.photoRow}>
              {images.map((img, i) => (
                <Pressable
                  key={`${img.src}-${i}`}
                  onPress={() => setLightbox({ images, index: i })}
                >
                  <Image source={{ uri: img.src }} style={styles.photoThumb} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {activities.length > 0 ? (
          <View style={styles.activityBlock}>
            <Pressable
              onPress={() => setShowActivity((v) => !v)}
              style={styles.activityToggle}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={[styles.activityToggleText, { color: colors.textMuted }]}>
                {showActivity ? 'Hide' : 'Show'} activity ({activities.length})
              </Text>
            </Pressable>
            {showActivity
              ? activities.map((act, i) => {
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
                })
              : null}
          </View>
        ) : null}
      </View>

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
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { ...typography.caption, fontSize: 11 },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  checkList: { gap: spacing.xs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkLabel: { ...typography.bodySmall, fontSize: 12, flex: 1 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  thumbPlaceholder: { width: 44 },
  photosBlock: { gap: spacing.sm },
  photosTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  activityBlock: { gap: spacing.sm },
  activityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityToggleText: { ...typography.caption, fontSize: 12, fontWeight: '600' },
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
});
