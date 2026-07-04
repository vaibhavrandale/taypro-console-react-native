import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { LocationActivitySource } from '../types/locationActivity';
import {
  enqueueLocationActivity,
  flushLocationActivityQueue,
} from '../utils/locationActivityQueue';

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

TaskManager.defineTask(TECHNICIAN_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)
    ?.locations;

  if (!locations?.length) return;

  const latest = locations[locations.length - 1];
  await persistLocationUpdate(latest.coords, 'background');
});

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

async function ensurePermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    throw new Error('Location permission is required for technician tracking.');
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    // Foreground tracking still works; background may be limited on some devices.
    return { backgroundGranted: false };
  }

  return { backgroundGranted: true };
}

export async function startTechnicianLocationTracking(session: TrackingSession) {
  trackingSession = session;

  const { backgroundGranted } = await ensurePermissions();

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

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await persistLocationUpdate(current.coords, 'foreground');
  } catch {
    // watchPositionAsync will capture the next update
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    TECHNICIAN_LOCATION_TASK,
  );

  if (!hasStarted && backgroundGranted) {
    await Location.startLocationUpdatesAsync(TECHNICIAN_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 120_000,
      distanceInterval: 25,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Nectyr location tracking',
        notificationBody: 'Tracking your site activity until punch out.',
        notificationColor: '#00C9A7',
      },
    });
  }

  startFlushTimer();
  await flushLocationActivityQueue();
}

export async function stopTechnicianLocationTracking() {
  trackingSession = {};

  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    TECHNICIAN_LOCATION_TASK,
  );

  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(TECHNICIAN_LOCATION_TASK);
  }

  stopFlushTimer();
  await flushLocationActivityQueue();
}

export async function isTechnicianLocationTrackingActive() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    TECHNICIAN_LOCATION_TASK,
  );
  return hasStarted || foregroundSubscription != null;
}
