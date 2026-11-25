import { apiFetch } from './client';
import type { BlockTimer, UpdateTimerPayload } from '../types/timers';

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

export async function fetchTimers(siteId: string): Promise<BlockTimer[]> {
  const response = await apiFetch('/timers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load timers');
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as BlockTimer[];
  }

  return [];
}

export async function fetchTimerActivity(
  id: string,
  offset: number,
  limit = 10,
): Promise<{ last_activity: BlockTimer['last_activity']; activity_count: number }> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const response = await apiFetch(
    `/timers/${encodeURIComponent(id)}/activity?${params}`,
  );
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load timer activity');
  }

  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const last = data.last_activity;
  return {
    last_activity: Array.isArray(last) ? (last as BlockTimer['last_activity']) : [],
    activity_count: Number(data.activity_count) || 0,
  };
}

export async function fetchTimerById(id: string): Promise<BlockTimer> {
  const response = await apiFetch(`/timers/${encodeURIComponent(id)}`);
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load timer');
  }

  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as BlockTimer;
  }

  throw new Error('Timer not found');
}

export async function updateTimer(
  id: string,
  data: UpdateTimerPayload,
): Promise<void> {
  const response = await apiFetch(`/timers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to update timer');
  }
}

export async function bulkUpdateTimers(
  ids: string[],
  data: UpdateTimerPayload,
): Promise<{ message: string; skipped: number }> {
  const response = await apiFetch('/timers/bulk', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids,
      timer1: data.timer1,
      timer1_date: data.timer1_date,
      timer2: data.timer2,
      timer2_date: data.timer2_date,
      timer3: data.timer3,
      timer3_date: data.timer3_date,
      timer_command: data.timer_command || '11',
    }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Bulk timer update failed');
  }

  const root = isRecord(payload) ? payload : {};
  const skipped = Array.isArray(root.skipped) ? root.skipped.length : 0;
  return {
    message: String(root.message ?? 'Timers updated successfully.'),
    skipped,
  };
}

export async function bulkToggleTimerPermission(
  ids: string[],
): Promise<BlockTimer[]> {
  const response = await apiFetch('/timers/enable-disable/edit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Bulk update failed');
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as BlockTimer[];
  }

  return [];
}
