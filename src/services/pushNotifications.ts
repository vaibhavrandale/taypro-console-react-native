import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from '../api/voiceCalls';

export const CALL_CHANNEL_ID = 'calls';

type NotificationsModule = typeof import('expo-notifications');

let notifications: NotificationsModule | null | undefined;
let handlerSet = false;
let cachedToken: string | null = null;

/**
 * Lazily load expo-notifications. Builds made before this module was added have
 * no native side, and touching it at import time would crash app startup, so
 * every entry point below tolerates a missing module.
 *
 * Expo Go dropped remote-notification support in SDK 53 and throws on every
 * call, so treat it as unavailable rather than letting it error repeatedly.
 */
function loadNotifications(): NotificationsModule | null {
  if (notifications !== undefined) return notifications;
  if (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  ) {
    notifications = null;
    return notifications;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require('expo-notifications') as NotificationsModule;
  } catch {
    notifications = null;
  }
  return notifications;
}

export function isPushAvailable(): boolean {
  return loadNotifications() != null;
}

function ensureForegroundHandler(mod: NotificationsModule) {
  if (handlerSet) return;
  try {
    // Surface the banner so a call is visible even when the app is open but
    // not on the call screen.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerSet = true;
  } catch {
    // ignore — notifications simply won't be presented in foreground
  }
}

async function ensureCallChannel(mod: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  // MAX importance + bypassDnd makes an incoming call ring like a real call.
  await mod.setNotificationChannelAsync(CALL_CHANNEL_ID, {
    name: 'Incoming calls',
    importance: mod.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 800, 700, 800],
    bypassDnd: true,
    lockscreenVisibility: mod.AndroidNotificationVisibility.PUBLIC,
  });
}

function getProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId
  );
}

/**
 * Ask permission, get the Expo push token, and register it with the backend so
 * offline call invites can wake this device. Safe to call repeatedly.
 */
export async function registerForCallPushAsync(): Promise<string | null> {
  const mod = loadNotifications();
  if (!mod) return null;

  try {
    ensureForegroundHandler(mod);
    await ensureCallChannel(mod);

    const existing = await mod.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await mod.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    if (!projectId) return null;

    const { data } = await mod.getExpoPushTokenAsync({ projectId });
    cachedToken = data;
    await registerPushToken(data);
    return data;
  } catch {
    return null;
  }
}

export async function unregisterCallPushAsync(): Promise<void> {
  if (!cachedToken) return;
  try {
    await unregisterPushToken(cachedToken);
  } catch {
    // best effort on sign-out
  }
  cachedToken = null;
}

function callIdFromData(data: unknown): string | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as { type?: unknown }).type === 'incoming_call'
  ) {
    const id = (data as { callId?: unknown }).callId;
    return typeof id === 'string' && id ? id : null;
  }
  return null;
}

/**
 * If the app was launched by tapping a call notification, return that call id
 * once so the caller can resume the ringing call.
 */
export async function consumeLaunchCallId(): Promise<string | null> {
  const mod = loadNotifications();
  if (!mod) return null;
  try {
    const response = await mod.getLastNotificationResponseAsync();
    const id = callIdFromData(response?.notification.request.content.data);
    if (id) await mod.clearLastNotificationResponseAsync();
    return id;
  } catch {
    return null;
  }
}

export function addCallNotificationResponseListener(
  handler: (callId: string) => void,
): () => void {
  const mod = loadNotifications();
  if (!mod) return () => undefined;
  try {
    const sub = mod.addNotificationResponseReceivedListener((response) => {
      const id = callIdFromData(response.notification.request.content.data);
      if (id) handler(id);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
