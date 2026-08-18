import { apiFetch } from './client';
import type { VoiceCall, VoiceCallContact } from '../types/voiceCall';

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

function asCall(payload: unknown): VoiceCall {
  if (!isRecord(payload) || typeof payload._id !== 'string') {
    throw new Error('Invalid call payload');
  }
  return payload as VoiceCall;
}

async function callAction(
  path: string,
  options: RequestInit = {},
  fallback: string,
): Promise<VoiceCall> {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractError(payload, fallback));
  }
  if (!isRecord(payload) || !payload.data) {
    throw new Error(fallback);
  }
  return asCall(payload.data);
}

export async function startVoiceCall(calleeId: string): Promise<VoiceCall> {
  return callAction(
    '/calls',
    {
      method: 'POST',
      body: JSON.stringify({ callee_id: calleeId }),
    },
    'Failed to start call',
  );
}

export async function fetchVoiceCall(callId: string): Promise<VoiceCall> {
  return callAction(`/calls/${callId}`, { method: 'GET' }, 'Failed to load call');
}

export async function fetchVoiceCallHistory(limit = 50): Promise<VoiceCall[]> {
  const response = await apiFetch(`/calls?limit=${limit}`);
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load call history'));
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  return payload.data.map(asCall);
}

export async function acceptVoiceCall(callId: string): Promise<VoiceCall> {
  return callAction(
    `/calls/${callId}/accept`,
    { method: 'POST', body: '{}' },
    'Failed to accept call',
  );
}

export async function rejectVoiceCall(callId: string): Promise<VoiceCall> {
  return callAction(
    `/calls/${callId}/reject`,
    { method: 'POST', body: '{}' },
    'Failed to reject call',
  );
}

export async function endVoiceCall(callId: string): Promise<VoiceCall> {
  return callAction(
    `/calls/${callId}/end`,
    { method: 'POST', body: '{}' },
    'Failed to end call',
  );
}

export async function registerPushToken(token: string): Promise<void> {
  const response = await apiFetch('/calls/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const payload = await parseJson(response);
    throw new Error(extractError(payload, 'Failed to register push token'));
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  const response = await apiFetch('/calls/push-token', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const payload = await parseJson(response);
    throw new Error(extractError(payload, 'Failed to remove push token'));
  }
}

export async function fetchCallContacts(): Promise<VoiceCallContact[]> {
  const response = await apiFetch('/users/get-all-internal-users-without-pg');
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load contacts'));
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }
  return payload.data
    .filter(isRecord)
    .map((row) => ({
      _id: String(row._id ?? ''),
      username: String(row.username ?? 'User'),
      email: typeof row.email === 'string' ? row.email : undefined,
      role: typeof row.role === 'string' ? row.role : undefined,
      profile_image:
        typeof row.profile_image === 'string' ? row.profile_image : undefined,
      department:
        typeof row.department === 'string' ? row.department : undefined,
      designation:
        typeof row.designation === 'string' ? row.designation : undefined,
    }))
    .filter((row) => row._id.length > 0);
}
