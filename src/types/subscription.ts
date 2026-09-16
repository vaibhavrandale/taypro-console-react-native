export const SUBSCRIPTION_STATUSES = [
  'subscriptionSitesAssigned',
  'subscriptionFound',
  'subscriptionaRenewStatus',
  'subscriptionPaymentStatus',
  'subscriptionPlanAccess',
] as const;

export type SubscriptionStatusCode = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionInvoice = {
  invoice_id?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  amount?: number;
  status?: string;
};

export type ClientSubscription = {
  _id?: string;
  client_id?: string;
  client_name?: string;
  client_logo?: string;
  plan_id?: string;
  frequency?: string;
  subscription_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  invoice?: SubscriptionInvoice[];
};

export type SubscriptionPlan = {
  _id?: string;
  plan_id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  frequency?: string[];
  features?: string[];
};
