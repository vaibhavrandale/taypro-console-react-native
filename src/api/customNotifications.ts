import { apiFetch } from './client';
import type { CustomNotification } from '../types/customNotification';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid response from server');
  }
}

function extractError(payload: unknown, fallback: string) {
  const errorPayload = isRecord(payload) ? payload : {};
  return String(errorPayload.message ?? errorPayload.error ?? fallback);
}

function extractNotification(payload: unknown): CustomNotification | null {
  if (!isRecord(payload)) return null;

  const data = payload.data;
  if (!isRecord(data) || typeof data._id !== 'string') {
    return null;
  }

  return data as CustomNotification;
}

export async function fetchLatestUnreadNotification(): Promise<CustomNotification | null> {
  const response = await apiFetch('/customnotifications/active/latest/unread');
  const payload = await parseJson(response);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(extractError(payload, 'Failed to load notification'));
  }

  if (isRecord(payload) && payload.success === false) {
    return null;
  }

  return extractNotification(payload);
}

export async function markNotificationRead(
  notificationId: string,
  feedback?: string,
): Promise<string> {
  const body =
    feedback != null && feedback.trim() !== ''
      ? { feedback: feedback.trim() }
      : {};

  const response = await apiFetch(`/customnotifications/read/${notificationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to mark notification as read'));
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Notification marked as read';
}
