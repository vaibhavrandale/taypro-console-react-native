import { apiFetch } from './client';
import type {
  ChecklistField,
  CreateServiceTicketPayload,
  FaultAnalysisChecklist,
  ServiceInventoryItem,
  ServiceTicket,
  ServiceTicketFault,
  ServiceTicketRobot,
  ServiceTicketsPageResult,
} from '../types/serviceTickets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);
    throw new Error(
      `Invalid response from server (${response.status})${snippet ? `: ${snippet}` : ''}`,
    );
  }
}

function throwApiError(payload: unknown, fallback: string): never {
  const errorPayload = isRecord(payload) ? payload : {};
  throw new Error(
    String(errorPayload.message ?? errorPayload.error ?? fallback),
  );
}

function asArray<T>(payload: unknown): T[] {
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  return [];
}

export async function fetchServiceTicketRobots(): Promise<ServiceTicketRobot[]> {
  const response = await apiFetch('/robots/get-robots-no');
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load robots');
  }
  return asArray<ServiceTicketRobot>(payload);
}

export async function fetchServiceTicketFaults(): Promise<ServiceTicketFault[]> {
  const response = await apiFetch(
    '/serviceticketsfaults/all-serviceticketsfaults-without-pg',
  );
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load fault types');
  }
  return asArray<ServiceTicketFault>(payload);
}

function emptyTicketsPage(
  page: number,
  limit: number,
): ServiceTicketsPageResult {
  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

function normalizeTicketsPage(
  payload: unknown,
  page: number,
  limit: number,
): ServiceTicketsPageResult {
  const data = asArray<ServiceTicket>(payload);
  const total =
    (isRecord(payload) ? Number(payload.total) : NaN) || data.length;
  const resolvedLimit =
    (isRecord(payload) ? Number(payload.limit) : NaN) || limit;
  const totalPages = Math.max(1, Math.ceil(total / resolvedLimit) || 1);

  return {
    data,
    total,
    page,
    limit: resolvedLimit,
    totalPages,
    hasNextPage: isRecord(payload)
      ? Boolean(payload.hasNextPage)
      : page < totalPages,
    hasPrevPage: isRecord(payload)
      ? Boolean(payload.hasPrevPage)
      : page > 1,
  };
}

/** Fallback when sitewise route is missing on older backends. */
async function fetchServiceTicketsLegacyPage(params: {
  page: number;
  limit: number;
}): Promise<ServiceTicketsPageResult> {
  const { page, limit } = params;
  const response = await apiFetch('/servicetickets');
  if (response.status === 404) {
    return emptyTicketsPage(page, limit);
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load service tickets');
  }

  const all = asArray<ServiceTicket>(payload);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export async function fetchServiceTickets(): Promise<ServiceTicket[]> {
  const page = await fetchSitewiseServiceTickets({ page: 1, limit: 100 });
  return page.data;
}

export async function fetchSitewiseServiceTickets(params: {
  page: number;
  limit?: number;
}): Promise<ServiceTicketsPageResult> {
  const limit = params.limit ?? 10;
  const page = params.page;

  const response = await apiFetch(
    '/servicetickets/get-sitewise-servicetickets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pg: page, limit }),
    },
  );

  // HTML 404 pages must not go through parseJson (throws "Invalid response…").
  if (response.status === 404) {
    return fetchServiceTicketsLegacyPage({ page, limit });
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load service tickets');
  }

  return normalizeTicketsPage(payload, page, limit);
}

export async function fetchServiceTicketById(
  id: string,
): Promise<ServiceTicket> {
  const response = await apiFetch(
    `/servicetickets/getone/${encodeURIComponent(id)}`,
  );
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load service ticket');
  }

  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as ServiceTicket;
  }

  throw new Error('Service ticket not found');
}

export async function createServiceTicket(
  data: CreateServiceTicketPayload,
): Promise<ServiceTicket> {
  const response = await apiFetch('/servicetickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to create service ticket');
  }

  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as ServiceTicket;
  }

  throw new Error('Ticket created but no data returned');
}

export async function resolveServiceTicket(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const response = await apiFetch(
    `/servicetickets/resolve/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to resolve service ticket');
  }
}

export async function fetchServiceInventory(): Promise<ServiceInventoryItem[]> {
  const response = await apiFetch('/service-inventory');
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load inventory');
  }
  return asArray<ServiceInventoryItem>(payload);
}

export async function fetchFaultAnalysisChecklist(
  itemId: string,
): Promise<{ fields: ChecklistField[]; componentName?: string }> {
  const response = await apiFetch(
    `/faultanalysis/${encodeURIComponent(itemId)}`,
  );
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load checklist');
  }

  const rows = asArray<FaultAnalysisChecklist>(payload);
  const first = rows[0];
  return {
    fields: first?.checklist_fields ?? [],
    componentName: first?.component?.item_name,
  };
}
