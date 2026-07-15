import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button } from '../ui';
import { UptimeSelectField } from '../robotUptime/UptimeSelectField';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  countFilledChecklistFields,
  formatFieldLabel,
  isChecklistComplete,
  type ChecklistField,
} from '../../types/serviceTickets';

type Props = {
  visible: boolean;
  partLabel: string;
  fields: ChecklistField[];
  responses: Record<string, string>;
  loading?: boolean;
  onChange: (fieldName: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function PartChecklistModal({
  visible,
  partLabel,
  fields,
  responses,
  loading,
  onChange,
  onClose,
  onSave,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useStatusBarOverlay(visible);

  const filled = useMemo(
    () => countFilledChecklistFields(fields, responses),
    [fields, responses],
  );
  const complete = useMemo(
    () => isChecklistComplete(fields, responses),
    [fields, responses],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        // Backdrop static when fields exist — must save or complete.
        if (fields.length === 0) onClose();
      }}
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlay,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : '#101936',
            },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: colors.primary }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                Part replacement checklist
              </Text>
              <Text
                style={[styles.title, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {partLabel || 'Selected part'}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={`${filled}/${fields.length} filled`}
                  variant={complete ? 'success' : 'warning'}
                  size="sm"
                />
                {complete ? (
                  <Badge label="Complete" variant="success" size="sm" />
                ) : (
                  <Badge label="Required" variant="error" size="sm" />
                )}
              </View>
            </View>
            {fields.length === 0 ? (
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Loading checklist...
              </Text>
            ) : fields.length === 0 ? (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                No checklist items found for this part. You can save and
                continue.
              </Text>
            ) : (
              fields.map((field) => {
                const value = responses[field.field_name] ?? '';
                const label = formatFieldLabel(field.field_name);

                if (field.input_type === 'checkbox') {
                  const checked = value === 'Yes';
                  return (
                    <View
                      key={field.field_name}
                      style={[
                        styles.fieldCard,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.switchRow}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: colors.textPrimary, flex: 1 },
                          ]}
                        >
                          {label}
                        </Text>
                        <Switch
                          value={checked}
                          onValueChange={(next) =>
                            onChange(field.field_name, next ? 'Yes' : 'No')
                          }
                          trackColor={{
                            false: colors.border,
                            true: colors.primary,
                          }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                      <Text
                        style={[styles.fieldHint, { color: colors.textMuted }]}
                      >
                        {value ? value : 'Toggle to set Yes or No'}
                      </Text>
                    </View>
                  );
                }

                if (field.input_type === 'select') {
                  return (
                    <View
                      key={field.field_name}
                      style={[
                        styles.fieldCard,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <UptimeSelectField
                        label={label}
                        value={value}
                        options={[
                          { value: '', label: 'Select an option' },
                          ...(field.input_options ?? []).map((opt) => ({
                            value: opt,
                            label: opt,
                          })),
                        ]}
                        onChange={(next) =>
                          onChange(field.field_name, String(next))
                        }
                        icon="list-outline"
                      />
                    </View>
                  );
                }

                return (
                  <View
                    key={field.field_name}
                    style={[
                      styles.fieldCard,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.fieldLabel, { color: colors.textPrimary }]}
                    >
                      {label}
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={(text) =>
                        onChange(field.field_name, text)
                      }
                      placeholder="Enter details"
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
                );
              })
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {!complete && fields.length > 0 ? (
              <Text style={[styles.footerHint, { color: colors.danger }]}>
                Fill every checklist field before saving.
              </Text>
            ) : null}
            <Button
              title="Save checklist"
              onPress={onSave}
              disabled={fields.length > 0 && !complete}
              fullWidth
              icon="checkmark-done-outline"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  panel: {
    maxHeight: '92%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  accent: { height: 3, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  fieldCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 13,
  },
  fieldHint: {
    ...typography.caption,
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerHint: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
