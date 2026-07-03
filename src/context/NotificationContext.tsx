import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  fetchLatestUnreadNotification,
  markNotificationRead,
} from '../api/customNotifications';
import { savePushToken } from '../api/pushToken';
import { isRemotePushSupported } from '../services/pushNotificationSupport';
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
  refreshNotification: () => Promise<void>;
  submitRead: (feedback?: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

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
  const loadLatestRef = useRef<(autoOpen: boolean) => Promise<void>>(async () => {});

  const loadLatest = useCallback(async (autoOpen: boolean) => {
    if (!isAuthenticated) {
      setNotification(null);
      setVisible(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const latest = await fetchLatestUnreadNotification();
      setNotification(latest);
      if (autoOpen && latest) {
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
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadLatestRef.current = loadLatest;
  }, [loadLatest]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    if (!isRemotePushSupported()) {
      if (__DEV__) {
        console.log(
          '[push] Skipped in Expo Go on Android — use an EAS dev build for remote push.',
        );
      }
      return;
    }

    let cancelled = false;
    let removeListeners: (() => void) | undefined;

    (async () => {
      try {
        const {
          registerForPushNotifications,
          addPushNotificationListeners,
        } = await import('../services/pushNotifications');

        const token = await registerForPushNotifications();
        if (!cancelled && token) {
          await savePushToken(token);
          if (__DEV__) {
            console.log('[push] Token registered and saved to backend');
          }
        }

        if (!cancelled) {
          removeListeners = await addPushNotificationListeners({
            onReceived: () => {
              void loadLatestRef.current(true);
            },
            onResponse: () => {
              void loadLatestRef.current(true);
            },
          });
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[push] Registration failed:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      removeListeners?.();
    };
  }, [authLoading, isAuthenticated]);

  const refreshNotification = useCallback(async () => {
    await loadLatest(false);
  }, [loadLatest]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setNotification(null);
      setVisible(false);
      setError('');
      return;
    }

    void loadLatest(true);
  }, [authLoading, isAuthenticated, loadLatest]);

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
