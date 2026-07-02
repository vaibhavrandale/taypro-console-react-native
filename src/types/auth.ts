export type AssignedSite = {
  site_id: string;
  site_name?: string;
  assignedBy?: string;
  assignedAt?: string;
};

export type User = {
  _id: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  type?: string;
  phone?: string;
  profile_image?: string;
  designation?: string;
  employee_id?: string;
  robot_command_access?: boolean;
  assigned_sites?: AssignedSite[];
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};
