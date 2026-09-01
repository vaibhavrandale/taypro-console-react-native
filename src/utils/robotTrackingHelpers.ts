import type {
  CleaningPercentageResult,
  RobotCleaning,
  RobotPhaseResult,
  RobotTrackDetail,
  RobotTracking,
} from '../types/robotTracking';

/** Physical position along the row: 0 = dock (DS), 1 = reverse station (RS). */
export function pointToSegmentPctFromDock(point: number): number {
  const p = Number(point) || 0;
  if (p >= 20 && p <= 29) return (p - 19) / (29 - 19);
  if (p === 30) return 1;
  if (p >= 31 && p <= 40) return Math.max(0, (40 - p) / (40 - 30));
  return 0;
}

function isFinishedYesterdayOrEarlier(cleaning?: RobotCleaning): boolean {
  if (!cleaning?.finish || !cleaning?.finishAt) return false;
  try {
    const finishDate = new Date(cleaning.finishAt);
    if (Number.isNaN(finishDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finishDateOnly = new Date(finishDate);
    finishDateOnly.setHours(0, 0, 0, 0);
    return finishDateOnly.getTime() < today.getTime();
  } catch {
    return false;
  }
}

export function getHighestTrackPoint(
  trackDetails?: RobotTrackDetail[],
): number {
  if (!trackDetails?.length) return 0;
  const valid = trackDetails
    .map((td) => td.point)
    .filter((p) => p >= 19 && p <= 40);
  if (valid.length > 0) return Math.max(...valid);
  return trackDetails[trackDetails.length - 1]?.point || 0;
}

export function getRobotPhase(
  pt: number,
  L: number,
  cleaning: RobotCleaning | undefined,
  trackDetails: RobotTrackDetail[] = [],
): RobotPhaseResult {
  let phase = 'At Dock';
  let badgeColor = 'secondary';
  let iconBorder = '#6c757d';
  let segmentPct = 0;

  const isFinishedFromPreviousDay =
    Boolean(cleaning?.finish) && isFinishedYesterdayOrEarlier(cleaning);

  const points = trackDetails.map((t) => t.point).sort((a, b) => a - b);
  let effectivePoint = pt;
  if (points.length) {
    const lastPoint = Math.max(...points);
    if (lastPoint > pt) effectivePoint = lastPoint;
  }

  if (cleaning?.battery_dead && !cleaning.finish) {
    return {
      phase: 'Battery Dead',
      badgeColor: 'danger',
      iconBorder: '#dc3545',
      segmentPct: pointToSegmentPctFromDock(effectivePoint),
      effectivePoint,
    };
  }
  if (cleaning?.battery_dead && cleaning.finish) {
    return {
      phase: 'Battery Dead',
      badgeColor: 'danger',
      iconBorder: '#dc3545',
      segmentPct: 0,
      effectivePoint,
    };
  }
  if (
    effectivePoint === 40 &&
    (cleaning?.cleaning_cancelled || cleaning?.battery_dead)
  ) {
    if (isFinishedFromPreviousDay) {
      return {
        phase: 'At Dock',
        badgeColor: 'secondary',
        iconBorder: '#6c757d',
        segmentPct: 0,
        effectivePoint,
      };
    }
    return {
      phase: 'Cleaning Completed & At Dock',
      badgeColor: 'success',
      iconBorder: '#000',
      segmentPct: 0,
      effectivePoint,
    };
  }
  if (cleaning?.cleaning_cancelled) {
    return {
      phase: 'Cleaning Cancelled',
      badgeColor: 'warning',
      iconBorder: '#6c757d',
      segmentPct: pointToSegmentPctFromDock(effectivePoint),
      effectivePoint,
    };
  }
  if (effectivePoint !== 40 && cleaning?.finish) {
    if (isFinishedFromPreviousDay) {
      return {
        phase: 'At Dock',
        badgeColor: 'secondary',
        iconBorder: '#6c757d',
        segmentPct: 0,
        effectivePoint,
      };
    }
    return {
      phase: 'Cleaning Completed & At Dock',
      badgeColor: 'success',
      iconBorder: '#198754',
      segmentPct: 0,
      effectivePoint,
    };
  }

  if (effectivePoint === 11) {
    phase = 'At Dock';
    badgeColor = 'success';
    iconBorder = '#343a40';
    segmentPct = 0;
  } else if (effectivePoint === 40 && cleaning?.finish) {
    if (isFinishedFromPreviousDay) {
      phase = 'At Dock';
      badgeColor = 'secondary';
      iconBorder = '#6c757d';
      segmentPct = 0;
    } else {
      phase = 'Cleaning Completed & At Dock';
      badgeColor = 'success';
      iconBorder = '#000';
      segmentPct = 0;
    }
  } else if (effectivePoint === 29) {
    phase = 'At Reverse Station';
    badgeColor = 'warning';
    iconBorder = '#ffc107';
    segmentPct = 1;
  } else if (effectivePoint === 30) {
    phase = 'Ready for Reverse Cleaning';
    badgeColor = 'primary';
    iconBorder = '#17a2b8';
    segmentPct = 1;
  } else if (effectivePoint >= 20 && effectivePoint <= 28) {
    phase = 'Forward Cleaning';
    badgeColor = 'success';
    iconBorder = '#2eb85c';
    segmentPct = pointToSegmentPctFromDock(effectivePoint);
  } else if (effectivePoint >= 31 && effectivePoint <= 39) {
    phase = 'Reverse Cleaning';
    badgeColor = 'primary';
    iconBorder = '#0d6efd';
    segmentPct = pointToSegmentPctFromDock(effectivePoint);
  } else if (effectivePoint === 40) {
    phase = 'At Dock';
    badgeColor = 'success';
    iconBorder = '#343a40';
    segmentPct = 0;
  } else {
    phase = 'At Dock';
    badgeColor = 'secondary';
    iconBorder = '#6c757d';
    segmentPct = L ? pt / L : 0;
  }

  return { phase, badgeColor, iconBorder, segmentPct, effectivePoint };
}

export function getCleaningPercentage(
  pt: number,
  robot: RobotTracking,
): CleaningPercentageResult {
  const totalSteps = 20;
  if (robot.cleaning?.finish === true) {
    return {
      point: pt,
      distanceCovered: totalSteps,
      totalDistance: totalSteps,
      percentage: 100,
    };
  }

  let highestPoint = pt;
  if (robot.track_details?.length) {
    const valid = robot.track_details
      .map((td) => td.point)
      .filter((p) => p >= 19 && p <= 40);
    if (valid.length > 0) highestPoint = Math.max(...valid);
  }

  let distance = 0;
  let percentage = 0;

  if (highestPoint >= 20 && highestPoint <= 29) {
    distance = highestPoint - 19;
    percentage = (distance / totalSteps) * 100;
  } else if (highestPoint === 30) {
    distance = 10;
    percentage = (distance / totalSteps) * 100;
  } else if (highestPoint >= 31 && highestPoint <= 39) {
    distance = 10 + (highestPoint - 30);
    percentage = (distance / totalSteps) * 100;
  } else if (highestPoint === 40) {
    distance = 20;
    percentage = 99;
  }

  return {
    point: highestPoint,
    distanceCovered: distance,
    totalDistance: totalSteps,
    percentage: Math.round(percentage),
  };
}

export function getStatusText(robot: RobotTracking, phase: string): string {
  const cleaning = robot.cleaning;
  const highestPoint = getHighestTrackPoint(robot.track_details);

  if (cleaning?.finish === true && isFinishedYesterdayOrEarlier(cleaning)) {
    return 'Not yet started';
  }
  if (cleaning?.finish === true) return 'Cleaning Finished';
  if (cleaning?.cleaning_cancelled === true) return 'Cleaning Cancelled';
  if (cleaning?.battery_dead === true) return 'Battery Dead';
  if (cleaning?.start === true) {
    if (phase === 'Forward Cleaning') return 'Forward Cleaning In Progress';
    if (phase === 'Reverse Cleaning') return 'Return Cleaning In Progress';
    if (
      phase === 'At Reverse Station' ||
      phase === 'Ready for Reverse Cleaning'
    ) {
      return 'At Reverse Station';
    }
    if (highestPoint >= 20 && highestPoint <= 40) {
      if (highestPoint >= 20 && highestPoint <= 28) {
        return 'Forward Cleaning In Progress';
      }
      if (highestPoint >= 31 && highestPoint <= 39) {
        return 'Return Cleaning In Progress';
      }
      if (highestPoint === 40) return 'At Dock';
    }
    return 'Starting Cleaning Cycle';
  }
  return 'At Dock';
}

export function getBatteryPercentage(robot: RobotTracking): number | null {
  const cleaning = robot.cleaning || {};
  if (cleaning.battery_after_cleaning != null) {
    return Number(cleaning.battery_after_cleaning);
  }
  if (cleaning.battery_at_reverse_station != null) {
    return Number(cleaning.battery_at_reverse_station);
  }
  if (cleaning.battery_before_cleaning != null) {
    return Number(cleaning.battery_before_cleaning);
  }
  return null;
}

export type TrackVisualState =
  | 'cleaning-in-progress'
  | 'cleaning-finished'
  | 'cleaning-cancelled'
  | 'battery-dead'
  | 'no-cleaning-today'
  | 'unknown-status';

export function getTrackVisualState(
  robot: RobotTracking,
  statusText: string,
  phase: string,
): {
  state: TrackVisualState;
  borderColor: string;
  gearStatus: 'progress' | 'failed' | 'finished' | null;
  gearSpin: 'cw' | 'ccw' | null;
} {
  const cleaning = robot.cleaning || {};
  const highestPoint = getHighestTrackPoint(robot.track_details);

  if (
    cleaning.start &&
    !cleaning.finish &&
    !cleaning.cleaning_cancelled &&
    !cleaning.battery_dead
  ) {
    // Point 40 = at dock after reverse pass, finish flag not yet received.
    // Still treat as return-to-DS so the gear spins anticlockwise (ccw).
    const isReturn =
      phase === 'Reverse Cleaning' ||
      phase === 'At Reverse Station' ||
      phase === 'Ready for Reverse Cleaning' ||
      (highestPoint >= 29 && highestPoint <= 40);
    return {
      state: 'cleaning-in-progress',
      borderColor: 'rgb(255, 187, 61)',
      gearStatus: 'progress',
      gearSpin: isReturn ? 'ccw' : 'cw',
    };
  }
  if (cleaning.finish && statusText === 'Cleaning Finished') {
    return {
      state: 'cleaning-finished',
      borderColor: 'limegreen',
      gearStatus: 'finished',
      gearSpin: null,
    };
  }
  if (cleaning.cleaning_cancelled) {
    return {
      state: 'cleaning-cancelled',
      borderColor: 'rgb(250, 28, 28)',
      gearStatus: 'failed',
      gearSpin: null,
    };
  }
  if (cleaning.battery_dead) {
    return {
      state: 'battery-dead',
      borderColor: 'rgb(250, 28, 28)',
      gearStatus: 'failed',
      gearSpin: null,
    };
  }
  if (!cleaning.start && !cleaning.finish) {
    return {
      state: 'no-cleaning-today',
      borderColor: '#ffffff',
      gearStatus: null,
      gearSpin: null,
    };
  }
  if (cleaning.finish) {
    return {
      state: 'cleaning-finished',
      borderColor: 'limegreen',
      gearStatus: null,
      gearSpin: null,
    };
  }
  return {
    state: 'unknown-status',
    borderColor: 'rgb(83, 247, 247)',
    gearStatus: null,
    gearSpin: null,
  };
}

export function formatSeconds(totalSec?: number): string {
  if (totalSec == null || Number.isNaN(totalSec)) return 'N/A';
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  return result.trim();
}

export function mergeLastActivity(
  existing: RobotTracking['last_activity'] = [],
  incoming: RobotTracking['last_activity'] = [],
) {
  const existingKeys = new Set(
    existing.map((a) => new Date(a.timestamp).getTime()),
  );
  const newItems = (incoming || []).filter(
    (a) => !existingKeys.has(new Date(a.timestamp).getTime()),
  );
  return [...existing, ...newItems];
}

export function mergeRobotTrackingUpdate(
  existingList: RobotTracking[],
  tracking: RobotTracking,
): RobotTracking[] {
  const index = existingList.findIndex(
    (r) => r._id === tracking._id || r.robot_no === tracking.robot_no,
  );

  if (index === -1) {
    return [tracking, ...existingList];
  }

  const existing = existingList[index];
  const trackDetailsMap = new Map<string, RobotTrackDetail>();

  (existing.track_details || []).forEach((td) => {
    trackDetailsMap.set(
      `${td.point}_${new Date(td.timestamp).getTime()}`,
      td,
    );
  });
  (tracking.track_details || []).forEach((td) => {
    trackDetailsMap.set(
      `${td.point}_${new Date(td.timestamp).getTime()}`,
      td,
    );
  });

  const updated = [...existingList];
  updated[index] = {
    ...tracking,
    ...existing,
    last_activity: mergeLastActivity(
      existing.last_activity || [],
      tracking.last_activity || [],
    ),
    track_details: Array.from(trackDetailsMap.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    ),
    cleaning: {
      ...existing.cleaning,
      ...tracking.cleaning,
    },
    uplink: tracking.uplink || existing.uplink,
    lora_state:
      tracking.lora_state !== undefined
        ? tracking.lora_state
        : existing.lora_state,
    last_status:
      tracking.last_status !== undefined
        ? tracking.last_status
        : existing.last_status,
    last_uplink:
      tracking.last_uplink !== undefined
        ? tracking.last_uplink
        : existing.last_uplink,
    updatedAt: new Date().toISOString(),
  };
  return updated;
}
