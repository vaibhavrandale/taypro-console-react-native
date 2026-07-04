import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationActivityPoint } from '../types/locationActivity';
import { uploadLocationActivityBatch } from '../api/locationActivity';
import {
  reportLocationCaptured,
  reportLocationSyncFailed,
  reportLocationSynced,
  setLocationQueueCount,
} from './locationActivitySyncStatus';

const QUEUE_KEY = 'taypro_location_activity_queue_v1';
const MAX_QUEUE_SIZE = 2000;
const BATCH_SIZE = 40;

export type LocationFlushResult = {
  synced: number;
  remaining: number;
  error?: string;
};

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
  const queue = await readLocationActivityQueue();
  if (queue.some((item) => item.client_id === point.client_id)) {
    return;
  }

  queue.push(point);
  await writeLocationActivityQueue(queue);
  reportLocationCaptured(point.location.lat, point.location.lng);
}

export async function flushLocationActivityQueue(): Promise<LocationFlushResult> {
  const queue = await readLocationActivityQueue();
  if (!queue.length) {
    setLocationQueueCount(0);
    return { synced: 0, remaining: 0 };
  }

  let synced = 0;
  let remaining = [...queue];
  let lastError: string | undefined;
  let lastSyncedPoint: { lat: number; lng: number } | undefined;

  while (remaining.length > 0) {
    const batch = remaining.slice(0, BATCH_SIZE);
    try {
      await uploadLocationActivityBatch(batch);
      synced += batch.length;
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
    reportLocationSynced(synced, remaining.length, lastSyncedPoint);
  } else if (!lastError) {
    setLocationQueueCount(remaining.length);
  }

  return {
    synced,
    remaining: remaining.length,
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
