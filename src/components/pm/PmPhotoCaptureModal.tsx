import React, { useCallback, useEffect, useRef, useState } from 'react';
import { appAlert } from '../../utils/appAlert';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { uploadPreventiveMaintenanceImage } from '../../api/imageUpload';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  formatIstTimestamp,
  getPhotoWatermarkMeta,
  type PhotoWatermarkMeta,
} from '../../utils/location';
import { Button } from '../ui';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onUploaded: (imageUrl: string) => Promise<void> | void;
};

function WatermarkOverlay({ meta }: { meta: PhotoWatermarkMeta | null }) {
  return (
    <View style={styles.watermark}>
      <Text style={styles.watermarkLine}>
        Coordinates: {meta ? `${meta.lat}, ${meta.lng}` : '…'}
      </Text>
      <Text style={styles.watermarkLine} numberOfLines={2}>
        Address: {meta?.address ?? 'Fetching address...'}
      </Text>
      <Text style={styles.watermarkLine}>
        Timestamp: {meta?.timestamp ?? formatIstTimestamp()}
      </Text>
    </View>
  );
}

export function PmPhotoCaptureModal({
  visible,
  title,
  onClose,
  onUploaded,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const watermarkShotRef = useRef<View>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [meta, setMeta] = useState<PhotoWatermarkMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useStatusBarOverlay(visible);

  const reset = useCallback(() => {
    setCapturedUri(null);
    setUploading(false);
    setCameraReady(false);
    setMeta(null);
    setLoadingMeta(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingMeta(true);
    void getPhotoWatermarkMeta().then((next) => {
      if (!cancelled) {
        setMeta(next);
        setLoadingMeta(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setMeta((prev) =>
          prev
            ? { ...prev, timestamp: formatIstTimestamp() }
            : prev,
        );
        setCapturedUri(photo.uri);
      }
    } catch {
      appAlert('Capture failed', 'Could not take photo. Please try again.');
    }
  }, [cameraReady]);

  const confirmPhoto = useCallback(async () => {
    if (!capturedUri) return;
    setUploading(true);
    try {
      // Burn watermark into a JPEG via view-shot of preview + overlay.
      let uploadUri = capturedUri;
      try {
        if (watermarkShotRef.current) {
          uploadUri = await captureRef(watermarkShotRef, {
            format: 'jpg',
            quality: 0.85,
            result: 'tmpfile',
          });
        }
      } catch {
        // ponytail: if view-shot fails (e.g. Expo Go), upload raw photo
      }

      const imageUrl = await uploadPreventiveMaintenanceImage(uploadUri);
      await onUploaded(imageUrl);
      handleClose();
    } catch (err) {
      appAlert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload photo',
      );
    } finally {
      setUploading(false);
    }
  }, [capturedUri, onUploaded, handleClose]);

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.backgroundSecondary,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Back camera · location stamped on photo
            </Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {capturedUri ? (
            <View
              ref={watermarkShotRef}
              collapsable={false}
              style={[styles.shotWrap, { borderColor: colors.border }]}
            >
              <Image
                source={{ uri: capturedUri }}
                style={styles.preview}
                resizeMode="contain"
              />
              <WatermarkOverlay meta={meta} />
            </View>
          ) : !permission?.granted ? (
            <View style={styles.permissionState}>
              <Ionicons
                name="camera-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text
                style={[styles.permissionText, { color: colors.textSecondary }]}
              >
                Camera access is required for PM photos.
              </Text>
              <Button
                title="Allow Camera"
                onPress={() => void requestPermission()}
                size="sm"
              />
            </View>
          ) : (
            <View style={[styles.cameraWrap, { borderColor: colors.border }]}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
              <WatermarkOverlay meta={meta} />
              {loadingMeta ? (
                <View style={styles.metaLoading}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.metaLoadingText}>Getting location…</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderTopColor: colors.border,
            },
          ]}
        >
          {capturedUri ? (
            <View style={styles.footerActions}>
              <Button
                title={uploading ? 'Uploading...' : 'Confirm'}
                onPress={() => void confirmPhoto()}
                loading={uploading}
                disabled={uploading}
                icon="checkmark-circle-outline"
                style={styles.footerButton}
              />
              <Button
                title="Retake"
                variant="outline"
                onPress={() => setCapturedUri(null)}
                disabled={uploading}
                icon="refresh-outline"
                style={styles.footerButton}
              />
            </View>
          ) : (
            <Button
              title="Capture"
              onPress={() => void capturePhoto()}
              disabled={!permission?.granted || !cameraReady || uploading}
              icon="camera-outline"
              fullWidth
            />
          )}
        </View>

        {uploading ? (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.uploadText}>Uploading photo...</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.label, fontSize: 16, fontWeight: '700' },
  subtitle: { ...typography.caption, fontSize: 11 },
  body: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 480,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  shotWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 480,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  preview: { width: '100%', height: '100%' },
  watermark: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  watermarkLine: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 15,
  },
  metaLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  metaLoadingText: { color: '#fff', ...typography.caption },
  permissionState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionText: { ...typography.bodySmall, textAlign: 'center' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerActions: { flexDirection: 'row', gap: spacing.sm },
  footerButton: { flex: 1 },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  uploadText: { ...typography.bodySmall, color: '#fff' },
});
