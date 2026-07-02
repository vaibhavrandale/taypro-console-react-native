export type SiteGateway = {
  gateway_name: string;
  gateway_id_in_lns_server: string;
  gateway_lattitude?: number | string;
  gateway_longitude?: number | string;
  gateway_name_in_lns_server?: string;
  last_uplink?: string;
  gateway_status?: string | boolean;
  gateway_robot_no?: string;
  battery_voltage?: number | null;
  robot_count?: number;
  location?: {
    latitude?: number | string;
    longitude?: number | string;
    map_url?: string;
  };
};

export type SiteRobot = {
  deveui: string;
  robot_no: string;
  battery_voltage?: number;
  row_length?: number;
  lora_state?: number;
  last_gateway?: string;
  block?: string;
  location?: {
    latitude?: number | string;
    longitude?: number | string;
    map_url?: string;
  };
};

export type BlockWiseCleaning = {
  block: string;
  areaCleaned: number;
  totalCleaningTime: number;
  cycles: number;
};

export type SiteCleaningSummary = {
  completed: number;
  inprogress: number;
  failure: number;
};

export type SiteWeather = {
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  description?: string;
  weather_description?: string;
  pressure?: number;
  visibility?: number;
  cloudiness?: number;
  is_rain?: boolean;
  is_forecast?: boolean;
  site_id?: string;
  location?: string;
};

export type SiteDetails = {
  logo?: string;
  gateways: SiteGateway[];
  robots: SiteRobot[];
  blockWiseCleaning: BlockWiseCleaning[];
  weather: SiteWeather;
  totalAreaCleaned: string;
  cleaning: SiteCleaningSummary;
};

export type SiteDetailsResponse = {
  success: boolean;
  message: string;
  data: SiteDetails;
};
