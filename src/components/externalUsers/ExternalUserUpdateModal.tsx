import React, { useEffect, useMemo, useState } from 'react';
import { appAlert } from '../../utils/appAlert';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '../ui';
import { TicketPhotoCaptureModal } from '../serviceTickets/TicketPhotoCaptureModal';
import { TicketPhotoSlots } from '../serviceTickets/TicketPhotoSlots';
import { UptimeSelectField } from '../robotUptime/UptimeSelectField';
import { updateExternalUser } from '../../api/externalUsers';
import { uploadClientLogo } from '../../api/imageUpload';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ExternalUser } from '../../types/externalUsers';

type Props = {
  visible: boolean;
  user: ExternalUser | null;
  onClose: () => void;
  onUpdated: (user: ExternalUser) => void;
};

const ROLE_OPTIONS = [
  { value: 'Client Admin', label: 'Admin' },
  // { value: 'Site Incharge', label: 'Site Incharge' },
  // { value: 'Client Site Technician', label: 'Client Site Technician' },
];

const DEPARTMENT_OPTIONS = [{ value: 'Service', label: 'Service' }];

export function ExternalUserUpdateModal({
  visible,
  user,
  onClose,
  onUpdated,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarOverlay(visible);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Client Admin');
  const [department, setDepartment] = useState('Service');
  const [phone, setPhone] = useState('');
  const [isDelete, setIsDelete] = useState(false);
  const [image, setImage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [libraryUploading, setLibraryUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setUsername(user.username ?? '');
    setEmail(user.email ?? '');
    setRole(user.role || 'Client Admin');
    setDepartment(user.department || 'Service');
    setPhone(user.phone ?? '');
    setIsDelete(Boolean(user.is_delete));
    setImage(user.profile_image ?? '');
  }, [user, visible]);

  const roleOptions = useMemo(() => {
    if (role && !ROLE_OPTIONS.some((option) => option.value === role)) {
      return [...ROLE_OPTIONS, { value: role, label: role }];
    }
    return ROLE_OPTIONS;
  }, [role]);

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert('Permission needed', 'Photo library access is required to upload.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setLibraryUploading(true);
    try {
      setImage(await uploadClientLogo(result.assets[0].uri));
    } catch (err) {
      appAlert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload image',
      );
    } finally {
      setLibraryUploading(false);
    }
  };

  const chooseImageSource = () => {
    appAlert('Add image', 'Camera or upload from your device', [
      { text: 'Camera', onPress: () => setCameraOpen(true) },
      { text: 'Upload', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!user) return;
    if (!username.trim() || !email.trim()) {
      appAlert('Required fields', 'Username and email are required.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateExternalUser(user._id, {
        username: username.trim(),
        email: email.trim(),
        role,
        department,
        phone: phone.trim(),
        is_delete: isDelete,
        profile_image: image || undefined,
      });
      onUpdated(updated);
      appAlert('User updated', `${updated.username} updated successfully.`);
      onClose();
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Could not update user',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            Update User{user?.username ? ` - ${user.username}` : ''}
          </Text>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary }]}
          >
            <Ionicons name="close" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <UptimeSelectField
            label="Role"
            value={role}
            options={roleOptions}
            onChange={(value) => setRole(String(value))}
            icon="shield-outline"
          />
          <UptimeSelectField
            label="Department"
            value={department}
            options={DEPARTMENT_OPTIONS}
            onChange={(value) => setDepartment(String(value))}
            icon="briefcase-outline"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                Active Status
              </Text>
              <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                If it is checked then user cannot be logged in
              </Text>
            </View>
            <Switch
              value={isDelete}
              onValueChange={setIsDelete}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TicketPhotoSlots
            title="Image"
            images={[image || undefined]}
            onCapture={() => chooseImageSource()}
            onRemove={() => setImage('')}
            emptyHint="Photo"
          />

          {libraryUploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : null}

          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" onPress={onClose} />
            <Button
              title="Update"
              onPress={() => void submit()}
              loading={submitting}
              disabled={submitting || libraryUploading}
            />
          </View>
        </ScrollView>
      </View>

      <TicketPhotoCaptureModal
        visible={cameraOpen}
        title="Profile photo"
        onClose={() => setCameraOpen(false)}
        onUploaded={(url) => setImage(url)}
        uploadImage={uploadClientLogo}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  title: { ...typography.label, fontSize: 16, fontWeight: '700', flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchCopy: { flex: 1 },
  switchLabel: { ...typography.label, fontSize: 13 },
  switchHint: { ...typography.caption, fontSize: 11, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
