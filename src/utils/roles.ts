const ATTENDANCE_ROLES = new Set([
  "Site Technician",
  "Opex Site Technician",
]);

export function canAccessAttendance(role?: string): boolean {
  return role != null && ATTENDANCE_ROLES.has(role);
}
