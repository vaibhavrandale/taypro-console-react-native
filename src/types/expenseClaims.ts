export type CreateExpenseClaimLineItem = {
  expense_date: string;
  cost_center: string;
  expense_type: string;
  description: string;
  amount: number;
  sanctioned_amount: number;
  default_account: string;
  file?: string;
  attachment?: string;
  docstatus?: number;
  doctype?: string;
  __islocal?: number;
  __unsaved?: number;
  owner?: string;
  name?: string;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
};

export type CreateExpenseClaimPayload = {
  company: string;
  naming_series: string;
  name: string;
  posting_date: string;
  cost_center: string;
  payable_account: string;
  department: string;
  expense_approver: string;
  company_gstin: string;
  department_of_visit: string;
  employee: string;
  employee_name: string;
  owner: string;
  docstatus: number;
  doctype: string;
  __islocal: number;
  __unsaved: number;
  approval_status: string;
  status: string;
  workflow_state: string;
  console_status: string;
  is_paid: boolean;
  taxes: unknown[];
  advances: unknown[];
  remark: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  grand_total: number;
  expenses: CreateExpenseClaimLineItem[];
};

export type ExpenseClaimLineItem = {
  _id?: string;
  expense_date?: string;
  expense_type?: string;
  description?: string;
  amount?: number;
  sanctioned_amount?: number;
  file?: string;
  cost_center?: string;
  [key: string]: unknown;
};

export type ExpenseClaimActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  details?: string;
  timestamp?: string;
  userId?: string;
  role?: string;
};

export type ExpenseClaim = {
  _id: string;
  name?: string;
  department_of_visit?: string;
  posting_date?: string;
  employee_name?: string;
  department?: string;
  employee?: string;
  remark?: string;
  grand_total?: number;
  total_claimed_amount?: number;
  total_sanctioned_amount?: number;
  console_status?: string;
  status?: string;
  can_technician_edit?: boolean;
  expenses?: ExpenseClaimLineItem[];
  last_activity?: ExpenseClaimActivity[];
  createdAt?: string;
  [key: string]: unknown;
};

export type ExpenseClaimsPageResult = {
  data: ExpenseClaim[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/** Normalize Mongo extended JSON / ISO dates to a string. */
export function coerceExpenseDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const raw = (value as { $date: unknown }).$date;
    if (typeof raw === 'string' || typeof raw === 'number') {
      return new Date(raw).toISOString();
    }
  }
  return undefined;
}

export function coerceExpenseId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '$oid' in value) {
    const oid = (value as { $oid: unknown }).$oid;
    return typeof oid === 'string' ? oid : undefined;
  }
  return undefined;
}
