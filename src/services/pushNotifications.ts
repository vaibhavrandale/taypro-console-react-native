import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  isRemotePushSupported,
  ROBOT_ALERTS_CHANNEL_ID,
} from './pushNotificationSupport';

type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications(): Promise<NotificationsModule> {
  return import('expo-notifications');
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ROBOT_ALERTS_CHANNEL_ID, {
    name: 'Robot alerts',
    description: 'Critical robot failure and site alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

async function configureNotificationHandler(Notifications: NotificationsModule) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isRemotePushSupported()) {
    return null;
  }

  const Notifications = await loadNotifications();
  await configureNotificationHandler(Notifications);
  await ensureAndroidChannel(Notifications);

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function addPushNotificationListeners(handlers: {
  onReceived: () => void;
  onResponse: () => void;
}): Promise<() => void> {
  if (!isRemotePushSupported()) {
    return () => {};
  }

  const Notifications = await loadNotifications();
  await configureNotificationHandler(Notifications);

  const receivedSub = Notifications.addNotificationReceivedListener(
    handlers.onReceived,
  );
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    handlers.onResponse,
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
