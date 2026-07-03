import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button } from '../ui';
import type { BadgeVariant } from '../ui/Badge';
import { useNotification } from '../../context/NotificationContext';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { CustomNotification } from '../../types/customNotification';
import { formatDateTimeIST } from '../../utils/datetime';

function getNotificationTone(notification: CustomNotification): {
  variant: BadgeVariant;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} {
  if (notification.is_feedback_required) {
    return {
      variant: 'purple',
      icon: 'chatbox-ellipses-outline',
      label: 'Feedback required',
    };
  }

  const subject = notification.subject.toLowerCase();
  if (
    subject.includes('failure') ||
    subject.includes('alert') ||
    subject.includes('error')
  ) {
    return {
      variant: 'error',
      icon: 'warning-outline',
      label: 'Action required',
    };
  }

  return {
    variant: 'info',
    icon: 'notifications-outline',
    label: 'Announcement',
  };
}

function DescriptionBody({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  return (
    <View style={styles.descriptionBlock}>
      {lines.map((line, index) => {
        const isSection =
          line.includes(':') &&
          (line.startsWith('🏭') ||
            line.startsWith('🤖') ||
            line.startsWith('⚠️') ||
            line.startsWith('🟢') ||
            line.startsWith('🔴') ||
            line.startsWith('🔧'));

        return (
          <Text
            key={`${index}-${line.slice(0, 12)}`}
            style={[
              isSection ? styles.descriptionSection : styles.descriptionLine,
              { color },
            ]}
          >
            {line}
          </Text>
        );
      })}
    </View>
  );
}

export function CustomNotificationModal() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { notification, visible, submitting, error, submitRead } =
    useNotification();
  const [feedback, setFeedback] = useState('');

  useStatusBarOverlay(visible);

  useEffect(() => {
    if (!visible) {
      setFeedback('');
    }
  }, [visible, notification?._id]);

  const tone = useMemo(
    () => (notification ? getNotificationTone(notification) : null),
    [notification],
  );

  if (!notification || !tone) {
    return null;
  }

  const requiresFeedback = Boolean(notification.is_feedback_required);
  const canSubmit = !requiresFeedback || feedback.trim().length > 0;
  const panelWidth = Math.min(windowWidth - spacing.lg * 2, 440);
  const maxPanelHeight =
    windowHeight - insets.top - insets.bottom - spacing.xl * 2;

  const postedByName = notification.posted_by?.name ?? 'System';
  const postedByRole = notification.posted_by?.role ?? 'Automated alert';
  const postedByImage = notification.posted_by?.profile_image;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        // Acknowledgement is required before dismiss.
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                width: panelWidth,
                maxHeight: maxPanelHeight,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: isDark ? '#000' : '#101936',
              },
            ]}
          >
            <View
              style={[
                styles.accentBar,
                { backgroundColor: colors.badge[tone.variant].text },
              ]}
            />

            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderTop}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.badge[tone.variant].bg },
                  ]}
                >
                  <Ionicons
                    name={tone.icon}
                    size={18}
                    color={colors.badge[tone.variant].text}
                  />
                </View>
                <View style={styles.panelHeaderText}>
                  <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                    Inbox notification
                  </Text>
                  <View style={styles.badgeRow}>
                    <Badge label={tone.label} variant={tone.variant} size="sm" />
                    <Badge label="Unread" variant="warning" size="sm" />
                  </View>
                </View>
              </View>

              <Text style={[styles.subject, { color: colors.textPrimary }]}>
                {notification.subject}
              </Text>

              <View
                style={[
                  styles.metaCard,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                {postedByImage ? (
                  <Image
                    source={{ uri: postedByImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.badge.info.bg },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={colors.badge.info.text}
                    />
                  </View>
                )}
                <View style={styles.metaText}>
                  <Text
                    style={[styles.metaName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {postedByName}
                  </Text>
                  <Text
                    style={[styles.metaSub, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {postedByRole}
                    {notification.createdAt
                      ? ` · ${formatDateTimeIST(notification.createdAt)}`
                      : ''}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.messageCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.messageLabel, { color: colors.textMuted }]}>
                  Message
                </Text>
                <DescriptionBody
                  text={notification.description}
                  color={colors.textSecondary}
                />
              </View>

              {notification.images && notification.images.length > 0 ? (
                <View style={styles.attachmentsBlock}>
                  <Text
                    style={[styles.messageLabel, { color: colors.textMuted }]}
                  >
                    Attachments
                  </Text>
                  <View style={styles.imagesRow}>
                    {notification.images.map((uri, index) => (
                      <Image
                        key={`${notification._id}-image-${index}`}
                        source={{ uri }}
                        style={[
                          styles.imageThumb,
                          { borderColor: colors.border },
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {requiresFeedback ? (
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.feedbackHeader}>
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={colors.badge.purple.text}
                    />
                    <Text
                      style={[
                        styles.feedbackTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Your feedback
                    </Text>
                  </View>
                  <Text
                    style={[styles.feedbackHint, { color: colors.textMuted }]}
                  >
                    Please share what action was taken or any notes for the
                    team.
                  </Text>
                  <TextInput
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Type your response here..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.feedbackInput,
                      {
                        color: colors.textPrimary,
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.acknowledgeHint,
                    { backgroundColor: colors.badge.info.bg },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.badge.info.text}
                  />
                  <Text
                    style={[
                      styles.acknowledgeHintText,
                      { color: colors.badge.info.text },
                    ]}
                  >
                    Please review this notification and confirm once you have
                    read it.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {error ? (
                <View
                  style={[
                    styles.errorBanner,
                    { backgroundColor: colors.badge.error.bg },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.badge.error.text}
                  />
                  <Text
                    style={[
                      styles.errorText,
                      { color: colors.badge.error.text },
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                title={
                  requiresFeedback
                    ? 'Submit feedback & acknowledge'
                    : 'Acknowledge notification'
                }
                onPress={() =>
                  void submitRead(requiresFeedback ? feedback : undefined)
                }
                loading={submitting}
                disabled={!canSubmit || submitting}
                fullWidth
                icon={
                  requiresFeedback
                    ? 'paper-plane-outline'
                    : 'checkmark-done-outline'
                }
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  panel: {
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  panelHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  panelHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subject: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
    gap: 2,
  },
  metaName: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '600',
  },
  metaSub: {
    ...typography.caption,
    fontSize: 11,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  messageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  descriptionBlock: {
    gap: 6,
  },
  descriptionLine: {
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 20,
  },
  descriptionSection: {
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 2,
  },
  attachmentsBlock: {
    gap: spacing.xs,
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  feedbackCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedbackTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackHint: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
  },
  feedbackInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
  },
  acknowledgeHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  acknowledgeHintText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    fontSize: 11,
    flex: 1,
    fontWeight: '600',
  },
});
