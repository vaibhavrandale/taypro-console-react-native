import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Modal,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { ExpenseAttachmentModal } from '../components/expenseClaims/ExpenseAttachmentModal';
import { UptimeSelectField } from '../components/robotUptime/UptimeSelectField';
import { Button } from '../components/ui';
import {
  fetchExpenseClaim,
  updateExpenseClaim,
} from '../api/expenseClaims';
import { uploadExpenseClaimFile } from '../api/imageUpload';
import { useAuth } from '../context/AuthContext';
import type { ExpenseClaimsStackParamList } from '../navigation/ExpenseClaimsStack';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ExpenseClaim, ExpenseClaimLineItem } from '../types/expenseClaims';
import { formatDisplayDate, toDateInputValue } from '../utils/dprHistory';

type Navigation = NativeStackNavigationProp<
  ExpenseClaimsStackParamList,
  'ExpensesUpdate'
>;
type Route = RouteProp<ExpenseClaimsStackParamList, 'ExpensesUpdate'>;

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
  file: string;
  uploading?: boolean;
  raw?: ExpenseClaimLineItem;
};

const EXPENSE_TYPES = ['Food', 'Travel', 'Medical', 'Others'] as const;

const DEPARTMENT_OPTIONS = [
  { value: 'Project - TPL', label: 'Project' },
];

const COST_CENTER_OPTIONS = [{ value: 'Main - TPL', label: 'Main' }];

const MAX_FILE_BYTES = 1 * 1024 * 1024;

function toDateInput(value?: string) {
  if (!value) return toDateInputValue(new Date());
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toDateInputValue(new Date());
  return toDateInputValue(date);
}

function getDefaultAccount(expenseType: string) {
  switch (expenseType) {
    case 'Food':
      return 'Food Expenses - TPL';
    case 'Travel':
      return 'Travel Expenses - TPL';
    case 'Stay':
      return 'Hotel Expenses - TPL';
    case 'Communication':
      return 'Communication Expenses - TPL';
    case 'Office':
      return 'Office Expenses - TPL';
    default:
      return 'Miscellaneous Expenses - TPL';
  }
}

function emptyItem(costCenter: string): ExpenseItemDraft {
  return {
    expense_date: toDateInputValue(new Date()),
    cost_center: costCenter,
    expense_type: '',
    description: '',
    amount: '',
    sanctioned_amount: '',
    default_account: '',
    file: '',
  };
}

function lineToDraft(item: ExpenseClaimLineItem): ExpenseItemDraft {
  const amount =
    item.amount != null && !Number.isNaN(Number(item.amount))
      ? String(item.amount)
      : '';
  return {
    expense_date: toDateInput(item.expense_date),
    cost_center:
      typeof item.cost_center === 'string' && item.cost_center
        ? item.cost_center
        : 'Main - TPL',
    expense_type: item.expense_type ?? '',
    description: item.description ?? '',
    amount,
    sanctioned_amount:
      item.sanctioned_amount != null
        ? String(item.sanctioned_amount)
        : amount,
    default_account:
      typeof item.default_account === 'string'
        ? item.default_account
        : getDefaultAccount(item.expense_type ?? ''),
    file: item.file ?? '',
    raw: item,
  };
}

function isTechnicianRole(role?: string) {
  return role === 'Site Technician' || role === 'Opex Site Technician';
}

