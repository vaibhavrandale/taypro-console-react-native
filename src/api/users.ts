import { apiFetch } from './client';
import { User } from '../types/auth';

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

function extractUser(payload: unknown): User {
  if (!isRecord(payload)) {
    throw new Error('Invalid user response');
  }

  const data = payload.data;
  if (isRecord(data) && typeof data._id === 'string') {
    return data as User;
  }
  if (typeof payload._id === 'string') {
    return payload as User;
  }

  throw new Error('User data not found in response');
}

export async function fetchUserById(userId: string): Promise<User> {
  const response = await apiFetch(`/users/${userId}`);
  const payload = await parseJson(response);

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(errorPayload.message ?? errorPayload.error ?? 'Failed to load profile'),
    );
  }

  return extractUser(payload);
}

export async function saveUserImage(userId: string, imageUrl: string): Promise<string> {
  const response = await apiFetch('/users/save-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, image: imageUrl }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(errorPayload.error ?? errorPayload.message ?? 'Failed to save image'),
    );
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Photo saved successfully';
}
