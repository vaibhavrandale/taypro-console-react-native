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
