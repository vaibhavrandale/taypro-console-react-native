import React, { useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Button } from '../components/ui';
import { createExpenseClaim } from '../api/expenseClaims';
import { uploadExpenseClaimFile } from '../api/imageUpload';
import { useAuth } from '../context/AuthContext';
import type { ExpenseClaimsStackParamList } from '../navigation/ExpenseClaimsStack';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';

type Navigation = NativeStackNavigationProp<
  ExpenseClaimsStackParamList,
  'ExpensesCreate'
>;

type LocalFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type ExpenseItemDraft = {
  expense_date: string;
  cost_center: string;
  expense_type: string;
  description: string;
  amount: string;
  sanctioned_amount: string;
  default_account: string;
  localFile?: LocalFile | null;
};

const EXPENSE_TYPES = ['Food', 'Travel', 'Medical', 'Others'] as const;

const VISIT_OPTIONS = [
  { value: '', label: 'Select department of visit' },
  { value: 'project', label: 'Project' },
  { value: 'service', label: 'Service' },
];

const COST_CENTER_OPTIONS = [{ value: 'Main - TPL', label: 'Main' }];

const ALLOWANCE_ROWS = [
  ['Food', '₹500'],
  ['Stay', '₹1,000'],
  ['Travel', '₹1,000'],
  ['Other', '₹110'],
  ['Total Per Day', '₹2,610'],
] as const;

const MAX_FILE_BYTES = 1 * 1024 * 1024;

function emptyItem(costCenter: string): ExpenseItemDraft {
  const today = toDateInputValue(new Date());
  return {
    expense_date: today,
    cost_center: costCenter,
    expense_type: '',
    description: '',
    amount: '',
    sanctioned_amount: '',
    default_account: '',
    localFile: null,
  };
}

function randomSuffix() {
  return Math.random().toString(36).substring(2, 12);
}

