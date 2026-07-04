import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { fetchPunchStatus } from '../api/attendance';
import {
  isTechnicianLocationTrackingActive,
  startTechnicianLocationTracking,
  stopTechnicianLocationTracking,
} from '../services/technicianLocationTracking';
import { flushLocationActivityQueue } from '../utils/locationActivityQueue';
import { canAccessAttendance } from '../utils/roles';

type LocationTrackingContextValue = {
  refreshTrackingState: () => Promise<void>;
};

const LocationTrackingContext = createContext<
  LocationTrackingContextValue | undefined
>(undefined);

const PUNCH_POLL_MS = 2 * 60_000;

export function LocationTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const trackingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncTracking = useCallback(async () => {
    if (!isAuthenticated || !user?._id || !canAccessAttendance(user.role)) {
      if (trackingRef.current) {
        trackingRef.current = false;
        await stopTechnicianLocationTracking();
      }
      return;
    }

    try {
      const status = await fetchPunchStatus();
      const shouldTrack = Boolean(status.punchedIn && !status.punchedOut);

      if (shouldTrack) {
        const attendanceId = status.data?._id;
        const siteId = status.data?.site_id ?? user.assigned_sites?.[0]?.site_id;

        if (!trackingRef.current) {
          await startTechnicianLocationTracking({
            attendanceId,
            siteId,
          });
          trackingRef.current = true;
        }
        return;
      }

      if (trackingRef.current) {
        await stopTechnicianLocationTracking();
        trackingRef.current = false;
      }
    } catch {
      const active = await isTechnicianLocationTrackingActive();
      trackingRef.current = active;
    }
  }, [isAuthenticated, user?._id, user?.role, user?.assigned_sites]);

  const refreshTrackingState = useCallback(async () => {
    await syncTracking();
    await flushLocationActivityQueue();
  }, [syncTracking]);

  useEffect(() => {
    void refreshTrackingState();
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
      void flushLocationActivityQueue();
    }, PUNCH_POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role, syncTracking]);

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
      void stopTechnicianLocationTracking();
    }
  }, [isAuthenticated]);

  const value = React.useMemo(
    () => ({ refreshTrackingState }),
    [refreshTrackingState],
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
