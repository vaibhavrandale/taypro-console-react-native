import type { TechnicianDprRecord } from '../types/technicianDpr';

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDprReportDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start_date: toDateInputValue(start),
    end_date: toDateInputValue(end),
  };
}

export function getPreviousMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start_date: toDateInputValue(start),
    end_date: toDateInputValue(end),
  };
}

export function flattenDprGroups(
  groups: { dprs: TechnicianDprRecord[] }[],
): TechnicianDprRecord[] {
  return groups
    .flatMap((group) => group.dprs)
    .sort((a, b) => {
      const aTime = new Date(a.new_report_date ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.new_report_date ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
}

export function getDprSubmitter(record: TechnicianDprRecord) {
  return record.last_activity?.[0] ?? record.technician_present?.[0];
}

export function getDprSubmittedBy(record: TechnicianDprRecord) {
  const submitter = getDprSubmitter(record);
  return submitter?.name ?? submitter?.email ?? 'Unknown';
}

export function formatTechnicianNames(
  technicians?: { name?: string }[],
) {
  if (!technicians?.length) return '—';
  return technicians
    .map((tech) => tech.name)
    .filter(Boolean)
    .join(', ');
}
