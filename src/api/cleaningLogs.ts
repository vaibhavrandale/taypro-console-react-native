import { apiFetch } from './client';
import { CleaningLogsForDay, CleaningLogsResponse } from '../types/cleaningLogs';

export async function fetchCleaningLogsForDay(
  siteId: string,
  date: string,
): Promise<CleaningLogsForDay> {
  const response = await apiFetch('/robot-tracking/cleaning-logs-for-a-day', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_id: siteId,
      date,
    }),
  });

  const text = await response.text();
  let result: CleaningLogsResponse | null = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    const errorPayload = result as { message?: string; error?: string } | null;
    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Failed to load cleaning logs (${response.status})`,
    );
  }

  if (!result?.data) {
    throw new Error('No cleaning log data returned');
  }

  return result.data;
}
