import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 5500;
const API_PATH = '/api/v1';

/** Android emulator alias for the host machine — must be exactly 10.0.2.2 */
const ANDROID_EMULATOR_HOST = '10.0.2.2';

/**
 * Your PC's LAN IP (same Wi‑Fi as phone). Find with: ipconfig → IPv4 Address.
 * Used when Expo can't detect Metro host automatically.
 */
const DEV_LAN_IP = '192.168.0.130';

function getMetroHost(): string | null {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri;

  if (!debuggerHost) return null;

  const host = debuggerHost.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
}

function getDevApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const metroHost = getMetroHost() ?? DEV_LAN_IP;

  // Android emulator
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return `http://${ANDROID_EMULATOR_HOST}:${API_PORT}${API_PATH}`;
  }

  // iOS simulator
  if (Platform.OS === 'ios' && !Constants.isDevice) {
    return `http://localhost:${API_PORT}${API_PATH}`;
  }

  // Physical phone / tablet on same Wi‑Fi as Metro
  return `http://${metroHost}:${API_PORT}${API_PATH}`;
}

export const API_BASE_URL = __DEV__
  ? getDevApiBaseUrl()
  : 'https://console.taypro.in/api/v1';
