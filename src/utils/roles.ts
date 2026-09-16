const ATTENDANCE_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
]);

const TIMER_RESTRICTED_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
  "Client Admin",
]);

const EXPENSE_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
  "Master Admin",
  "Service Admin",
  "Project Admin",
  "Master User",
  "Service User",
  "Project User",
]);

const EXPENSE_ADMIN_ROLES = new Set([
  "Master Admin",
  "Service Admin",
  "Project Admin",
]);

const EXPENSE_READ_ONLY_USER_ROLES = new Set([
  "Master User",
  "Service User",
  "Project User",
]);

/** Pricing, My Subscription, and yellow subscription gems — Client Admin only. */
export function canAccessSubscriptionPages(role?: string): boolean {
  return role === "Client Admin";
}

/** Analytics / Statistics — Client Admin only (web /client-admin/statistics). */
export function canAccessAnalytics(role?: string): boolean {
  return role === "Client Admin";
}

export function canAccessAttendance(role?: string): boolean {
  return role != null && ATTENDANCE_ROLES.has(role);
}

export function canSubmitDpr(role?: string): boolean {
  return canAccessAttendance(role);
}

/** Site / Opex technicians and Client Admin can open the PM dashboard. */
export function canAccessPreventiveMaintenance(role?: string): boolean {
  return canAccessAttendance(role) || role === "Client Admin";
}

/** Client Admin may view PM records only — no create/edit. */
export function canMutatePreventiveMaintenance(role?: string): boolean {
  return canAccessAttendance(role);
}

/** Client Tickets (support tickets) — Client Admin only. */
export function canAccessClientTickets(role?: string): boolean {
  return role === "Client Admin";
}

/** Manage external users — Client Admin only (web /client-admin/external-users). */
export function canManageExternalUsers(role?: string): boolean {
  return role === "Client Admin";
}

/** Client Admin has no service-ticket feature. */
export function canAccessServiceTickets(role?: string): boolean {
  return role != null && role !== "Client Admin";
}

/** Service Inventory sidebar entry — Site Technician only. */
export function canAccessServiceInventory(role?: string): boolean {
  return role === "Site Technician";
}

export function canAccessExpenses(role?: string): boolean {
  return role != null && EXPENSE_ROLES.has(role);
}

export function canApproveOrDeleteExpenses(role?: string): boolean {
  return role != null && EXPENSE_ADMIN_ROLES.has(role);
}

/** Read-only console users cannot update expense claims. */
export function canUpdateExpenseClaim(
  role: string | undefined,
  canTechnicianEdit?: boolean,
): boolean {
  if (!role) return false;
  if (EXPENSE_READ_ONLY_USER_ROLES.has(role)) return false;
  if (role === "Site Technician" || role === "Opex Site Technician") {
    return Boolean(canTechnicianEdit);
  }
  return true;
}

/** Site techs / client admins cannot bulk-toggle timer edit permission. */
export function canBulkToggleTimers(role?: string): boolean {
  return role != null && !TIMER_RESTRICTED_ROLES.has(role);
}

/** Restricted roles can only update when the block flag allows it. */
export function canEditTimer(
  role: string | undefined,
  isAvailableToEdit?: boolean,
): boolean {
  if (!role) return false;
  if (!TIMER_RESTRICTED_ROLES.has(role)) return true;
  return Boolean(isAvailableToEdit);
}
