import { apiFetch } from './client';
import type {
  CreateExpenseClaimPayload,
  ExpenseClaim,
  ExpenseClaimActivity,
  ExpenseClaimLineItem,
  ExpenseClaimsPageResult,
} from '../types/expenseClaims';
import {
  coerceExpenseDate,
  coerceExpenseId,
} from '../types/expenseClaims';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);
    throw new Error(
      `Invalid response from server (${response.status})${snippet ? `: ${snippet}` : ''}`,
    );
  }
}

function throwApiError(payload: unknown, fallback: string): never {
  const errorPayload = isRecord(payload) ? payload : {};
  throw new Error(
    String(errorPayload.message ?? errorPayload.error ?? fallback),
  );
}

function asActivity(value: unknown): ExpenseClaimActivity | null {
  if (!isRecord(value)) return null;
  return {
    name: typeof value.name === 'string' ? value.name : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
    profile_image:
      typeof value.profile_image === 'string'
        ? value.profile_image
        : undefined,
    details: typeof value.details === 'string' ? value.details : undefined,
    timestamp: coerceExpenseDate(value.timestamp) ?? (
      typeof value.timestamp === 'string' ? value.timestamp : undefined
    ),
    userId:
      coerceExpenseId(value.userId) ??
      (typeof value.userId === 'string' ? value.userId : undefined),
    role: typeof value.role === 'string' ? value.role : undefined,
  };
}

function asLineItem(value: unknown): ExpenseClaimLineItem | null {
  if (!isRecord(value)) return null;
  return {
    ...value,
    _id:
      coerceExpenseId(value._id) ??
      (typeof value.name === 'string' ? value.name : undefined),
    expense_date: coerceExpenseDate(value.expense_date),
    expense_type:
      typeof value.expense_type === 'string' ? value.expense_type : undefined,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    amount:
      typeof value.amount === 'number'
        ? value.amount
        : Number(value.amount) || undefined,
    sanctioned_amount:
      typeof value.sanctioned_amount === 'number'
        ? value.sanctioned_amount
        : Number(value.sanctioned_amount) || undefined,
    file:
      typeof value.file === 'string'
        ? value.file
        : typeof value.attachment === 'string'
          ? value.attachment
          : undefined,
    cost_center:
      typeof value.cost_center === 'string' ? value.cost_center : undefined,
  };
}

function asClaim(value: unknown): ExpenseClaim | null {
  if (!isRecord(value)) return null;
  const id = coerceExpenseId(value._id);
  if (!id) return null;

  const expenses = Array.isArray(value.expenses)
    ? value.expenses
        .map(asLineItem)
        .filter((item): item is ExpenseClaimLineItem => item != null)
    : undefined;

  const last_activity = Array.isArray(value.last_activity)
    ? value.last_activity
        .map(asActivity)
        .filter((item): item is ExpenseClaimActivity => item != null)
    : undefined;

  return {
    ...value,
    _id: id,
    name: typeof value.name === 'string' ? value.name : undefined,
    department_of_visit:
      typeof value.department_of_visit === 'string'
        ? value.department_of_visit
        : undefined,
    posting_date: coerceExpenseDate(value.posting_date),
    employee_name:
      typeof value.employee_name === 'string' ? value.employee_name : undefined,
    department:
      typeof value.department === 'string' ? value.department : undefined,
    employee: typeof value.employee === 'string' ? value.employee : undefined,
    remark: typeof value.remark === 'string' ? value.remark : undefined,
    grand_total:
      typeof value.grand_total === 'number'
        ? value.grand_total
        : Number(value.grand_total) || undefined,
    total_claimed_amount:
      typeof value.total_claimed_amount === 'number'
        ? value.total_claimed_amount
        : Number(value.total_claimed_amount) || undefined,
    total_sanctioned_amount:
      typeof value.total_sanctioned_amount === 'number'
        ? value.total_sanctioned_amount
        : Number(value.total_sanctioned_amount) || undefined,
    console_status:
      typeof value.console_status === 'string'
        ? value.console_status
        : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
    can_technician_edit: Boolean(value.can_technician_edit),
    expenses,
    last_activity,
    createdAt: coerceExpenseDate(value.createdAt),
  };
}

