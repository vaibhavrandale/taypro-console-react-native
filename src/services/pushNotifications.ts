import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from '../api/voiceCalls';

export const CALL_CHANNEL_ID = 'calls';
export const ALERTS_CHANNEL_ID = 'alerts';
export const TIMER_ALERT_IDENTIFIER = 'timer-execution-alert';
export const CALL_CATEGORY_ID = 'incomingcall';
export const CALL_ACTION_ACCEPT = 'acceptcall';
export const CALL_ACTION_DECLINE = 'declinecall';

export type AlertNotificationType = 'custom_notification' | 'timer_execution';

type NotificationsModule = typeof import('expo-notifications');

let notifications: NotificationsModule | null | undefined;
let handlerSet = false;
let cachedToken: string | null = null;
let callChannelEnsured = false;

/**
 * Lazily load expo-notifications. Builds made before this module was added have
 * no native side, and touching it at import time would crash app startup, so
 * every entry point below tolerates a missing module.
 *
 * Expo Go dropped remote notifications in SDK 53 and throws on every call
 * (including local present/handler APIs on Android). Skip the module entirely
 * there; system tray alerts need a development build.
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

export function customAlertIdentifier(notificationId: string): string {
  return `custom-alert:${notificationId}`;
}

export function alertTypeFromData(data: unknown): AlertNotificationType | null {
  if (typeof data !== 'object' || data === null || !('type' in data)) {
    return null;
  }
  const type = (data as { type?: unknown }).type;
  if (type === 'custom_notification' || type === 'timer_execution') {
    return type;
  }
  return null;
}

function ensureForegroundHandler(mod: NotificationsModule) {
  if (handlerSet) return;
  try {
    mod.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const isCall = callIdFromData(data) != null;
        const inForeground = AppState.currentState === 'active';
        return {
          shouldPlaySound: !isCall || !inForeground,
          shouldSetBadge: false,
          // In-app call modal already covers foreground ringing. Heads-up
          // only when the app is not on screen so a locked / backgrounded
          // phone still alerts.
          shouldShowBanner: !inForeground,
          shouldShowList: true,
          ...(isCall && !inForeground
            ? { priority: mod.AndroidNotificationPriority.MAX }
            : {}),
        };
      },
    });
    handlerSet = true;
  } catch {
    // ignore — notifications simply won't be presented in foreground
  }
}

async function ensureCallChannel(mod: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  if (callChannelEnsured) return;
  try {
    await mod.deleteNotificationChannelAsync(CALL_CHANNEL_ID);
  } catch {
    // first run, or channel already gone
  }
  await mod.setNotificationChannelAsync(CALL_CHANNEL_ID, {
    name: 'Incoming calls',
    importance: mod.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 800, 700, 800, 700, 800],
    bypassDnd: true,
    enableVibrate: true,
    enableLights: true,
    lockscreenVisibility: mod.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: mod.AndroidAudioUsage.NOTIFICATION_RINGTONE,
      contentType: mod.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
  callChannelEnsured = true;
}

async function ensureCallCategory(mod: NotificationsModule) {
  try {
    await mod.setNotificationCategoryAsync(CALL_CATEGORY_ID, [
      {
        identifier: CALL_ACTION_ACCEPT,
        buttonTitle: 'Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: CALL_ACTION_DECLINE,
        buttonTitle: 'Decline',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);
  } catch {
    // categories unavailable on this build
  }
}

async function ensureAlertChannel(mod: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await mod.setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
    name: 'Alerts',
    importance: mod.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: mod.AndroidNotificationVisibility.PUBLIC,
  });
}

async function ensurePermission(mod: NotificationsModule): Promise<boolean> {
  const existing = await mod.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await mod.requestPermissionsAsync()).status;
  }
  return status === 'granted';
}

function getProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId
  );
}

/** Permission + Android channels so local/system alerts can show. */
export async function ensureAlertNotificationsReady(): Promise<boolean> {
  const mod = loadNotifications();
  if (!mod) return false;

  try {
    ensureForegroundHandler(mod);
    await ensureCallChannel(mod);
    await ensureAlertChannel(mod);
    await ensureCallCategory(mod);
    return await ensurePermission(mod);
  } catch {
    return false;
  }
}

/**
 * Ask permission, get the Expo push token, and register it with the backend so
 * offline call invites can wake this device. Safe to call repeatedly.
 */
