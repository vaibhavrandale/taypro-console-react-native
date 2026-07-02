import { apiFetch } from './client';
import { SiteDetails, SiteDetailsResponse } from '../types/siteDetails';

export async function fetchSiteDetails(siteId: string): Promise<SiteDetails> {
  const response = await apiFetch(`/sites-coordinates/site-details/${encodeURIComponent(siteId)}`);

  const text = await response.text();
  let result: SiteDetailsResponse | null = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    throw new Error(
      (result as { message?: string; error?: string } | null)?.message ||
        (result as { error?: string } | null)?.error ||
        `Failed to load site details (${response.status})`,
    );
  }

  if (!result?.data) {
    throw new Error('No site details returned');
  }

  return result.data;
}
