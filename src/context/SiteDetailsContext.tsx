import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSiteDetails } from '../api/siteDetails';
import { fetchClientWeather } from '../api/weather';
import { useAuth } from './AuthContext';
import { AssignedSite } from '../types/auth';
import { SiteDetails } from '../types/siteDetails';
import { SELECTED_SITE_STORAGE_KEY } from '../utils/sessionStorage';

type SiteDetailsContextValue = {
  assignedSites: AssignedSite[];
  selectedSite: AssignedSite | null;
  setSelectedSite: (site: AssignedSite | null) => void;
  siteDetails: SiteDetails | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
};

const SiteDetailsContext = createContext<SiteDetailsContextValue | undefined>(
  undefined,
);

export function SiteDetailsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const [selectedSite, setSelectedSiteState] = useState<AssignedSite | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const storedSiteIdRef = useRef<string | null>(null);
  const [siteDetails, setSiteDetails] = useState<SiteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void AsyncStorage.getItem(SELECTED_SITE_STORAGE_KEY).then((stored) => {
      storedSiteIdRef.current = stored;
      setHydrated(true);
    });
  }, []);

  const setSelectedSite = useCallback((site: AssignedSite | null) => {
    setSelectedSiteState(site);
    if (site?.site_id) {
      storedSiteIdRef.current = site.site_id;
      void AsyncStorage.setItem(SELECTED_SITE_STORAGE_KEY, site.site_id);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedSiteState(null);
      setSiteDetails(null);
      setError('');
      setLoading(false);
      return;
    }

    if (!hydrated) return;

    if (assignedSites.length === 0) {
      setSelectedSiteState(null);
      setSiteDetails(null);
      return;
    }

    setSelectedSiteState((current) => {
      if (current && assignedSites.some((s) => s.site_id === current.site_id)) {
        return current;
      }
      const storedId = storedSiteIdRef.current;
      const stored = storedId
        ? assignedSites.find((s) => s.site_id === storedId)
        : undefined;
      return stored ?? assignedSites[0];
    });
  }, [assignedSites, isAuthenticated, hydrated]);

  const loadSiteDetails = useCallback(async (siteId: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await fetchSiteDetails(siteId);
      try {
        const weather = await fetchClientWeather(siteId);
        if (weather) {
          data.weather = weather;
        }
      } catch {
        // Keep site-details weather if the client weather API fails.
      }
      setSiteDetails(data);
    } catch (err) {
      setSiteDetails(null);
      setError(err instanceof Error ? err.message : 'Failed to load site details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !selectedSite?.site_id) {
      setLoading(false);
      return;
    }

    loadSiteDetails(selectedSite.site_id);
  }, [selectedSite?.site_id, loadSiteDetails, isAuthenticated]);

  const refresh = useCallback(() => {
    if (selectedSite?.site_id) {
      loadSiteDetails(selectedSite.site_id, true);
    }
  }, [selectedSite?.site_id, loadSiteDetails]);

  const value = useMemo(
    () => ({
      assignedSites,
      selectedSite,
      setSelectedSite,
      siteDetails,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [
      assignedSites,
      selectedSite,
      setSelectedSite,
      siteDetails,
      loading,
      refreshing,
      error,
      refresh,
    ],
  );

  return (
    <SiteDetailsContext.Provider value={value}>
      {children}
    </SiteDetailsContext.Provider>
  );
}

export function useSiteDetails() {
  const context = useContext(SiteDetailsContext);
  if (!context) {
    throw new Error('useSiteDetails must be used within SiteDetailsProvider');
  }
  return context;
}

/** Shared site id for pickers. Last real site is persisted until the user picks another. */
export function usePersistedSiteId(options?: {
  initialSiteId?: string;
  allowAll?: boolean;
}) {
  const { assignedSites, selectedSite, setSelectedSite } = useSiteDetails();
  const [viewAll, setViewAll] = useState(false);
  const appliedInitial = useRef(false);
  const allowAll = options?.allowAll === true;
  const initialSiteId = options?.initialSiteId;

  useEffect(() => {
    if (appliedInitial.current || !initialSiteId || assignedSites.length === 0) {
      return;
    }
    const site = assignedSites.find((s) => s.site_id === initialSiteId);
    if (!site) return;
    appliedInitial.current = true;
    setViewAll(false);
    setSelectedSite(site);
  }, [assignedSites, initialSiteId, setSelectedSite]);

  const setSiteId = useCallback(
    (id: string) => {
      if (allowAll && id === 'all') {
        setViewAll(true);
        return;
      }
      setViewAll(false);
      const site = assignedSites.find((s) => s.site_id === id) ?? null;
      if (site) setSelectedSite(site);
    },
    [allowAll, assignedSites, setSelectedSite],
  );

  return {
    assignedSites,
    selectedSite,
    siteId: viewAll && allowAll ? 'all' : (selectedSite?.site_id ?? ''),
    setSiteId,
  };
}
