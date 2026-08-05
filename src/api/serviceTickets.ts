import { apiFetch } from './client';
import type {
  ChecklistField,
  CreateServiceTicketPayload,
  FaultAnalysisChecklist,
  ServiceInventoryActivity,
  ServiceInventoryItem,
  ServiceTicket,
  ServiceTicketDashboardStats,
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

export async function fetchServiceTicketDashboardStats(): Promise<ServiceTicketDashboardStats> {
  const response = await apiFetch('/servicetickets/dashboard-stats');
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load service ticket dashboard');
  }

  const data =
    isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  if (!data) {
    throw new Error('No dashboard stats returned');
  }

  const summary = isRecord(data.summary) ? data.summary : {};

  return {
    summary: {
      raised: Number(summary.raised ?? 0),
      resolved: Number(summary.resolved ?? 0),
      pending: Number(summary.pending ?? 0),
      avg_pending_days: Number(summary.avg_pending_days ?? 0),
    },
    by_site: Array.isArray(data.by_site)
      ? (data.by_site as ServiceTicketDashboardStats['by_site'])
      : [],
    recurring_faults: Array.isArray(data.recurring_faults)
      ? (data.recurring_faults as ServiceTicketDashboardStats['recurring_faults'])
      : [],
    pending_aging: Array.isArray(data.pending_aging)
      ? (data.pending_aging as ServiceTicketDashboardStats['pending_aging'])
      : [],
    oldest_pending: Array.isArray(data.oldest_pending)
      ? (data.oldest_pending as ServiceTicketDashboardStats['oldest_pending'])
      : [],
  };
}

function coerceId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '$oid' in value) {
    const oid = (value as { $oid: unknown }).$oid;
    return typeof oid === 'string' ? oid : undefined;
  }
  return undefined;
}

function coerceDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && '$date' in value) {
    const raw = (value as { $date: unknown }).$date;
    if (typeof raw === 'string' || typeof raw === 'number') {
      return new Date(raw).toISOString();
    }
  }
  return undefined;
}

function asInventoryActivity(value: unknown): ServiceInventoryActivity | null {
  if (!isRecord(value)) return null;
  return {
    name: typeof value.name === 'string' ? value.name : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
    profile_image:
      typeof value.profile_image === 'string'
        ? value.profile_image
        : undefined,
    timestamp: coerceDate(value.timestamp),
    userId:
      coerceId(value.userId) ??
      (typeof value.userId === 'string' ? value.userId : undefined),
    details: typeof value.details === 'string' ? value.details : undefined,
    role: typeof value.role === 'string' ? value.role : undefined,
  };
}

function asInventoryItem(value: unknown): ServiceInventoryItem | null {
  if (!isRecord(value)) return null;
  const itemId =
    coerceId(value.item_id) ??
    (typeof value.item_id === 'string' ? value.item_id : undefined);
  const itemName =
    typeof value.item_name === 'string' ? value.item_name : undefined;
  const itemCode =
    typeof value.item_code === 'string' ? value.item_code : undefined;
  if (!itemId && !itemName && !itemCode) return null;

  const last_activity = Array.isArray(value.last_activity)
    ? value.last_activity
        .map(asInventoryActivity)
        .filter((row): row is ServiceInventoryActivity => row != null)
    : undefined;

  return {
    _id: coerceId(value._id),
    item_id: itemId ?? itemCode ?? itemName ?? '',
    item_name: itemName ?? '—',
    item_code: itemCode ?? '—',
    site_id: typeof value.site_id === 'string' ? value.site_id : undefined,
    company: typeof value.company === 'string' ? value.company : undefined,
    quantity:
      typeof value.quantity === 'number'
        ? value.quantity
        : Number(value.quantity) || undefined,
    threshold:
      typeof value.threshold === 'number'
        ? value.threshold
        : value.threshold != null
          ? Number(value.threshold) || undefined
          : undefined,
    item_image:
      typeof value.item_image === 'string' ? value.item_image : null,
    item_description:
      typeof value.item_description === 'string'
        ? value.item_description
        : undefined,
    is_delete: Boolean(value.is_delete),
    last_activity,
    createdAt: coerceDate(value.createdAt),
    updatedAt: coerceDate(value.updatedAt),
  };
}

function asInventoryList(payload: unknown): ServiceInventoryItem[] {
  const raw = asArray<unknown>(payload);
  return raw
    .map(asInventoryItem)
    .filter((item): item is ServiceInventoryItem => item != null);
}

export async function fetchServiceInventory(): Promise<ServiceInventoryItem[]> {
  const response = await apiFetch('/service-inventory');
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load inventory');
  }
  return asInventoryList(payload);
}

/** Inventory for the signed-in user's assigned sites. */
export async function fetchSitewiseServiceInventory(): Promise<
  ServiceInventoryItem[]
> {
  const response = await apiFetch('/service-inventory/get-sitewise-inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load site inventory');
  }
  return asInventoryList(payload);
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
