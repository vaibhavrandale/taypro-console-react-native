import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchSiteDetails } from '../api/siteDetails';
import { useAuth } from './AuthContext';
import { AssignedSite } from '../types/auth';
import { SiteDetails } from '../types/siteDetails';

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

  const [selectedSite, setSelectedSite] = useState<AssignedSite | null>(null);
  const [siteDetails, setSiteDetails] = useState<SiteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedSite(null);
      setSiteDetails(null);
      setError('');
      setLoading(false);
      return;
    }

    if (assignedSites.length > 0) {
      setSelectedSite((current) => {
        if (current && assignedSites.some((s) => s.site_id === current.site_id)) {
          return current;
        }
        return assignedSites[0];
      });
    } else {
      setSelectedSite(null);
      setSiteDetails(null);
    }
  }, [assignedSites, isAuthenticated]);

  const loadSiteDetails = useCallback(async (siteId: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await fetchSiteDetails(siteId);
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
