import { apiFetch } from './client';
import { PunchStatus, UserAttendanceResult } from '../types/attendance';
import type { AttendanceRecord } from '../types/attendance';

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

function normalizePunchStatus(payload: unknown): PunchStatus {
  if (!isRecord(payload)) {
    return { punchedIn: false, punchedOut: false, data: null };
  }

  // Support { punchedIn, punchedOut, data } or { success, data: { punchedIn, ... } }
  const body =
    isRecord(payload.data) &&
    ('punchedIn' in payload.data || 'punchedOut' in payload.data)
      ? payload.data
      : payload;

  const record =
    isRecord(body.data) && typeof body.data._id === 'string'
      ? (body.data as PunchStatus['data'])
      : null;

  const punchedIn = Boolean(body.punchedIn) && Boolean(record);
  const punchedOut = Boolean(body.punchedOut) && Boolean(record);

  return {
    punchedIn,
    punchedOut: punchedIn ? punchedOut : false,
    data: record,
  };
}

function asAttendanceRecords(value: unknown): AttendanceRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is AttendanceRecord =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as AttendanceRecord)._id === 'string',
  );
}

function emptyAttendanceResult(page: number, limit: number): UserAttendanceResult {
  return {
    records: [],
    total: 0,
    page,
    limit,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

function normalizeUserAttendance(
  payload: unknown,
  page: number,
  limit: number,
): UserAttendanceResult {
  if (!isRecord(payload)) {
    return emptyAttendanceResult(page, limit);
  }

  if (payload.success === false) {
    throw new Error(
      extractError(payload, 'Failed to load attendance history'),
    );
  }

  const records = asAttendanceRecords(payload.data);

  return {
    records,
    total: Number(payload.total ?? records.length) || 0,
    page: Number(payload.page ?? page) || page,
    limit: Number(payload.limit ?? limit) || limit,
    hasNextPage: Boolean(payload.hasNextPage),
    hasPrevPage: Boolean(payload.hasPrevPage),
  };
}

export async function fetchUserAttendance(params: {
  page: number;
  limit?: number;
}): Promise<UserAttendanceResult> {
  const limit = params.limit ?? 10;
  const response = await apiFetch('/technician-attendance/get-user-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit, pg: params.page }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load attendance history'));
  }

  return normalizeUserAttendance(payload, params.page, limit);
}

export async function fetchPunchStatus(expectedUserId: string): Promise<PunchStatus> {
  const response = await apiFetch('/technician-attendance/punchstatus');
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load punch status'));
  }

  const normalized = normalizePunchStatus(payload);

  if (
    normalized.data &&
    normalized.data.user_id &&
    normalized.data.user_id !== expectedUserId
  ) {
    return { punchedIn: false, punchedOut: false, data: null };
  }

  return normalized;
}

export async function punchIn(params: {
  siteId: string;
  punchInImage: string;
  lat: number;
  lng: number;
}): Promise<string> {
  const response = await apiFetch('/technician-attendance/punchin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site_id: params.siteId,
      punch_in_image: params.punchInImage,
      punchin_location: {
        lat: params.lat,
        lng: params.lng,
      },
    }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractError(payload, 'Punch in failed'));
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Punched in successfully';
}

export async function punchOut(params: {
  punchOutImage: string;
  lat: number;
  lng: number;
}): Promise<string> {
  const response = await apiFetch('/technician-attendance/punchout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      punch_out_image: params.punchOutImage,
      punchout_location: {
        lat: params.lat,
        lng: params.lng,
      },
    }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractError(payload, 'Punch out failed'));
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Punched out successfully';
}
