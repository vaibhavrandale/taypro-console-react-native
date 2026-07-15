export type LocationSyncSnapshot = {
  isTracking: boolean;
  /** Points waiting on device (AsyncStorage). */
  queueCount: number;
  /** Total points captured this install/session (persisted). */
  totalCaptured: number;
  /** Total points uploaded to server (direct + from memory). */
  totalSynced: number;
  /** Uploaded in the same moment they were captured (online). */
  uploadedDirect: number;
  /** Uploaded later from device queue (offline / app reopen). */
  uploadedFromMemory: number;
  lastCapturedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncedLat: number | null;
  lastSyncedLng: number | null;
  lastError: string | null;
  lastFlushOrigin: 'immediate' | 'deferred' | null;
};

export type LocationFlushOrigin = 'immediate' | 'deferred';

type Listener = (snapshot: LocationSyncSnapshot) => void;

const EMPTY_SNAPSHOT: LocationSyncSnapshot = {
  isTracking: false,
  queueCount: 0,
  totalCaptured: 0,
  totalSynced: 0,
  uploadedDirect: 0,
  uploadedFromMemory: 0,
  lastCapturedAt: null,
  lastSyncedAt: null,
  lastSyncedLat: null,
  lastSyncedLng: null,
  lastError: null,
  lastFlushOrigin: null,
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
  snapshot = {
    ...EMPTY_SNAPSHOT,
    queueCount: snapshot.queueCount,
  };
  emit();
}

/** Restore persisted test counters after app restart. */
export function hydrateLocationSyncCounters(partial: {
  totalCaptured?: number;
  totalSynced?: number;
  uploadedDirect?: number;
  uploadedFromMemory?: number;
}) {
  snapshot = {
    ...snapshot,
    totalCaptured: partial.totalCaptured ?? snapshot.totalCaptured,
    totalSynced: partial.totalSynced ?? snapshot.totalSynced,
    uploadedDirect: partial.uploadedDirect ?? snapshot.uploadedDirect,
    uploadedFromMemory:
      partial.uploadedFromMemory ?? snapshot.uploadedFromMemory,
  };
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
  lastPoint: { lat: number; lng: number } | undefined,
  origin: LocationFlushOrigin,
  breakdown: { direct: number; fromMemory: number },
) {
  snapshot = {
    ...snapshot,
    totalSynced: snapshot.totalSynced + syncedCount,
    uploadedDirect: snapshot.uploadedDirect + breakdown.direct,
    uploadedFromMemory: snapshot.uploadedFromMemory + breakdown.fromMemory,
    queueCount: remaining,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    lastFlushOrigin: origin,
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
