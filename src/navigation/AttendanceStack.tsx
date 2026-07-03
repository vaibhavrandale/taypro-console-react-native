import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { AttendanceHistoryScreen } from '../screens/AttendanceHistoryScreen';
import type { AttendanceStackParamList } from './types';

export type { AttendanceStackParamList } from './types';

const Stack = createNativeStackNavigator<AttendanceStackParamList>();

export function AttendanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AttendanceHome" component={AttendanceScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
    </Stack.Navigator>
  );
}
