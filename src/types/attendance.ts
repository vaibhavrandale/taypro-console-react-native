export type PunchLocation = {
  lat: number;
  lng: number;
  _id?: string;
};

export type AttendanceRecord = {
  _id: string;
  user_id: string;
  username: string;
  profile_image?: string;
  site_id: string;
  punchin_time?: string;
  punchin_location?: PunchLocation;
  punch_in_image?: string;
  punchout_time?: string;
  punchout_location?: PunchLocation;
  punch_out_image?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PunchStatus = {
  punchedIn: boolean;
  punchedOut: boolean;
  data: AttendanceRecord | null;
};

export type UserAttendanceResult = {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