export function CreateExpenseClaimScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();

  const [limitsVisible, setLimitsVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [postingDate, setPostingDate] = useState(toDateInputValue(new Date()));
  const [departmentOfVisit, setDepartmentOfVisit] = useState('');
  const [costCenter, setCostCenter] = useState('Main - TPL');
  const [items, setItems] = useState<ExpenseItemDraft[]>([
    emptyItem('Main - TPL'),
  ]);
  const [datePicker, setDatePicker] = useState<
    | { kind: 'posting' }
    | { kind: 'item'; index: number }
    | null
  >(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const totals = useMemo(() => {
    const claimed = items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const value = Number(claimed.toFixed(2));
    return {
      total_claimed_amount: value,
      total_sanctioned_amount: value,
      grand_total: value,
    };
  }, [items]);

  const openPostingDate = () => {
    setPickerDate(new Date(`${postingDate}T12:00:00`));
    setDatePicker({ kind: 'posting' });
  };

  const openItemDate = (index: number) => {
    setPickerDate(new Date(`${items[index].expense_date}T12:00:00`));
    setDatePicker({ kind: 'item', index });
  };

  const applyPickedDate = (picked?: Date) => {
    if (!picked || !datePicker) return;
    const next = toDateInputValue(picked);
    if (datePicker.kind === 'posting') {
      setPostingDate(next);
    } else {
      updateItem(datePicker.index, { expense_date: next });
    }
    if (Platform.OS === 'ios') setPickerDate(picked);
  };

  const isDuplicateType = (
    index: number,
    date: string,
    type: string,
    list = items,
  ) => {
    if (!type) return false;
    return list.some(
      (item, idx) =>
        idx !== index &&
        item.expense_date === date &&
        item.expense_type === type,
    );
  };

  const updateItem = (index: number, patch: Partial<ExpenseItemDraft>) => {
    setItems((prev) => {
      const current = prev[index];
      if (!current) return prev;

      const nextDate = patch.expense_date ?? current.expense_date;
      const nextType = patch.expense_type ?? current.expense_type;

      if (
        (patch.expense_date != null || patch.expense_type != null) &&
        isDuplicateType(index, nextDate, nextType, prev)
      ) {
        appAlert(
          'Duplicate item',
          'This expense type is already selected for the selected date.',
        );
        return prev;
      }

      const next = [...prev];
      next[index] = { ...current, ...patch };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem(costCenter)]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      appAlert('Required', 'At least one expense item is required.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const attachFile = async (index: number) => {
    appAlert('Attach bill', 'Choose a source', [
      {
        text: 'Photo library',
        onPress: () => void pickImage(index),
      },
      {
        text: 'Files',
        onPress: () => void pickDocument(index),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const applyLocalFile = (index: number, file: LocalFile) => {
    if (file.size != null && file.size > MAX_FILE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      appAlert(
        'File too large',
        `File size must be less than 1MB. Your file is ${mb} MB.`,
      );
      return;
    }
    updateItem(index, { localFile: file });
  };

  const pickImage = async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    applyLocalFile(index, {
      uri: asset.uri,
      name: asset.fileName || 'expense-bill.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
      size: asset.fileSize ?? null,
    });
  };

  const pickDocument = async (index: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    applyLocalFile(index, {
      uri: asset.uri,
      name: asset.name || 'expense-bill',
      mimeType: asset.mimeType,
      size: asset.size ?? null,
    });
  };

  const validate = () => {
    const errors: string[] = [];
    if (!user?.employee_id) errors.push('Employee ID');
    if (!departmentOfVisit) errors.push('Department of visit');
    items.forEach((item, index) => {
      if (!item.expense_date) errors.push(`Item ${index + 1}: Date`);
      if (!item.expense_type) errors.push(`Item ${index + 1}: Type`);
      if (!item.description.trim())
        errors.push(`Item ${index + 1}: Description`);
      if (!item.amount || Number(item.amount) <= 0) {
        errors.push(`Item ${index + 1}: Valid amount`);
      }
      if (isDuplicateType(index, item.expense_date, item.expense_type)) {
        errors.push(`Item ${index + 1}: Duplicate type for date`);
      }
    });
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length) {
      appAlert('Missing fields', errors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const claimName = `new-expense-claim-${randomSuffix()}`;
      const uploadedItems = [];

      for (const [idx, item] of items.entries()) {
        let fileUrl = '';
        if (item.localFile?.uri) {
          fileUrl = await uploadExpenseClaimFile(
            item.localFile.uri,
            item.localFile.mimeType,
          );
        }

        const amount = Number(Number(item.amount).toFixed(2));
        uploadedItems.push({
          expense_date: item.expense_date,
          cost_center: costCenter,
          expense_type: item.expense_type,
          description: item.description.trim(),
          amount,
          sanctioned_amount: amount,
          default_account: '',
          file: fileUrl,
          attachment: fileUrl,
          docstatus: 0,
          doctype: 'Expense Claim Detail',
          __islocal: 1,
          __unsaved: 1,
          owner: user!.email,
          name: `new-expense-claim-detail-${randomSuffix()}`,
          parent: claimName,
          parentfield: 'expenses',
          parenttype: 'Expense Claim',
          idx: idx + 1,
        });
      }

      await createExpenseClaim({
        company: 'Taypro Private Limited',
        naming_series: 'HR-EXP-.YYYY.-',
        name: claimName,
        posting_date: postingDate,
        cost_center: costCenter,
        payable_account: 'Employee Expenses Payable - TPL',
        department: user?.department || 'Project - TPL',
        expense_approver: 'tejas.memane@taypro.in',
        company_gstin: '27AAHCT4250H1ZA',
        department_of_visit: departmentOfVisit,
        employee: user!.employee_id!,
        employee_name: user!.username,
        owner: user!.email,
        docstatus: 0,
        doctype: 'Expense Claim',
        __islocal: 1,
        __unsaved: 1,
        approval_status: 'Draft',
        status: 'Draft',
        workflow_state: 'Draft',
        console_status: 'Waiting For Approval',
        is_paid: true,
        taxes: [],
        advances: [],
        remark: 'Site visit',
        total_claimed_amount: totals.total_claimed_amount,
        total_sanctioned_amount: totals.total_sanctioned_amount,
        grand_total: totals.grand_total,
        expenses: uploadedItems,
      });

      appAlert('Expense created', 'Expense claim created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      appAlert(
        'Create failed',
        err instanceof Error ? err.message : 'Could not create expense claim',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="New Expense"
        subtitle="Create expense claim"
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
        <Pressable
          onPress={() => setLimitsVisible(true)}
          style={[
            styles.limitsBanner,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.limitsBannerText, { color: colors.textSecondary }]}>
            View daily allowance limits
          </Text>
        </Pressable>

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
            Basic info
          </Text>

          <View style={styles.metaGrid}>
            {[
              ['Employee', user?.username || '—'],
              ['Employee ID', user?.employee_id || '—'],
              ['Company', 'Taypro Private Limited'],
              ['Approver', 'tejas.memane@taypro.in'],
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
                  {value}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={openPostingDate}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              Posting date
            </Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
              {formatDisplayDate(postingDate)}
            </Text>
          </Pressable>

          <UptimeSelectField
            label="Department of visit *"
            value={departmentOfVisit}
            options={VISIT_OPTIONS}
            onChange={(value) => setDepartmentOfVisit(String(value))}
          />

          <UptimeSelectField
            label="Cost center"
            value={costCenter}
            options={COST_CENTER_OPTIONS}
            onChange={(value) => {
              const next = String(value);
              setCostCenter(next);
              setItems((prev) =>
                prev.map((item) => ({ ...item, cost_center: next })),
              );
            }}
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
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Expense items
            </Text>
            <Button
              title="Add item"
              size="sm"
              icon="add-outline"
              onPress={addItem}
            />
          </View>

          {items.map((item, index) => {
            const duplicate = isDuplicateType(
              index,
              item.expense_date,
              item.expense_type,
            );
            const typeOptions = [
              { value: '', label: 'Select type' },
              ...EXPENSE_TYPES.map((type) => ({
                value: type,
                label: type,
                disabled: isDuplicateType(index, item.expense_date, type),
              })),
            ];

            return (
              <View
                key={`item-${index}`}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: duplicate ? colors.danger : colors.border,
                  },
                ]}
              >
                <View style={styles.itemHeader}>
                  <Text
                    style={[styles.itemTitle, { color: colors.textPrimary }]}
                  >
                    Item {index + 1}
                  </Text>
                  <Pressable
                    onPress={() => removeItem(index)}
                    hitSlop={8}
                    disabled={items.length <= 1}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={
                        items.length <= 1 ? colors.textMuted : colors.danger
                      }
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => openItemDate(index)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                    Date
                  </Text>
                  <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                    {formatDisplayDate(item.expense_date)}
                  </Text>
                </Pressable>

                <UptimeSelectField
                  label="Type *"
                  value={item.expense_type}
                  options={typeOptions}
                  onChange={(value) =>
                    updateItem(index, { expense_type: String(value) })
                  }
                />

                {duplicate ? (
                  <Text style={{ color: colors.danger, ...typography.caption }}>
                    {item.expense_type} already selected for{' '}
                    {item.expense_date}. Choose a different type.
                  </Text>
                ) : null}

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Description *
                </Text>
                <TextInput
                  value={item.description}
                  onChangeText={(value) =>
                    updateItem(index, { description: value })
                  }
                  placeholder="Describe the expense"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[
                    styles.textArea,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Amount (₹) *
                </Text>
                <TextInput
                  value={item.amount}
                  onChangeText={(value) =>
                    updateItem(index, {
                      amount: value.replace(/[^0-9.]/g, ''),
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
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

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Bill attachment
                </Text>
                {item.localFile ? (
                  <View
                    style={[
                      styles.fileRow,
                      {
                        backgroundColor: colors.backgroundTertiary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-attach-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.fileName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.localFile.name}
                    </Text>
                    <Pressable
                      onPress={() => updateItem(index, { localFile: null })}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Button
                    title="Attach file"
                    size="sm"
                    variant="outline"
                    icon="attach-outline"
                    onPress={() => void attachFile(index)}
                  />
                )}
              </View>
            );
          })}
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
            Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Total claimed</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              ₹{totals.total_claimed_amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Grand total</Text>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              ₹{totals.grand_total.toFixed(2)}
            </Text>
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

      <Modal
        visible={limitsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setLimitsVisible(false)}
          />
          <View
            style={[
              styles.limitsSheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Daily allowance limits
              </Text>
              <Pressable onPress={() => setLimitsVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            {ALLOWANCE_ROWS.map(([label, value], index) => (
              <View
                key={label}
                style={[
                  styles.limitRow,
                  index < ALLOWANCE_ROWS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.limitLabel,
                    {
                      color: colors.textSecondary,
                      fontWeight: index === ALLOWANCE_ROWS.length - 1 ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.limitValue,
                    {
                      color: colors.textPrimary,
                      fontWeight: index === ALLOWANCE_ROWS.length - 1 ? '700' : '600',
                    },
                  ]}
                >
                  {value}
                </Text>
              </View>
            ))}
            <Button
              title="Got it"
              onPress={() => setLimitsVisible(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {datePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onValueChange={(_event, picked) => {
            applyPickedDate(picked);
            setDatePicker(null);
          }}
          onDismiss={() => setDatePicker(null)}
        />
      ) : null}

      {datePicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <View
              style={[
                styles.iosPickerSheet,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.iosPickerActions}>
                <Pressable onPress={() => setDatePicker(null)}>
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyPickedDate(pickerDate);
                    setDatePicker(null);
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
  limitsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  limitsBannerText: { ...typography.bodySmall, flex: 1 },
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
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
    minWidth: '47%',
    flexGrow: 1,
  },
  metaLabel: { ...typography.caption, fontSize: 10 },
  metaValue: { ...typography.bodySmall, fontWeight: '600' },
  datePill: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  dateLabel: { ...typography.caption, fontSize: 10 },
  dateValue: { ...typography.bodySmall, fontWeight: '600' },
  itemCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: { ...typography.label, fontSize: 13, fontWeight: '700' },
  inputLabel: { ...typography.caption, fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 84,
    textAlignVertical: 'top',
    ...typography.bodySmall,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fileName: { ...typography.caption, flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  limitsSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modalTitle: { ...typography.label, fontSize: 16, fontWeight: '700', flex: 1 },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  limitLabel: { ...typography.bodySmall },
  limitValue: { ...typography.bodySmall },
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
