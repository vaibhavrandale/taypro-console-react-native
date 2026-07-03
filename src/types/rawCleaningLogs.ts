export type RawCleaningLog = {
  _id: string;
  robot_no: string;
  deveui: string;
  data: string;
  gateway_id: string;
  rssi: string;
  snr: string;
  topic: string;
  is_delete: boolean;
  is_added_in_cleaningLog: boolean;
  is_added_in_robot_position_tracking: boolean;
  createdAt: string;
  updatedAt: string;
  comments?: string;
};

export type RawCleaningLogsParams = {
  robotNo: string;
  page: number;
  limit?: number;
  startDate: string;
  endDate: string;
};

export type RawCleaningLogsResult = {
  logs: RawCleaningLog[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
