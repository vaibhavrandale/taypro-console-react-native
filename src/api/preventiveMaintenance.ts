import { apiFetch } from './client';
import type {
  CreatePreventiveMaintenancePayload,
  PmClientGroup,
  PmRobotRecord,
  PreventiveMaintenanceResult,
  UpdatePreventiveMaintenancePayload,
} from '../types/preventiveMaintenance';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);
    throw new Error(
      `Invalid response from server (${response.status})${snippet ? `: ${snippet}` : ''}`,
    );
  }
}

function throwApiError(payload: unknown, fallback: string): never {
  const errorPayload = isRecord(payload) ? payload : {};
  throw new Error(
    String(errorPayload.message ?? errorPayload.error ?? fallback),
  );
}

function asRobot(value: unknown): PmRobotRecord | null {
  if (!isRecord(value) || typeof value._id !== 'string') return null;
  return value as PmRobotRecord;
}

function asGroups(value: unknown): PmClientGroup[] {
  if (!Array.isArray(value)) return [];
  return value.map((group) => {
    if (!isRecord(group)) return { robots: [] };
    const robots = Array.isArray(group.robots)
      ? group.robots.map(asRobot).filter((r): r is PmRobotRecord => r != null)
      : [];
    return { ...group, robots };
  });
}

export async function createPreventiveMaintenance(
  data: CreatePreventiveMaintenancePayload,
): Promise<{ message?: string }> {
  const response = await apiFetch('/preventivemaintenances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to create preventive maintenance');
  }

  if (isRecord(payload)) {
    return {
      message:
        typeof payload.message === 'string' ? payload.message : undefined,
    };
  }

  return {};
}

export async function fetchPreventiveMaintenance(
  id: string,
): Promise<PmRobotRecord> {
  const response = await apiFetch(
    `/preventivemaintenances/${encodeURIComponent(id)}`,
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load preventive maintenance');
  }

  if (isRecord(payload) && isRecord(payload.data)) {
    const record = asRobot(payload.data);
    if (record) return record;
  }

  if (isRecord(payload)) {
    const record = asRobot(payload);
    if (record) return record;
  }

  throw new Error('Preventive maintenance record not found');
}

export async function updatePreventiveMaintenance(
  id: string,
  data: UpdatePreventiveMaintenancePayload,
): Promise<void> {
  const response = await apiFetch(
    `/preventivemaintenances/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to update preventive maintenance');
  }
}

export async function fetchPreventiveMaintenances(params: {
  startDate: string;
  endDate: string;
  siteId: string;
}): Promise<PreventiveMaintenanceResult> {
  const site = encodeURIComponent(params.siteId || 'all');
  const start = encodeURIComponent(params.startDate);
  const end = encodeURIComponent(params.endDate);

  const response = await apiFetch(
    `/preventivemaintenances/sites-with-date/${start}/${end}/${site}`,
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load preventive maintenance records');
  }

  if (!isRecord(payload)) {
    return { data: [] };
  }

  // API may return { data: groups } or groups at root with meta fields.
  const groups = Array.isArray(payload.data)
    ? asGroups(payload.data)
    : Array.isArray(payload)
      ? asGroups(payload)
      : [];

  return {
    data: groups,
    site_count:
      typeof payload.site_count === 'number' ? payload.site_count : undefined,
    record_count:
      typeof payload.record_count === 'number'
        ? payload.record_count
        : undefined,
    start_date:
      typeof payload.start_date === 'string' ? payload.start_date : undefined,
    end_date:
      typeof payload.end_date === 'string' ? payload.end_date : undefined,
    site_id: typeof payload.site_id === 'string' ? payload.site_id : undefined,
    site_name:
      typeof payload.site_name === 'string' ? payload.site_name : undefined,
    site_location:
      typeof payload.site_location === 'string'
        ? payload.site_location
        : undefined,
  };
}
