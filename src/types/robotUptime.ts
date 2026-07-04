export type RobotUptimeDpr = {
  dpr_comment?: string;
  submitted_by?: string;
};

export type RobotUptimeDay = {
  date: string;
  success_count: number;
  failure_count: number;
  available_robots: number;
  total_robots: number;
  cleaning_uptime_percentage: number;
  availibility_uptime_percentage: number;
  dpr?: RobotUptimeDpr | null;
};

export type RobotUptimeResponse = {
  success: boolean;
  total_assigned_robots?: number;
  data: RobotUptimeDay[];
  monthlyAvailibilityUptime?: number;
  monthlyCleaningUptime?: number;
  average_success?: number;
  average_failure?: number;
  message?: string;
};

export type RobotUptimeSummary = {
  totalAssignedRobots: number;
  monthlyCleaningUptime: number;
  monthlyAvailabilityUptime: number;
  averageSuccess: number;
  averageFailure: number;
  operationalDays: number;
  rainDays: number;
  perfectDays: number;
};
