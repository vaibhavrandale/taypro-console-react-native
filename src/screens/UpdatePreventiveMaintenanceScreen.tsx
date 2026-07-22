import React, { useCallback, useEffect, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { Button } from '../components/ui';
import { PmPhotoCaptureModal } from '../components/pm/PmPhotoCaptureModal';
import {
  PM_CONDITION_FIELDS,
  PM_META_FIELDS,
  PM_OK_OPTIONS,
  PM_PHOTO_FIELDS,
  PM_YES_OPTIONS,
  toDateOnly,
  type PmFormFieldKey,
} from '../components/pm/pmFormFields';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import {
  fetchPreventiveMaintenance,
  updatePreventiveMaintenance,
} from '../api/preventiveMaintenance';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { UpdatePreventiveMaintenancePayload } from '../types/preventiveMaintenance';
import type { PreventiveMaintenanceStackParamList } from '../navigation/PreventiveMaintenanceStack';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';

type Navigation = NativeStackNavigationProp<
  PreventiveMaintenanceStackParamList,
  'PmUpdate'
>;
type Route = RouteProp<PreventiveMaintenanceStackParamList, 'PmUpdate'>;

function stripUpdatePayload(
  form: UpdatePreventiveMaintenancePayload,
): UpdatePreventiveMaintenancePayload {
  const {
    createdAt: _c,
    updatedAt: _u,
    _id: _id,
    last_activity: _la,
    __v: _v,
    ...rest
  } = form;
  return rest;
}

export function UpdatePreventiveMaintenanceScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { id } = route.params;

  const [form, setForm] = useState<UpdatePreventiveMaintenancePayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoField, setPhotoField] = useState<PmFormFieldKey | null>(null);
  const [dateField, setDateField] = useState<'start' | 'end' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const record = await fetchPreventiveMaintenance(id);
      setForm({
        pm_id: record.pm_id ?? '',
        robot_no: record.robot_no ?? '',
        robot_type: record.robot_type ?? '',
        client_id: String(record.client_id ?? ''),
        site_name: record.site_name ?? '',
        site_id: record.site_id ?? '',
        site_location: record.site_location ?? '',
        physical_condition_of_transPipe_condition:
          record.physical_condition_of_transPipe_condition ?? '',
        physical_condition_of_transPipe_image:
          record.physical_condition_of_transPipe_image ?? '',
        physical_condition_of_channel_condition:
          record.physical_condition_of_channel_condition ?? '',
        physical_condition_of_channel_image:
          record.physical_condition_of_channel_image ?? '',
        physical_condition_of_top_bottom_cover_condition:
          record.physical_condition_of_top_bottom_cover_condition ?? '',
        physical_condition_of_top_bottom_cover_image:
          record.physical_condition_of_top_bottom_cover_image ?? '',
        oiling_need_for_bearing_condition:
          record.oiling_need_for_bearing_condition ?? '',
        oiling_need_for_bearing_condition_image:
          record.oiling_need_for_bearing_condition_image ?? '',
        oiling_need_for_coupling_condition:
          record.oiling_need_for_coupling_condition ?? '',
        oiling_need_for_coupling_image:
          record.oiling_need_for_coupling_image ?? '',
        oiling_need_for_motors_condition:
          record.oiling_need_for_motors_condition ?? '',
        oiling_need_for_motors_image: record.oiling_need_for_motors_image ?? '',
        mf_clothes_alignment: record.mf_clothes_alignment ?? '',
        wheels_alignment: record.wheels_alignment ?? '',
        is_wheels_loose: String(record.is_wheels_loose ?? ''),
        is_nutbolt_loose: String(record.is_nutbolt_loose ?? ''),
        start_date:
          toDateOnly(String(record.start_date ?? '')) ||
          toDateInputValue(new Date()),
        end_date:
          toDateOnly(String(record.end_date ?? '')) ||
          toDateInputValue(new Date()),
      });
    } catch (err) {
      setForm(null);
      setError(err instanceof Error ? err.message : 'Failed to load PM');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: string, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const openDatePicker = (field: 'start' | 'end') => {
    if (!form) return;
    setPickerDate(
      new Date(`${field === 'start' ? form.start_date : form.end_date}T12:00:00`),
    );
    setDateField(field);
  };

  const applyPickedDate = (picked?: Date) => {
    if (!picked || !dateField || !form) return;
    const next = toDateInputValue(picked);
    if (dateField === 'start') {
      setField('start_date', next);
      if (next > form.end_date) setField('end_date', next);
    } else {
      setField('end_date', next);
      if (next < form.start_date) setField('start_date', next);
    }
    if (Platform.OS === 'ios') setPickerDate(picked);
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    try {
      await updatePreventiveMaintenance(id, stripUpdatePayload(form));
      appAlert('PM updated', 'Preventive maintenance updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Could not update PM record',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activePhoto = PM_PHOTO_FIELDS.find((f) => f.key === photoField);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Update PM"
        subtitle={form?.pm_id ? String(form.pm_id) : 'Edit checklist'}
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !form ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            {error || 'Record not found'}
          </Text>
          <Button title="Retry" size="sm" onPress={() => void load()} />
        </View>
      ) : (
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
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Details
            </Text>
            {PM_META_FIELDS.map((field) => (
              <View key={field.key} style={styles.inputBlock}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  {field.label}
                </Text>
                <TextInput
                  value={String(form[field.key] ?? '')}
                  onChangeText={(value) => setField(field.key, value)}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Dates
            </Text>
            <View style={styles.dateRow}>
              {(
                [
                  ['start', 'Start', form.start_date],
                  ['end', 'End', form.end_date],
                ] as const
              ).map(([key, label, value]) => (
                <Pressable
                  key={key}
                  onPress={() => openDatePicker(key)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                  <Text
                    style={[styles.dateValue, { color: colors.textPrimary }]}
                  >
                    {formatDisplayDate(value)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Checklist
            </Text>
            {PM_CONDITION_FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <UptimeSelectField
                  label={field.label}
                  value={String(form[field.key] ?? '')}
                  options={
                    field.options === 'ok' ? PM_OK_OPTIONS : PM_YES_OPTIONS
                  }
                  onChange={(value) => setField(field.key, String(value))}
                />
              </View>
            ))}
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Photos
            </Text>
            <View style={styles.photoGrid}>
              {PM_PHOTO_FIELDS.map((field) => {
                const uri = String(form[field.key] ?? '');
                return (
                  <View key={field.key} style={styles.photoBlock}>
                    <Text
                      style={[styles.photoLabel, { color: colors.textMuted }]}
                    >
                      {field.label}
                    </Text>
                    <Pressable
                      onPress={() => setPhotoField(field.key)}
                      style={[
                        styles.photoSlot,
                        {
                          backgroundColor: colors.backgroundTertiary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {uri ? (
                        <>
                          <Image source={{ uri }} style={styles.photoImage} />
                          <View style={styles.photoRetake}>
                            <Text style={styles.photoRetakeText}>Retake</Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.photoEmpty}>
                          <Ionicons
                            name="camera-outline"
                            size={22}
                            color={colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.photoEmptyText,
                              { color: colors.textMuted },
                            ]}
                          >
                            Take photo
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    {uri ? (
                      <Pressable
                        onPress={() => setField(field.key, '')}
                        hitSlop={6}
                      >
                        <Text
                          style={[styles.clearPhoto, { color: colors.danger }]}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <Button
            title={submitting ? 'Updating...' : 'Update Maintenance'}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
        </ScrollView>
      )}

      <PmPhotoCaptureModal
        visible={photoField != null}
        title={activePhoto?.label ?? 'Take photo'}
        onClose={() => setPhotoField(null)}
        onUploaded={(url) => {
          if (photoField) setField(photoField, url);
        }}
      />

      {dateField && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onValueChange={(_event, picked) => {
            applyPickedDate(picked);
            setDateField(null);
          }}
          onDismiss={() => setDateField(null)}
        />
      ) : null}

      {dateField && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <View
              style={[
                styles.iosPickerSheet,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.iosPickerActions}>
                <Pressable onPress={() => setDateField(null)}>
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyPickedDate(pickerDate);
                    setDateField(null);
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onValueChange={(_event, date) => {
                  if (date) setPickerDate(date);
                }}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
  inputBlock: { gap: 4 },
  inputLabel: { ...typography.caption, fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
  },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  datePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  dateLabel: { ...typography.caption, fontSize: 10 },
  dateValue: { ...typography.bodySmall, fontWeight: '600' },
  fieldBlock: { gap: 4 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoBlock: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  photoLabel: { ...typography.caption, fontSize: 11 },
  photoSlot: {
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoRetake: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  photoRetakeText: { color: '#fff', ...typography.caption, fontSize: 10 },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmptyText: { ...typography.caption, fontSize: 10 },
  clearPhoto: { ...typography.caption, fontSize: 11 },
  iosPickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
