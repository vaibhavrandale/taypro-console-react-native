import { SiteRobot } from '../types/siteDetails';

export function isRobotOnline(loraState?: number) {
  return loraState === 1;
}

/** Marker color: yellow when cleaning in progress, else green online / red offline. */
export function getRobotMarkerColor(
  loraState?: number,
  lastStatus?: string | null,
) {
  const status = (lastStatus ?? '').trim().toLowerCase();
  if (status === 'cleaning in progress') return '#eab308';
  return isRobotOnline(loraState) ? '#22c55e' : '#ef4444';
}

export function getBatteryPercent(battery?: number | null) {
  if (battery == null || Number.isNaN(battery)) return null;
  return Math.max(0, Math.min(100, Math.round(battery)));
}

export function getBatteryLevel(percent: number | null) {
  if (percent == null) return 'unknown' as const;
  if (percent >= 70) return 'good' as const;
  if (percent >= 40) return 'medium' as const;
  return 'low' as const;
}

export function sortRobotsForDisplay(robots: SiteRobot[]) {
  return [...robots].sort((a, b) => {
    const onlineDiff = Number(isRobotOnline(b.lora_state)) - Number(isRobotOnline(a.lora_state));
    if (onlineDiff !== 0) return onlineDiff;

    const batteryA = getBatteryPercent(a.battery_voltage) ?? -1;
    const batteryB = getBatteryPercent(b.battery_voltage) ?? -1;
    return batteryA - batteryB;
  });
}
