import { apiFetch } from './client';
import type {
  RobotNotification,
  RobotNotificationActivity,
  RobotNotificationsPageResult,
} from '../types/robotNotifications';

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

function coerceId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '$oid' in value) {
    const oid = (value as { $oid: unknown }).$oid;
    return typeof oid === 'string' ? oid : undefined;
  }
  return undefined;
}

function coerceDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const raw = (value as { $date: unknown }).$date;
    if (typeof raw === 'string' || typeof raw === 'number') {
      return new Date(raw).toISOString();
    }
  }
  return undefined;
}

function asActivity(value: unknown): RobotNotificationActivity | undefined {
  if (!isRecord(value)) return undefined;
  return {
    name: typeof value.name === 'string' ? value.name : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
    profile_image:
      typeof value.profile_image === 'string'
        ? value.profile_image
        : undefined,
    details: typeof value.details === 'string' ? value.details : undefined,
    timestamp: coerceDate(value.timestamp),
    role: typeof value.role === 'string' ? value.role : undefined,
  };
}

function asNotification(value: unknown): RobotNotification | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value._id);
  if (!id) return null;

  return {
    _id: id,
    robot_no: typeof value.robot_no === 'string' ? value.robot_no : undefined,
    command: typeof value.command === 'string' ? value.command : undefined,
    deveui: typeof value.deveui === 'string' ? value.deveui : undefined,
    site_id: typeof value.site_id === 'string' ? value.site_id : undefined,
    createdAt: coerceDate(value.createdAt),
    last_activity: asActivity(value.last_activity),
  };
}

export async function fetchRobotNotifications(params: {
  page: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<RobotNotificationsPageResult> {
  const limit = params.limit ?? 10;
  const page = params.page;

  const body: Record<string, unknown> = { pg: page, limit };
  if (params.startDate && params.endDate) {
    body.startDate = params.startDate;
    body.endDate = params.endDate;
  }

  const response = await apiFetch('/robot-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load robot commands');
  }

  const root = isRecord(payload) ? payload : {};
  const nested = isRecord(root.data) ? root.data : root;

  const rawList = Array.isArray(nested.data)
    ? nested.data
    : Array.isArray(root.data)
      ? root.data
      : [];

  const data = rawList
    .map(asNotification)
    .filter((item): item is RobotNotification => item != null);

  const total = Number(nested.total ?? root.total ?? data.length) || data.length;
  const resolvedLimit = Number(nested.limit ?? root.limit ?? limit) || limit;
  const totalPages = Math.max(1, Math.ceil(total / resolvedLimit) || 1);

  return {
    data,
    total,
    page,
    limit: resolvedLimit,
    totalPages,
    hasNextPage: Boolean(
      nested.hasNextPage ?? root.hasNextPage ?? page < totalPages,
    ),
    hasPrevPage: Boolean(
      nested.hasPrevPage ?? root.hasPrevPage ?? page > 1,
    ),
  };
}
