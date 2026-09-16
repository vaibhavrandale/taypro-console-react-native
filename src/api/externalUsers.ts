import { apiFetch } from './client';
import type {
  AssignableSite,
  CreateExternalUserPayload,
  ExternalUser,
  ExternalUsersPageResult,
  UpdateExternalUserPayload,
} from '../types/externalUsers';

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
  const rec = isRecord(payload) ? payload : {};
  throw new Error(String(rec.message ?? rec.error ?? fallback));
}

export async function fetchExternalUsers(params: {
  page: number;
  limit: number;
}): Promise<ExternalUsersPageResult> {
  const { page, limit } = params;
  const response = await apiFetch('/users/get-external-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pg: page, limit }),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load users');
  }

  const rec = isRecord(payload) ? payload : {};
  const data = Array.isArray(rec.data) ? (rec.data as ExternalUser[]) : [];
  const total = Number(rec.total ?? rec.totalCount ?? data.length) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return {
    data,
    total,
    page: Number(rec.page) || page,
    limit: Number(rec.limit) || limit,
    totalPages,
    hasNextPage: Boolean(rec.hasNextPage),
    hasPrevPage: Boolean(rec.hasPrevPage),
  };
}

export async function fetchAssignableSites(): Promise<AssignableSite[]> {
  const response = await apiFetch('/sites');
  const payload = await parseJson(response);
  if (!response.ok) {
    const rec = isRecord(payload) ? payload : {};
    const message = String(rec.message ?? rec.error ?? '');
    if (/sites not found/i.test(message) || response.status === 404) {
      return [];
    }
    throwApiError(payload, 'Failed to load sites');
  }

  const rec = isRecord(payload) ? payload : {};
  const rows = Array.isArray(rec.data) ? rec.data : [];
  return rows.filter((row): row is AssignableSite => {
    if (!isRecord(row)) return false;
    return (
      typeof row._id === 'string' &&
      typeof row.site_id === 'string' &&
      row.site_id !== 'all'
    );
  });
}

export async function createExternalUser(
  data: CreateExternalUserPayload,
): Promise<ExternalUser> {
  const response = await apiFetch('/users/create-external-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to create user');
  }

  const rec = isRecord(payload) ? payload : {};
  const nested = isRecord(rec.data) ? rec.data : rec;
  if (isRecord(nested.user) && typeof nested.user._id === 'string') {
    return nested.user as ExternalUser;
  }
  if (typeof nested._id === 'string') {
    return nested as ExternalUser;
  }
  throw new Error('User created but response was invalid');
}

export async function updateExternalUser(
  id: string,
  data: UpdateExternalUserPayload,
): Promise<ExternalUser> {
  const response = await apiFetch(`/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to update user');
  }

  const rec = isRecord(payload) ? payload : {};
  if (isRecord(rec.data) && typeof rec.data._id === 'string') {
    return rec.data as ExternalUser;
  }
  throw new Error('User updated but response was invalid');
}
