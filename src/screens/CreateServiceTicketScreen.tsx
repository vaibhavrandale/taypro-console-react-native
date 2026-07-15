import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { TicketPhotoCaptureModal } from '../components/serviceTickets/TicketPhotoCaptureModal';
import { TicketPhotoSlots } from '../components/serviceTickets/TicketPhotoSlots';
import {
  TicketSearchSheet,
  type SearchSheetItem,
} from '../components/serviceTickets/TicketSearchSheet';
import {
  createServiceTicket,
  fetchServiceTicketFaults,
  fetchServiceTicketRobots,
} from '../api/serviceTickets';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  CreateServiceTicketPayload,
  ServiceTicketFault,
  ServiceTicketRobot,
} from '../types/serviceTickets';
import type { ServiceTicketsStackParamList } from '../navigation/ServiceTicketsStack';

type Navigation = NativeStackNavigationProp<
  ServiceTicketsStackParamList,
  'CreateTicket'
>;

export function CreateServiceTicketScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();

  const [robots, setRobots] = useState<ServiceTicketRobot[]>([]);
  const [faults, setFaults] = useState<ServiceTicketFault[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [robotSheet, setRobotSheet] = useState(false);
  const [faultSheet, setFaultSheet] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const [form, setForm] = useState<CreateServiceTicketPayload>({
    robot_no: '',
    deveui: '',
    site_id: '',
    company: '',
    lora_no: '',
    fault_type: '',
    ticket_generating_notes: '',
    block: '',
    robot_type: '',
    ticket_resolved: false,
    ticket_generated_images1: '',
    ticket_generated_images2: '',
    ticket_generated_images3: '',
    ticket_generated_images4: '',
    ticket_generated_images5: '',
  });

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setError('');
    try {
      const [robotData, faultData] = await Promise.all([
        fetchServiceTicketRobots(),
        fetchServiceTicketFaults(),
      ]);
      setRobots(robotData);
      setFaults(faultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form data');
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
        subtitle: [robot.site_id, robot.block, robot.company]
          .filter(Boolean)
          .join(' · '),
      })),
    [robots],
  );

  const faultItems: SearchSheetItem[] = useMemo(
    () =>
      faults.map((fault, index) => ({
        id: fault._id ?? `${fault.fault_name}-${index}`,
        title: fault.fault_name.replace(/-/g, ' '),
        subtitle: fault.fault_name,
      })),
    [faults],
  );

  const images = [
    form.ticket_generated_images1,
    form.ticket_generated_images2,
    form.ticket_generated_images3,
    form.ticket_generated_images4,
    form.ticket_generated_images5,
  ];

  const canSubmit = Boolean(form.robot_no && form.fault_type) && !submitting;

  const selectRobot = (item: SearchSheetItem) => {
    const robot = robots.find(
      (r, index) => `${r.robot_no}-${r.site_id ?? index}` === item.id,
    );
    if (!robot) return;
    setForm((prev) => ({
      ...prev,
      robot_no: robot.robot_no,
      deveui: robot.deveui ?? '',
      site_id: robot.site_id ?? '',
      company: robot.company ?? '',
      lora_no: robot.lora_no ?? '',
      block: robot.block ?? '',
      robot_type: robot.robot_type ?? '',
    }));
  };

  const selectFault = (item: SearchSheetItem) => {
    const fault = faults.find(
      (f, index) => (f._id ?? `${f.fault_name}-${index}`) === item.id,
    );
    if (!fault) return;
    setForm((prev) => ({ ...prev, fault_type: fault.fault_name }));
  };

  const setImageAt = (index: number, url: string) => {
    const key =
      `ticket_generated_images${index + 1}` as keyof CreateServiceTicketPayload;
    setForm((prev) => ({ ...prev, [key]: url }));
  };

  const clearImageAt = (index: number) => {
    setImageAt(index, '');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createServiceTicket(form);
      appAlert(
        'Ticket created',
        `${created.ticket_id ?? 'Ticket'} created successfully.`,
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
        subtitle="New service request"
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
          contentContainerStyle={styles.content}
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
                  borderColor: colors.border,
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

            {form.robot_no ? (
              <View style={styles.metaGrid}>
                {[
                  ['Deveui', form.deveui],
                  ['Site', form.site_id],
                  ['Company', form.company],
                  ['Block', form.block],
                  ['Type', form.robot_type],
                  ['Lora', form.lora_no || 'N/A'],
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
              Fault
            </Text>
            <Pressable
              onPress={() => setFaultSheet(true)}
              style={[
                styles.picker,
                {
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.pickerText}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
                  Fault type
                </Text>
                <Text
                  style={[styles.pickerValue, { color: colors.textPrimary }]}
                >
                  {form.fault_type
                    ? form.fault_type.replace(/-/g, ' ')
                    : 'Search fault type'}
                </Text>
              </View>
              <Ionicons name="warning-outline" size={16} color={colors.textMuted} />
            </Pressable>
            {form.fault_type ? (
              <Badge
                label={form.fault_type.replace(/-/g, ' ')}
                variant="warning"
              />
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
              Notes
            </Text>
            <TextInput
              value={form.ticket_generating_notes}
              onChangeText={(text) =>
                setForm((prev) => ({
                  ...prev,
                  ticket_generating_notes: text,
                }))
              }
              placeholder="Add any additional notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.notes,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            />
          </View>

          <TicketPhotoSlots
            title="Ticket photos"
            images={images}
            onCapture={(index) => setPhotoIndex(index)}
            onRemove={clearImageAt}
          />

          <Button
            title={submitting ? 'Creating...' : 'Create ticket'}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={!canSubmit}
            fullWidth
            icon="checkmark-circle-outline"
          />
        </ScrollView>
      )}

      <TicketSearchSheet
        visible={robotSheet}
        title="Select robot"
        placeholder="Search robot no or site..."
        items={robotItems}
        onClose={() => setRobotSheet(false)}
        onSelect={selectRobot}
      />

      <TicketSearchSheet
        visible={faultSheet}
        title="Select fault"
        placeholder="Search fault type..."
        items={faultItems}
        onClose={() => setFaultSheet(false)}
        onSelect={selectFault}
      />

      <TicketPhotoCaptureModal
        visible={photoIndex != null}
        title={`Ticket photo ${(photoIndex ?? 0) + 1}`}
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
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
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
    fontSize: 13,
    fontWeight: '700',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pickerText: { flex: 1, gap: 2 },
  pickerLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pickerValue: { ...typography.label, fontSize: 14 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaValue: { ...typography.bodySmall, fontSize: 12 },
  notes: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...typography.body,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
});
