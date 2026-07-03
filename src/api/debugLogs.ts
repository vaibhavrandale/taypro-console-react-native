import { apiFetch } from './client';
import { DebugLogsParams, DebugLogsResult } from '../types/debugLogs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isNotFoundMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not found') ||
    normalized.includes('no found') ||
    normalized.includes('no logs')
  );
}

function emptyResult(page: number, limit: number): DebugLogsResult {
  return {
    logs: [],
    total: 0,
    page,
    limit,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

function normalizeResponse(
  payload: unknown,
  page: number,
  limit: number,
): DebugLogsResult {
  if (!isRecord(payload)) {
    return emptyResult(page, limit);
  }

  const message = typeof payload.message === 'string' ? payload.message : '';

  if (payload.success === false) {
    if (isNotFoundMessage(message)) {
      return emptyResult(page, limit);
    }
    throw new Error(message || 'Failed to load debug logs');
  }

  const logs = asArray(payload.data);

  return {
    logs,
    total: Number(payload.total ?? logs.length) || 0,
    page: Number(payload.page ?? page) || page,
    limit: Number(payload.limit ?? limit) || limit,
    hasNextPage: Boolean(payload.hasNextPage),
    hasPrevPage: Boolean(payload.hasPrevPage),
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    const message = String(
      errorPayload.message ??
        errorPayload.error ??
        `Request failed (${response.status})`,
    );

    if (response.status === 404 || isNotFoundMessage(message)) {
      return { success: true, data: [], total: 0, page: 1, limit: 10 };
    }

    throw new Error(message);
  }

  return payload;
}

export async function fetchDebugLogs(
  params: DebugLogsParams,
): Promise<DebugLogsResult> {
  const limit = params.limit ?? 10;
  const body = {
    limit,
    pg: params.page,
    robot_no: params.robotNo,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const response = await apiFetch('/debuglogs/get-debug-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await parseJson(response);
  return normalizeResponse(payload, params.page, limit);
}
