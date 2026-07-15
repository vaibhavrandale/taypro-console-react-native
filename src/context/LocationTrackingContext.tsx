import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { fetchPunchStatus } from '../api/attendance';
import {
  isTechnicianLocationTrackingActive,
  startTechnicianLocationTracking,
  stopTechnicianLocationTracking,
} from '../services/technicianLocationTracking';
import {
  flushLocationActivityQueue,
  hydrateLocationDebugStats,
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

export function LocationTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const trackingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [syncStatus, setSyncStatus] = useState<LocationSyncSnapshot>(
    getLocationSyncSnapshot,
  );
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    return subscribeLocationSyncStatus((next) => {
      setSyncStatus(next);
    });
  }, []);

  /** Upload any points stored on device (offline queue). Safe when offline. */
  const flushPendingQueue = useCallback(async () => {
    setSyncingNow(true);
    try {
      return await flushLocationActivityQueue({ origin: 'deferred' });
    } finally {
      setSyncingNow(false);
      await refreshLocationQueueCount();
    }
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
      }
    } catch {
      const active = await isTechnicianLocationTrackingActive();
      trackingRef.current = active;
      setLocationTrackingActive(active);
    }
  }, [isAuthenticated, user?._id, user?.role, user?.assigned_sites]);

  const syncNow = useCallback(async () => {
    return flushPendingQueue();
  }, [flushPendingQueue]);

  const refreshTrackingState = useCallback(async () => {
    // Always try uploading queued points first (works after offline / cold start).
    await flushPendingQueue();
    await syncTracking();
    await flushPendingQueue();
    await refreshLocationQueueCount();
  }, [flushPendingQueue, syncTracking]);

  useEffect(() => {
    if (AppState.currentState !== 'active') {
      return;
    }

    // ponytail: avoid deprecated InteractionManager; defer past first paint
    const timer = setTimeout(() => {
      void refreshTrackingState();
    }, 0);

    return () => clearTimeout(timer);
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
      void flushPendingQueue();
    }, PUNCH_POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role, syncTracking, flushPendingQueue]);

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
        // App opened / returned from background → upload anything stored on disk.
        void refreshTrackingState();
      } else if (state === 'background' || state === 'inactive') {
        // Best-effort flush before leaving foreground; queue stays if offline.
        void flushLocationActivityQueue({ origin: 'deferred' });
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [refreshTrackingState]);

  useEffect(() => {
    void hydrateLocationDebugStats();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      trackingRef.current = false;
      resetLocationSyncStatus();
      void stopTechnicianLocationTracking();
      return;
    }

    // Logged-in cold start: upload any leftover offline points.
    void flushPendingQueue();
  }, [isAuthenticated, flushPendingQueue]);

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
