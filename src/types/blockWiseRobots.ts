export type BlockRobot = {
  _id?: string;
  robot_no: string;
  block?: string;
  last_status?: string;
  lora_state?: number;
  battery_voltage?: number;
};

export type BlockSummary = {
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
  robots: BlockRobot[];
  blocks: BlockSummary[];
};

export type SiteManagementResponse = {
  data: SiteManagementData;
};
