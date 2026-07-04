import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  fetchLatestUnreadNotification,
  markNotificationRead,
} from '../api/customNotifications';
import { useAuth } from './AuthContext';
import type { CustomNotification } from '../types/customNotification';

type NotificationContextValue = {
  notification: CustomNotification | null;
  unreadCount: number;
  loading: boolean;
  submitting: boolean;
  error: string;
  visible: boolean;
  openNotification: () => void;
  closeNotification: () => void;
  refreshNotification: (autoOpen?: boolean, silent?: boolean) => Promise<void>;
  submitRead: (feedback?: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const NOTIFICATION_POLL_INTERVAL_MS = 30 * 1000;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notification, setNotification] = useState<CustomNotification | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const lastKnownIdRef = useRef<string | null>(null);
  const loadLatestRef = useRef<
    (autoOpen: boolean, silent?: boolean) => Promise<void>
  >(async () => {});

  const loadLatest = useCallback(async (autoOpen: boolean, silent = false) => {
    if (!isAuthenticated) {
      setNotification(null);
      setVisible(false);
      lastKnownIdRef.current = null;
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const latest = await fetchLatestUnreadNotification();
      const isNewAlert =
        latest != null && latest._id !== lastKnownIdRef.current;

      if (latest) {
        lastKnownIdRef.current = latest._id;
      } else {
        lastKnownIdRef.current = null;
      }

      setNotification(latest);
      if (autoOpen && latest && isNewAlert) {
        setVisible(true);
      }
      if (!latest) {
        setVisible(false);
      }
    } catch (err) {
      setNotification(null);
      setError(
        err instanceof Error ? err.message : 'Failed to load notification',
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadLatestRef.current = loadLatest;
  }, [loadLatest]);

  const refreshNotification = useCallback(
    async (autoOpen = false, silent = false) => {
      await loadLatest(autoOpen, silent);
    },
    [loadLatest],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setNotification(null);
      setVisible(false);
      setError('');
      lastKnownIdRef.current = null;
      return;
    }

    void loadLatest(true);
  }, [authLoading, isAuthenticated, loadLatest]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const poll = () => {
      if (AppState.currentState === 'active') {
        void loadLatestRef.current(true, true);
      }
    };

    const intervalId = setInterval(poll, NOTIFICATION_POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void loadLatestRef.current(true, true);
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [authLoading, isAuthenticated]);

  const openNotification = useCallback(() => {
    if (notification) {
      setVisible(true);
      return;
    }
    void loadLatest(true);
  }, [notification, loadLatest]);

  const closeNotification = useCallback(() => {
    setVisible(false);
  }, []);

  const submitRead = useCallback(
    async (feedback?: string) => {
      if (!notification?._id) return;

      setSubmitting(true);
      setError('');

      try {
        await markNotificationRead(notification._id, feedback);
        await loadLatest(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to mark notification as read',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [notification?._id, loadLatest],
  );

  const value = useMemo(
    () => ({
      notification,
      unreadCount: notification ? 1 : 0,
      loading,
      submitting,
      error,
      visible,
      openNotification,
      closeNotification,
      refreshNotification,
      submitRead,
    }),
    [
      notification,
      loading,
      submitting,
      error,
      visible,
      openNotification,
      closeNotification,
      refreshNotification,
      submitRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
