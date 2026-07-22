import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import {
  isSessionExpiredPayload,
  notifySessionExpired,
} from '../utils/sessionExpiry';

const TOKEN_STORAGE_KEY = 'taypro_auth_token';

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

async function checkSessionExpired(response: Response): Promise<void> {
  if (response.status === 401) {
    notifySessionExpired();
    return;
  }

  if (response.ok) return;

  try {
    const payload: unknown = await response.clone().json();
    if (isSessionExpiredPayload(payload)) {
      notifySessionExpired();
    }
  } catch {
    // Non-JSON error body — ignore.
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    // Avoid stale server session cookies overriding the Bearer JWT.
    credentials: 'omit',
  });

  await checkSessionExpired(response);
  return response;
}
