import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  InteractionManager,
  type AppStateStatus,
} from 'react-native';
import { useAuth } from './AuthContext';
import { fetchPunchStatus } from '../api/attendance';
import {
  isTechnicianLocationTrackingActive,
  startTechnicianLocationTracking,
  stopTechnicianLocationTracking,
} from '../services/technicianLocationTracking';
import {
  flushLocationActivityQueue,
  refreshLocationQueueCount,
  type LocationFlushResult,
} from '../utils/locationActivityQueue';
import {
  getLocationSyncSnapshot,
  resetLocationSyncStatus,
  setLocationTrackingActive,
  subscribeLocationSyncStatus,
  type LocationSyncSnapshot,
} from '../utils/locationActivitySyncStatus';
import { canAccessAttendance } from '../utils/roles';
import { formatDateTimeIST } from '../utils/datetime';

type LocationTrackingContextValue = {
  refreshTrackingState: () => Promise<void>;
  syncStatus: LocationSyncSnapshot;
  syncNow: () => Promise<LocationFlushResult>;
  syncingNow: boolean;
};

const LocationTrackingContext = createContext<
  LocationTrackingContextValue | undefined
>(undefined);

const PUNCH_POLL_MS = 2 * 60_000;
const STATUS_POLL_MS = 15_000;

function showFirstSyncAlert(snapshot: LocationSyncSnapshot) {
  if (AppState.currentState !== 'active') {
    return;
  }

  const timeLabel = snapshot.lastSyncedAt
    ? formatDateTimeIST(snapshot.lastSyncedAt)
    : 'just now';
  const coords =
    snapshot.lastSyncedLat != null && snapshot.lastSyncedLng != null
      ? `\n${snapshot.lastSyncedLat.toFixed(6)}, ${snapshot.lastSyncedLng.toFixed(6)}`
      : '';

  Alert.alert(
    'Location saved',
    `Your location was uploaded to the server at ${timeLabel}.${coords}`,
    [{ text: 'OK' }],
  );
}

export function LocationTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const trackingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstSyncAlertShownRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<LocationSyncSnapshot>(
    getLocationSyncSnapshot,
  );
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    return subscribeLocationSyncStatus((next) => {
      setSyncStatus(next);

      if (
        next.totalSynced > 0 &&
        !firstSyncAlertShownRef.current &&
        next.lastSyncedAt
      ) {
        firstSyncAlertShownRef.current = true;
        showFirstSyncAlert(next);
      }
    });
  }, []);

  const syncTracking = useCallback(async () => {
    if (!isAuthenticated || !user?._id || !canAccessAttendance(user.role)) {
      if (trackingRef.current) {
        trackingRef.current = false;
        setLocationTrackingActive(false);
        await stopTechnicianLocationTracking();
      }
      return;
    }

    try {
      const status = await fetchPunchStatus(user._id);
      const shouldTrack = Boolean(status.punchedIn && !status.punchedOut);

      if (shouldTrack) {
        const attendanceId = status.data?._id;
        const siteId = status.data?.site_id ?? user.assigned_sites?.[0]?.site_id;

        if (!trackingRef.current) {
          try {
            await startTechnicianLocationTracking({
              attendanceId,
              siteId,
            });
            trackingRef.current = true;
            setLocationTrackingActive(true);
          } catch {
            trackingRef.current = false;
            setLocationTrackingActive(false);
          }
        } else {
          setLocationTrackingActive(true);
        }
        return;
      }

      if (trackingRef.current) {
        await stopTechnicianLocationTracking();
        trackingRef.current = false;
        setLocationTrackingActive(false);
        firstSyncAlertShownRef.current = false;
      }
    } catch {
      const active = await isTechnicianLocationTrackingActive();
      trackingRef.current = active;
      setLocationTrackingActive(active);
    }
  }, [isAuthenticated, user?._id, user?.role, user?.assigned_sites]);

  const syncNow = useCallback(async () => {
    setSyncingNow(true);
    try {
      return await flushLocationActivityQueue();
    } finally {
      setSyncingNow(false);
      await refreshLocationQueueCount();
    }
  }, []);

  const refreshTrackingState = useCallback(async () => {
    await syncTracking();
    await syncNow();
    await refreshLocationQueueCount();
  }, [syncTracking, syncNow]);

  useEffect(() => {
    if (AppState.currentState !== 'active') {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void refreshTrackingState();
    });

    return () => task.cancel();
  }, [refreshTrackingState]);

  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!isAuthenticated || !canAccessAttendance(user?.role)) {
      return;
    }

    pollTimerRef.current = setInterval(() => {
      void syncTracking();
      void syncNow();
    }, PUNCH_POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role, syncTracking, syncNow]);

  useEffect(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }

    if (!isAuthenticated || !canAccessAttendance(user?.role)) {
      return;
    }

    statusPollRef.current = setInterval(() => {
      void refreshLocationQueueCount();
    }, STATUS_POLL_MS);

    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshTrackingState();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [refreshTrackingState]);

  useEffect(() => {
    if (!isAuthenticated) {
      trackingRef.current = false;
      firstSyncAlertShownRef.current = false;
      resetLocationSyncStatus();
      void stopTechnicianLocationTracking();
    }
  }, [isAuthenticated]);

  const value = React.useMemo(
    () => ({
      refreshTrackingState,
      syncStatus,
      syncNow,
      syncingNow,
    }),
    [refreshTrackingState, syncStatus, syncNow, syncingNow],
  );

  return (
    <LocationTrackingContext.Provider value={value}>
      {children}
    </LocationTrackingContext.Provider>
  );
}

export function useLocationTracking() {
  const context = useContext(LocationTrackingContext);
  if (!context) {
    throw new Error('useLocationTracking must be used within LocationTrackingProvider');
  }
  return context;
}
