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
import {
  addAlertNotificationResponseListener,
  consumeLaunchAlertType,
  dismissAlertNotification,
  ensureAlertNotificationsReady,
  presentAlertNotification,
  TIMER_ALERT_IDENTIFIER,
} from '../services/pushNotifications';

type TimerExecutionNotificationContextValue = {
  notifications: TimerExecutionNotification[];
  loading: boolean;
  submitting: boolean;
  error: string;
  visible: boolean;
  openModal: () => void;
  closeModal: () => void;
  refresh: (autoOpen?: boolean, silent?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const TimerExecutionNotificationContext =
  createContext<TimerExecutionNotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 30 * 1000;

function postTimerSystemAlert(items: TimerExecutionNotification[]) {
  if (items.length === 0) return;
  const blocks = items.reduce((sum, item) => sum + (item.block?.length ?? 0), 0);
  void presentAlertNotification({
    identifier: TIMER_ALERT_IDENTIFIER,
    title: 'Timer execution',
    body: `${items.length} site${items.length === 1 ? '' : 's'} · ${blocks} block${blocks === 1 ? '' : 's'} waiting for acknowledgement`,
    data: { type: 'timer_execution' },
  });
}

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
  const notificationsRef = useRef<TimerExecutionNotification[]>([]);
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
        const appActive = AppState.currentState === 'active';

        signatureRef.current = signature;
        notificationsRef.current = data;
        setNotifications(data);

        if (data.length === 0) {
          void dismissAlertNotification(TIMER_ALERT_IDENTIFIER);
          setVisible(false);
        } else {
          if (isNew) postTimerSystemAlert(data);
          if (autoOpen && appActive && (isNew || !silent)) {
            setVisible(true);
          }
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
      void dismissAlertNotification(TIMER_ALERT_IDENTIFIER);
      setNotifications([]);
      notificationsRef.current = [];
      setVisible(false);
      setError('');
      signatureRef.current = '';
      return;
    }

    void ensureAlertNotificationsReady();
    void load(true);
  }, [authLoading, isAuthenticated, user?._id, load]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const poll = () => {
      const active = AppState.currentState === 'active';
      void loadRef.current(active, true);
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void loadRef.current(true, true);
        return;
      }
      postTimerSystemAlert(notificationsRef.current);
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void consumeLaunchAlertType('timer_execution').then((type) => {
      if (type === 'timer_execution') {
        setVisible(true);
        void loadRef.current(false, true);
      }
    });

    const unsubscribe = addAlertNotificationResponseListener((type) => {
      if (type !== 'timer_execution') return;
      setVisible(true);
      void loadRef.current(false, true);
    });
    return unsubscribe;
  }, [isAuthenticated]);

  const openModal = useCallback(() => {
    if (notifications.length > 0) {
      setVisible(true);
      return;
    }
    void load(true);
  }, [notifications.length, load]);

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
      notificationsRef.current = [];
      setNotifications([]);
      setVisible(false);
      void dismissAlertNotification(TIMER_ALERT_IDENTIFIER);
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
      openModal,
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
      openModal,
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
