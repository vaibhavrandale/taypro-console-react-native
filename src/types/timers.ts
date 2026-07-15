export const DISABLED_TIMER = '25:00:00';

export type TimerLastActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  timestamp?: string | { $date?: string };
  userId?: string | { $oid?: string };
  details?: string;
  role?: string;
  action?: string;
  message?: string;
  createdAt?: string;
};

export type BlockTimer = {
  _id: string;
  site_id: string;
  block: string;
  total_robots_in_block?: number;
  max_cleaning_time?: number;
  timer1?: string;
  timer1_date?: string;
  timer2?: string;
  timer2_date?: string;
  timer3?: string;
  timer3_date?: string;
  is_available_to_edit?: boolean;
  is_timer_updated?: boolean;
  timer_updated_at?: string | { $date?: string };
  createdAt?: string | { $date?: string };
  updatedAt?: string | { $date?: string };
  last_activity?: TimerLastActivity | TimerLastActivity[];
  [key: string]: unknown;
};

export type UpdateTimerPayload = {
  site_id?: string;
  block?: string;
  timer1: string;
  timer1_date: string;
  timer2: string;
  timer2_date: string;
  timer3: string;
  timer3_date: string;
};
