import { apiFetch } from './client';
import type {
  ClientTicket,
  ClientTicketsPageResult,
  CreateClientTicketPayload,
} from '../types/clientTickets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server (${response.status})`);
  }
}

function throwApiError(payload: unknown, fallback: string): never {
  const rec = isRecord(payload) ? payload : {};
  throw new Error(String(rec.message ?? rec.error ?? fallback));
}

export async function fetchClientTickets(params: {
  page: number;
  limit: number;
}): Promise<ClientTicketsPageResult> {
  const { page, limit } = params;
  const response = await apiFetch('/clienttickets/get-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pg: page, limit }),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load client tickets');
  }

  const rec = isRecord(payload) ? payload : {};
  const data = Array.isArray(rec.data) ? (rec.data as ClientTicket[]) : [];
  const total = Number(rec.total ?? rec.totalCount ?? data.length) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return {
    data,
    total,
    page: Number(rec.page) || page,
    limit: Number(rec.limit) || limit,
    totalPages,
    hasNextPage: Boolean(rec.hasNextPage),
    hasPrevPage: Boolean(rec.hasPrevPage),
  };
}

export async function fetchClientTicketById(id: string): Promise<ClientTicket> {
  const response = await apiFetch(`/clienttickets/${encodeURIComponent(id)}`);
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to load client ticket');
  }
  const rec = isRecord(payload) ? payload : {};
  if (isRecord(rec.data)) return rec.data as ClientTicket;
  throw new Error('Client ticket not found');
}

export async function createClientTicket(
  data: CreateClientTicketPayload,
): Promise<ClientTicket> {
  const response = await apiFetch('/clienttickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throwApiError(payload, 'Failed to create client ticket');
  }
  const rec = isRecord(payload) ? payload : {};
  return (isRecord(rec.data) ? rec.data : rec) as ClientTicket;
}
