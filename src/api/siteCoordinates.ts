import { apiFetch } from './client';
import { SiteCoordinates } from '../types/siteCoordinates';

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

export async function fetchSiteCoordinates(siteId: string): Promise<SiteCoordinates> {
  const response = await apiFetch('/sites-coordinates/get-by-siteId', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(errorPayload.message ?? errorPayload.error ?? 'Failed to load site coordinates'),
    );
  }

  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as SiteCoordinates;
  }

  throw new Error('Site coordinates not found');
}

export function parseSiteCoordinateNumbers(coords: SiteCoordinates) {
  return {
    latitude: Number(coords.latitude),
    longitude: Number(coords.longitude),
    radiusMeters: Number(coords.radius) || 0,
  };
}
