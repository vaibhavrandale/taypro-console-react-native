export type DebugLog = {
  _id: string;
  robot_no: string;
  deveui: string;
  data: string;
  gateway_id: string;
  rssi: string;
  snr: string;
  topic: string;
  is_delete: boolean;
  is_added_in_robot_position_tracking: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DebugLogsParams = {
  robotNo: string;
  page: number;
  limit?: number;
  startDate: string;
  endDate: string;
};

export type DebugLogsResult = {
  logs: DebugLog[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
