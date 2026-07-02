export type BlockRobot = {
  _id: string;
  robot_no: string;
  lora_state: number;
  last_status: string;
  battery_voltage: number;
};

export type SiteBlock = {
  block_name: string;
  total_robot_count: number;
  at_dock: number;
  running: number;
  online: number;
  offline: number;
  blockrobots: BlockRobot[];
};

export type SiteManagementData = {
  site_name: string;
  location: string;
  robots: unknown[];
  blocks: SiteBlock[];
};

export type SiteManagementResponse = {
  data: SiteManagementData;
};
