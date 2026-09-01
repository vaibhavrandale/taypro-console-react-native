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

function parseFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return match?.[1] || fallback;
}

/** Fetch the server-generated cleaning-logs PDF for a site/day. */
export async function downloadCleaningLogsPdf(options: {
  siteId: string;
  siteName?: string;
  date: string;
}): Promise<{ bytes: Uint8Array; fileName: string }> {
  const safeSite = options.siteId.replace(/[^\w.-]+/g, '_');
  const fallbackName = `cleaning-logs_${safeSite}_${options.date}.pdf`;

  const response = await apiFetch('/robot-tracking/cleaning-logs-for-a-day/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
    },
    body: JSON.stringify({
      site_id: options.siteId,
      site_name: options.siteName || options.siteId,
      date: options.date,
    }),
    timeoutMs: 90000,
  });

  if (!response.ok) {
    let message = `Failed to download PDF (${response.status})`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      message = payload.message || payload.error || message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  const buffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    fileName: parseFilename(
      response.headers.get('Content-Disposition'),
      fallbackName,
    ),
  };
}
