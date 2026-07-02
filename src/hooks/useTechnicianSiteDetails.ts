import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSiteDetails } from '../api/siteDetails';
import { useAuth } from '../context/AuthContext';
import { AssignedSite } from '../types/auth';
import { SiteDetails } from '../types/siteDetails';

export function useTechnicianSiteDetails() {
  const { user } = useAuth();

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const [selectedSite, setSelectedSite] = useState<AssignedSite | null>(null);
  const [siteDetails, setSiteDetails] = useState<SiteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignedSites.length > 0) {
      setSelectedSite((current) => {
        if (current && assignedSites.some((s) => s.site_id === current.site_id)) {
          return current;
        }
        return assignedSites[0];
      });
    } else {
      setSelectedSite(null);
    }
  }, [assignedSites]);

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
    if (!selectedSite?.site_id) {
      setLoading(false);
      setSiteDetails(null);
      return;
    }

    loadSiteDetails(selectedSite.site_id);
  }, [selectedSite?.site_id, loadSiteDetails]);

  const refresh = useCallback(() => {
    if (selectedSite?.site_id) {
      loadSiteDetails(selectedSite.site_id, true);
    }
  }, [selectedSite?.site_id, loadSiteDetails]);

  return {
    assignedSites,
    selectedSite,
    setSelectedSite,
    siteDetails,
    loading,
    refreshing,
    error,
    refresh,
  };
}
