import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type AttachmentKind = 'image' | 'pdf' | 'other';

type Props = {
  url: string | null;
  title?: string;
  onClose: () => void;
};

function getAttachmentKind(url: string): AttachmentKind {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|heic)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path) || path.includes('.pdf')) return 'pdf';
  return 'other';
}

function fileLabel(url: string) {
  try {
    const name = url.split('?')[0].split('/').pop() || 'Attachment';
    return decodeURIComponent(name);
  } catch {
    return 'Attachment';
  }
}

function pdfViewerUri(url: string) {
  if (Platform.OS === 'android') {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function ExpenseAttachmentModal({ url, title, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useStatusBarOverlay(Boolean(url));

  const kind = useMemo(
    () => (url ? getAttachmentKind(url) : 'other'),
    [url],
  );

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url]);

  if (!url) return null;

  const heading = title || fileLabel(url);
  const kindLabel = kind === 'image' ? 'Image' : kind === 'pdf' ? 'PDF' : 'File';

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: '#0B0B0F' }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: 'rgba(255,255,255,0.12)',
            },
          ]}
        >
          <View style={styles.headerText}>
            <View style={styles.kindPill}>
              <Ionicons
                name={
                  kind === 'image'
                    ? 'image-outline'
                    : kind === 'pdf'
                      ? 'document-text-outline'
                      : 'attach-outline'
                }
                size={12}
                color="#fff"
              />
              <Text style={styles.kindText}>{kindLabel}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {heading}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.closeBtn}
            accessibilityLabel="Close attachment"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.stage}>
          {kind === 'image' ? (
            <View style={styles.mediaFrame}>
              <Image
                source={{ uri: url }}
                style={styles.image}
                resizeMode="contain"
                onLoadStart={() => {
                  setLoading(true);
                  setFailed(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
              />
            </View>
          ) : kind === 'pdf' ? (
            <View style={styles.mediaFrame}>
              <WebView
                source={{ uri: pdfViewerUri(url) }}
                style={styles.webview}
                onLoadStart={() => {
                  setLoading(true);
                  setFailed(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
                originWhitelist={['*']}
                allowFileAccess
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-outline"
                size={42}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Preview unavailable</Text>
              <Text style={styles.emptyBody}>
                This file type can’t be previewed in the app.
              </Text>
            </View>
          )}

          {loading && kind !== 'other' ? (
            <View style={styles.overlayCenter}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.loadingText}>
                {kind === 'pdf' ? 'Loading PDF…' : 'Loading image…'}
              </Text>
            </View>
          ) : null}

          {failed ? (
            <View style={styles.overlayCenter}>
              <Ionicons name="alert-circle-outline" size={36} color="#fff" />
              <Text style={styles.errorText}>
                {kind === 'pdf'
                  ? 'Could not load PDF'
                  : 'Could not load image'}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: 'rgba(255,255,255,0.12)',
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: 6 },
  kindPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  kindText: {
    color: '#fff',
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: '#fff',
    ...typography.label,
    fontSize: 14,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111318',
  },
  mediaFrame: { flex: 1 },
  image: { width: '100%', height: '100%' },
  webview: { flex: 1, backgroundColor: '#111318' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: '#fff',
    ...typography.label,
    fontSize: 15,
  },
  emptyBody: {
    color: 'rgba(255,255,255,0.65)',
    ...typography.bodySmall,
    textAlign: 'center',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingText: { color: '#fff', ...typography.caption },
  errorText: {
    color: '#fff',
    ...typography.bodySmall,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#fff',
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
});
