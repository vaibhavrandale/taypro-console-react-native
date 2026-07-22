import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { Button } from '../components/ui';
import { PmPhotoCaptureModal } from '../components/pm/PmPhotoCaptureModal';
import {
  PM_CONDITION_FIELDS,
  PM_OK_OPTIONS,
  PM_PHOTO_FIELDS,
  PM_YES_OPTIONS,
} from '../components/pm/pmFormFields';
import {
  TicketSearchSheet,
  type SearchSheetItem,
} from '../components/serviceTickets/TicketSearchSheet';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import {
  createPreventiveMaintenance,
} from '../api/preventiveMaintenance';
import { fetchServiceTicketRobots } from '../api/serviceTickets';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { CreatePreventiveMaintenancePayload } from '../types/preventiveMaintenance';
import type { ServiceTicketRobot } from '../types/serviceTickets';
import type { PreventiveMaintenanceStackParamList } from '../navigation/PreventiveMaintenanceStack';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';

type Navigation = NativeStackNavigationProp<
  PreventiveMaintenanceStackParamList,
  'PmCreate'
>;

type RobotRow = ServiceTicketRobot & {
  client_id?: string;
  site_name?: string;
  site_location?: string;
};

function emptyForm(): CreatePreventiveMaintenancePayload {
  const today = toDateInputValue(new Date());
  return {
    robot_no: '',
    robot_type: '',
    client_id: '',
    site_name: '',
    site_id: '',
    site_location: '',
    physical_condition_of_transPipe_condition: '',
    physical_condition_of_transPipe_image: '',
    physical_condition_of_channel_condition: '',
    physical_condition_of_channel_image: '',
    physical_condition_of_top_bottom_cover_condition: '',
    physical_condition_of_top_bottom_cover_image: '',
    oiling_need_for_bearing_condition: '',
    oiling_need_for_bearing_condition_image: '',
    oiling_need_for_coupling_condition: '',
    oiling_need_for_coupling_image: '',
    oiling_need_for_motors_condition: '',
    oiling_need_for_motors_image: '',
    mf_clothes_alignment: '',
    wheels_alignment: '',
    is_wheels_loose: '',
    is_nutbolt_loose: '',
    start_date: today,
    end_date: today,
  };
}

export function CreatePreventiveMaintenanceScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const [robots, setRobots] = useState<RobotRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [robotSheet, setRobotSheet] = useState(false);
  const [photoField, setPhotoField] = useState<
    (typeof PM_PHOTO_FIELDS)[number]['key'] | null
  >(null);
  const [dateField, setDateField] = useState<'start' | 'end' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setError('');
    try {
      const data = await fetchServiceTicketRobots();
      setRobots(data as RobotRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load robots');
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const robotItems: SearchSheetItem[] = useMemo(
    () =>
      robots.map((robot, index) => ({
        id: `${robot.robot_no}-${robot.site_id ?? index}`,
        title: robot.robot_no,
        subtitle: [robot.site_id, robot.robot_type, robot.company]
          .filter(Boolean)
          .join(' · '),
      })),
    [robots],
  );

  const selectRobot = (item: SearchSheetItem) => {
    const robot = robots.find(
      (r, index) => `${r.robot_no}-${r.site_id ?? index}` === item.id,
    );
    if (!robot) return;
    setForm((prev) => ({
      ...prev,
      robot_no: robot.robot_no,
      robot_type: robot.robot_type ?? '',
      site_id: robot.site_id ?? '',
      client_id: robot.client_id ?? '',
      site_name: robot.site_name ?? '',
      site_location: robot.site_location ?? '',
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.robot_no;
      return next;
    });
  };

  const setField = <K extends keyof CreatePreventiveMaintenancePayload>(
    key: K,
    value: CreatePreventiveMaintenancePayload[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openDatePicker = (field: 'start' | 'end') => {
    setPickerDate(
      new Date(`${field === 'start' ? form.start_date : form.end_date}T12:00:00`),
    );
    setDateField(field);
  };

  const applyPickedDate = (picked?: Date) => {
    if (!picked || !dateField) return;
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

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.robot_no.trim()) errors.robot_no = 'Select a robot';
    if (!form.start_date) errors.start_date = 'Start date is required';
    if (!form.end_date) errors.end_date = 'End date is required';

    for (const field of PM_CONDITION_FIELDS) {
      if (field.required && !String(form[field.key]).trim()) {
        errors[field.key] = `${field.label} is required`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      appAlert('Missing fields', 'Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createPreventiveMaintenance(form);
      appAlert(
        'PM created',
        result.message ?? 'Preventive maintenance created successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      appAlert(
        'Create failed',
        err instanceof Error ? err.message : 'Could not create PM record',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activePhoto = PM_PHOTO_FIELDS.find((f) => f.key === photoField);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Create PM"
        subtitle="Preventive maintenance checklist"
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

      {loadingMeta ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl + spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.badge.error.bg,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={{ color: colors.danger }}>{error}</Text>
              <Button title="Retry" size="sm" onPress={() => void loadMeta()} />
            </View>
          ) : null}

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
              Robot
            </Text>
            <Pressable
              onPress={() => setRobotSheet(true)}
              style={[
                styles.picker,
                {
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: fieldErrors.robot_no
                    ? colors.danger
                    : colors.border,
                },
              ]}
            >
              <View style={styles.pickerText}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
                  Select robot
                </Text>
                <Text
                  style={[styles.pickerValue, { color: colors.textPrimary }]}
                >
                  {form.robot_no || 'Search robot no or site'}
                </Text>
              </View>
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
            {fieldErrors.robot_no ? (
              <Text style={[styles.fieldError, { color: colors.danger }]}>
                {fieldErrors.robot_no}
              </Text>
            ) : null}

            {form.robot_no ? (
              <View style={styles.metaGrid}>
                {[
                  ['Robot', form.robot_no],
                  ['Type', form.robot_type],
                  ['Site', form.site_id],
                ].map(([label, value]) => (
                  <View
                    key={label}
                    style={[
                      styles.metaChip,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.metaLabel, { color: colors.textMuted }]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[styles.metaValue, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {value || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
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
                      borderColor: fieldErrors[`${key}_date`]
                        ? colors.danger
                        : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                  <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
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
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  value={String(form[field.key] ?? '')}
                  options={
                    field.options === 'ok' ? PM_OK_OPTIONS : PM_YES_OPTIONS
                  }
                  onChange={(value) =>
                    setField(field.key, String(value) as never)
                  }
                />
                {fieldErrors[field.key] ? (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>
                    {fieldErrors[field.key]}
                  </Text>
                ) : null}
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
                        onPress={() => setField(field.key, '' as never)}
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
            title={submitting ? 'Submitting...' : 'Submit'}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
        </ScrollView>
      )}

      <TicketSearchSheet
        visible={robotSheet}
        title="Select robot"
        placeholder="Search robot no or site..."
        items={robotItems}
        onClose={() => setRobotSheet(false)}
        onSelect={(item) => {
          selectRobot(item);
          setRobotSheet(false);
        }}
      />

      <PmPhotoCaptureModal
        visible={photoField != null}
        title={activePhoto?.label ?? 'Take photo'}
        onClose={() => setPhotoField(null)}
        onUploaded={(url) => {
          if (photoField) setField(photoField, url as never);
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
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
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
  picker: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerText: { flex: 1, gap: 2 },
  pickerLabel: { ...typography.caption, fontSize: 11 },
  pickerValue: { ...typography.bodySmall, fontWeight: '600' },
  fieldError: { ...typography.caption, fontSize: 11 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: '30%',
    flexGrow: 1,
  },
  metaLabel: { ...typography.caption, fontSize: 10 },
  metaValue: { ...typography.bodySmall, fontWeight: '600' },
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
