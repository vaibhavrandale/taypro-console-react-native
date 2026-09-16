import type {
  CleaningCycleRaw,
  CycleOutcome,
  CycleRecord,
  RobotAnalyticsRaw,
} from '../types/robotAnalytics';

export const OUTCOME_META: Record<
  CycleOutcome,
  { label: string; color: string }
> = {
  completed: { label: 'Completed', color: '#2ecc71' },
  cancelled: { label: 'Stopped', color: '#e74c3c' },
  stuck: { label: 'Stuck', color: '#f39c12' },
  battery_dead: { label: 'Battery Dead', color: '#9b59b6' },
  in_progress: { label: 'In Progress', color: '#3498db' },
};

export function fmtA(mA?: number | null): number | null {
  if (mA == null || mA === 0) return null;
  return parseFloat((mA / 1000).toFixed(3));
}

export function fmtMin(sec?: number | null): number | null {
  if (!sec) return null;
  return parseFloat((sec / 60).toFixed(1));
}

export function outcomeOf(c: CleaningCycleRaw = {}, comments = ''): CycleOutcome {
  if (c.finish) return 'completed';
  if (c.battery_dead) return 'battery_dead';
  if (c.cleaning_cancelled) {
    const txt = comments.toLowerCase();
    if (txt.includes('stuck') || txt.includes('mrae')) return 'stuck';
    return 'cancelled';
  }
  return 'in_progress';
}

export function deriveCycleRecords(rawData: RobotAnalyticsRaw[]): CycleRecord[] {
  return rawData.map((d, index) => {
    const c = d.cleaning || {};
    const outcome = outcomeOf(c, d.comments);
    const actualDurationSec =
      c.startAt && c.finishAt
        ? (new Date(c.finishAt).getTime() - new Date(c.startAt).getTime()) / 1000
        : null;
    const actualDurationMin = actualDurationSec
      ? parseFloat((actualDurationSec / 60).toFixed(1))
      : null;
    const cleaningSec = c.total_cleaning_time || null;
    const overheadSec =
      actualDurationSec && cleaningSec
        ? Math.max(0, Math.round(actualDurationSec - cleaningSec))
        : null;
    const fwdTime = c.forward_cleaning_time || null;
    const revTime = c.reverse_cleaning_time || null;
    const batBefore = c.battery_before_cleaning ?? null;
    const batMid = c.battery_at_reverse_station ?? null;
    const batAfter = c.battery_after_cleaning ?? null;
    const avgBrush = fmtA(c.cycle_average_brush_current);
    const maxBrush = fmtA(c.cycle_max_brush_current);
    const avgWheel = fmtA(c.cycle_average_wheel_current);
    const maxWheel = fmtA(c.cycle_max_wheel_current);
    const created = d.createdAt ? new Date(d.createdAt) : new Date();

    return {
      _id: d._id || `${d.robot_no ?? 'r'}-${index}`,
      date: created.toISOString().slice(0, 10),
      dateLabel: created.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      robot_no: d.robot_no,
      block: d.block,
      outcome,
      actualDurationMin,
      cleaningMin: fmtMin(cleaningSec),
      overheadSec,
      fwdTime,
      revTime,
      fwdRevRatio:
        fwdTime && revTime ? parseFloat((fwdTime / revTime).toFixed(2)) : null,
      batBefore,
      batMid,
      batAfter,
      batDrain:
        batBefore != null && batAfter != null ? batBefore - batAfter : null,
      avgBrush,
      maxBrush,
      avgWheel,
      maxWheel,
      brushSpike:
        avgBrush && maxBrush
          ? parseFloat((maxBrush / avgBrush).toFixed(2))
          : null,
      wheelSpike:
        avgWheel && maxWheel
          ? parseFloat((maxWheel / avgWheel).toFixed(2))
          : null,
      brushWheelRatio:
        avgBrush && avgWheel
          ? parseFloat((avgBrush / avgWheel).toFixed(2))
          : null,
      temp: c.temperature_before_cleaning ?? null,
    };
  });
}

export function countOutcomes(records: CycleRecord[]) {
  const counts = {
    completed: 0,
    cancelled: 0,
    stuck: 0,
    battery_dead: 0,
    in_progress: 0,
  };
  for (const r of records) {
    if (r.outcome in counts) counts[r.outcome] += 1;
  }
  return counts;
}

export function avgByKey(rows: CycleRecord[], key: keyof CycleRecord) {
  const vals = rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number');
  if (!vals.length) return null;
  return parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2));
}

export function last7AndToday() {
  const today = new Date();
  const last7 = new Date();
  last7.setDate(today.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(last7), endDate: fmt(today) };
}
