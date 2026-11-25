import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthToken } from '../api/client';
import { deleteDeviceItem } from './deviceStore';
import { clearSearchCache } from './searchCache';

export const USER_STORAGE_KEY = 'taypro_user';
export const SELECTED_SITE_STORAGE_KEY = '@taypro_selected_site_id';

/** User/session AsyncStorage keys cleared on sign out (theme prefs are kept). */
const SESSION_ASYNC_KEYS = [
  '@taypro_search_gateways_robots',
  SELECTED_SITE_STORAGE_KEY,
] as const;

export async function clearAllSessionData(): Promise<void> {
  await Promise.all([
    deleteDeviceItem(USER_STORAGE_KEY).catch(() => undefined),
    clearAuthToken(),
    clearSearchCache(),
    AsyncStorage.multiRemove([...SESSION_ASYNC_KEYS]).catch(() => undefined),
  ]);
}
