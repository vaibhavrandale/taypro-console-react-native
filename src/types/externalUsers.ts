export type ExternalAssignedSite = {
  _id?: string;
  site_id: string;
  siteName?: string;
};

export type ExternalUser = {
  _id: string;
  username: string;
  email: string;
  role?: string;
  department?: string;
  phone?: string;
  type?: string;
  profile_image?: string;
  is_delete?: boolean;
  assigned_sites?: ExternalAssignedSite[];
};

export type ExternalUsersPageResult = {
  data: ExternalUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AssignableSite = {
  _id: string;
  site_id: string;
  siteName?: string;
};

export type CreateExternalUserPayload = {
  username: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  type: 'External';
  profile_image?: string;
  assigned_sites: Array<{
    _id: string;
    siteName?: string;
    site_id: string;
    assignedBy: {
      userId: string;
      username: string;
      email: string;
    };
    assignedAt: string;
  }>;
};

export type UpdateExternalUserPayload = {
  username: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  is_delete?: boolean;
  profile_image?: string;
};
