export type NotificationPostedBy = {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  profile_image?: string;
};

export type NotificationUser = {
  _id: string;
  username?: string;
  email?: string;
  image?: string;
  role?: string;
  read_status?: boolean;
  read_at?: string | null;
  feedback?: string;
};

export type CustomNotification = {
  _id: string;
  subject: string;
  description: string;
  points?: unknown[];
  posted_by?: NotificationPostedBy;
  users?: NotificationUser[];
  for_user_roles?: string[];
  is_active?: boolean;
  images?: string[];
  is_feedback_required?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