export function UpdateExpenseClaimScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const id = route.params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [postingDate, setPostingDate] = useState(toDateInputValue(new Date()));
  const [department, setDepartment] = useState('Project - TPL');
  const [costCenter, setCostCenter] = useState('Main - TPL');
  const [expenseApprover, setExpenseApprover] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  const [canTechnicianEdit, setCanTechnicianEdit] = useState(false);
  const [items, setItems] = useState<ExpenseItemDraft[]>([
    emptyItem('Main - TPL'),
  ]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
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

  const loadClaim = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExpenseClaim(id);

      if (
        isTechnicianRole(user?.role) &&
        data.can_technician_edit === false
      ) {
        appAlert(
          'Cannot edit',
          'You cannot edit this expense. Contact an admin.',
        );
        navigation.goBack();
        return;
      }

      setClaim(data);
      setPostingDate(toDateInput(data.posting_date));
      setDepartment(
        typeof data.department === 'string' && data.department
          ? data.department
          : 'Project - TPL',
      );
      setCostCenter(
        typeof data.cost_center === 'string' && data.cost_center
          ? data.cost_center
          : 'Main - TPL',
      );
      setExpenseApprover(
        typeof data.expense_approver === 'string'
          ? data.expense_approver
          : '',
      );
      setCompanyGstin(
        typeof data.company_gstin === 'string' ? data.company_gstin : '',
      );
      setCanTechnicianEdit(Boolean(data.can_technician_edit));
      setItems(
        data.expenses && data.expenses.length > 0
          ? data.expenses.map(lineToDraft)
          : [emptyItem('Main - TPL')],
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load expense claim',
      );
    } finally {
      setLoading(false);
    }
  }, [id, navigation, user?.role]);

  useEffect(() => {
    void loadClaim();
  }, [loadClaim]);

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
      const merged = { ...current, ...patch };

      if (patch.expense_type != null) {
        merged.default_account = getDefaultAccount(patch.expense_type);
      }
      if (patch.amount != null) {
        merged.sanctioned_amount = patch.amount;
      }

      next[index] = merged;
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

  const attachFile = (index: number) => {
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

  const uploadAndSetFile = async (index: number, file: LocalFile) => {
    if (file.size != null && file.size > MAX_FILE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      appAlert(
        'File too large',
        `File size must be less than 1MB. Your file is ${mb} MB.`,
      );
      return;
    }

    updateItem(index, { uploading: true });
    try {
      const url = await uploadExpenseClaimFile(file.uri, file.mimeType);
      updateItem(index, { file: url, uploading: false });
      appAlert('Uploaded', 'File uploaded.');
    } catch (err) {
      updateItem(index, { uploading: false });
      appAlert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload file',
      );
    }
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
    await uploadAndSetFile(index, {
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
    await uploadAndSetFile(index, {
      uri: asset.uri,
      name: asset.name || 'expense-bill',
      mimeType: asset.mimeType,
      size: asset.size ?? null,
    });
  };

  const validate = () => {
    const errors: string[] = [];
    if (!expenseApprover.trim()) errors.push('Expense approver');
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
    if (!claim) return;

    const errors = validate();
    if (errors.length) {
      appAlert('Missing fields', errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const {
        createdAt: _createdAt,
        _id: _omitId,
        last_activity: _lastActivity,
        ...rest
      } = claim;

      const payload: Record<string, unknown> = {
        ...rest,
        posting_date: postingDate,
        department,
        cost_center: costCenter,
        expense_approver: expenseApprover.trim(),
        company_gstin: companyGstin,
        can_technician_edit: isTechnicianRole(user?.role)
          ? false
          : canTechnicianEdit,
        total_claimed_amount: totals.total_claimed_amount,
        total_sanctioned_amount: totals.total_sanctioned_amount,
        grand_total: totals.grand_total,
        expenses: items.map((item) => {
          const amount = Number(Number(item.amount).toFixed(2));
          return {
            ...(item.raw ?? {}),
            expense_date: item.expense_date,
            cost_center: item.cost_center || costCenter,
            expense_type: item.expense_type,
            description: item.description.trim(),
            amount,
            sanctioned_amount: amount,
            default_account:
              item.default_account || getDefaultAccount(item.expense_type),
            file: item.file || '',
            attachment: item.file || '',
          };
        }),
      };

      const result = await updateExpenseClaim(id, payload);
      appAlert('Updated', result.message ?? 'Expense claim updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Could not update expense claim',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Update Expense"
        subtitle={claim?.name || id}
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
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Button title="Retry" onPress={() => void loadClaim()} />
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
              Basic info
            </Text>

            <View style={styles.metaGrid}>
              {[
                ['Employee', claim?.employee_name || '—'],
                ['Employee ID', claim?.employee || '—'],
                [
                  'Company',
                  typeof claim?.company === 'string'
                    ? claim.company
                    : 'Taypro Private Limited',
                ],
                ['GSTIN', companyGstin || '—'],
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
              label="Department"
              value={department}
              options={DEPARTMENT_OPTIONS}
              onChange={(value) => setDepartment(String(value))}
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

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              Expense approver email *
            </Text>
            <TextInput
              value={expenseApprover}
              onChangeText={setExpenseApprover}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="approver@example.com"
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
                  key={`item-${index}-${item.raw?._id ?? ''}`}
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
                    <Text
                      style={[styles.dateLabel, { color: colors.textMuted }]}
                    >
                      Date
                    </Text>
                    <Text
                      style={[styles.dateValue, { color: colors.textPrimary }]}
                    >
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
                    <Text
                      style={{ color: colors.danger, ...typography.caption }}
                    >
                      {item.expense_type} already selected for{' '}
                      {item.expense_date}. Choose a different type.
                    </Text>
                  ) : null}

                  <Text
                    style={[styles.inputLabel, { color: colors.textMuted }]}
                  >
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

                  <Text
                    style={[styles.inputLabel, { color: colors.textMuted }]}
                  >
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

                  <Text
                    style={[styles.inputLabel, { color: colors.textMuted }]}
                  >
                    Bill attachment
                  </Text>
                  {item.file ? (
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
                        name={
                          item.file.toLowerCase().includes('.pdf')
                            ? 'download-outline'
                            : 'attach-outline'
                        }
                        size={16}
                        color={colors.primary}
                      />
                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => setAttachmentUrl(item.file)}
                      >
                        <Text
                          style={[
                            styles.fileName,
                            { color: colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          View attachment
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateItem(index, { file: '' })}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                  <Button
                    title={
                      item.uploading
                        ? 'Uploading...'
                        : item.file
                          ? 'Replace file'
                          : 'Attach file'
                    }
                    size="sm"
                    variant="outline"
                    icon="attach-outline"
                    loading={item.uploading}
                    disabled={item.uploading}
                    onPress={() => attachFile(index)}
                  />
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

          {!isTechnicianRole(user?.role) ? (
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
                <Text
                  style={[styles.switchLabel, { color: colors.textSecondary }]}
                >
                  Enable technician edit
                </Text>
                <Switch
                  value={canTechnicianEdit}
                  onValueChange={setCanTechnicianEdit}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ) : null}

          <Button
            title={saving ? 'Updating...' : 'Update'}
            onPress={() => void handleSubmit()}
            loading={saving}
            disabled={saving || items.some((item) => item.uploading)}
            fullWidth
          />
        </ScrollView>
      )}

      <ExpenseAttachmentModal
        url={attachmentUrl}
        onClose={() => setAttachmentUrl(null)}
      />

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.bodySmall,
    flex: 1,
  },
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
