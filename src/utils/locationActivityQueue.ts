import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationActivityPoint } from '../types/locationActivity';
import { uploadLocationActivityBatch } from '../api/locationActivity';
import {
  getLocationSyncSnapshot,
  hydrateLocationSyncCounters,
  reportLocationCaptured,
  reportLocationSyncFailed,
  reportLocationSynced,
  setLocationQueueCount,
  type LocationFlushOrigin,
} from './locationActivitySyncStatus';

const QUEUE_KEY = 'taypro_location_activity_queue_v1';
const DEBUG_STATS_KEY = 'taypro_location_debug_stats_v1';
const MAX_QUEUE_SIZE = 2000;
const BATCH_SIZE = 40;

/** Points newer than this during an immediate flush count as "direct". */
const DIRECT_UPLOAD_WINDOW_MS = 8_000;

export type LocationFlushResult = {
  synced: number;
  remaining: number;
  direct: number;
  fromMemory: number;
  error?: string;
};

type PersistedDebugStats = {
  totalCaptured: number;
  totalSynced: number;
  uploadedDirect: number;
  uploadedFromMemory: number;
};

let debugHydrated = false;

async function persistDebugStats() {
  const snap = getLocationSyncSnapshot();
  const payload: PersistedDebugStats = {
    totalCaptured: snap.totalCaptured,
    totalSynced: snap.totalSynced,
    uploadedDirect: snap.uploadedDirect,
    uploadedFromMemory: snap.uploadedFromMemory,
  };
  await AsyncStorage.setItem(DEBUG_STATS_KEY, JSON.stringify(payload));
}

export async function hydrateLocationDebugStats() {
  if (debugHydrated) return;
  debugHydrated = true;

  try {
    const raw = await AsyncStorage.getItem(DEBUG_STATS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedDebugStats;
    hydrateLocationSyncCounters({
      totalCaptured: Number(parsed.totalCaptured) || 0,
      totalSynced: Number(parsed.totalSynced) || 0,
      uploadedDirect: Number(parsed.uploadedDirect) || 0,
      uploadedFromMemory: Number(parsed.uploadedFromMemory) || 0,
    });
  } catch {
    // Ignore corrupt debug stats.
  }
}

export async function resetLocationDebugStats() {
  await AsyncStorage.removeItem(DEBUG_STATS_KEY);
  hydrateLocationSyncCounters({
    totalCaptured: 0,
    totalSynced: 0,
    uploadedDirect: 0,
    uploadedFromMemory: 0,
  });
}

export async function readLocationActivityQueue(): Promise<LocationActivityPoint[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocationActivityPoint[]) : [];
  } catch {
    return [];
  }
}

async function writeLocationActivityQueue(points: LocationActivityPoint[]) {
  const trimmed = points.slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  setLocationQueueCount(trimmed.length);
}

export async function enqueueLocationActivity(point: LocationActivityPoint) {
  await hydrateLocationDebugStats();

  const queue = await readLocationActivityQueue();
  if (queue.some((item) => item.client_id === point.client_id)) {
    return;
  }

  queue.push({
    ...point,
    enqueued_at: point.enqueued_at ?? new Date().toISOString(),
  });
  await writeLocationActivityQueue(queue);
  reportLocationCaptured(point.location.lat, point.location.lng);
  void persistDebugStats();
}

function classifySyncedPoints(
  points: LocationActivityPoint[],
  origin: LocationFlushOrigin,
  nowMs: number,
): { direct: number; fromMemory: number } {
  if (origin === 'deferred') {
    return { direct: 0, fromMemory: points.length };
  }

  let direct = 0;
  let fromMemory = 0;

  for (const point of points) {
    const stamped = Date.parse(point.enqueued_at ?? point.recorded_at);
    const ageMs = Number.isFinite(stamped) ? nowMs - stamped : Number.POSITIVE_INFINITY;
    if (ageMs <= DIRECT_UPLOAD_WINDOW_MS) {
      direct += 1;
    } else {
      fromMemory += 1;
    }
  }

  return { direct, fromMemory };
}

export async function flushLocationActivityQueue(
  options?: { origin?: LocationFlushOrigin },
): Promise<LocationFlushResult> {
  await hydrateLocationDebugStats();

  const origin: LocationFlushOrigin = options?.origin ?? 'deferred';
  const queue = await readLocationActivityQueue();
  if (!queue.length) {
    setLocationQueueCount(0);
    return { synced: 0, remaining: 0, direct: 0, fromMemory: 0 };
  }

  let synced = 0;
  let direct = 0;
  let fromMemory = 0;
  let remaining = [...queue];
  let lastError: string | undefined;
  let lastSyncedPoint: { lat: number; lng: number } | undefined;
  const nowMs = Date.now();

  while (remaining.length > 0) {
    const batch = remaining.slice(0, BATCH_SIZE);
    try {
      await uploadLocationActivityBatch(batch);
      const breakdown = classifySyncedPoints(batch, origin, nowMs);
      synced += batch.length;
      direct += breakdown.direct;
      fromMemory += breakdown.fromMemory;
      const last = batch[batch.length - 1];
      lastSyncedPoint = { lat: last.location.lat, lng: last.location.lng };
      remaining = remaining.slice(batch.length);
      await writeLocationActivityQueue(remaining);
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : 'Failed to upload location activity';
      await writeLocationActivityQueue(remaining);
      reportLocationSyncFailed(lastError, remaining.length);
      break;
    }
  }

  if (synced > 0) {
    reportLocationSynced(synced, remaining.length, lastSyncedPoint, origin, {
      direct,
      fromMemory,
    });
    void persistDebugStats();
  } else if (!lastError) {
    setLocationQueueCount(remaining.length);
  }

  return {
    synced,
    remaining: remaining.length,
    direct,
    fromMemory,
    error: lastError,
  };
}

export async function clearLocationActivityQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
  setLocationQueueCount(0);
}

export async function refreshLocationQueueCount() {
  const queue = await readLocationActivityQueue();
  setLocationQueueCount(queue.length);
  return queue.length;
}

export function getQueuedLocationCount() {
  return readLocationActivityQueue().then((queue) => queue.length);
}
