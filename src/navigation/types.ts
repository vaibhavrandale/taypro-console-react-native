import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from './MainTabs';
import type { SitesStackParamList } from './SitesStack';

export type AttendanceStackParamList = {
  AttendanceHome: undefined;
  AttendanceHistory: undefined;
};

export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Robots: undefined;
  Blockwise: {
    siteId: string;
    siteName?: string;
  };
  BlockManagement: {
    siteId: string;
    siteName?: string;
    block: string;
  };
  RobotOperating: {
    robotNo: string;
    siteId: string;
    block: string;
    siteName?: string;
  };
  GatewayDetail: {
    gatewayId: string;
    gatewayName?: string;
    gatewayType?: string;
    gatewaySimNumber?: string;
    gatewayRobotNo?: string;
    gatewayLoraDeveui?: string;
    lastUplink?: string | null;
    gatewayStatus?: boolean;
  };
  Sites: NavigatorScreenParams<SitesStackParamList> | undefined;
  Gateways: undefined;
  RobotUptime:
    | {
        siteId?: string;
        siteName?: string;
      }
    | undefined;
  Users: undefined;
  ServiceTickets: undefined;
  Settings: undefined;
};