function emptyPage(page: number, limit: number): ExpenseClaimsPageResult {
  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

export async function createExpenseClaim(
  data: CreateExpenseClaimPayload,
): Promise<{ message?: string }> {
  const response = await apiFetch('/expenseclaims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to create expense claim');
  }

  if (isRecord(payload)) {
    return {
      message:
        typeof payload.message === 'string' ? payload.message : undefined,
    };
  }

  return {};
}

export async function updateExpenseClaim(
  id: string,
  data: Record<string, unknown>,
): Promise<{ message?: string }> {
  const response = await apiFetch(
    `/expenseclaims/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to update expense claim');
  }

  if (isRecord(payload)) {
    return {
      message:
        typeof payload.message === 'string' ? payload.message : undefined,
    };
  }

  return {};
}

export async function fetchExpenseClaims(params: {
  page: number;
  limit?: number;
}): Promise<ExpenseClaimsPageResult> {
  const limit = params.limit ?? 10;
  const page = params.page;

  const response = await apiFetch('/expenseclaims/get-expense-claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pg: page, limit }),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load expense claims');
  }

  // Web shape: { data: { data, total, limit, hasNextPage, hasPrevPage } }
  const root = isRecord(payload) ? payload : {};
  const nested = isRecord(root.data) ? root.data : root;

  const rawList = Array.isArray(nested.data)
    ? nested.data
    : Array.isArray(root.data)
      ? root.data
      : [];

  const data = rawList
    .map(asClaim)
    .filter((item): item is ExpenseClaim => item != null);

  const total = Number(nested.total ?? data.length) || data.length;
  const resolvedLimit = Number(nested.limit ?? limit) || limit;
  const totalPages = Math.max(1, Math.ceil(total / resolvedLimit) || 1);

  if (!data.length && !total) {
    return emptyPage(page, resolvedLimit);
  }

  return {
    data,
    total,
    page,
    limit: resolvedLimit,
    totalPages,
    hasNextPage: Boolean(nested.hasNextPage ?? page < totalPages),
    hasPrevPage: Boolean(nested.hasPrevPage ?? page > 1),
  };
}

export async function fetchExpenseClaim(id: string): Promise<ExpenseClaim> {
  const response = await apiFetch(`/expenseclaims/${encodeURIComponent(id)}`);
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load expense claim');
  }

  // Common shapes: { data: claim }, { data: { data: claim } }, claim root
  if (isRecord(payload)) {
    if (payload.data != null) {
      const nested = payload.data;
      if (isRecord(nested) && nested.data != null) {
        const claim = asClaim(nested.data);
        if (claim) return claim;
      }
      const claim = asClaim(nested);
      if (claim) return claim;
    }
  }

  const claim = asClaim(payload);
  if (claim) return claim;

  throw new Error('Expense claim not found');
}

export async function approveExpenseClaim(
  id: string,
  remark: string,
): Promise<string | undefined> {
  const response = await apiFetch(
    `/expenseclaims/approve/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ console_status: 'Approved', remark }),
    },
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to approve expense claim');
  }

  if (
    isRecord(payload) &&
    isRecord(payload.frappe_response) &&
    isRecord(payload.frappe_response.data) &&
    typeof payload.frappe_response.data.name === 'string'
  ) {
    return payload.frappe_response.data.name;
  }

  return typeof (payload as { message?: string })?.message === 'string'
    ? (payload as { message: string }).message
    : undefined;
}

export async function deleteExpenseClaim(
  id: string,
  reason: string,
): Promise<string | undefined> {
  const response = await apiFetch(
    `/expenseclaims/delete-expense/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to delete expense claim');
  }

  return isRecord(payload) && typeof payload.message === 'string'
    ? payload.message
    : undefined;
}
