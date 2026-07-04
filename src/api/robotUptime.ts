import { apiFetch } from './client';
import type { RobotUptimeDay, RobotUptimeResponse } from '../types/robotUptime';

export type FetchRobotUptimeParams = {
  siteId: string;
  month: number;
  year: number;
  signal?: AbortSignal;
};

export type RobotUptimeResult = {
  days: RobotUptimeDay[];
  totalAssignedRobots: number;
  monthlyCleaningUptime: number;
  monthlyAvailabilityUptime: number;
  averageSuccess: number;
  averageFailure: number;
};

const UPTIME_TIMEOUT_MS = 90_000;

export async function fetchRobotUptime({
  siteId,
  month,
  year,
  signal,
}: FetchRobotUptimeParams): Promise<RobotUptimeResult> {
  const startedAt = Date.now();

  const response = await apiFetch('/robot-tracking/uptime', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_id: siteId,
      month,
      year,
    }),
    signal,
    timeoutMs: UPTIME_TIMEOUT_MS,
  });

  const result = (await response.json()) as RobotUptimeResponse | null;

  if (__DEV__) {
    console.log('[uptime] response', {
      siteId,
      month,
      year,
      status: response.status,
      durationMs: Date.now() - startedAt,
      dayCount: Array.isArray(result?.data) ? result.data.length : 0,
    });
  }

  if (!response.ok) {
    const errorPayload = result as { message?: string; error?: string } | null;
    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Failed to load robot uptime (${response.status})`,
    );
  }

  if (!Array.isArray(result?.data)) {
    throw new Error('No uptime data returned');
  }

  return {
    days: result.data,
    totalAssignedRobots: result.total_assigned_robots ?? 0,
    monthlyCleaningUptime: result.monthlyCleaningUptime ?? 0,
    monthlyAvailabilityUptime: result.monthlyAvailibilityUptime ?? 0,
    averageSuccess: result.average_success ?? 0,
    averageFailure: result.average_failure ?? 0,
  };
}
