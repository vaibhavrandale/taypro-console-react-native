import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { uploadUserImage } from '../../api/imageUpload';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../ui';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onUploaded: (imageUrl: string) => Promise<void>;
};

export function PunchCaptureModal({
  visible,
  title,
  onClose,
  onUploaded,
}: Props) {
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useStatusBarOverlay(visible);

  const reset = useCallback(() => {
    setCapturedUri(null);
    setUploading(false);
    setCameraReady(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch {
      Alert.alert('Capture failed', 'Could not take photo. Please try again.');
    }
  }, [cameraReady]);

  const confirmPhoto = useCallback(async () => {
    if (!capturedUri) return;

    setUploading(true);
    try {
      const imageUrl = await uploadUserImage(capturedUri);
      await onUploaded(imageUrl);
      handleClose();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload photo',
      );
    } finally {
      setUploading(false);
    }
  }, [capturedUri, onUploaded, handleClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Face the camera clearly for attendance
            </Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {capturedUri ? (
            <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
          ) : !permission?.granted ? (
            <View style={styles.permissionState}>
              <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                Camera access is required for punch in/out.
              </Text>
              <Button title="Allow Camera" onPress={() => void requestPermission()} size="sm" />
            </View>
          ) : (
            <View style={[styles.cameraWrap, { borderColor: colors.border }]}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                mirror
                onCameraReady={() => setCameraReady(true)}
              />
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
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.label, fontSize: 16, fontWeight: '700' },
  subtitle: { ...typography.caption, fontSize: 11 },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 480,
    borderRadius: radius.md,
    backgroundColor: '#fff',
  },
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
