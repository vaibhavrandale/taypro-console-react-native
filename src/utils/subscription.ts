import {
  SUBSCRIPTION_STATUSES,
  type ClientSubscription,
  type SubscriptionStatusCode,
} from '../types/subscription';

export class SubscriptionError extends Error {
  readonly subscriptionStatus: SubscriptionStatusCode;
  readonly data: ClientSubscription | null;

  constructor(
    message: string,
    subscriptionStatus: SubscriptionStatusCode,
    data: ClientSubscription | null,
  ) {
    super(message);
    this.name = 'SubscriptionError';
    this.subscriptionStatus = subscriptionStatus;
    this.data = data;
  }
}

export function isSubscriptionStatus(
  value: unknown,
): value is SubscriptionStatusCode {
  return (
    typeof value === 'string' &&
    (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isSubscriptionError(err: unknown): err is SubscriptionError {
  return err instanceof SubscriptionError;
}

export function asLoadError(err: unknown, fallback: string): string | SubscriptionError {
  if (err instanceof SubscriptionError) return err;
  return err instanceof Error ? err.message : fallback;
}

export function subscriptionErrorFromPayload(
  payload: unknown,
): SubscriptionError | null {
  if (typeof payload !== 'object' || payload == null) return null;
  const rec = payload as Record<string, unknown>;
  if (!isSubscriptionStatus(rec.subscriptionStatus)) return null;

  const data =
    rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)
      ? (rec.data as ClientSubscription)
      : null;

  return new SubscriptionError(
    String(rec.error ?? rec.message ?? 'Please subscribe to use this feature.'),
    rec.subscriptionStatus,
    data,
  );
}
