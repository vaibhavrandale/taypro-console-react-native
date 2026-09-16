export type CleaningCycleRaw = {
  start?: boolean;
  finish?: boolean;
  battery_dead?: boolean;
  cleaning_cancelled?: boolean;
  startAt?: string;
  finishAt?: string;
  total_cleaning_time?: number;
  forward_cleaning_time?: number;
  reverse_cleaning_time?: number;
  battery_before_cleaning?: number;
  battery_at_reverse_station?: number;
  battery_after_cleaning?: number;
  cycle_average_brush_current?: number;
  cycle_max_brush_current?: number;
  cycle_average_wheel_current?: number;
  cycle_max_wheel_current?: number;
  temperature_before_cleaning?: number;
  cycle_count?: number;
};

export type RobotAnalyticsRaw = {
  _id?: string;
  robot_no?: string;
  site_id?: string;
  block?: string;
  comments?: string;
  createdAt?: string;
  cleaning?: CleaningCycleRaw;
};

export type RobotAnalyticsResult = {
  data: RobotAnalyticsRaw[];
  avg_cleaning_minutes: number;
  total_cycles: number;
  maxWheelCurrent: string | number;
  avgWheelCurrent: string | number;
  maxBrushCurrent: string | number;
  avgBrushCurrent: string | number;
};

export type CycleOutcome =
  | 'completed'
  | 'cancelled'
  | 'stuck'
  | 'battery_dead'
  | 'in_progress';

export type CycleRecord = {
  _id: string;
  date: string;
  dateLabel: string;
  robot_no?: string;
  block?: string;
  outcome: CycleOutcome;
  actualDurationMin: number | null;
  cleaningMin: number | null;
  overheadSec: number | null;
  fwdTime: number | null;
  revTime: number | null;
  fwdRevRatio: number | null;
  batBefore: number | null;
  batMid: number | null;
  batAfter: number | null;
  batDrain: number | null;
  avgBrush: number | null;
  maxBrush: number | null;
  avgWheel: number | null;
  maxWheel: number | null;
  brushSpike: number | null;
  wheelSpike: number | null;
  brushWheelRatio: number | null;
  temp: number | null;
};

export type SiteAnalyticsRobot = {
  robot_no: string;
  total_cycles: number;
  avg_cleaning_minutes: number;
  avgBatteryBeforeCleaning?: number;
  avgBatteryAfterCleaning?: number;
  maxWheelCurrent?: string | number;
  avgWheelCurrent?: string | number;
  maxBrushCurrent?: string | number;
  avgBrushCurrent?: string | number;
};

export type SiteAnalyticsResult = {
  summary: {
    total_robots: number;
    total_cycles: number;
    avg_cleaning_minutes: number;
  };
  robots: SiteAnalyticsRobot[];
};
