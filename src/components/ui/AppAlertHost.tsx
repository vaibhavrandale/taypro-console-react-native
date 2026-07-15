import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  bindAppAlertHost,
  dismissAppAlert,
  type AppAlertButton,
  type AppAlertPayload,
  type AppAlertVariant,
} from '../../utils/appAlert';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';

const VARIANT_META: Record<
  AppAlertVariant,
  { icon: keyof typeof Ionicons.glyphMap; badgeKey: 'info' | 'success' | 'error' | 'warning' }
> = {
  info: { icon: 'information-circle', badgeKey: 'info' },
  success: { icon: 'checkmark-circle', badgeKey: 'success' },
  error: { icon: 'close-circle', badgeKey: 'error' },
  warning: { icon: 'warning', badgeKey: 'warning' },
};

function sortButtons(buttons: AppAlertButton[]) {
  // Cancel first (left), then default, destructive last — matches modern confirm sheets.
  return [...buttons].sort((a, b) => {
    const rank = (style?: string) =>
      style === 'cancel' ? 0 : style === 'destructive' ? 2 : 1;
    return rank(a.style) - rank(b.style);
  });
}

export function AppAlertHost() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<AppAlertPayload | null>(null);

  useStatusBarOverlay(payload != null);

  useEffect(() => bindAppAlertHost(setPayload), []);

  const close = useCallback(() => {
    setPayload(null);
    dismissAppAlert();
  }, []);

  const onButtonPress = useCallback(
    (button: AppAlertButton) => {
      close();
      // Defer so the modal unmounts before navigation / follow-up alerts.
      requestAnimationFrame(() => {
        button.onPress?.();
      });
    },
    [close],
  );

  const meta = payload ? VARIANT_META[payload.variant] : VARIANT_META.info;
  const badge = colors.badge[meta.badgeKey];
  const buttons = useMemo(
    () => (payload ? sortButtons(payload.buttons) : []),
    [payload],
  );

  const stacked = buttons.length > 2;
  const single = buttons.length === 1;

  return (
    <Modal
      visible={payload != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        const cancel = buttons.find((b) => b.style === 'cancel');
        if (cancel) onButtonPress(cancel);
        else close();
      }}
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlay,
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {
          const cancel = buttons.find((b) => b.style === 'cancel');
          if (cancel) onButtonPress(cancel);
        }} />

        {payload ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: isDark ? '#000' : '#101936',
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: badge.bg }]}>
              <Ionicons name={meta.icon} size={28} color={badge.text} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {payload.title}
            </Text>
            {payload.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {payload.message}
              </Text>
            ) : null}

            <View
              style={[
                styles.actions,
                stacked ? styles.actionsStacked : styles.actionsRow,
              ]}
            >
              {buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                return (
                  <Button
                    key={`${button.text}-${index}`}
                    title={button.text}
                    size="md"
                    variant={
                      isCancel
                        ? 'outline'
                        : isDestructive
                          ? 'danger'
                          : 'primary'
                    }
                    onPress={() => onButtonPress(button)}
                    style={
                      stacked || single ? styles.fullBtn : styles.flexBtn
                    }
                    fullWidth={stacked || single}
                  />
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    zIndex: 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    ...typography.bodySmall,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  flexBtn: {
    flex: 1,
  },
  fullBtn: {
    width: '100%',
  },
});
