import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** expo-secure-store's web build is an empty module, so the browser uses localStorage. */
const web = Platform.OS === 'web';

export async function getDeviceItem(key: string): Promise<string | null> {
  if (web) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setDeviceItem(key: string, value: string): Promise<void> {
  if (web) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteDeviceItem(key: string): Promise<void> {
  if (web) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
