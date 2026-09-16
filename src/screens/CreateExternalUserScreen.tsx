import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { Button, Input } from '../components/ui';
import { TicketPhotoCaptureModal } from '../components/serviceTickets/TicketPhotoCaptureModal';
import { TicketPhotoSlots } from '../components/serviceTickets/TicketPhotoSlots';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import {
  createExternalUser,
  fetchAssignableSites,
} from '../api/externalUsers';
import { uploadClientLogo } from '../api/imageUpload';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import type { AssignableSite } from '../types/externalUsers';
import type { ExternalUsersStackParamList } from '../navigation/ExternalUsersStack';

type Navigation = NativeStackNavigationProp<
  ExternalUsersStackParamList,
  'CreateExternalUser'
>;

const ROLE_OPTIONS = [
  { value: 'Client Admin', label: 'Admin' },
  // { value: 'Site Incharge', label: 'Site Incharge' },
  // { value: 'Client Site Technician', label: 'Client Site Technician' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'Service', label: 'Service' },
];

export function CreateExternalUserScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const [sites, setSites] = useState<AssignableSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Client Admin');
  const [department, setDepartment] = useState('Service');
  const [phone, setPhone] = useState('');
  const [siteMongoId, setSiteMongoId] = useState('');
  const [image, setImage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [libraryUploading, setLibraryUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const list = await fetchAssignableSites();
      setSites(list);
      if (list.length === 1) setSiteMongoId(list[0]._id);
    } catch (err) {
      appAlert(
        'Sites failed',
        err instanceof Error ? err.message : 'Could not load sites',
      );
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const siteOptions = useMemo(
    () => [
      { value: '', label: 'Assign Site' },
      ...sites.map((site) => ({
        value: site._id,
        label: site.siteName
          ? `${site.site_id} - (${site.siteName})`
          : site.site_id,
      })),
    ],
    [sites],
  );

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
    if (!username.trim() || !email.trim() || !role || !department) {
      appAlert('Required fields', 'Username, email, role, and department are required.');
      return;
    }

    const selectedSite = sites.find((site) => site._id === siteMongoId);
    const assignedSites = selectedSite && user
      ? [
          {
            _id: selectedSite._id,
            siteName: selectedSite.siteName,
            site_id: selectedSite.site_id,
            assignedBy: {
              userId: user._id,
              username: user.username,
              email: user.email,
            },
            assignedAt: new Date().toISOString(),
          },
        ]
      : [];

    setSubmitting(true);
    try {
      const created = await createExternalUser({
        username: username.trim(),
        email: email.trim(),
        role,
        department,
        phone: phone.trim(),
        type: 'External',
        profile_image: image || undefined,
        assigned_sites: assignedSites,
      });
      appAlert(
        'User created',
        `${created.username} was created and a login email was sent to ${created.email}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      appAlert(
        'Create failed',
        err instanceof Error ? err.message : 'Could not create user',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Add User"
        subtitle="Create external user"
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl + spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <UptimeSelectField
            label="Role"
            value={role}
            options={ROLE_OPTIONS}
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
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          {sitesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <UptimeSelectField
              label="Assign Site"
              value={siteMongoId}
              options={siteOptions}
              onChange={(value) => setSiteMongoId(String(value))}
              icon="business-outline"
            />
          )}
        </View>

        <TicketPhotoSlots
          title="Profile Image"
          images={[image || undefined]}
          onCapture={() => chooseImageSource()}
          onRemove={() => setImage('')}
          emptyHint="Photo"
        />

        {libraryUploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : null}

        <Button
          title="Add User"
          onPress={() => void submit()}
          loading={submitting}
          disabled={
            submitting ||
            libraryUploading ||
            !username.trim() ||
            !email.trim() ||
            !role ||
            !department
          }
          fullWidth
        />
      </ScrollView>

      <TicketPhotoCaptureModal
        visible={cameraOpen}
        title="Profile photo"
        onClose={() => setCameraOpen(false)}
        onUploaded={(url) => setImage(url)}
        uploadImage={uploadClientLogo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
