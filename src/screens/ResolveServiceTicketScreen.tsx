import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { PartChecklistModal } from '../components/serviceTickets/PartChecklistModal';
import { TicketPhotoCaptureModal } from '../components/serviceTickets/TicketPhotoCaptureModal';
import { TicketPhotoSlots } from '../components/serviceTickets/TicketPhotoSlots';
import {
  TicketSearchSheet,
  type SearchSheetItem,
} from '../components/serviceTickets/TicketSearchSheet';
import {
  fetchFaultAnalysisChecklist,
  fetchServiceInventory,
  fetchServiceTicketById,
  fetchServiceTicketFaults,
  resolveServiceTicket,
} from '../api/serviceTickets';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  ChecklistField,
  ServiceInventoryItem,
  ServiceTicket,
  ServiceTicketFault,
} from '../types/serviceTickets';
import { isChecklistComplete } from '../types/serviceTickets';
import type { ServiceTicketsStackParamList } from '../navigation/ServiceTicketsStack';

type Navigation = NativeStackNavigationProp<
  ServiceTicketsStackParamList,
  'ResolveTicket'
>;
type Route = RouteProp<ServiceTicketsStackParamList, 'ResolveTicket'>;

export function ResolveServiceTicketScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { ticketId } = route.params;

  const [form, setForm] = useState<ServiceTicket | null>(null);
  const [faults, setFaults] = useState<ServiceTicketFault[]>([]);
  const [inventory, setInventory] = useState<ServiceInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [inventorySheet, setInventorySheet] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistFields, setChecklistFields] = useState<ChecklistField[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<
    Record<string, string>
  >({});
  const [savedChecklist, setSavedChecklist] = useState<Record<
    string,
    string
  > | null>(null);
  const [checklistSaved, setChecklistSaved] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<{
    kind: 'generated' | 'resolved';
    index: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ticket, faultData, inventoryData] = await Promise.all([
        fetchServiceTicketById(ticketId),
        fetchServiceTicketFaults(),
        fetchServiceInventory(),
      ]);
      setForm(ticket);
      setFaults(faultData);
      setInventory(inventoryData);
      if (ticket.part_checklist?.[0]?.checklist) {
        setSavedChecklist(ticket.part_checklist[0].checklist);
        setChecklistResponses(ticket.part_checklist[0].checklist);
        setChecklistSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const inventoryItems: SearchSheetItem[] = useMemo(
    () =>
      inventory.map((item) => ({
        id: item.item_id,
        title: `${item.item_name} · ${item.item_code}`,
        subtitle: [
          item.site_id,
          item.quantity != null ? `Qty ${item.quantity}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [inventory],
  );

  const faultOptions = useMemo(
    () => [
      { value: '', label: 'Select fault type' },
      ...faults.map((fault) => ({
        value: fault.fault_name,
        label: fault.fault_name.replace(/-/g, ' '),
      })),
    ],
    [faults],
  );

  const partReplaced = Boolean(form?.service_part_replaced);
  const quantityValid =
    form?.replaced_part_quantity != null &&
    Number(form.replaced_part_quantity) > 0;
  const partSelected = Boolean(form?.part_replaced_id);

  const canSubmit = useMemo(() => {
    if (!form?.ticket_resolved) return false;
    if (!partReplaced) return true;
    return partSelected && quantityValid && checklistSaved;
  }, [form?.ticket_resolved, partReplaced, partSelected, quantityValid, checklistSaved]);

  const openChecklist = async (itemId: string, reopen = false) => {
    setChecklistLoading(true);
    setChecklistVisible(true);
    try {
      const result = await fetchFaultAnalysisChecklist(itemId);
      setChecklistFields(result.fields);
      if (reopen && savedChecklist) {
        setChecklistResponses(savedChecklist);
      } else if (!reopen) {
        setChecklistResponses({});
      }
    } catch (err) {
      appAlert(
        'Checklist unavailable',
        err instanceof Error ? err.message : 'Could not load checklist',
      );
      setChecklistFields([]);
    } finally {
      setChecklistLoading(false);
    }
  };

  const selectPart = async (item: SearchSheetItem) => {
    const inv = inventory.find((row) => row.item_id === item.id);
    if (!inv || !form) return;

    setForm({
      ...form,
      part_replaced_id: inv.item_id,
      part_replaced: `${inv.item_name} - ${inv.item_code}`,
    });
    setChecklistSaved(false);
    setSavedChecklist(null);
    setChecklistResponses({});
    await openChecklist(inv.item_id, false);
  };

  const saveChecklist = () => {
    if (!form?.part_replaced_id) return;
    if (
      checklistFields.length > 0 &&
      !isChecklistComplete(checklistFields, checklistResponses)
    ) {
      appAlert(
        'Incomplete checklist',
        'Fill every checklist field before saving.',
      );
      return;
    }

    setSavedChecklist({ ...checklistResponses });
    setChecklistSaved(true);
    setChecklistVisible(false);
    appAlert('Saved', 'Checklist saved successfully.');
  };

  const setGeneratedImage = (index: number, url: string) => {
    if (!form) return;
    setForm({
      ...form,
      [`ticket_generated_images${index + 1}`]: url,
    });
  };

  const setResolvedImage = (index: number, url: string) => {
    if (!form) return;
    setForm({
      ...form,
      [`ticket_resolved_images${index + 1}`]: url,
    });
  };

  const handleSubmit = async () => {
    if (!form || !canSubmit) return;
    setSaving(true);
    try {
      const {
        createdAt: _c,
        _id,
        last_activity: _l,
        updatedAt: _u,
        __v: _v,
        ...rest
      } = form;

      await resolveServiceTicket(_id, {
        ...rest,
        part_checklist: partReplaced
          ? [
              {
                part_id: form.part_replaced_id,
                checklist: savedChecklist ?? checklistResponses,
              },
            ]
          : [],
      });

      appAlert(
        'Updated',
        `${form.ticket_id ?? 'Ticket'} resolved successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Could not update ticket',
      );
    } finally {
      setSaving(false);
    }
  };

  const generatedImages = form
    ? [
        form.ticket_generated_images1,
        form.ticket_generated_images2,
        form.ticket_generated_images3,
        form.ticket_generated_images4,
        form.ticket_generated_images5,
      ]
    : EMPTY_IMAGES;

  const resolvedImages = form
    ? [
        form.ticket_resolved_images1,
        form.ticket_resolved_images2,
        form.ticket_resolved_images3,
        form.ticket_resolved_images4,
        form.ticket_resolved_images5,
      ]
    : EMPTY_IMAGES;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Resolve Ticket"
        subtitle={form?.ticket_id}
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

      {loading || !form ? (
        <View style={styles.centered}>
          {error ? (
            <>
              <Text style={{ color: colors.danger }}>{error}</Text>
              <Button title="Retry" size="sm" onPress={() => void load()} />
            </>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
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
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Ticket details
              </Text>
              <Badge
                label={form.ticket_resolved ? 'Resolved' : 'Open'}
                variant={form.ticket_resolved ? 'success' : 'warning'}
                size="sm"
              />
            </View>
            <View style={styles.metaGrid}>
              {[
                ['Robot', form.robot_no],
                ['Deveui', form.deveui],
                ['Site', form.site_id],
                ['Block', form.block],
                ['Type', form.robot_type],
                ['Company', form.company],
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
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
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
              Resolution
            </Text>
            <UptimeSelectField
              label="Fault type"
              value={form.fault_type ?? ''}
              options={faultOptions}
              onChange={(value) =>
                setForm({ ...form, fault_type: String(value) })
              }
            />
            <UptimeSelectField
              label="Ticket resolved"
              value={String(Boolean(form.ticket_resolved))}
              options={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes' },
              ]}
              onChange={(value) =>
                setForm({ ...form, ticket_resolved: String(value) === 'true' })
              }
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Resolving notes
            </Text>
            <TextInput
              value={form.ticket_resolving_notes ?? ''}
              onChangeText={(text) =>
                setForm({ ...form, ticket_resolving_notes: text })
              }
              placeholder="Describe the fix..."
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

          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                  Part replaced?
                </Text>
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  Enabling this requires a full checklist and quantity.
                </Text>
              </View>
              <Switch
                value={partReplaced}
                onValueChange={(next) => {
                  setForm({
                    ...form,
                    service_part_replaced: next,
                    ...(next
                      ? {}
                      : {
                          part_replaced_id: '',
                          part_replaced: '',
                          replaced_part_quantity: '',
                        }),
                  });
                  if (!next) {
                    setChecklistSaved(false);
                    setSavedChecklist(null);
                    setChecklistResponses({});
                    setChecklistFields([]);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {partReplaced ? (
              <>
                <Pressable
                  onPress={() => setInventorySheet(true)}
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[styles.metaLabel, { color: colors.textMuted }]}
                    >
                      Select part
                    </Text>
                    <Text
                      style={[styles.metaValue, { color: colors.textPrimary }]}
                    >
                      {form.part_replaced || 'Search inventory item'}
                    </Text>
                  </View>
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>

                {form.part_replaced_id ? (
                  <View style={styles.checklistStatus}>
                    <Badge
                      label={
                        checklistSaved
                          ? 'Checklist saved'
                          : 'Checklist required'
                      }
                      variant={checklistSaved ? 'success' : 'error'}
                      size="sm"
                    />
                    <Button
                      title={checklistSaved ? 'View checklist' : 'Fill checklist'}
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        void openChecklist(String(form.part_replaced_id), true)
                      }
                    />
                  </View>
                ) : null}

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  Replaced quantity
                </Text>
                {!quantityValid ? (
                  <Text style={[styles.hint, { color: colors.danger }]}>
                    Enter a quantity greater than 0
                  </Text>
                ) : null}
                <TextInput
                  value={String(form.replaced_part_quantity ?? '')}
                  onChangeText={(text) =>
                    setForm({ ...form, replaced_part_quantity: text })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                />
              </>
            ) : null}
          </View>

          <TicketPhotoSlots
            title="Generating photos"
            images={generatedImages}
            onCapture={(index) =>
              setPhotoTarget({ kind: 'generated', index })
            }
            onRemove={(index) => setGeneratedImage(index, '')}
          />

          <TicketPhotoSlots
            title="Resolving photos"
            images={resolvedImages}
            onCapture={(index) => setPhotoTarget({ kind: 'resolved', index })}
            onRemove={(index) => setResolvedImage(index, '')}
          />

          {!canSubmit ? (
            <Text style={[styles.hint, { color: colors.badge.warning.text }]}>
              Mark resolved
              {partReplaced
                ? ', select a part, complete the checklist, and enter quantity'
                : ''}{' '}
              to enable update.
            </Text>
          ) : null}

          <Button
            title={saving ? 'Updating...' : 'Update ticket'}
            onPress={() => void handleSubmit()}
            loading={saving}
            disabled={!canSubmit || saving}
            fullWidth
            icon="checkmark-done-outline"
          />
        </ScrollView>
      )}

      <TicketSearchSheet
        visible={inventorySheet}
        title="Select replaced part"
        placeholder="Search item name or code..."
        items={inventoryItems}
        onClose={() => setInventorySheet(false)}
        onSelect={(item) => void selectPart(item)}
      />

      <PartChecklistModal
        visible={checklistVisible}
        partLabel={form?.part_replaced ?? ''}
        fields={checklistFields}
        responses={checklistResponses}
        loading={checklistLoading}
        onChange={(fieldName, value) =>
          setChecklistResponses((prev) => ({ ...prev, [fieldName]: value }))
        }
        onClose={() => setChecklistVisible(false)}
        onSave={saveChecklist}
      />

      <TicketPhotoCaptureModal
        visible={photoTarget != null}
        title={
          photoTarget
            ? `${photoTarget.kind === 'generated' ? 'Generating' : 'Resolving'} photo ${photoTarget.index + 1}`
            : 'Photo'
        }
        onClose={() => setPhotoTarget(null)}
        onUploaded={(url) => {
          if (!photoTarget) return;
          if (photoTarget.kind === 'generated') {
            setGeneratedImage(photoTarget.index, url);
          } else {
            setResolvedImage(photoTarget.index, url);
          }
        }}
      />
    </View>
  );
}

const EMPTY_IMAGES = ['', '', '', '', ''];

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
    gap: spacing.sm,
    padding: spacing.xl,
  },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
  },
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
  fieldLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notes: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...typography.body,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  checklistStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
