import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from './MainTabs';
import type { SitesStackParamList } from './SitesStack';
import type { TimersStackParamList } from './TimersStack';
import type { ServiceTicketsStackParamList } from './ServiceTicketsStack';
import type { PreventiveMaintenanceStackParamList } from './PreventiveMaintenanceStack';
import type { ExpenseClaimsStackParamList } from './ExpenseClaimsStack';

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
  Timers: NavigatorScreenParams<TimersStackParamList> | undefined;
  Users: undefined;
  ServiceTickets: NavigatorScreenParams<ServiceTicketsStackParamList> | undefined;
  PreventiveMaintenance: NavigatorScreenParams<PreventiveMaintenanceStackParamList> | undefined;
  ExpenseClaims: NavigatorScreenParams<ExpenseClaimsStackParamList> | undefined;
  Settings: undefined;
};
