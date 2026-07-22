import React, { useCallback, useMemo, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navbar } from '../components/layout';
import { ExpenseAttachmentModal } from '../components/expenseClaims/ExpenseAttachmentModal';
import { Badge, Button } from '../components/ui';
import {
  approveExpenseClaim,
  deleteExpenseClaim,
  fetchExpenseClaim,
  fetchExpenseClaims,
} from '../api/expenseClaims';
import { useAuth } from '../context/AuthContext';
import type { ExpenseClaimsStackParamList } from '../navigation/ExpenseClaimsStack';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  ExpenseClaim,
  ExpenseClaimLineItem,
} from '../types/expenseClaims';
import {
  formatDateIST,
  formatDateTimeIST,
  formatRelativeTime,
} from '../utils/datetime';
import { resolveProfileImageUri } from '../utils/cleaningLogs';
import {
  canApproveOrDeleteExpenses,
  canUpdateExpenseClaim,
} from '../utils/roles';

type Navigation = NativeStackNavigationProp<
  ExpenseClaimsStackParamList,
  'ExpensesList'
>;

const PAGE_LIMIT = 10;

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

type ActivityDetailPart = {
  text: string;
  tone?: 'success' | 'danger' | 'warning' | 'info';
};

/** Parse CoreUI-style activity HTML into styled Text parts. */
function parseActivityDetails(html?: string): ActivityDetailPart[] {
  if (!html) return [];
  const parts: ActivityDetailPart[] = [];
  const re =
    /<span\s+class=['"]([^'"]*)['"]>([\s\S]*?)<\/span>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const plain = decodeEntities(
        html.slice(lastIndex, match.index).replace(/<[^>]+>/g, ''),
      );
      if (plain) parts.push({ text: plain });
    }

    const className = match[1].toLowerCase();
    const inner = decodeEntities(match[2].replace(/<[^>]+>/g, ''));
    let tone: ActivityDetailPart['tone'];
    if (className.includes('success')) tone = 'success';
    else if (className.includes('danger') || className.includes('error'))
      tone = 'danger';
    else if (className.includes('warning')) tone = 'warning';
    else if (className.includes('info') || className.includes('primary'))
      tone = 'info';

    if (inner) parts.push({ text: inner, tone });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    const plain = decodeEntities(
      html.slice(lastIndex).replace(/<[^>]+>/g, ''),
    );
    if (plain) parts.push({ text: plain });
  }

  return parts.length ? parts : [{ text: decodeEntities(html.replace(/<[^>]+>/g, '')) }];
}

