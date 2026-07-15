export function formatDateTimeIST(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Relative time like "3 hours ago". Manual — Intl.RelativeTimeFormat missing on some Android/RN builds. */
export function formatRelativeTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  const past = diffSec >= 0;
  const abs = Math.abs(diffSec);

  const pick = (n: number, unit: string) => {
    const label = n === 1 ? unit : `${unit}s`;
    return past ? `${n} ${label} ago` : `in ${n} ${label}`;
  };

  if (abs < 60) return past ? 'just now' : 'in a moment';
  if (abs < 3600) return pick(Math.round(abs / 60), 'minute');
  if (abs < 86400) return pick(Math.round(abs / 3600), 'hour');
  if (abs < 604800) return pick(Math.round(abs / 86400), 'day');
  if (abs < 2592000) return pick(Math.round(abs / 604800), 'week');
  if (abs < 31536000) return pick(Math.round(abs / 2592000), 'month');
  return pick(Math.round(abs / 31536000), 'year');
}

export function formatDateIST(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toApiDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultRawLogsDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: toApiDateString(start),
    endDate: toApiDateString(end),
  };
}

export function formatApiDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
