import { apiFetch } from './client';
import type { SiteWeather } from '../types/siteDetails';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasUsableWeather(weather?: SiteWeather | null): boolean {
  if (!weather || typeof weather !== 'object') return false;
  return (
    weather.temperature != null ||
    weather.humidity != null ||
    weather.wind_speed != null ||
    Boolean(weather.description) ||
    Boolean(weather.weather_description)
  );
}

export async function fetchClientWeather(
  siteId: string,
): Promise<SiteWeather | null> {
  const response = await apiFetch(
    `/weatherdata/client/${encodeURIComponent(siteId)}`,
  );
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const rec = isRecord(payload) ? payload : {};
  const data = isRecord(rec.data) ? rec.data : rec;
  if (!hasUsableWeather(data as SiteWeather)) return null;
  return data as SiteWeather;
}
