const ATTENDANCE_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
]);

const TIMER_RESTRICTED_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
  "Client Admin",
]);

export function canAccessAttendance(role?: string): boolean {
  return role != null && ATTENDANCE_ROLES.has(role);
}

export function canSubmitDpr(role?: string): boolean {
  return canAccessAttendance(role);
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
