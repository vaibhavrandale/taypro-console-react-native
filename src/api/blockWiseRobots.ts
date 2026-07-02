import { apiFetch } from './client';
import { SiteManagementData, SiteManagementResponse } from '../types/blockWiseRobots';

export async function fetchBlockWiseRobotsBySite(
  siteId: string,
): Promise<SiteManagementData> {
  const response = await apiFetch(
    `/robots/site-management/${encodeURIComponent(siteId)}`,
  );

  const text = await response.text();
  let result: SiteManagementResponse | null = null;

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
        `Failed to load robots (${response.status})`,
    );
  }

  if (!result?.data) {
    throw new Error('No robot data returned');
  }

  return result.data;
}
