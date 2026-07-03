export type MqttDeviceInfo = {
  devEui?: string;
  deviceName?: string;
  deviceProfileName?: string;
  deviceProfileId?: string;
  deviceClassEnabled?: string;
  tenantName?: string;
  tenantId?: string;
  applicationName?: string;
  applicationId?: string;
  tags?: Record<string, unknown>;
};

export type MqttRxInfo = {
  gatewayId?: string;
  uplinkId?: number;
  gwTime?: string;
  nsTime?: string;
  rssi?: number;
  snr?: number;
  channel?: number;
  rfChain?: number;
  crcStatus?: string;
  context?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
};

export type MqttFramePayload = {
  data?: string;
  dr?: number;
  fCnt?: number;
  fPort?: number;
  devAddr?: string;
  adr?: boolean;
  confirmed?: boolean;
  deduplicationId?: string;
  regionConfigId?: string;
  deviceInfo?: MqttDeviceInfo;
  rxInfo?: MqttRxInfo[];
  txInfo?: {
    frequency?: number;
    modulation?: {
      lora?: {
        bandwidth?: number;
        spreadingFactor?: number;
        codeRate?: string;
      };
    };
  };
};

export type MqttEventFrame = {
  _id?: string;
  topic?: string;
  createdAt?: string;
  time?: string;
  payload?: MqttFramePayload;
  data?: MqttFramePayload;
};
