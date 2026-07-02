import { API_BASE_URL } from '../config/api';
import { CleaningLogRecord, DprRecord } from '../types/cleaningLogs';
import { isRobotOnline } from './robot';

export function formatCleaningDuration(seconds?: number | null) {
  if (seconds == null || seconds <= 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatBatteryRange(
  before?: number | null,
  after?: number | null,
) {
  if (before == null && after == null) return '—';
  if (before != null && after != null) return `${before}% → ${after}%`;
  if (before != null) return `${before}%`;
  return `${after}%`;
}

export function formatLogDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCleaningNote(record: CleaningLogRecord) {
  if (record.comments) {
    return record.comments.replace(/^✅\s*/, '').trim();
  }
  if (record.cleaning?.cleaning_cancelled) return 'Cancelled';
  if (record.cleaning?.battery_dead) return 'Battery dead';
  if (record.cleaning?.finish) return 'Finished';
  if (record.cleaning?.start) return 'In Progress';
  return '—';
}

export function getCleaningPercentage(record: CleaningLogRecord) {
  const percentage =
    record.cleaning_percentage ??
    record.cleaning?.cleaning_percentage ??
    (record.cleaning?.finish ? 100 : null);

  if (percentage == null) return '—';
  return `${Math.round(percentage)}%`;
}

export function formatOnlineStatus(loraState?: number) {
  return isRobotOnline(loraState) ? 'Online' : 'Offline';
}

export function formatTechnicianNames(
  technicians?: Array<{ name?: string }>,
) {
  if (!technicians?.length) return '—';
  return technicians
    .map((tech) => tech.name)
    .filter(Boolean)
    .join(', ');
}

export function getDprTechnician(record: DprRecord) {
  return record.last_activity?.[0] ?? record.technician_present?.[0];
}

export function getDprTechnicianName(record: DprRecord) {
  return getDprTechnician(record)?.name ?? '—';
}

export function resolveProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const root = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${root}${path.startsWith('/') ? path : `/${path}`}`;
}

export function formatOperationalValue(value?: number | null) {
  if (value == null) return '—';
  return String(value);
}

export function formatDprDate(record: {
  new_report_date?: string;
  report_date?: string;
  createdAt?: string;
}) {
  return formatLogDateTime(
    record.new_report_date ?? record.report_date ?? record.createdAt,
  );
}

export function matchesCleaningSearch(
  query: string,
  values: Array<string | number | null | undefined>,
) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return values.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(normalized),
  );
}
