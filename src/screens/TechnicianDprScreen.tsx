import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar, Screen } from '../components/layout';
import { DprReadOnlyField, DprSection } from '../components/dpr/DprSection';
import { DprRobotPickerModal } from '../components/dpr/DprRobotPickerModal';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Button, Input } from '../components/ui';
import {
  createTechnicianDpr,
  fetchPmAndTicketDetails,
  fetchSiteRobotsForDpr,
  fetchSiteTechnicians,
} from '../api/technicianDpr';
import { summarizeText } from '../api/openai';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AssignedSite } from '../types/auth';
import {
  BREAKDOWN_REASONS,
  BreakdownReason,
  DprFormState,
  SiteRobotOption,
  SiteTechnicianUser,
  TechnicianPresentEntry,
} from '../types/technicianDpr';
import {
  buildTechnicianDprPayload,
  createEmptyDprForm,
  formatOperationalLabel,
  parseNumericInput,
} from '../utils/technicianDpr';
import type { DprStackParamList } from '../navigation/DprStack';

type Navigation = NativeStackNavigationProp<DprStackParamList, 'DprSubmit'>;

function getSiteLabel(site: AssignedSite) {
  const name =
    (site as AssignedSite & { site_name?: string }).site_name ?? site.siteName;
  return name ? `${name} (${site.site_id})` : site.site_id;
}

