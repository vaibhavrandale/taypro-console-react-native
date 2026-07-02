import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AssignedSitesScreen } from '../screens/AssignedSitesScreen';
import { CleaningLogsScreen } from '../screens/CleaningLogsScreen';

export type SitesStackParamList = {
  AssignedSites: undefined;
  CleaningLogs: {
    siteId: string;
    siteName?: string;
  };
};

const Stack = createNativeStackNavigator<SitesStackParamList>();

export function SitesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssignedSites" component={AssignedSitesScreen} />
      <Stack.Screen name="CleaningLogs" component={CleaningLogsScreen} />
    </Stack.Navigator>
  );
}
