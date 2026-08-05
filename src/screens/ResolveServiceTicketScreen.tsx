import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  fetchServiceTicketById,
  fetchServiceTicketFaults,
  fetchSitewiseServiceInventory,
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
import { resolveProfileImageUri } from '../utils/cleaningLogs';

type Navigation = NativeStackNavigationProp<
  ServiceTicketsStackParamList,
  'ResolveTicket'
>;
type Route = RouteProp<ServiceTicketsStackParamList, 'ResolveTicket'>;

type PartRow = {
  key: string;
  part_replaced_id: string;
  part_replaced: string;
  replaced_part_quantity: string;
  item_image?: string | null;
  checklist: Record<string, string> | null;
};

function emptyPartRow(): PartRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    part_replaced_id: '',
    part_replaced: '',
    replaced_part_quantity: '',
    item_image: null,
    checklist: null,
  };
}

function hydrateParts(ticket: ServiceTicket): PartRow[] {
  if (Array.isArray(ticket.parts_replaced) && ticket.parts_replaced.length > 0) {
    return ticket.parts_replaced.map((part) => {
      const checklistEntry = (ticket.part_checklist || []).find(
        (c) => c.part_id === part.part_replaced_id,
      );
      return {
        ...emptyPartRow(),
        part_replaced_id: part.part_replaced_id || '',
        part_replaced: part.part_replaced || '',
        replaced_part_quantity: String(part.replaced_part_quantity ?? ''),
        item_image: part.item_image ?? null,
        checklist:
          part.checklist && typeof part.checklist === 'object'
            ? part.checklist
            : checklistEntry?.checklist || null,
      };
    });
  }

  if (ticket.part_replaced_id) {
    const checklistEntry = (ticket.part_checklist || []).find(
      (c) => c.part_id === ticket.part_replaced_id,
    );
    return [
      {
        ...emptyPartRow(),
        part_replaced_id: ticket.part_replaced_id,
        part_replaced: ticket.part_replaced || '',
        replaced_part_quantity: String(ticket.replaced_part_quantity ?? ''),
        item_image: ticket.part_replaced_image ?? null,
        checklist: checklistEntry?.checklist || null,
      },
    ];
  }

  return [emptyPartRow()];
}

