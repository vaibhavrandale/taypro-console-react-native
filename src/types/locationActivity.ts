export type LocationActivitySource = 'foreground' | 'background' | 'manual';

export type LocationActivityPoint = {
  client_id: string;
  site_id?: string;
  attendance_id?: string;
  location: {
    lat: number;
    lng: number;
  };
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  recorded_at: string;
  captured_offline: boolean;
  source: LocationActivitySource;
};

export type LocationActivityBatchResponse = {
  success: boolean;
  message?: string;
  inserted?: number;
  skipped?: number;
};
