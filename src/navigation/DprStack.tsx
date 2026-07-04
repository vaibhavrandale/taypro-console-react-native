import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AssignedSitesDprScreen } from '../screens/AssignedSitesDprScreen';
import { TechnicianDprScreen } from '../screens/TechnicianDprScreen';

export type DprStackParamList = {
  DprHistory: undefined;
  DprSubmit: undefined;
};

const Stack = createNativeStackNavigator<DprStackParamList>();

export function DprStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DprHistory" component={AssignedSitesDprScreen} />
      <Stack.Screen name="DprSubmit" component={TechnicianDprScreen} />
    </Stack.Navigator>
  );
}
