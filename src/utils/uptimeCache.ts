export type UptimeCacheEntry = {
  days: import('../types/robotUptime').RobotUptimeDay[];
  totals: {
    totalAssignedRobots: number;
    monthlyCleaningUptime: number;
    monthlyAvailabilityUptime: number;
    averageSuccess: number;
    averageFailure: number;
  };
  fetchedAt: number;
};

export type UptimeResultPayload = {
  days: import('../types/robotUptime').RobotUptimeDay[];
  totalAssignedRobots: number;
  monthlyCleaningUptime: number;
  monthlyAvailabilityUptime: number;
  averageSuccess: number;
  averageFailure: number;
};

export function toUptimeResultPayload(
  entry: Omit<UptimeCacheEntry, 'fetchedAt'>,
): UptimeResultPayload {
  return {
    days: entry.days,
    ...entry.totals,
  };
}

export function normalizeUptimeNumbers(
  values: Partial<UptimeResultPayload>,
): Omit<UptimeResultPayload, 'days'> {
  return {
    totalAssignedRobots: Number(values.totalAssignedRobots) || 0,
    monthlyCleaningUptime: Number(values.monthlyCleaningUptime) || 0,
    monthlyAvailabilityUptime: Number(values.monthlyAvailabilityUptime) || 0,
    averageSuccess: Number(values.averageSuccess) || 0,
    averageFailure: Number(values.averageFailure) || 0,
  };
}

const cache = new Map<string, UptimeCacheEntry>();

export function getUptimeCacheKey(
  siteId: string,
  month: number,
  year: number,
) {
  return `${siteId}:${year}:${month}`;
}

export function getUptimeCache(key: string): UptimeCacheEntry | undefined {
  return cache.get(key);
}

export function setUptimeCache(key: string, entry: Omit<UptimeCacheEntry, 'fetchedAt'>) {
  cache.set(key, {
    ...entry,
    fetchedAt: Date.now(),
  });
}

export function clearUptimeCache() {
  cache.clear();
}
