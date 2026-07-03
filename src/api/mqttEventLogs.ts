import { apiFetch } from './client';
import { MqttEventFrame } from '../types/mqttEventLogs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    throw new Error(
      String(
        errorPayload.message ??
          errorPayload.error ??
          `Request failed (${response.status})`,
      ),
    );
  }

  return payload;
}

function normalizeFrames(payload: unknown): MqttEventFrame[] {
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.data)) {
    return payload.data as MqttEventFrame[];
  }

  if (Array.isArray(payload)) {
    return payload as MqttEventFrame[];
  }

  return [];
}

export async function fetchMqttEventLogs(robotNo: string, deveui: string) {
  const encodedRobot = encodeURIComponent(robotNo);
  const encodedDeveui = encodeURIComponent(deveui);
  const response = await apiFetch(
    `/mqtt-event-logs/${encodedRobot}/${encodedDeveui}`,
  );
  const payload = await parseJson(response);
  return normalizeFrames(payload);
}
