export function getJwtUserId(token: string): string | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;

    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(base64)
        : null;
    if (!json) return null;

    const payload = JSON.parse(json) as Record<string, unknown>;
    const id = payload.id ?? payload._id ?? payload.userId ?? payload.sub;
    if (typeof id === "string") return id;
    if (id != null) return String(id);
    return null;
  } catch {
    return null;
  }
}
