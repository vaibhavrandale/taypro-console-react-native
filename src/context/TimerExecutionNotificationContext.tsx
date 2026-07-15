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
  fetchTimerExecutionNotifications,
  markAllTimerNotificationsRead,
} from '../api/timerExecutionNotifications';
import { useAuth } from './AuthContext';
import type { TimerExecutionNotification } from '../types/timerExecutionNotification';

type TimerExecutionNotificationContextValue = {
  notifications: TimerExecutionNotification[];
  loading: boolean;
  submitting: boolean;
  error: string;
  visible: boolean;
  closeModal: () => void;
  refresh: (autoOpen?: boolean, silent?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const TimerExecutionNotificationContext =
  createContext<TimerExecutionNotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 30 * 1000;

export function TimerExecutionNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [notifications, setNotifications] = useState<
    TimerExecutionNotification[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const signatureRef = useRef<string>('');
  const loadRef = useRef<(autoOpen: boolean, silent?: boolean) => Promise<void>>(
    async () => {},
  );

  const load = useCallback(
    async (autoOpen: boolean, silent = false) => {
      if (!isAuthenticated || !user?._id) {
        setNotifications([]);
        setVisible(false);
        signatureRef.current = '';
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError('');

      try {
        const data = await fetchTimerExecutionNotifications(user._id);
        const signature = data
          .map((item) => item._id)
          .sort()
          .join('|');
        const isNew = signature.length > 0 && signature !== signatureRef.current;

        signatureRef.current = signature;
        setNotifications(data);

        if (data.length === 0) {
          setVisible(false);
        } else if (autoOpen && (isNew || !silent)) {
          setVisible(true);
        }
      } catch (err) {
        setNotifications([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load timer notifications',
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, user?._id],
  );

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const refresh = useCallback(
    async (autoOpen = false, silent = false) => {
      await load(autoOpen, silent);
    },
    [load],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?._id) {
      setNotifications([]);
      setVisible(false);
      setError('');
      signatureRef.current = '';
      return;
    }

    void load(true);
  }, [authLoading, isAuthenticated, user?._id, load]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const poll = () => {
      if (AppState.currentState === 'active') {
        void loadRef.current(true, true);
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void loadRef.current(true, true);
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [authLoading, isAuthenticated]);

  const closeModal = useCallback(() => {
    // Must mark as read — keep open (matches web backdrop="static").
  }, []);

  const markAllRead = useCallback(async () => {
    if (notifications.length === 0) return;

    setSubmitting(true);
    setError('');

    try {
      await markAllTimerNotificationsRead(notifications.map((item) => item._id));
      signatureRef.current = '';
      setNotifications([]);
      setVisible(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to mark timer notifications as read',
      );
    } finally {
      setSubmitting(false);
    }
  }, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      submitting,
      error,
      visible,
      closeModal,
      refresh,
      markAllRead,
    }),
    [
      notifications,
      loading,
      submitting,
      error,
      visible,
      closeModal,
      refresh,
      markAllRead,
    ],
  );

  return (
    <TimerExecutionNotificationContext.Provider value={value}>
      {children}
    </TimerExecutionNotificationContext.Provider>
  );
}

export function useTimerExecutionNotification() {
  const context = useContext(TimerExecutionNotificationContext);
  if (!context) {
    throw new Error(
      'useTimerExecutionNotification must be used within TimerExecutionNotificationProvider',
    );
  }
  return context;
}
