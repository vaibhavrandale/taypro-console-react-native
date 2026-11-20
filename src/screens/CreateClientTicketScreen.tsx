import React, { useMemo, useState } from 'react';
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
import { createClientTicket } from '../api/clientTickets';
import { uploadClientTicketImage } from '../api/imageUpload';
import { usePersistedSiteId } from '../context/SiteDetailsContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import type { ClientTicketsStackParamList } from '../navigation/ClientTicketsStack';

type Navigation = NativeStackNavigationProp<
  ClientTicketsStackParamList,
  'CreateClientTicket'
>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

export function CreateClientTicketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const { assignedSites, siteId, setSiteId } = usePersistedSiteId();

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [image1, setImage1] = useState('');
  const [image2, setImage2] = useState('');
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [libraryUploading, setLibraryUploading] = useState(false);

  const setImageAt = (index: number, url: string) => {
    if (index === 0) setImage1(url);
    else setImage2(url);
  };

  const pickFromLibrary = async (index: number) => {
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
      const url = await uploadClientTicketImage(result.assets[0].uri);
      setImageAt(index, url);
    } catch (err) {
      appAlert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload image',
      );
    } finally {
      setLibraryUploading(false);
    }
  };

  const chooseImageSource = (index: number) => {
    appAlert('Add image', 'Camera or upload from your device', [
      { text: 'Camera', onPress: () => setPhotoIndex(index) },
      { text: 'Upload', onPress: () => void pickFromLibrary(index) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!siteId) {
      appAlert('Site required', 'Please select a site.');
      return;
    }
    if (!subject.trim()) {
      appAlert('Subject required', 'Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      appAlert('Description required', 'Please enter a description.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createClientTicket({
        site_id: siteId,
        subject: subject.trim(),
        description: description.trim(),
        creation_image1: image1,
        creation_image2: image2,
        root_cause: 'NA',
        corrective_action: 'NA',
        review_of_corrective_action: 'NA',
      });
      appAlert(
        'Ticket submitted',
        created.ticket_id
          ? `${created.ticket_id} created successfully.`
          : 'Client ticket created successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      appAlert(
        'Create failed',
        err instanceof Error ? err.message : 'Could not create ticket',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Create Ticket"
        subtitle="New client ticket"
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
          <UptimeSelectField
            label="Site"
            value={siteId}
            options={siteOptions}
            onChange={(value) => setSiteId(String(value))}
            icon="business-outline"
          />
          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Short summary"
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.description}
          />
        </View>

        <View>
          <TicketPhotoSlots
            title="Images"
            emptyHint="Upload"
            images={[image1 || undefined, image2 || undefined]}
            onCapture={chooseImageSource}
            onRemove={(index) => {
              if (index === 0) setImage1('');
              else setImage2('');
            }}
          />
          {libraryUploading ? (
            <View style={styles.uploadRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </View>

        <Button
          title={submitting ? 'Creating...' : 'Create'}
          onPress={() => void submit()}
          loading={submitting}
          disabled={submitting}
          fullWidth
        />
      </ScrollView>

      <TicketPhotoCaptureModal
        visible={photoIndex != null}
        title={`Photo ${(photoIndex ?? 0) + 1}`}
        uploadImage={uploadClientTicketImage}
        onClose={() => setPhotoIndex(null)}
        onUploaded={(url) => {
          if (photoIndex != null) setImageAt(photoIndex, url);
        }}
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
    gap: spacing.md,
  },
  description: {
    minHeight: 96,
    ...typography.bodySmall,
  },
  uploadRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
});
