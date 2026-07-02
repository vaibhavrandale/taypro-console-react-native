export type SearchRobot = {
  _id?: string;
  robot_no?: string;
  deveui?: string;
  block?: string;
  site_id?: string;
  lora_no?: number;
  robot_type?: string;
  company?: string;
};

export type SearchGateway = {
  _id?: string;
  gateway_name?: string;
  gateway_type?: string;
  gateway_id_in_lns_server?: string;
};

export type GatewaysAndRobotsData = {
  robots: SearchRobot[];
  gateways: SearchGateway[];
};

export type GatewaysAndRobotsResponse = {
  success: boolean;
  message?: string;
  data: GatewaysAndRobotsData;
};

export type BlockRobotSummary = {
  robot_no?: string;
  deveui?: string;
  block?: string;
  site_id?: string;
  lora_state?: number;
  lora_no?: number;
  battery_voltage?: number;
  last_status?: string;
};

export type BlockRobotsResponse = {
  success: boolean;
  totalrobots?: number;
  message?: string;
  data: BlockRobotSummary[];
};
