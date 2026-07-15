import { apiFetch } from './client';
import type { TimerExecutionNotification } from '../types/timerExecutionNotification';

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

function isNotFound(payload: unknown) {
  const message = extractError(payload, '');
  return (
    message === 'Timer Execution Notifications Not Found' ||
    /not found/i.test(message)
  );
}

export async function fetchTimerExecutionNotifications(
  userId: string,
): Promise<TimerExecutionNotification[]> {
  const response = await apiFetch(
    `/timerexecutionnotifications/get-by-userId/${encodeURIComponent(userId)}`,
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    if (response.status === 404 || isNotFound(payload)) {
      return [];
    }
    throw new Error(extractError(payload, 'Failed to load timer notifications'));
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as TimerExecutionNotification[];
  }

  return [];
}

export async function markAllTimerNotificationsRead(
  ids: string[],
): Promise<string> {
  const response = await apiFetch(
    '/timerexecutionnotifications/mark-allnotification/as-read',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allUnreadTmerNotifications: ids }),
    },
  );

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(
      extractError(payload, 'Failed to mark timer notifications as read'),
    );
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Timer notifications marked as read';
}
