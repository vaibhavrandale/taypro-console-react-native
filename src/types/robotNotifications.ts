export type RobotNotificationActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  details?: string;
  timestamp?: string;
  role?: string;
};

export type RobotNotification = {
  _id: string;
  robot_no?: string;
  command?: string;
  deveui?: string;
  site_id?: string;
  createdAt?: string;
  last_activity?: RobotNotificationActivity;
};

export type RobotNotificationsPageResult = {
  data: RobotNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
