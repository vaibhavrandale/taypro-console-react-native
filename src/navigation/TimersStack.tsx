import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TimersScreen } from '../screens/TimersScreen';
import { UpdateTimerScreen } from '../screens/UpdateTimerScreen';

export type TimersStackParamList = {
  TimersList: undefined;
  UpdateTimer: { timerId: string };
};

const Stack = createNativeStackNavigator<TimersStackParamList>();

export function TimersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TimersList" component={TimersScreen} />
      <Stack.Screen name="UpdateTimer" component={UpdateTimerScreen} />
    </Stack.Navigator>
  );
}
