export type ServiceTicketRobot = {
  robot_no: string;
  deveui?: string;
  site_id?: string;
  company?: string;
  lora_no?: string;
  block?: string;
  robot_type?: string;
};

export type ServiceTicketFault = {
  _id?: string;
  fault_name: string;
};

export type ServiceInventoryItem = {
  item_id: string;
  item_name: string;
  item_code: string;
  site_id?: string;
  quantity?: number;
};

export type ChecklistInputType = 'text' | 'select' | 'checkbox';

export type ChecklistField = {
  _id?: string;
  field_name: string;
  input_type: ChecklistInputType | string;
  input_options?: string[];
};

export type FaultAnalysisChecklist = {
  _id?: string;
  component?: {
    _id?: string;
    item_name?: string;
    item_code?: string;
    item_image?: string;
    item_description?: string;
  };
  checklist_fields?: ChecklistField[];
};

export type PartChecklistEntry = {
  part_id: string;
  checklist: Record<string, string>;
};

export type ServiceTicketLastActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  timestamp?: string | { $date?: string };
  userId?: string | { $oid?: string };
  details?: string;
  role?: string;
  action?: string;
  message?: string;
  createdAt?: string;
};

export type ServiceTicket = {
  _id: string;
  ticket_id?: string;
  robot_no?: string;
  deveui?: string;
  site_id?: string;
  company?: string;
  lora_no?: string;
  block?: string;
  robot_type?: string;
  fault_type?: string;
  ticket_generating_notes?: string;
  ticket_resolving_notes?: string;
  ticket_generated_by?: string;
  ticket_generated_by_email?: string;
  ticket_resolved?: boolean;
  ticket_resolved_at?: string;
  ticket_resolved_by?: string;
  ticket_resolved_by_email?: string;
  ticket_resolved_by_user_id?: string;
  service_part_replaced?: boolean;
  part_replaced?: string;
  part_replaced_id?: string;
  replaced_part_quantity?: number | string;
  part_checklist?: PartChecklistEntry[];
  ticket_generated_images1?: string;
  ticket_generated_images2?: string;
  ticket_generated_images3?: string;
  ticket_generated_images4?: string;
  ticket_generated_images5?: string;
  ticket_resolved_images1?: string;
  ticket_resolved_images2?: string;
  ticket_resolved_images3?: string;
  ticket_resolved_images4?: string;
  ticket_resolved_images5?: string;
  last_activity?: ServiceTicketLastActivity | ServiceTicketLastActivity[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type ServiceTicketsPageResult = {
  data: ServiceTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type CreateServiceTicketPayload = {
  robot_no: string;
  deveui?: string;
  site_id?: string;
  company?: string;
  lora_no?: string;
  fault_type: string;
  ticket_generating_notes?: string;
  block?: string;
  robot_type?: string;
  ticket_resolved?: boolean;
  ticket_generated_images1?: string;
  ticket_generated_images2?: string;
  ticket_generated_images3?: string;
  ticket_generated_images4?: string;
  ticket_generated_images5?: string;
};

export function formatFieldLabel(fieldName: string) {
  return fieldName
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function isChecklistComplete(
  fields: ChecklistField[],
  responses: Record<string, string>,
): boolean {
  if (fields.length === 0) return true;

  return fields.every((field) => {
    const value = (responses[field.field_name] ?? '').trim();
    if (!value) return false;
    if (field.input_type === 'checkbox') {
      return value === 'Yes' || value === 'No';
    }
    if (field.input_type === 'select') {
      return (field.input_options ?? []).includes(value);
    }
    return value.length > 0;
  });
}

export function countFilledChecklistFields(
  fields: ChecklistField[],
  responses: Record<string, string>,
) {
  return fields.filter((field) => {
    const value = (responses[field.field_name] ?? '').trim();
    if (!value) return false;
    if (field.input_type === 'checkbox') {
      return value === 'Yes' || value === 'No';
    }
    if (field.input_type === 'select') {
      return (field.input_options ?? []).includes(value);
    }
    return value.length > 0;
  }).length;
}
