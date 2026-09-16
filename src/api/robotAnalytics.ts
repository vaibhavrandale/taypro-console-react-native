import { apiFetch } from './client';
import { fetchServiceTicketRobots } from './serviceTickets';
import type {
  RobotAnalyticsRaw,
  RobotAnalyticsResult,
  SiteAnalyticsResult,
} from '../types/robotAnalytics';

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

export async function fetchRobotNos() {
  return fetchServiceTicketRobots();
}

export async function fetchRobotCleaningAnalytics(params: {
  robot_no: string;
  startDate: string;
  endDate: string;
}): Promise<RobotAnalyticsResult> {
  const response = await apiFetch('/robot-tracking/robot-cleaning-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load robot analytics');
  }
  const rec = isRecord(payload) ? payload : {};
  return {
    data: Array.isArray(rec.data) ? (rec.data as RobotAnalyticsRaw[]) : [],
    avg_cleaning_minutes: Number(rec.avg_cleaning_minutes) || 0,
    total_cycles: Number(rec.total_cycles) || 0,
    maxWheelCurrent: rec.maxWheelCurrent as string | number,
    avgWheelCurrent: rec.avgWheelCurrent as string | number,
    maxBrushCurrent: rec.maxBrushCurrent as string | number,
    avgBrushCurrent: rec.avgBrushCurrent as string | number,
  };
}

export async function fetchSiteCleaningAnalytics(params: {
  site_id: string;
  startDate: string;
  endDate: string;
}): Promise<SiteAnalyticsResult> {
  const response = await apiFetch('/robot-tracking/site-cleaning-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load site analytics');
  }
  const rec = isRecord(payload) ? payload : {};
  const data = isRecord(rec.data) ? rec.data : rec;
  const summary = isRecord(data.summary) ? data.summary : {};
  return {
    summary: {
      total_robots: Number(summary.total_robots) || 0,
      total_cycles: Number(summary.total_cycles) || 0,
      avg_cleaning_minutes: Number(summary.avg_cleaning_minutes) || 0,
    },
    robots: Array.isArray(data.robots)
      ? (data.robots as SiteAnalyticsResult['robots'])
      : [],
  };
}
