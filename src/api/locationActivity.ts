import { apiFetch } from './client';
import type {
  LocationActivityBatchResponse,
  LocationActivityPoint,
} from '../types/locationActivity';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server (${response.status})`);
  }
}

function throwApiError(payload: unknown, fallback: string): never {
  const errorPayload = isRecord(payload) ? payload : {};
  throw new Error(
    String(errorPayload.message ?? errorPayload.error ?? fallback),
  );
}

export async function uploadLocationActivityBatch(
  points: LocationActivityPoint[],
): Promise<LocationActivityBatchResponse> {
  const response = await apiFetch('/technician-user-location-activity/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to upload location activity');
  }

  return isRecord(payload)
    ? (payload as LocationActivityBatchResponse)
    : { success: true };
}

export async function uploadLocationActivityPoint(
  point: LocationActivityPoint,
): Promise<void> {
  const response = await apiFetch('/technician-user-location-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(point),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to upload location activity');
  }
}
