import AsyncStorage from '@react-native-async-storage/async-storage';
import { GatewaysAndRobotsData } from '../types/robotSearch';

const SEARCH_CACHE_KEY = '@taypro_search_gateways_robots';

export async function loadSearchCache(): Promise<GatewaysAndRobotsData | null> {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GatewaysAndRobotsData;
  } catch {
    return null;
  }
}

export async function saveSearchCache(data: GatewaysAndRobotsData) {
  await AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(data));
}

export async function clearSearchCache() {
  await AsyncStorage.removeItem(SEARCH_CACHE_KEY);
}
