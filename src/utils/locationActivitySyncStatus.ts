export type LocationSyncSnapshot = {
  isTracking: boolean;
  queueCount: number;
  totalCaptured: number;
  totalSynced: number;
  lastCapturedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncedLat: number | null;
  lastSyncedLng: number | null;
  lastError: string | null;
};

type Listener = (snapshot: LocationSyncSnapshot) => void;

const EMPTY_SNAPSHOT: LocationSyncSnapshot = {
  isTracking: false,
  queueCount: 0,
  totalCaptured: 0,
  totalSynced: 0,
  lastCapturedAt: null,
  lastSyncedAt: null,
  lastSyncedLat: null,
  lastSyncedLng: null,
  lastError: null,
};

let snapshot: LocationSyncSnapshot = { ...EMPTY_SNAPSHOT };
const listeners = new Set<Listener>();

function emit() {
  const next = { ...snapshot };
  listeners.forEach((listener) => listener(next));
}

export function getLocationSyncSnapshot(): LocationSyncSnapshot {
  return { ...snapshot };
}

export function subscribeLocationSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(getLocationSyncSnapshot());
  return () => listeners.delete(listener);
}

export function resetLocationSyncStatus() {
  snapshot = { ...EMPTY_SNAPSHOT };
  emit();
}

export function setLocationTrackingActive(active: boolean) {
  snapshot = { ...snapshot, isTracking: active };
  emit();
}

export function setLocationQueueCount(count: number) {
  snapshot = { ...snapshot, queueCount: count };
  emit();
}

export function reportLocationCaptured(lat: number, lng: number) {
  snapshot = {
    ...snapshot,
    totalCaptured: snapshot.totalCaptured + 1,
    lastCapturedAt: new Date().toISOString(),
    lastSyncedLat: lat,
    lastSyncedLng: lng,
  };
  emit();
}

export function reportLocationSynced(
  syncedCount: number,
  remaining: number,
  lastPoint?: { lat: number; lng: number },
) {
  snapshot = {
    ...snapshot,
    totalSynced: snapshot.totalSynced + syncedCount,
    queueCount: remaining,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    lastSyncedLat: lastPoint?.lat ?? snapshot.lastSyncedLat,
    lastSyncedLng: lastPoint?.lng ?? snapshot.lastSyncedLng,
  };
  emit();
}

export function reportLocationSyncFailed(error: string, remaining: number) {
  snapshot = {
    ...snapshot,
    queueCount: remaining,
    lastError: error,
  };
  emit();
}
