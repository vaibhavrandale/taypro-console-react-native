import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RobotAnalyticsScreen } from '../screens/RobotAnalyticsScreen';
import { SiteAnalyticsScreen } from '../screens/SiteAnalyticsScreen';

export type AnalyticsStackParamList = {
  RobotAnalytics: undefined;
  SiteAnalytics: undefined;
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RobotAnalytics" component={RobotAnalyticsScreen} />
      <Stack.Screen name="SiteAnalytics" component={SiteAnalyticsScreen} />
    </Stack.Navigator>
  );
}
