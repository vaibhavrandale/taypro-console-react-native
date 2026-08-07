import { apiFetch } from './client';
import type { RobotLocationItem, RobotTracking } from '../types/robotTracking';

type ApiErrorBody = {
  message?: string;
  error?: string;
  subscriptionStatus?: string;
  data?: unknown;
};

export class RobotTrackingApiError extends Error {
  subscriptionStatus?: string;
  subscriptionData?: unknown;

  constructor(message: string, extras?: {
    subscriptionStatus?: string;
    subscriptionData?: unknown;
  }) {
    super(message);
    this.name = 'RobotTrackingApiError';
    this.subscriptionStatus = extras?.subscriptionStatus;
    this.subscriptionData = extras?.subscriptionData;
  }
}

export async function fetchRobotTrackingBySiteAndDate(params: {
  siteId: string;
  date: string;
  signal?: AbortSignal;
}): Promise<RobotTracking[]> {
  const response = await apiFetch(
    '/robot-tracking/sitewise/fetch-by-sites-and-date',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: params.siteId,
        date: params.date,
      }),
      signal: params.signal,
    },
  );

  const payload = (await response.json()) as {
    data?: RobotTracking[];
  } & ApiErrorBody;

  if (!response.ok) {
    throw new RobotTrackingApiError(
      payload.error || payload.message || 'Failed to fetch robot tracking',
      {
        subscriptionStatus: payload.subscriptionStatus,
        subscriptionData: payload.data,
      },
    );
  }

  return payload.data ?? [];
}

export async function fetchRobotOnlyLocations(
  siteId: string,
  signal?: AbortSignal,
): Promise<RobotLocationItem[]> {
  const response = await apiFetch(
    `/robot-locations/only-locations/${encodeURIComponent(siteId)}`,
    { signal },
  );

  const payload = (await response.json()) as {
    data?: RobotLocationItem[];
  } & ApiErrorBody;

  if (!response.ok) {
    throw new Error(
      payload.message || payload.error || 'Failed to fetch robot locations',
    );
  }

  return payload.data ?? [];
}

export async function sendRobotMqttDownlink(params: {
  deveui: string;
  robot_no: string;
  site_id: string;
  payload: string;
  lora_no?: number | string;
}): Promise<string> {
  const response = await apiFetch('/robots/send-mqtt-downlink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const result = (await response.json()) as ApiErrorBody & { message?: string };

  if (!response.ok) {
    throw new Error(
      result.message || result.error || 'Failed to send command',
    );
  }

  return result.message || 'Command sent successfully';
}

export async function deleteRobotTracking(id: string): Promise<string> {
  const response = await apiFetch(`/robot-tracking/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const result = (await response.json()) as ApiErrorBody & { message?: string };
  if (!response.ok) {
    throw new Error(
      result.message || result.error || 'Failed to delete tracking',
    );
  }
  return result.message || 'Deleted';
}
