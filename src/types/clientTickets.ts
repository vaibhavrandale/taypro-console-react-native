export type ClientTicketPerson = {
  id?: string;
  name?: string;
  email?: string;
  profile_image?: string;
  designation?: string;
  timestamp?: string;
  details?: string;
};

export type ClientTicketActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  timestamp?: string;
  details?: string;
};

export type ClientTicket = {
  _id: string;
  ticket_id?: string;
  site_id?: string;
  subject?: string;
  description?: string;
  status?: string;
  created_by?: ClientTicketPerson;
  resolved_by?: ClientTicketPerson;
  resolution_notes?: string;
  resolved_at?: string;
  creation_image1?: string | null;
  creation_image2?: string | null;
  resolution_image1?: string | null;
  resolution_image2?: string | null;
  last_activity?: ClientTicketActivity[];
  createdAt?: string;
  updatedAt?: string;
};

export type ClientTicketsPageResult = {
  data: ClientTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type CreateClientTicketPayload = {
  site_id: string;
  subject: string;
  description: string;
  creation_image1?: string;
  creation_image2?: string;
  root_cause: string;
  corrective_action: string;
  review_of_corrective_action: string;
};
