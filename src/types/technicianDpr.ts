export const BREAKDOWN_REASONS = [
  'Oxidation',
  'Offline',
  'Transit Online to Offline',
  'Battery Dead',
  'Vegetation',
  'Client Reasons',
  'Service Reasons',
  'Timer',
  'Breakdown',
  'Material Unavailability',
] as const;

export type BreakdownReasonType = (typeof BREAKDOWN_REASONS)[number];

export type BreakdownRobotRef = {
  robot_no?: string;
  block?: string;
  robot_id: string;
};

export type BreakdownReason = {
  reason: BreakdownReasonType;
  count: number;
  robots: BreakdownRobotRef[];
};

export type RobotsOperationalDetails = {
  ready_for_operational: number;
  online_operational: number;
  manual_operational: number;
  unoperational: number;
  robots_uptime: number;
};

export type PmRobotRef = {
  robot_no?: string;
  block?: string;
  robot_id: string;
  pm_id: string;
};

export type PreventiveMaintenanceStatus = {
  automatic: {
    attempted: number;
    completed: number;
    robots: PmRobotRef[];
  };
  semi_automatic: {
    attempted: number;
    completed: number;
    robots: PmRobotRef[];
  };
  total_pm_done: number;
};

export type TicketDetails = {
  total_raised: number;
  total_closed: number;
  total_pending: number;
};

export type TechnicianPresentEntry = {
  name: string;
  email: string;
  technician_id: string;
  _id: string;
  role?: string;
  profile_image?: string;
};

export type SiteTechnicianUser = {
  _id: string;
  username: string;
  email: string;
  role?: string;
  profile_image?: string;
};

export type SiteRobotOption = {
  _id: string;
  robot_no?: string;
  block?: string;
  deveui?: string;
  lora_state?: number | string;
};

export type TechnicianDprPayload = {
  site_id: string;
  comments: string;
  report_date: string;
  new_report_date: string;
  robots_operational_details: RobotsOperationalDetails;
  preventive_maintenance_status: PreventiveMaintenanceStatus;
  ticket_details: TicketDetails;
  breakdown_reasons: BreakdownReason[];
  technician_present: TechnicianPresentEntry[];
};

export type DprFormState = {
  site_id: string;
  comments: string;
  robots_operational_details: Omit<RobotsOperationalDetails, 'robots_uptime'>;
  preventive_maintenance_status: Omit<PreventiveMaintenanceStatus, 'total_pm_done'>;
  ticket_details: TicketDetails;
  technician_present: TechnicianPresentEntry[];
};

export type DprLastActivityEntry = {
  name?: string;
  email?: string;
  userId?: string;
  timestamp?: string;
  details?: string;
  profile_image?: string;
};

export type TechnicianDprRecord = {
  _id?: string;
  site_id?: string;
  comments?: string;
  report_date?: string;
  new_report_date?: string;
  createdAt?: string;
  updatedAt?: string;
  robots_operational_details?: RobotsOperationalDetails;
  preventive_maintenance_status?: PreventiveMaintenanceStatus;
  ticket_details?: TicketDetails;
  breakdown_reasons?: BreakdownReason[];
  technician_present?: TechnicianPresentEntry[];
  last_activity?: DprLastActivityEntry[];
};

export type AssignedSitesDprGroup = {
  site_id: string;
  count: number;
  dprs: TechnicianDprRecord[];
};

export type AssignedSitesDprResponse = {
  success: boolean;
  message?: string;
  start_date: string;
  end_date: string;
  assigned_sites?: string[];
  count: number;
  data: AssignedSitesDprGroup[];
};
