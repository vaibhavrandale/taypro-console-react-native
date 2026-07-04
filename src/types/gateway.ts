export type MongoIdValue =
  | string
  | {
      $oid?: string;
    };

export type MongoDateValue =
  | string
  | {
      $date?: string;
    }
  | null;

export type Gateway = {
  _id?: string;
  gateway_id: string;
  gateway_name: string;
  site_id: string;
  gateway_id_in_lns_server: string;
  gateway_name_in_lns_server: string;
  gateway_lattitude?: string;
  gateway_longitude?: string;
  gateway_simnumber?: string;
  gateway_status?: boolean;
  gateway_type: string;
  gateway_robot_no?: string;
  gateway_lora_deveui?: string;
  last_uplink?: string | null;
  gateway_lora_no?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GatewaysBySiteResponse = {
  success: boolean;
  message?: string;
  data: RawGateway[];
};

export type RawGateway = Omit<
  Gateway,
  '_id' | 'last_uplink' | 'createdAt' | 'updatedAt'
> & {
  _id?: MongoIdValue;
  last_uplink?: MongoDateValue;
  createdAt?: MongoDateValue;
  updatedAt?: MongoDateValue;
  __v?: number;
};