export async function registerForCallPushAsync(): Promise<string | null> {
  const ready = await ensureAlertNotificationsReady();
  if (!ready) return null;

  const mod = loadNotifications();
  if (!mod) return null;

  try {
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

export async function presentIncomingCallNotification(opts: {
  callId: string;
  callerName: string;
}): Promise<void> {
  const mod = loadNotifications();
  if (!mod) return;

  try {
    ensureForegroundHandler(mod);
    await ensureCallChannel(mod);
    await ensureCallCategory(mod);
    await mod.scheduleNotificationAsync({
      identifier: `incomingcall_${opts.callId}`,
      content: {
        title: 'Incoming call',
        body: `${opts.callerName} is calling you`,
        sound: Platform.OS === 'ios' ? 'defaultRingtone' : 'default',
        categoryIdentifier: CALL_CATEGORY_ID,
        interruptionLevel: 'timeSensitive',
        sticky: true,
        autoDismiss: false,
        data: { type: 'incoming_call', callId: opts.callId },
        ...(Platform.OS === 'android'
          ? {
              channelId: CALL_CHANNEL_ID,
              priority: 'max',
              vibrate: [0, 800, 700, 800, 700, 800],
            }
          : {}),
      },
      trigger: null,
    });
  } catch {
    // ignore — lock-screen ring simply won't show
  }
}

export async function dismissIncomingCallNotifications(
  callId?: string,
): Promise<void> {
  const mod = loadNotifications();
  if (!mod) return;
  try {
    if (callId) {
      await mod.dismissNotificationAsync(`incomingcall_${callId}`);
    }
    const presented = await mod.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => {
          const id = callIdFromData(item.request.content.data);
          return id != null && (!callId || id === callId);
        })
        .map((item) => mod.dismissNotificationAsync(item.request.identifier)),
    );
  } catch {
    // already gone
  }
}

export async function presentAlertNotification(opts: {
  identifier: string;
  title: string;
  body: string;
  data: { type: AlertNotificationType; [key: string]: string };
}): Promise<void> {
  const mod = loadNotifications();
  if (!mod) return;

  try {
    ensureForegroundHandler(mod);
    await ensureAlertChannel(mod);
    await mod.scheduleNotificationAsync({
      identifier: opts.identifier,
      content: {
        title: opts.title,
        body: opts.body,
        sound: 'default',
        data: opts.data,
        ...(Platform.OS === 'android' ? { channelId: ALERTS_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch {
    // ignore — system tray simply won't show
  }
}

export async function dismissAlertNotification(
  identifier: string,
): Promise<void> {
  const mod = loadNotifications();
  if (!mod) return;
  try {
    await mod.dismissNotificationAsync(identifier);
  } catch {
    // already gone
  }
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

export async function consumeLaunchAlertType(
  expected?: AlertNotificationType,
): Promise<AlertNotificationType | null> {
  const mod = loadNotifications();
  if (!mod) return null;
  try {
    const response = await mod.getLastNotificationResponseAsync();
    const type = alertTypeFromData(
      response?.notification.request.content.data,
    );
    if (!type) return null;
    if (expected && type !== expected) return null;
    await mod.clearLastNotificationResponseAsync();
    return type;
  } catch {
    return null;
  }
}

export function addCallNotificationResponseListener(
  handler: (callId: string, actionIdentifier: string) => void,
): () => void {
  const mod = loadNotifications();
  if (!mod) return () => undefined;
  try {
    const sub = mod.addNotificationResponseReceivedListener((response) => {
      const id = callIdFromData(response.notification.request.content.data);
      if (id) handler(id, response.actionIdentifier);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}

export function addCallNotificationReceivedListener(
  handler: (callId: string) => void,
): () => void {
  const mod = loadNotifications();
  if (!mod) return () => undefined;
  try {
    const sub = mod.addNotificationReceivedListener((notification) => {
      const id = callIdFromData(notification.request.content.data);
      if (id) handler(id);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}

export function addAlertNotificationResponseListener(
  handler: (type: AlertNotificationType) => void,
): () => void {
  const mod = loadNotifications();
  if (!mod) return () => undefined;
  try {
    const sub = mod.addNotificationResponseReceivedListener((response) => {
      const type = alertTypeFromData(
        response.notification.request.content.data,
      );
      if (type) handler(type);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
