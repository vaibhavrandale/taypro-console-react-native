export type CleaningDetails = {
  start?: boolean;
  startAt?: string | null;
  finish?: boolean;
  finishAt?: string | null;
  cleaning_cancelled?: boolean;
  cleaning_cancelled_at?: string | null;
  battery_dead?: boolean;
  battery_dead_at?: string | null;
  forward_cleaning_time?: number | null;
  reverse_cleaning_time?: number | null;
  total_cleaning_time?: number | null;
  battery_before_cleaning?: number | null;
  battery_after_cleaning?: number | null;
  cycle_count?: number | null;
  cleaning_percentage?: number | null;
};

export type CleaningLogRecord = {
  _id?: string;
  deveui?: string;
  robot_no?: string;
  site_id?: string;
  block?: string;
  row_no?: number;
  row_length?: number;
  lora_state?: number;
  lora_no?: number;
  robot_type?: string;
  cleaning?: CleaningDetails;
  cleaning_percentage?: number | null;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NotStartedRobot = {
  _id?: string;
  robot_no?: string;
  block?: string;
  deveui?: string;
  lora_state?: number;
  lora_no?: number;
  last_uplink?: string;
};

export type OfflineRobotLog = {
  _id?: string;
  robot_no?: string;
  block?: string;
  createdAt?: string;
  error_type?: string;
};

export type DprTechnician = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  technician_id?: string;
  profile_image?: string;
};

export type DprLastActivity = DprTechnician & {
  details?: string;
};

export type DprOperationalDetails = {
  ready_for_operational?: number;
  online_operational?: number;
  manual_operational?: number;
  unoperational?: number;
  robots_uptime?: number;
};

export type DprRecord = {
  _id?: string;
  site_id?: string;
  comments?: string;
  report_date?: string;
  new_report_date?: string;
  createdAt?: string;
  robots_operational_details?: DprOperationalDetails;
  last_activity?: DprLastActivity[];
  technician_present?: DprTechnician[];
};

export type CleaningLogsForDay = {
  total_cleaning_logs: number;
  total_cleaning_completed: number;
  total_cleaning_in_progress: number;
  total_failure_logs: number;
  total_robots_assigned: number;
  total_not_started_robots: number;
  total_offline_robots_at_time_of_cleaning: number;
  cleaning_completed: CleaningLogRecord[];
  cleaning_in_progress: CleaningLogRecord[];
  cleaning_failures: CleaningLogRecord[];
  not_started_robots: NotStartedRobot[];
  offline_robots_at_time_of_cleaning: OfflineRobotLog[];
  dpr: DprRecord[];
};

export type CleaningLogsResponse = {
  success: boolean;
  message?: string;
  data: CleaningLogsForDay;
};

export type CleaningLogCategory =
  | 'completed'
  | 'inprogress'
  | 'failure'
  | 'not_started'
  | 'offline'
  | 'dpr';

export const CLEANING_LOG_TABLE_WIDTH = 1020;
export const OFFLINE_LOG_TABLE_WIDTH = 420;
export const NOT_STARTED_TABLE_WIDTH = 460;
export const DPR_TABLE_WIDTH = 920;
