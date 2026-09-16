import { apiFetch } from './client';
import type { ClientSubscription, SubscriptionPlan } from '../types/subscription';

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

function extractError(payload: unknown, fallback: string) {
  const rec = isRecord(payload) ? payload : {};
  return String(rec.message ?? rec.error ?? fallback);
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiFetch('/subscription-plans');
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load plans'));
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as SubscriptionPlan[];
  }
  if (Array.isArray(payload)) return payload as SubscriptionPlan[];
  return [];
}

export async function fetchMySubscription(): Promise<ClientSubscription | null> {
  const response = await apiFetch('/client-subscription/get-subscriptions');
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(extractError(payload, 'Failed to load subscription'));
  }
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as ClientSubscription;
  }
  return null;
}
