import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SitesStackParamList } from './SitesStack';

export type DrawerParamList = {
  MainTabs: undefined;
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
  };
  Sites: NavigatorScreenParams<SitesStackParamList> | undefined;
  Gateways: undefined;
  Users: undefined;
  ServiceTickets: undefined;
  Settings: undefined;
};
