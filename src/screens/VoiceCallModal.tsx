import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVoiceCall } from '../context/VoiceCallContext';
import { useAuth } from '../context/AuthContext';
import { useStatusBarOverlay } from '../context/StatusBarOverlayContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

function LevelBar({
  label,
  level,
  talking,
  colors,
}: {
  label: string;
  level: number;
  talking: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const pct = Math.round(Math.min(1, Math.max(0, level)) * 100);
  return (
    <View style={styles.meterBlock}>
      <View style={styles.meterLabels}>
        <Text style={[styles.meterLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text
          style={[
            styles.meterLabel,
            { color: talking ? colors.primary : colors.textMuted },
          ]}
        >
          {talking ? 'Speaking' : 'Silent'}
        </Text>
      </View>
      <View
        style={[styles.meterTrack, { backgroundColor: colors.backgroundTertiary }]}
      >
        <View
          style={[
            styles.meterFill,
            {
              width: `${Math.max(pct, talking ? 12 : 2)}%`,
              backgroundColor: talking ? colors.primary : colors.border,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function VoiceCallModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    phase,
    call,
    error,
    muted,
    speakerOn,
    submitting,
    audioLevels,
    accept,
    reject,
    hangUp,
    toggleMute,
    toggleSpeaker,
  } = useVoiceCall();

  const visible = phase !== 'idle';
  useStatusBarOverlay(visible);

  const peer = useMemo(() => {
    if (!call || !user) return null;
    const iAmCaller = String(call.caller_id) === String(user._id);
    return iAmCaller ? call.callee_snapshot : call.caller_snapshot;
  }, [call, user]);

  const title = peer?.username || 'Console user';
  const subtitle = peer?.role || peer?.email || '';

  const statusLabel = (() => {
    switch (phase) {
      case 'outgoing':
        return 'Calling…';
      case 'incoming':
        return 'Incoming call';
      case 'connecting':
        return 'Connecting…';
      case 'active':
        return 'On call';
      case 'ended':
        return call?.status === 'rejected'
          ? 'Call declined'
          : call?.status === 'missed'
            ? 'Call missed'
            : 'Call ended';
      default:
        return '';
    }
  })();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
          Voice call
        </Text>
        <View style={[styles.avatar, { backgroundColor: colors.badge.info.bg }]}>
          <Ionicons name="person" size={36} color={colors.badge.info.text} />
        </View>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
        <Text style={[styles.status, { color: colors.primary }]}>{statusLabel}</Text>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        {submitting && phase === 'connecting' ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : null}

        {(phase === 'active' ||
          phase === 'outgoing' ||
          phase === 'connecting') && (
          <View style={styles.meters}>
            <LevelBar
              label="You"
              level={muted ? 0 : audioLevels.localLevel}
              talking={!muted && audioLevels.isLocalTalking}
              colors={colors}
            />
            <LevelBar
              label="Other person"
              level={audioLevels.remoteLevel}
              talking={audioLevels.isRemoteTalking}
              colors={colors}
            />
          </View>
        )}

        <View style={styles.spacer} />

        {(phase === 'active' || phase === 'outgoing' || phase === 'connecting') && (
          <View style={styles.controlsRow}>
            <Pressable
              onPress={toggleMute}
              style={[
                styles.roundBtn,
                {
                  backgroundColor: muted
                    ? colors.badge.warning.bg
                    : colors.backgroundTertiary,
                },
              ]}
            >
              <Ionicons
                name={muted ? 'mic-off' : 'mic'}
                size={22}
                color={muted ? colors.badge.warning.text : colors.textPrimary}
              />
              <Text style={[styles.btnLabel, { color: colors.textMuted }]}>
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </Pressable>
            <Pressable
              onPress={toggleSpeaker}
              style={[
                styles.roundBtn,
                {
                  backgroundColor: speakerOn
                    ? colors.badge.info.bg
                    : colors.backgroundTertiary,
                },
              ]}
            >
              <Ionicons
                name={speakerOn ? 'volume-high' : 'ear-outline'}
                size={22}
                color={speakerOn ? colors.badge.info.text : colors.textPrimary}
              />
              <Text style={[styles.btnLabel, { color: colors.textMuted }]}>
                {speakerOn ? 'Speaker' : 'Earpiece'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actions}>
          {phase === 'incoming' ? (
            <>
              <Pressable
                onPress={() => void reject()}
                disabled={submitting}
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              >
                <Ionicons name="call" size={28} color="#fff" style={styles.declineIcon} />
              </Pressable>
              <Pressable
                onPress={() => void accept()}
                disabled={submitting}
                style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}
              >
                <Ionicons name="call" size={28} color="#fff" />
              </Pressable>
            </>
          ) : phase === 'ended' ? null : (
            <Pressable
              onPress={() => void hangUp()}
              disabled={submitting}
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="call" size={28} color="#fff" style={styles.declineIcon} />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
  },
  sub: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  status: {
    ...typography.label,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  meters: {
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  meterBlock: { gap: 4 },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  spacer: { flex: 1 },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  roundBtn: {
    width: 72,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  btnLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