export function TechnicianDprScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Navigation>();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const [form, setForm] = useState<DprFormState>(() =>
    createEmptyDprForm(assignedSites[0]?.site_id ?? ''),
  );
  const [breakdownReasons, setBreakdownReasons] = useState<BreakdownReason[]>(
    [],
  );
  const [technicians, setTechnicians] = useState<SiteTechnicianUser[]>([]);
  const [robots, setRobots] = useState<SiteRobotOption[]>([]);

  const [bootLoading, setBootLoading] = useState(true);
  const [techLoading, setTechLoading] = useState(false);
  const [robotLoading, setRobotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [summarizingComments, setSummarizingComments] = useState(false);
  const [error, setError] = useState('');

  const [robotPickerIndex, setRobotPickerIndex] = useState<number | null>(null);

  const siteOptions = useMemo(
    () =>
      assignedSites.map((site) => ({
        value: site.site_id,
        label: getSiteLabel(site),
      })),
    [assignedSites],
  );

  const breakdownOptions = useMemo(
    () =>
      BREAKDOWN_REASONS.map((reason) => ({
        value: reason,
        label: reason,
      })),
    [],
  );

  const loadInitialData = useCallback(async () => {
    setBootLoading(true);
    setError('');

    try {
      const pmData = await fetchPmAndTicketDetails();
      setForm((prev) => ({
        ...prev,
        preventive_maintenance_status: pmData.preventive_maintenance_status,
        ticket_details: pmData.ticket_details,
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load DPR defaults',
      );
    } finally {
      setBootLoading(false);
    }
  }, []);

  const loadTechnicians = useCallback(async (siteId: string) => {
    if (!siteId) {
      setTechnicians([]);
      return;
    }

    setTechLoading(true);
    try {
      const data = await fetchSiteTechnicians(siteId);
      setTechnicians(data);
    } catch {
      setTechnicians([]);
    } finally {
      setTechLoading(false);
    }
  }, []);

  useEffect(() => {
    if (assignedSites.length === 0) {
      setBootLoading(false);
      return;
    }

    setForm((prev) => {
      if (prev.site_id && assignedSites.some((s) => s.site_id === prev.site_id)) {
        return prev;
      }
      return { ...prev, site_id: assignedSites[0].site_id };
    });
    void loadInitialData();
  }, [assignedSites, loadInitialData]);

  useEffect(() => {
    if (!form.site_id) return;
    void loadTechnicians(form.site_id);
  }, [form.site_id, loadTechnicians]);

  const updateOperational = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      robots_operational_details: {
        ...prev.robots_operational_details,
        [key]: parseNumericInput(value),
      },
    }));
  };

  const toggleTechnician = (tech: SiteTechnicianUser) => {
    setForm((prev) => {
      const exists = prev.technician_present.some(
        (entry) => entry.technician_id === tech._id,
      );

      if (exists) {
        return {
          ...prev,
          technician_present: prev.technician_present.filter(
            (entry) => entry.technician_id !== tech._id,
          ),
        };
      }

      const entry: TechnicianPresentEntry = {
        name: tech.username,
        email: tech.email,
        technician_id: tech._id,
        _id: tech._id,
        role: tech.role,
        profile_image: tech.profile_image,
      };

      return {
        ...prev,
        technician_present: [...prev.technician_present, entry],
      };
    });
  };

  const addBreakdownReason = () => {
    setBreakdownReasons((prev) => [
      ...prev,
      {
        reason: BREAKDOWN_REASONS[0],
        count: 0,
        robots: [],
      },
    ]);
  };

  const updateBreakdownReason = (
    index: number,
    patch: Partial<BreakdownReason>,
  ) => {
    setBreakdownReasons((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeBreakdownReason = (index: number) => {
    setBreakdownReasons((prev) => prev.filter((_, i) => i !== index));
  };

  const openRobotPicker = async (index: number) => {
    setRobotPickerIndex(index);
    setRobotLoading(true);

    try {
      const data = await fetchSiteRobotsForDpr(form.site_id);
      setRobots(data);
    } catch {
      setRobots([]);
      appAlert('Error', 'Failed to load robots for this site.');
      setRobotPickerIndex(null);
    } finally {
      setRobotLoading(false);
    }
  };

  const addRobotToBreakdown = (robot: SiteRobotOption) => {
    if (robotPickerIndex == null) return;

    setBreakdownReasons((prev) =>
      prev.map((item, index) => {
        if (index !== robotPickerIndex) return item;
        if (item.robots.some((entry) => entry.robot_id === robot._id)) {
          return item;
        }

        const robots = [
          ...item.robots,
          {
            robot_no: robot.robot_no,
            block: robot.block,
            robot_id: robot._id,
          },
        ];

        return {
          ...item,
          robots,
          count: robots.length,
        };
      }),
    );
  };

  const removeRobotFromBreakdown = (
    reasonIndex: number,
    robotIndex: number,
  ) => {
    setBreakdownReasons((prev) =>
      prev.map((item, index) => {
        if (index !== reasonIndex) return item;
        const robots = item.robots.filter((_, i) => i !== robotIndex);
        return { ...item, robots, count: robots.length };
      }),
    );
  };

  const summarizeComments = async () => {
    const text = form.comments.trim();
    if (!text) {
      appAlert('Comments required', 'Please enter some comments to improve.');
      return;
    }

    setSummarizingComments(true);
    setError('');

    try {
      const improved = await summarizeText(text);
      setForm((prev) => ({ ...prev, comments: improved }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to improve comments';
      appAlert('Improve failed', message);
    } finally {
      setSummarizingComments(false);
    }
  };

  const handleSubmit = async () => {
    const comments = form.comments.trim();
    if (!comments) {
      setCommentsError('Comments are required to submit this DPR.');
      appAlert('Comments required', 'Please enter DPR comments before submitting.');
      return;
    }
    setCommentsError('');

    if (form.technician_present.length === 0) {
      appAlert(
        'Technicians required',
        'Select at least one technician present.',
      );
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = buildTechnicianDprPayload(
        { ...form, comments },
        breakdownReasons,
      );
      await createTechnicianDpr(payload);
      appAlert('Success', 'DPR submitted successfully.');
      setForm(createEmptyDprForm(form.site_id));
      setBreakdownReasons([]);
      setCommentsError('');
      await loadInitialData();
      await loadTechnicians(form.site_id);
      navigation.navigate('DprHistory');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit DPR';
      setError(message);
      appAlert('Submit failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRobotIds =
    robotPickerIndex != null
      ? breakdownReasons[robotPickerIndex]?.robots.map((r) => r.robot_id) ?? []
      : [];

  if (assignedSites.length === 0) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
        <Navbar
          title="Submit DPR"
          subtitle="Daily progress report"
          showMenu={false}
          leftAction={
            <Pressable
              onPress={() => navigation.goBack()}
              style={[
                styles.navButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>
          }
        />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No assigned sites found for your account.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Submit DPR"
        subtitle="Daily progress report"
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.navButton,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {bootLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <Screen scroll>
          <View style={styles.content}>
            <View
              style={[
                styles.filtersCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <UptimeSelectField
                label="Site"
                value={form.site_id}
                options={siteOptions}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    site_id: String(value),
                    technician_present: [],
                  }))
                }
                icon="business-outline"
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}

            <DprSection title="Operational Details">
              <View style={styles.fieldGrid}>
                {Object.keys(form.robots_operational_details).map((key) => (
                  <Input
                    key={key}
                    label={formatOperationalLabel(key)}
                    value={String(
                      form.robots_operational_details[
                        key as keyof typeof form.robots_operational_details
                      ],
                    )}
                    keyboardType="number-pad"
                    onChangeText={(value) => updateOperational(key, value)}
                  />
                ))}
              </View>
            </DprSection>

            <DprSection
              title="Preventive Maintenance"
              hint="Auto-filled from PM records. Do not edit."
            >
              <View style={styles.fieldGrid}>
                <DprReadOnlyField
                  label="Auto attempted"
                  value={form.preventive_maintenance_status.automatic.attempted}
                />
                <DprReadOnlyField
                  label="Auto completed"
                  value={form.preventive_maintenance_status.automatic.completed}
                />
                <DprReadOnlyField
                  label="Semi attempted"
                  value={
                    form.preventive_maintenance_status.semi_automatic.attempted
                  }
                />
                <DprReadOnlyField
                  label="Semi completed"
                  value={
                    form.preventive_maintenance_status.semi_automatic.completed
                  }
                />
              </View>
            </DprSection>

            <DprSection
              title="Tickets"
              hint="Auto-filled from service tickets. Do not edit."
            >
              <View style={styles.fieldGrid}>
                <DprReadOnlyField
                  label="Total raised"
                  value={form.ticket_details.total_raised}
                />
                <DprReadOnlyField
                  label="Total closed"
                  value={form.ticket_details.total_closed}
                />
                <DprReadOnlyField
                  label="Total pending"
                  value={form.ticket_details.total_pending}
                />
              </View>
            </DprSection>

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Breakdown / Unoperational
              </Text>
              <Button
                title="Add Reason"
                size="sm"
                icon="add-outline"
                onPress={addBreakdownReason}
              />
            </View>

            {breakdownReasons.map((breakdown, index) => (
              <View
                key={`breakdown-${index}`}
                style={[
                  styles.breakdownCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.breakdownHeader}>
                  <Text style={[styles.breakdownTitle, { color: colors.danger }]}>
                    Reason #{index + 1}
                  </Text>
                  <Pressable onPress={() => removeBreakdownReason(index)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>

                <UptimeSelectField
                  label="Reason"
                  value={breakdown.reason}
                  options={breakdownOptions}
                  onChange={(value) =>
                    updateBreakdownReason(index, {
                      reason: String(value) as BreakdownReason['reason'],
                    })
                  }
                />

                <DprReadOnlyField label="Count" value={breakdown.count} />

                <Button
                  title="Add Robots"
                  size="sm"
                  variant="danger"
                  onPress={() => void openRobotPicker(index)}
                  disabled={!form.site_id}
                />

                {breakdown.robots.length > 0 ? (
                  <View style={styles.robotChipRow}>
                    {breakdown.robots.map((robot, robotIndex) => (
                      <Pressable
                        key={`${robot.robot_id}-${robotIndex}`}
                        onPress={() =>
                          removeRobotFromBreakdown(index, robotIndex)
                        }
                        style={[
                          styles.robotChip,
                          {
                            backgroundColor: colors.badge.error.bg,
                            borderColor: colors.danger,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.robotChipText,
                            { color: colors.danger },
                          ]}
                        >
                          {robot.robot_no} · {robot.block}
                        </Text>
                        <Ionicons name="close" size={14} color={colors.danger} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            <DprSection
              title="Comments"
              required
              hint="Required — describe today's site status and issues."
            >
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsHint, { color: colors.textMuted }]}>
                  This field must be filled before you can submit.
                </Text>
                <Button
                  title={
                    summarizingComments ? 'Improving...' : 'Improve with AI'
                  }
                  size="sm"
                  variant="outline"
                  loading={summarizingComments}
                  disabled={summarizingComments || !form.comments.trim()}
                  icon="sparkles-outline"
                  onPress={() => void summarizeComments()}
                />
              </View>
              <TextInput
                value={form.comments}
                onChangeText={(comments) => {
                  setForm((prev) => ({ ...prev, comments }));
                  if (commentsError && comments.trim()) {
                    setCommentsError('');
                  }
                }}
                placeholder="Enter DPR comments (required)..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[
                  styles.commentsInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: commentsError
                      ? colors.danger
                      : colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
              />
              {commentsError ? (
                <Text style={[styles.fieldError, { color: colors.danger }]}>
                  {commentsError}
                </Text>
              ) : null}
            </DprSection>

            <DprSection title="Technicians Present" required>
              {techLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : technicians.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No technicians found for this site.
                </Text>
              ) : (
                technicians.map((tech) => {
                  const selected = form.technician_present.some(
                    (entry) => entry.technician_id === tech._id,
                  );

                  return (
                    <Pressable
                      key={tech._id}
                      onPress={() => toggleTechnician(tech)}
                      style={[
                        styles.techRow,
                        {
                          backgroundColor: selected
                            ? colors.badge.success.bg
                            : colors.backgroundTertiary,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      {tech.profile_image ? (
                        <Image
                          source={{ uri: tech.profile_image }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarFallback,
                            { backgroundColor: colors.backgroundSecondary },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                      <View style={styles.techInfo}>
                        <Text
                          style={[styles.techName, { color: colors.textPrimary }]}
                        >
                          {tech.username}
                        </Text>
                        <Text
                          style={[styles.techEmail, { color: colors.textMuted }]}
                        >
                          {tech.email}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </DprSection>

            <Button
              title="Submit DPR"
              fullWidth
              loading={submitting}
              disabled={submitting}
              onPress={() => void handleSubmit()}
            />
          </View>
        </Screen>
      )}

      <DprRobotPickerModal
        visible={robotPickerIndex != null}
        loading={robotLoading}
        robots={robots}
        selectedRobotIds={selectedRobotIds}
        onClose={() => setRobotPickerIndex(null)}
        onSelect={addRobotToBreakdown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  filtersCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
  },
  breakdownCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTitle: {
    ...typography.label,
  },
  robotChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  robotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  robotChipText: {
    ...typography.caption,
    fontSize: 11,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentsHint: {
    ...typography.caption,
    flex: 1,
  },
  commentsInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
    lineHeight: 20,
  },
  fieldError: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techInfo: {
    flex: 1,
    gap: 2,
  },
  techName: {
    ...typography.label,
    fontSize: 13,
  },
  techEmail: {
    ...typography.caption,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodySmall,
  },
});
