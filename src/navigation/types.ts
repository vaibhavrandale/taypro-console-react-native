import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SitesStackParamList } from './SitesStack';

export type DrawerParamList = {
  MainTabs: undefined;
  Robots: undefined;
  Blockwise: {
    siteId: string;
    siteName?: string;
  };
  Sites: NavigatorScreenParams<SitesStackParamList> | undefined;
  Gateways: undefined;
  Users: undefined;
  ServiceTickets: undefined;
  Settings: undefined;
};