function ActivityDetailsText({ html }: { html?: string }) {
  const { colors } = useTheme();
  const parts = useMemo(() => parseActivityDetails(html), [html]);

  const toneColor = (tone?: ActivityDetailPart['tone']) => {
    switch (tone) {
      case 'success':
        return colors.badge.success.text;
      case 'danger':
        return colors.danger;
      case 'warning':
        return colors.badge.warning.text;
      case 'info':
        return colors.badge.info.text;
      default:
        return colors.textSecondary;
    }
  };

  if (!parts.length) {
    return (
      <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
        Activity
      </Text>
    );
  }

  return (
    <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
      {parts.map((part, index) => (
        <Text
          key={`${index}-${part.text.slice(0, 12)}`}
          style={{
            color: toneColor(part.tone),
            fontWeight: part.tone ? '700' : '400',
          }}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function fileLabel(url: string) {
  try {
    const path = url.split('?')[0];
    const name = path.split('/').pop() || 'Attachment';
    return decodeURIComponent(name);
  } catch {
    return 'Attachment';
  }
}

function groupExpensesByDate(items: ExpenseClaimLineItem[]) {
  const groups = new Map<string, ExpenseClaimLineItem[]>();
  for (const item of items) {
    const key = item.expense_date
      ? item.expense_date.slice(0, 10)
      : 'Unknown date';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function statusVariant(
  status?: string | boolean,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (status === true || status === 'Approved' || status === 'Paid') {
    return 'success';
  }
  if (status === false || status === 'Rejected') return 'error';
  if (
    status === 'Pending Approval' ||
    status === 'Draft' ||
    status === 'Waiting for HR Approval' ||
    status === 'Waiting for Management Approval' ||
    status === 'Waiting for Disbursement'
  ) {
    return 'warning';
  }
  return 'neutral';
}

function ExpenseCard({
  expense,
  index,
  role,
  isSiteTech,
  onView,
  onUpdate,
  onApprove,
  onDelete,
  approving,
}: {
  expense: ExpenseClaim;
  index: number;
  role?: string;
  isSiteTech: boolean;
  onView: () => void;
  onUpdate: () => void;
  onApprove: () => void;
  onDelete: () => void;
  approving: boolean;
}) {
  const { colors } = useTheme();
  const showUpdate = canUpdateExpenseClaim(role, expense.can_technician_edit);
  const showAdmin = canApproveOrDeleteExpenses(role);
  const alreadyApproved = expense.console_status === 'Approved';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.serial, { color: colors.textMuted }]}>
          #{index}
        </Text>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.claimId, { color: colors.textPrimary }]}>
            {expense.name || expense._id}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              label={expense.console_status || '—'}
              variant={statusVariant(expense.console_status)}
              size="sm"
            />
            <Badge
              label={expense.status || '—'}
              variant={statusVariant(expense.status)}
              size="sm"
            />
            {!isSiteTech ? (
              <Badge
                label={expense.can_technician_edit ? 'Tech edit on' : 'Tech edit off'}
                variant={expense.can_technician_edit ? 'success' : 'warning'}
                size="sm"
              />
            ) : null}
          </View>
        </View>
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {expense.employee_name || '—'}
        {expense.department ? ` · ${expense.department}` : ''}
      </Text>
      {expense.department_of_visit ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Visit: {expense.department_of_visit}
        </Text>
      ) : null}
      <Text style={[styles.amount, { color: colors.textPrimary }]}>
        ₹{Number(expense.grand_total ?? 0).toFixed(2)}
        {expense.posting_date
          ? ` · ${formatDateIST(expense.posting_date)}`
          : ''}
      </Text>
      {expense.createdAt ? (
        <Text style={[styles.created, { color: colors.textMuted }]}>
          {formatRelativeTime(expense.createdAt)}
          {' · '}
          {formatDateTimeIST(expense.createdAt)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button title="View" size="sm" variant="outline" onPress={onView} />
        {showUpdate ? (
          <Button
            title="Update"
            size="sm"
            variant="outline"
            onPress={onUpdate}
          />
        ) : null}
        {showAdmin && expense.status === 'Draft' ? (
          <Button
            title={alreadyApproved ? 'Approved' : approving ? '…' : 'Approve'}
            size="sm"
            disabled={alreadyApproved || approving}
            onPress={onApprove}
          />
        ) : null}
        {showAdmin ? (
          <Button
            title="Delete"
            size="sm"
            variant="outline"
            onPress={onDelete}
          />
        ) : null}
      </View>
    </View>
  );
}

export function ExpenseClaimsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const role = user?.role;
  const isSiteTech =
    role === 'Site Technician' || role === 'Opex Site Technician';

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [viewClaim, setViewClaim] = useState<ExpenseClaim | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [approveClaim, setApproveClaim] = useState<ExpenseClaim | null>(null);
  const [deleteClaim, setDeleteClaim] = useState<ExpenseClaim | null>(null);
  const [remark, setRemark] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(
    async (targetPage: number, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await fetchExpenseClaims({
          page: targetPage,
          limit: PAGE_LIMIT,
        });
        setClaims(result.data);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasNextPage(result.hasNextPage);
        setHasPrevPage(result.hasPrevPage);
      } catch (err) {
        setClaims([]);
        setError(
          err instanceof Error ? err.message : 'Failed to load expense claims',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPage(page);
    }, [loadPage, page]),
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return claims;
    return claims.filter(
      (item) =>
        (item.name ?? '').toLowerCase().includes(term) ||
        (item.employee_name ?? '').toLowerCase().includes(term) ||
        (item.department ?? '').toLowerCase().includes(term),
    );
  }, [claims, searchTerm]);

  const handleNew = () => {
    if (!user?.employee_id) {
      appAlert('Employee ID required', 'Please update your Employee ID in Profile first.');
      return;
    }
    navigation.navigate('ExpensesCreate');
  };

  const openView = async (claim: ExpenseClaim) => {
    setViewClaim(claim);
    setViewError('');
    setViewLoading(true);
    try {
      const full = await fetchExpenseClaim(claim._id);
      setViewClaim({
        ...claim,
        ...full,
        expenses:
          full.expenses && full.expenses.length > 0
            ? full.expenses
            : claim.expenses,
        last_activity:
          full.last_activity && full.last_activity.length > 0
            ? full.last_activity
            : claim.last_activity,
      });
    } catch (err) {
      // Keep list row data (may already include expenses / activity).
      if (
        !(claim.expenses && claim.expenses.length > 0) &&
        !(claim.last_activity && claim.last_activity.length > 0)
      ) {
        setViewError(
          err instanceof Error ? err.message : 'Failed to load claim details',
        );
      }
    } finally {
      setViewLoading(false);
    }
  };

  const openAttachment = (url: string) => {
    setAttachmentUrl(url);
  };

  const handleUpdate = (claim: ExpenseClaim) => {
    navigation.navigate('ExpensesUpdate', { id: claim._id });
  };

  const submitApprove = async () => {
    if (!approveClaim) return;
    setApprovingId(approveClaim._id);
    try {
      const message = await approveExpenseClaim(approveClaim._id, remark.trim());
      setApproveClaim(null);
      setRemark('');
      appAlert('Approved', message ?? 'Expense claim approved.');
      void loadPage(page);
    } catch (err) {
      appAlert(
        'Approve failed',
        err instanceof Error ? err.message : 'Could not approve claim',
      );
    } finally {
      setApprovingId(null);
    }
  };

  const submitDelete = async () => {
    if (!deleteClaim) return;
    if (!deleteReason.trim()) {
      appAlert('Reason required', 'Please enter a reason for deletion.');
      return;
    }
    setDeleting(true);
    try {
      const message = await deleteExpenseClaim(
        deleteClaim._id,
        deleteReason.trim(),
      );
      setDeleteClaim(null);
      setDeleteReason('');
      appAlert('Deleted', message ?? 'Expense claim deleted.');
      void loadPage(page);
    } catch (err) {
      appAlert(
        'Delete failed',
        err instanceof Error ? err.message : 'Could not delete claim',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar title="Expense Claims" subtitle="Claims & approvals" />

      <View style={styles.toolbar}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search claim, employee, department"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        <Button
          title="New"
          size="sm"
          icon="add-outline"
          onPress={handleNew}
        />
      </View>

      {loading && claims.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && claims.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            {error}
          </Text>
          <Button title="Retry" size="sm" onPress={() => void loadPage(page)} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.textMuted }}>
                No expense claims found
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ExpenseCard
              expense={item}
              index={(page - 1) * PAGE_LIMIT + index + 1}
              role={role}
              isSiteTech={isSiteTech}
              onView={() => void openView(item)}
              onUpdate={() => handleUpdate(item)}
              onApprove={() => {
                setApproveClaim(item);
                setRemark('');
              }}
              onDelete={() => {
                setDeleteClaim(item);
                setDeleteReason('');
              }}
              approving={approvingId === item._id}
            />
          )}
          ListFooterComponent={
            <View style={styles.pager}>
              <Button
                title="Prev"
                size="sm"
                variant="outline"
                disabled={!hasPrevPage || loading}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text style={[styles.pageLabel, { color: colors.textMuted }]}>
                Page {page} / {totalPages}
              </Text>
              <Button
                title="Next"
                size="sm"
                variant="outline"
                disabled={!hasNextPage || loading}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          }
        />
      )}

      {/* View */}
      <Modal
        visible={viewClaim != null}
        transparent
        animationType="slide"
        onRequestClose={() => setViewClaim(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setViewClaim(null)}
          />
          <View
            style={[
              styles.modalSheet,
              styles.viewSheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <View style={styles.handleRow}>
              <View
                style={[styles.handle, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text
                  style={[styles.modalEyebrow, { color: colors.textMuted }]}
                >
                  Expense claim
                </Text>
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {viewClaim?.name || 'Details'}
                </Text>
              </View>
              <Pressable
                onPress={() => setViewClaim(null)}
                hitSlop={8}
                style={[
                  styles.sheetClose,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            {viewLoading && !(viewClaim?.expenses?.length) ? (
              <View style={styles.viewLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : viewError && !(viewClaim?.expenses?.length) ? (
              <Text style={[styles.viewError, { color: colors.danger }]}>
                {viewError}
              </Text>
            ) : viewClaim ? (
              <ScrollView
                style={styles.viewScroll}
                contentContainerStyle={styles.viewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.summaryRow}>
                  <View
                    style={[
                      styles.summaryAmountCard,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.summaryLabel, { color: colors.textMuted }]}
                    >
                      Grand total
                    </Text>
                    <Text
                      style={[
                        styles.summaryAmount,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ₹{Number(viewClaim.grand_total ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryBadges}>
                    <Badge
                      label={viewClaim.console_status || '—'}
                      variant={statusVariant(viewClaim.console_status)}
                      size="sm"
                    />
                    <Badge
                      label={viewClaim.status || '—'}
                      variant={statusVariant(viewClaim.status)}
                      size="sm"
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.metaCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {[
                    ['Employee', viewClaim.employee_name],
                    ['Department', viewClaim.department],
                    ['Dept. of visit', viewClaim.department_of_visit],
                    ['Remark', viewClaim.remark],
                    [
                      'Posting date',
                      viewClaim.posting_date
                        ? formatDateIST(viewClaim.posting_date)
                        : '—',
                    ],
                    [
                      'Created',
                      viewClaim.createdAt
                        ? formatDateTimeIST(viewClaim.createdAt)
                        : '—',
                    ],
                  ].map(([label, value], index, arr) => (
                    <View
                      key={label}
                      style={[
                        styles.metaRow,
                        index < arr.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.viewLabel, { color: colors.textMuted }]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.viewValue,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {value || '—'}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionHeading, { color: colors.textPrimary }]}
                  >
                    Daywise expenses
                  </Text>
                  <Text
                    style={[styles.sectionCount, { color: colors.textMuted }]}
                  >
                    {viewClaim.expenses?.length ?? 0} item
                    {(viewClaim.expenses?.length ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>

                {viewLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}

                {(viewClaim.expenses?.length ?? 0) === 0 ? (
                  <View
                    style={[
                      styles.emptyLines,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textMuted }}>
                      No line items found
                    </Text>
                  </View>
                ) : (
                  groupExpensesByDate(viewClaim.expenses ?? []).map(
                    ([day, items]) => (
                      <View key={day} style={styles.dayGroup}>
                        <Text
                          style={[
                            styles.dayHeading,
                            { color: colors.textMuted },
                          ]}
                        >
                          {day === 'Unknown date'
                            ? day
                            : formatDateIST(day)}
                        </Text>
                        {items.map((line, idx) => (
                          <View
                            key={line._id ?? `${day}-${idx}`}
                            style={[
                              styles.lineCard,
                              {
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.lineTop}>
                              <View style={styles.lineTitleBlock}>
                                <Text
                                  style={[
                                    styles.lineType,
                                    { color: colors.textPrimary },
                                  ]}
                                >
                                  {line.expense_type || 'Expense'}
                                </Text>
                                {line.description ? (
                                  <Text
                                    style={[
                                      styles.lineDesc,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    {line.description}
                                  </Text>
                                ) : null}
                              </View>
                              <Text
                                style={[
                                  styles.lineAmount,
                                  { color: colors.primary },
                                ]}
                              >
                                ₹{Number(line.amount ?? 0).toFixed(2)}
                              </Text>
                            </View>
                            {line.cost_center ? (
                              <Text
                                style={[
                                  styles.lineMeta,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {line.cost_center}
                              </Text>
                            ) : null}
                            {line.file ? (
                              <Pressable
                                onPress={() => openAttachment(line.file!)}
                                style={[
                                  styles.attachBtn,
                                  {
                                    backgroundColor: colors.backgroundTertiary,
                                    borderColor: colors.border,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="attach-outline"
                                  size={16}
                                  color={colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.attachText,
                                    { color: colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {fileLabel(line.file)}
                                </Text>
                                <Ionicons
                                  name="chevron-forward"
                                  size={14}
                                  color={colors.textMuted}
                                />
                              </Pressable>
                            ) : (
                              <Text
                                style={[
                                  styles.lineMeta,
                                  { color: colors.textMuted },
                                ]}
                              >
                                No attachment
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ),
                  )
                )}

                <View
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.activityCardHeader}>
                    <Text
                      style={[
                        styles.sectionHeading,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Activity
                    </Text>
                    <Text
                      style={[styles.sectionCount, { color: colors.textMuted }]}
                    >
                      {viewClaim.last_activity?.length ?? 0}
                    </Text>
                  </View>

                  {(viewClaim.last_activity?.length ?? 0) === 0 ? (
                    <Text
                      style={[
                        styles.activityEmpty,
                        { color: colors.textMuted },
                      ]}
                    >
                      No activity yet
                    </Text>
                  ) : (
                    <ScrollView
                      style={styles.activityScroll}
                      contentContainerStyle={styles.activityScrollContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    >
                      {[...(viewClaim.last_activity ?? [])]
                        .slice()
                        .reverse()
                        .map((act, i) => {
                          const avatar = resolveProfileImageUri(
                            act.profile_image,
                          );
                          return (
                            <View
                              key={`${act.email ?? act.name ?? 'a'}-${i}`}
                              style={[
                                styles.activityRow,
                                {
                                  backgroundColor: colors.backgroundTertiary,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              {avatar ? (
                                <Image
                                  source={{ uri: avatar }}
                                  style={styles.avatar}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.avatarFallback,
                                    {
                                      backgroundColor:
                                        colors.backgroundSecondary,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name="person"
                                    size={14}
                                    color={colors.textMuted}
                                  />
                                </View>
                              )}
                              <View style={styles.activityBody}>
                                <ActivityDetailsText
                                  html={act.details || act.name || 'Activity'}
                                />
                                <Text
                                  style={[
                                    styles.activityMeta,
                                    { color: colors.textMuted },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {[
                                    act.name || act.email,
                                    act.timestamp
                                      ? `${formatRelativeTime(act.timestamp)} · ${formatDateTimeIST(act.timestamp)}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
            ) : null}

            <Button title="Close" onPress={() => setViewClaim(null)} fullWidth />
          </View>
        </View>
      </Modal>

      <ExpenseAttachmentModal
        url={attachmentUrl}
        onClose={() => setAttachmentUrl(null)}
      />

      {/* Approve */}
      <Modal
        visible={approveClaim != null}
        transparent
        animationType="fade"
        onRequestClose={() => setApproveClaim(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setApproveClaim(null)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Approve {approveClaim?.name || ''}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Enter remark before approving
            </Text>
            <TextInput
              value={remark}
              onChangeText={setRemark}
              placeholder="Enter remark..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                style={styles.modalBtn}
                onPress={() => setApproveClaim(null)}
              />
              <Button
                title={approvingId ? 'Approving...' : 'Approve'}
                size="sm"
                style={styles.modalBtn}
                loading={Boolean(approvingId)}
                disabled={Boolean(approvingId)}
                onPress={() => void submitApprove()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete */}
      <Modal
        visible={deleteClaim != null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteClaim(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDeleteClaim(null)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Delete expense
            </Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '700' }}>
                {deleteClaim?.name || deleteClaim?._id}
              </Text>
              ?
            </Text>
            <TextInput
              value={deleteReason}
              onChangeText={setDeleteReason}
              placeholder="Reason for deletion..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundTertiary,
                  borderColor: colors.border,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                style={styles.modalBtn}
                disabled={deleting}
                onPress={() => setDeleteClaim(null)}
              />
              <Button
                title={deleting ? 'Deleting...' : 'Delete'}
                size="sm"
                style={styles.modalBtn}
                loading={deleting}
                disabled={deleting}
                onPress={() => void submitDelete()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  searchInput: { flex: 1, ...typography.bodySmall, paddingVertical: 8 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', gap: spacing.sm },
  serial: { ...typography.caption, fontSize: 11, marginTop: 2 },
  cardTitleBlock: { flex: 1, gap: 6 },
  claimId: { ...typography.label, fontSize: 15, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { ...typography.bodySmall },
  amount: { ...typography.label, fontSize: 14, fontWeight: '700' },
  created: { ...typography.caption, fontSize: 11 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  pageLabel: { ...typography.caption },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
    overflow: 'hidden',
  },
  viewSheet: {
    maxHeight: '92%',
    height: '88%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  viewScroll: {
    flex: 1,
  },
  viewScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  viewLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  viewError: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  summaryAmountCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  summaryLabel: { ...typography.caption, fontSize: 11 },
  summaryAmount: {
    ...typography.label,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryBadges: {
    justifyContent: 'center',
    gap: spacing.xs,
    maxWidth: '42%',
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  metaRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: { ...typography.caption, fontSize: 11 },
  emptyLines: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  dayGroup: { gap: spacing.sm },
  dayHeading: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lineCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lineTitleBlock: { flex: 1, gap: 2 },
  lineType: { ...typography.label, fontSize: 14, fontWeight: '700' },
  lineAmount: { ...typography.label, fontSize: 15, fontWeight: '700' },
  lineDesc: { ...typography.bodySmall },
  lineMeta: { ...typography.caption, fontSize: 11 },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  attachText: { ...typography.caption, fontSize: 12, flex: 1 },
  activityCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  activityScroll: {
    maxHeight: 220,
  },
  activityScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  activityEmpty: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: { flex: 1, gap: 2 },
  activityDetails: { ...typography.bodySmall, lineHeight: 18 },
  activityMeta: { ...typography.caption, fontSize: 11 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modalHeaderText: { flex: 1, gap: 2 },
  modalEyebrow: {
    ...typography.caption,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalTitle: { ...typography.label, fontSize: 17, fontWeight: '700' },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHint: { ...typography.bodySmall },
  modalInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1 },
  viewLabel: { ...typography.caption, fontSize: 11 },
  viewValue: { ...typography.bodySmall, fontWeight: '600' },
});