export function ResolveServiceTicketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { ticketId } = route.params;

  const [form, setForm] = useState<ServiceTicket | null>(null);
  const [parts, setParts] = useState<PartRow[]>([emptyPartRow()]);
  const [faults, setFaults] = useState<ServiceTicketFault[]>([]);
  const [inventory, setInventory] = useState<ServiceInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [activePartKey, setActivePartKey] = useState<string | null>(null);
  const [inventorySheet, setInventorySheet] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistFields, setChecklistFields] = useState<ChecklistField[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<
    Record<string, string>
  >({});
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
        fetchSitewiseServiceInventory(),
      ]);
      setForm(ticket);
      setParts(hydrateParts(ticket));
      setFaults(faultData);
      setInventory(inventoryData);
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
      inventory.map((item, index) => ({
        // Same catalog item can appear per site — keep list keys unique
        id: item._id || `${item.item_id}::${item.site_id ?? ''}::${index}`,
        title: `${item.item_name} · ${item.item_code}`,
        subtitle: [
          item.site_id,
          item.quantity != null ? `Qty ${item.quantity}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        imageUri: resolveProfileImageUri(item.item_image ?? undefined),
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

  const partsValid = useMemo(() => {
    if (!partReplaced) return true;
    return (
      parts.length > 0 &&
      parts.every(
        (p) =>
          Boolean(p.part_replaced_id) &&
          Number(p.replaced_part_quantity) > 0 &&
          p.checklist !== null &&
          typeof p.checklist === 'object',
      )
    );
  }, [partReplaced, parts]);

  const canSubmit = Boolean(form?.ticket_resolved) && partsValid;

  const updatePart = (key: string, patch: Partial<PartRow>) => {
    setParts((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  };

  const openChecklist = async (part: PartRow, reopen = false) => {
    if (!part.part_replaced_id) {
      appAlert('Select a part', 'Pick an inventory item first.');
      return;
    }
    setActivePartKey(part.key);
    setChecklistLoading(true);
    setChecklistVisible(true);
    try {
      const result = await fetchFaultAnalysisChecklist(part.part_replaced_id);
      setChecklistFields(result.fields);
      if (!result.fields.length && !reopen) {
        updatePart(part.key, { checklist: {} });
        setChecklistVisible(false);
        appAlert('Checklist', 'No checklist configured for this part.');
        return;
      }
      setChecklistResponses(
        reopen && part.checklist ? part.checklist : {},
      );
    } catch (err) {
      appAlert(
        'Checklist unavailable',
        err instanceof Error ? err.message : 'Could not load checklist',
      );
      setChecklistFields([]);
      setChecklistVisible(false);
    } finally {
      setChecklistLoading(false);
    }
  };

  const selectPart = async (item: SearchSheetItem) => {
    const inv = inventory.find((row, index) => {
      const key = row._id || `${row.item_id}::${row.site_id ?? ''}::${index}`;
      return key === item.id || row.item_id === item.id;
    });
    if (!inv || !activePartKey) return;

    const next: PartRow = {
      key: activePartKey,
      part_replaced_id: inv.item_id,
      part_replaced: `${inv.item_name} - ${inv.item_code}`,
      replaced_part_quantity:
        parts.find((p) => p.key === activePartKey)?.replaced_part_quantity ||
        '',
      item_image: inv.item_image ?? null,
      checklist: null,
    };
    updatePart(activePartKey, next);
    setInventorySheet(false);
    await openChecklist(next, false);
  };

  const saveChecklist = () => {
    if (!activePartKey) return;
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
    updatePart(activePartKey, { checklist: { ...checklistResponses } });
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

      const servicePartReplaced = Boolean(rest.service_part_replaced);
      const parts_replaced = servicePartReplaced
        ? parts
            .filter((p) => p.part_replaced_id)
            .map((p) => ({
              part_replaced_id: p.part_replaced_id,
              part_replaced: p.part_replaced,
              replaced_part_quantity: Number(p.replaced_part_quantity) || 0,
              item_image: p.item_image || null,
              checklist: p.checklist || {},
            }))
        : [];

      const first = parts_replaced[0];

      await resolveServiceTicket(_id, {
        ...rest,
        service_part_replaced: servicePartReplaced,
        parts_replaced,
        part_replaced: first?.part_replaced || null,
        part_replaced_id: first?.part_replaced_id || null,
        replaced_part_quantity: first?.replaced_part_quantity || null,
        part_replaced_image: first?.item_image || null,
        part_checklist: parts_replaced.map((p) => ({
          part_id: p.part_replaced_id,
          checklist: p.checklist || {},
        })),
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

  const activePart = parts.find((p) => p.key === activePartKey);

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
        <>
          <View
            style={[
              styles.topActionBar,
              {
                backgroundColor: colors.backgroundSecondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {!canSubmit ? (
              <Text
                style={[styles.hint, { color: colors.badge.warning.text }]}
                numberOfLines={2}
              >
                Mark resolved
                {partReplaced
                  ? ', add part(s) with quantity and checklist'
                  : ''}{' '}
                to enable update.
              </Text>
            ) : (
              <Text
                style={[styles.topActionReady, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                Ready to update
              </Text>
            )}
            <Button
              title={saving ? 'Updating...' : 'Update ticket'}
              onPress={() => void handleSubmit()}
              loading={saving}
              disabled={!canSubmit || saving}
              size="sm"
              icon="checkmark-done-outline"
            />
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing.xxl + spacing.md },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
                  Part(s) replaced?
                </Text>
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  Add one or more parts. Each needs quantity and checklist.
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
                  setParts([emptyPartRow()]);
                  setActivePartKey(null);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {partReplaced
              ? parts.map((part, idx) => (
                  <View
                    key={part.key}
                    style={[
                      styles.partCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.headerRow}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Part {idx + 1}
                      </Text>
                      <View style={styles.partActions}>
                        {part.checklist ? (
                          <Button
                            title="Checklist"
                            size="sm"
                            variant="outline"
                            onPress={() => void openChecklist(part, true)}
                          />
                        ) : null}
                        <Pressable
                          onPress={() =>
                            setParts((prev) =>
                              prev.length <= 1
                                ? [emptyPartRow()]
                                : prev.filter((p) => p.key !== part.key),
                            )
                          }
                          hitSlop={8}
                          style={[
                            styles.iconBtn,
                            { backgroundColor: colors.backgroundTertiary },
                          ]}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.danger}
                          />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => {
                        setActivePartKey(part.key);
                        setInventorySheet(true);
                      }}
                      style={[
                        styles.picker,
                        {
                          backgroundColor: colors.backgroundTertiary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {part.item_image ? (
                        <Image
                          source={{
                            uri:
                              resolveProfileImageUri(part.item_image) ||
                              part.item_image,
                          }}
                          style={styles.partThumb}
                        />
                      ) : (
                        <View
                          style={[
                            styles.partThumbFallback,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <Ionicons
                            name="cube-outline"
                            size={16}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[
                            styles.metaLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          Select part
                        </Text>
                        <Text
                          style={[
                            styles.metaValue,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {part.part_replaced || 'Search inventory item'}
                        </Text>
                      </View>
                      <Ionicons
                        name="search-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>

                    {part.part_replaced_id ? (
                      <View style={styles.checklistStatus}>
                        <Badge
                          label={
                            part.checklist
                              ? 'Checklist saved'
                              : 'Checklist required'
                          }
                          variant={part.checklist ? 'success' : 'error'}
                          size="sm"
                        />
                        <Button
                          title={
                            part.checklist ? 'View checklist' : 'Fill checklist'
                          }
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            void openChecklist(part, Boolean(part.checklist))
                          }
                        />
                      </View>
                    ) : null}

                    <Text
                      style={[styles.fieldLabel, { color: colors.textMuted }]}
                    >
                      Replaced quantity
                    </Text>
                    <TextInput
                      value={part.replaced_part_quantity}
                      onChangeText={(text) =>
                        updatePart(part.key, {
                          replaced_part_quantity: text,
                        })
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
                  </View>
                ))
              : null}

            {partReplaced ? (
              <Button
                title="Add another part"
                size="sm"
                variant="outline"
                icon="add-outline"
                onPress={() => setParts((prev) => [...prev, emptyPartRow()])}
              />
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
        </ScrollView>
          </KeyboardAvoidingView>
        </>
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
        partLabel={activePart?.part_replaced ?? ''}
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
  flex: { flex: 1 },
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
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topActionReady: {
    ...typography.caption,
    flex: 1,
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
  partCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  partActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  partThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  partThumbFallback: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
