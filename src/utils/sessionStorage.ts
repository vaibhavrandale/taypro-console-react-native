import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearAuthToken } from '../api/client';
import { clearSearchCache } from './searchCache';

export const USER_STORAGE_KEY = 'taypro_user';

/** User/session AsyncStorage keys cleared on sign out (theme prefs are kept). */
const SESSION_ASYNC_KEYS = ['@taypro_search_gateways_robots'] as const;

export async function clearAllSessionData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(USER_STORAGE_KEY).catch(() => undefined),
    clearAuthToken(),
    clearSearchCache(),
    AsyncStorage.multiRemove([...SESSION_ASYNC_KEYS]).catch(() => undefined),
  ]);
}
