import { apiFetch } from './client';
import type {
  AssignedSitesDprGroup,
  PreventiveMaintenanceStatus,
  SiteRobotOption,
  SiteTechnicianUser,
  TechnicianDprPayload,
  TechnicianDprRecord,
  TicketDetails,
} from '../types/technicianDpr';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = /<\s*!?doctype|<\s*html/i.test(text);
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);

    if (isHtml || response.status === 404) {
      throw new Error(
        `API endpoint not found (${response.status}). Restart or update the backend server.`,
      );
    }

    throw new Error(
      `Invalid response from server (${response.status})${snippet ? `: ${snippet}` : ''}`,
    );
  }
}

function groupDprRecordsBySite(
  records: TechnicianDprRecord[],
): AssignedSitesDprGroup[] {
  const bySite = new Map<string, TechnicianDprRecord[]>();

  for (const record of records) {
    const siteId = record.site_id ?? 'unknown';
    const existing = bySite.get(siteId);
    if (existing) {
      existing.push(record);
    } else {
      bySite.set(siteId, [record]);
    }
  }

  return Array.from(bySite.entries()).map(([site_id, dprs]) => ({
    site_id,
    count: dprs.length,
    dprs,
  }));
}

async function fetchAssignedSitesDprViaGet({
  siteId,
  startDate,
  endDate,
}: FetchAssignedSitesDprParams) {
  const response = await apiFetch(
    `/techniciandprs/${encodeURIComponent(siteId)}/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
  );

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load DPR history');
  }

  const records = isRecord(payload) && Array.isArray(payload.data)
    ? (payload.data as TechnicianDprRecord[])
    : [];

  const groups = groupDprRecordsBySite(records);
  const assignedSites = groups.map((group) => group.site_id);

  return {
    message:
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : undefined,
    startDate,
    endDate,
    assignedSites,
    count: asNumber(isRecord(payload) ? payload.count : records.length),
    groups,
  };
}

function throwApiError(payload: unknown, fallback: string): never {
  const errorPayload = isRecord(payload) ? payload : {};
  throw new Error(
    String(errorPayload.message ?? errorPayload.error ?? fallback),
  );
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asPmSection(value: unknown): PreventiveMaintenanceStatus['automatic'] {
  if (!isRecord(value)) {
    return { attempted: 0, completed: 0, robots: [] };
  }

  return {
    attempted: asNumber(value.attempted),
    completed: asNumber(value.completed),
    robots: Array.isArray(value.robots)
      ? (value.robots as PreventiveMaintenanceStatus['automatic']['robots'])
      : [],
  };
}

export async function fetchPmAndTicketDetails(): Promise<{
  preventive_maintenance_status: Omit<PreventiveMaintenanceStatus, 'total_pm_done'>;
  ticket_details: TicketDetails;
}> {
  const response = await apiFetch('/techniciandprs/get-pm-robots-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load PM and ticket details');
  }

  const data = isRecord(payload) ? payload.data : null;
  if (!isRecord(data)) {
    throw new Error('PM and ticket details not found');
  }

  const pm = data.preventive_maintenance_status;
  const tickets = data.ticketDetails;

  return {
    preventive_maintenance_status: {
      automatic: asPmSection(pm && isRecord(pm) ? pm.automatic : null),
      semi_automatic: asPmSection(
        pm && isRecord(pm) ? pm.semi_automatic : null,
      ),
    },
    ticket_details: {
      total_raised: asNumber(isRecord(tickets) ? tickets.total_raised : 0),
      total_closed: asNumber(isRecord(tickets) ? tickets.total_closed : 0),
      total_pending: asNumber(isRecord(tickets) ? tickets.total_pending : 0),
    },
  };
}

export async function fetchSiteTechnicians(
  siteId: string,
): Promise<SiteTechnicianUser[]> {
  const response = await apiFetch(
    `/users/role/sitetechnician/${encodeURIComponent(siteId)}`,
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load site technicians');
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as SiteTechnicianUser[];
  }

  return [];
}

export async function fetchSiteRobotsForDpr(
  siteId: string,
): Promise<SiteRobotOption[]> {
  const response = await apiFetch(
    `/robots/get-all-robots-sitewise/${encodeURIComponent(siteId)}`,
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throwApiError(payload, 'Failed to load site robots');
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as SiteRobotOption[];
  }

  return [];
}

export async function createTechnicianDpr(
  payload: TechnicianDprPayload,
): Promise<void> {
  const response = await apiFetch('/techniciandprs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await parseJson(response);
  if (!response.ok) {
    throwApiError(result, 'Failed to submit DPR');
  }
}

export type FetchAssignedSitesDprParams = {
  siteId: string;
  startDate: string;
  endDate: string;
};

export async function fetchAssignedSitesDpr({
  siteId,
  startDate,
  endDate,
}: FetchAssignedSitesDprParams) {
  const response = await apiFetch('/techniciandprs/assigned-sites-dpr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site_id: siteId,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (response.status === 404) {
    return fetchAssignedSitesDprViaGet({ siteId, startDate, endDate });
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load DPR history');
  }

  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('No DPR history returned');
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : undefined,
    startDate: String(payload.start_date ?? startDate),
    endDate: String(payload.end_date ?? endDate),
    assignedSites: Array.isArray(payload.assigned_sites)
      ? (payload.assigned_sites as string[])
      : [],
    count: asNumber(payload.count),
    groups: payload.data as AssignedSitesDprGroup[],
  };
}
