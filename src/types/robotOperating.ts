export type RobotOperatingDetails = {
  _id?: string;
  robot_no?: string;
  site_id?: string;
  block?: string;
  deveui?: string;
  lora_no?: number;
  lora_state?: number;
  last_status?: string;
  last_uplink?: string;
  pcb_version?: string;
  version?: string;
  firmware_version?: string;
  wheel_motor_speed?: number;
  brush_motor_speed?: number;
  robot_type?: string;
  company?: string;
  battery_voltage?: number;
  temperature?: number;
};

export type RobotOperatingResponse = {
  success: boolean;
  message?: string;
  data: RobotOperatingDetails;
};

export type RobotCommand = "start" | "stop" | "return";

export type SendMqttDownlinkBody = {
  deveui: string;
  lora_no: number;
  payload: string;
  robot_no: string;
  site_id: string;
};

export type SendMqttDownlinkResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type SendMqttMulticastDownlinkBody = {
  block: string;
  command: string;
  deveui: string[];
  robot_no: string[];
  site_id: string;
};
