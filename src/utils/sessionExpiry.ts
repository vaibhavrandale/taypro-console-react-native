/** Called when the API reports an expired / unauthorized session. */
type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;
let handling = false;

export function setSessionExpiredHandler(
  next: SessionExpiredHandler | null,
): void {
  handler = next;
}

export function isSessionExpiredMessage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /session\s*expired/i.test(value);
}

export function isSessionExpiredPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return (
    isSessionExpiredMessage(record.message) ||
    isSessionExpiredMessage(record.error) ||
    isSessionExpiredMessage(record.msg)
  );
}

/** Clears local auth so AppNavigator shows Login. Idempotent while in-flight. */
export function notifySessionExpired(): void {
  if (handling) return;
  handling = true;
  try {
    handler?.();
  } finally {
    setTimeout(() => {
      handling = false;
    }, 1500);
  }
}
