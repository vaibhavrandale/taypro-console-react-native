export type RobotTrackDetail = {
  point: number;
  timestamp: string;
};

export type RobotLastActivity = {
  data?: string;
  topic?: string;
  details?: string;
  timestamp: string;
};

export type RobotCleaning = {
  start?: boolean;
  startAt?: string | null;
  finish?: boolean;
  finishAt?: string | null;
  cleaning_cancelled?: boolean;
  cleaning_cancelled_at?: string | null;
  battery_dead?: boolean;
  battery_dead_at?: string | null;
  battery_health_status?: string;
  battery_health_status_updated_at?: string;
  cleaning_mertic?: boolean;
  cleaning_metric_recievet_at?: string;
  forward_cleaning_time?: number;
  reverse_cleaning_time?: number;
  total_cleaning_time?: number;
  battery_before_cleaning?: number;
  battery_at_reverse_station?: number;
  battery_after_cleaning?: number;
  cycle_count?: number;
  [key: string]: unknown;
};

export type RobotTracking = {
  _id: string;
  robot_no: string;
  deveui?: string;
  site_id: string;
  block?: string;
  robot_type?: string;
  row_no?: number;
  row_length?: number;
  lora_no?: number | string;
  lora_state?: number;
  last_status?: string | null;
  last_uplink?: string | null;
  comments?: string;
  is_delete?: boolean;
  createdAt?: string;
  updatedAt?: string;
  uplink?: { data?: string };
  track_details?: RobotTrackDetail[];
  last_activity?: RobotLastActivity[];
  cleaning?: RobotCleaning;
};

export type RobotLocationItem = {
  _id: string;
  robot_no: string;
  block?: string;
  deveui?: string;
  last_gateway?: string | null;
  last_uplink?: string | null;
  lora_state?: number | null;
  lora_no?: number | string | null;
  last_status?: string | null;
  location?: {
    latitude?: number;
    longitude?: number;
    map_url?: string;
  };
};

export type RobotPhaseResult = {
  phase: string;
  badgeColor: string;
  iconBorder: string;
  segmentPct: number;
  effectivePoint?: number;
};

export type CleaningPercentageResult = {
  point: number;
  distanceCovered: number;
  totalDistance: number;
  percentage: number;
};
