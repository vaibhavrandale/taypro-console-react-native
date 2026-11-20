import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from './MainTabs';
import type { SitesStackParamList } from './SitesStack';
import type { TimersStackParamList } from './TimersStack';
import type { ServiceTicketsStackParamList } from './ServiceTicketsStack';
import type { PreventiveMaintenanceStackParamList } from './PreventiveMaintenanceStack';
import type { ClientTicketsStackParamList } from './ClientTicketsStack';
import type { ExpenseClaimsStackParamList } from './ExpenseClaimsStack';
import type { AnalyticsStackParamList } from './AnalyticsStack';
import type { ExternalUsersStackParamList } from './ExternalUsersStack';

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
  RobotTracking:
    | {
        siteId?: string;
        siteName?: string;
      }
    | undefined;
  Analytics: NavigatorScreenParams<AnalyticsStackParamList> | undefined;
  RobotCommands: undefined;
  RobotActivity: undefined;
  PcbLog: undefined;
  Timers: NavigatorScreenParams<TimersStackParamList> | undefined;
  Users: undefined;
  ExternalUsers: NavigatorScreenParams<ExternalUsersStackParamList> | undefined;
  ServiceTickets: NavigatorScreenParams<ServiceTicketsStackParamList> | undefined;
  ClientTickets: NavigatorScreenParams<ClientTicketsStackParamList> | undefined;
  ServiceInventory: undefined;
  PreventiveMaintenance: NavigatorScreenParams<PreventiveMaintenanceStackParamList> | undefined;
  ExpenseClaims: NavigatorScreenParams<ExpenseClaimsStackParamList> | undefined;
  Notifications: undefined;
  Settings: undefined;
  About: undefined;
  Pricing: undefined;
  MySubscription: undefined;
  Dummy: undefined;
};
