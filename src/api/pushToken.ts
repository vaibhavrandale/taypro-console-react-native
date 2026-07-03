import { Platform } from 'react-native';
import { apiFetch } from './client';

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

export async function savePushToken(expoPushToken: string): Promise<void> {
  const response = await apiFetch('/users/save-push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expo_push_token: expoPushToken,
      platform: Platform.OS,
    }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(
        errorPayload.message ??
          errorPayload.error ??
          'Failed to save push notification token',
      ),
    );
  }
}

export async function removePushToken(expoPushToken: string): Promise<void> {
  const response = await apiFetch('/users/remove-push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expo_push_token: expoPushToken,
    }),
  });

  if (!response.ok) {
    await parseJson(response);
  }
}
