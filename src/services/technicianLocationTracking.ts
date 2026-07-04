import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { LocationActivitySource } from '../types/locationActivity';
import {
  enqueueLocationActivity,
  flushLocationActivityQueue,
} from '../utils/locationActivityQueue';
import { setLocationTrackingActive } from '../utils/locationActivitySyncStatus';

export const TECHNICIAN_LOCATION_TASK = 'TECHNICIAN_LOCATION_TRACKING';

type TrackingSession = {
  siteId?: string;
  attendanceId?: string;
};

let trackingSession: TrackingSession = {};
let foregroundSubscription: Location.LocationSubscription | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function createClientId(source: LocationActivitySource) {
  return `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function persistLocationUpdate(
  coords: Location.LocationObjectCoords,
  source: LocationActivitySource,
) {
  await enqueueLocationActivity({
    client_id: createClientId(source),
    site_id: trackingSession.siteId,
    attendance_id: trackingSession.attendanceId,
    location: {
      lat: coords.latitude,
      lng: coords.longitude,
    },
    accuracy: coords.accuracy ?? undefined,
    speed: coords.speed ?? undefined,
    heading: coords.heading ?? undefined,
    altitude: coords.altitude ?? undefined,
    recorded_at: new Date().toISOString(),
    captured_offline: true,
    source,
  });

  void flushLocationActivityQueue();
}

if (!TaskManager.isTaskDefined(TECHNICIAN_LOCATION_TASK)) {
  TaskManager.defineTask(TECHNICIAN_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;

    const locations = (
      data as { locations?: Location.LocationObject[] } | undefined
    )?.locations;

    if (!locations?.length) return;

    const latest = locations[locations.length - 1];
    await persistLocationUpdate(latest.coords, 'background');
  });
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushLocationActivityQueue();
  }, 60_000);
}

function stopFlushTimer() {
  if (!flushTimer) return;
  clearInterval(flushTimer);
  flushTimer = null;
}

async function ensureForegroundPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const result = await Location.requestForegroundPermissionsAsync();
  return result.granted;
}

async function hasBackgroundPermission() {
  const current = await Location.getBackgroundPermissionsAsync();
  return current.granted;
}

const BACKGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 120_000,
  distanceInterval: 25,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Nectyr location tracking',
    notificationBody: 'Tracking your site activity until punch out.',
    notificationColor: '#00C9A7',
  },
};

async function tryStartBackgroundUpdates() {
  if (AppState.currentState !== 'active') {
    return false;
  }

  if (!(await hasBackgroundPermission())) {
    return false;
  }

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      TECHNICIAN_LOCATION_TASK,
    );
    if (hasStarted) {
      return true;
    }

    await Location.startLocationUpdatesAsync(
      TECHNICIAN_LOCATION_TASK,
      BACKGROUND_LOCATION_OPTIONS,
    );
    return true;
  } catch {
    return false;
  }
}

async function startForegroundWatch() {
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }

  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 120_000,
      distanceInterval: 25,
    },
    (location) => {
      void persistLocationUpdate(location.coords, 'foreground');
    },
  );
}

async function captureImmediateLocation() {
  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await persistLocationUpdate(current.coords, 'foreground');
  } catch {
    // watchPositionAsync will capture the next update
  }
}

export async function requestBackgroundLocationForTracking() {
  if (await hasBackgroundPermission()) {
    return tryStartBackgroundUpdates();
  }

  if (AppState.currentState !== 'active') {
    return false;
  }

  try {
    const result = await Location.requestBackgroundPermissionsAsync();
    if (!result.granted) {
      return false;
    }

    return tryStartBackgroundUpdates();
  } catch {
    return false;
  }
}

export async function startTechnicianLocationTracking(session: TrackingSession) {
  trackingSession = session;

  const foregroundGranted = await ensureForegroundPermission();
  if (!foregroundGranted) {
    throw new Error('Location permission is required for technician tracking.');
  }

  try {
    await startForegroundWatch();
    await captureImmediateLocation();
  } catch {
    throw new Error('Unable to start location tracking on this device.');
  }

  // Only start the Android foreground service when background permission is
  // already granted. Never open the background-permission settings during
  // automatic sync — that backgrounds the app and can crash on Android.
  await tryStartBackgroundUpdates();

  startFlushTimer();
  setLocationTrackingActive(true);
  await flushLocationActivityQueue();
}

export async function stopTechnicianLocationTracking() {
  trackingSession = {};
  setLocationTrackingActive(false);

  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      TECHNICIAN_LOCATION_TASK,
    );

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(TECHNICIAN_LOCATION_TASK);
    }
  } catch {
    // Ignore stop failures during cleanup.
  }

  stopFlushTimer();
  await flushLocationActivityQueue();
}

export async function isTechnicianLocationTrackingActive() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      TECHNICIAN_LOCATION_TASK,
    );
    return hasStarted || foregroundSubscription != null;
  } catch {
    return foregroundSubscription != null;
  }
}
