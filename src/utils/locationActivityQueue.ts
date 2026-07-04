import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationActivityPoint } from '../types/locationActivity';
import { uploadLocationActivityBatch } from '../api/locationActivity';

const QUEUE_KEY = 'taypro_location_activity_queue_v1';
const MAX_QUEUE_SIZE = 2000;
const BATCH_SIZE = 40;

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
}

export async function enqueueLocationActivity(point: LocationActivityPoint) {
  const queue = await readLocationActivityQueue();
  if (queue.some((item) => item.client_id === point.client_id)) {
    return;
  }

  queue.push(point);
  await writeLocationActivityQueue(queue);
}

export async function flushLocationActivityQueue(): Promise<number> {
  const queue = await readLocationActivityQueue();
  if (!queue.length) return 0;

  let synced = 0;
  let remaining = [...queue];

  while (remaining.length > 0) {
    const batch = remaining.slice(0, BATCH_SIZE);
    try {
      await uploadLocationActivityBatch(batch);
      synced += batch.length;
      remaining = remaining.slice(batch.length);
      await writeLocationActivityQueue(remaining);
    } catch {
      await writeLocationActivityQueue(remaining);
      break;
    }
  }

  return synced;
}

export async function clearLocationActivityQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export function getQueuedLocationCount() {
  return readLocationActivityQueue().then((queue) => queue.length);
}
