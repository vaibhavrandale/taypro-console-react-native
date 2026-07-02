import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchGatewaysAndRobots } from '../api/robots';
import { useAuth } from './AuthContext';
import {
  GatewaysAndRobotsData,
  SearchGateway,
  SearchRobot,
} from '../types/robotSearch';
import {
  clearSearchCache,
  saveSearchCache,
} from '../utils/searchCache';

type SearchContextValue = {
  visible: boolean;
  loading: boolean;
  error: string;
  data: GatewaysAndRobotsData;
  openSearch: () => void;
  closeSearch: () => void;
  refreshSearchData: () => Promise<void>;
  searchRobots: (query: string) => SearchRobot[];
  searchGateways: (query: string) => SearchGateway[];
};

const emptyData: GatewaysAndRobotsData = { robots: [], gateways: [] };

const SearchContext = createContext<SearchContextValue | null>(null);

function matchesQuery(query: string, values: Array<string | number | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(normalized),
  );
}

function normalizeSearchData(
  fresh: GatewaysAndRobotsData | null | undefined,
): GatewaysAndRobotsData {
  return {
    robots: fresh?.robots ?? [],
    gateways: fresh?.gateways ?? [],
  };
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GatewaysAndRobotsData>(emptyData);

  const clearSearchData = useCallback(async () => {
    await clearSearchCache();
    setData(emptyData);
    setError('');
    setLoading(false);
  }, []);

  const fetchAndCacheSearchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const fresh = await fetchGatewaysAndRobots();
      const normalized = normalizeSearchData(fresh);
      await saveSearchCache(normalized);
      setData(normalized);
      return normalized;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load search data',
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      void clearSearchData();
      return;
    }

    void fetchAndCacheSearchData().catch(() => {
      // Error state is already set in fetchAndCacheSearchData.
    });
  }, [authLoading, isAuthenticated, clearSearchData, fetchAndCacheSearchData]);

  const openSearch = useCallback(() => {
    if (!isAuthenticated) return;
    setVisible(true);
  }, [isAuthenticated]);

  const closeSearch = useCallback(() => {
    setVisible(false);
  }, []);

  const refreshSearchData = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchAndCacheSearchData();
  }, [fetchAndCacheSearchData, isAuthenticated]);

  const searchRobots = useCallback(
    (query: string) => {
      if (!query.trim()) return [];
      return (data?.robots ?? []).filter((robot) =>
        matchesQuery(query, [
          robot.robot_no,
          robot.deveui,
          robot.block,
          robot.site_id,
          robot.lora_no,
          robot.robot_type,
          robot.company,
        ]),
      );
    },
    [data?.robots],
  );

  const searchGateways = useCallback(
    (query: string) => {
      if (!query.trim()) return [];
      return (data?.gateways ?? []).filter((gateway) =>
        matchesQuery(query, [
          gateway.gateway_name,
          gateway.gateway_type,
          gateway.gateway_id_in_lns_server,
        ]),
      );
    },
    [data?.gateways],
  );

  const value = useMemo(
    () => ({
      visible,
      loading,
      error,
      data,
      openSearch,
      closeSearch,
      refreshSearchData,
      searchRobots,
      searchGateways,
    }),
    [
      visible,
      loading,
      error,
      data,
      openSearch,
      closeSearch,
      refreshSearchData,
      searchRobots,
      searchGateways,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
