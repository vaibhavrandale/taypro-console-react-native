import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreatePreventiveMaintenanceScreen } from '../screens/CreatePreventiveMaintenanceScreen';
import { PreventiveMaintenanceScreen } from '../screens/PreventiveMaintenanceScreen';
import { UpdatePreventiveMaintenanceScreen } from '../screens/UpdatePreventiveMaintenanceScreen';

export type PreventiveMaintenanceStackParamList = {
  PmList: undefined;
  PmCreate: undefined;
  PmUpdate: { id: string };
};

const Stack = createNativeStackNavigator<PreventiveMaintenanceStackParamList>();

export function PreventiveMaintenanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PmList" component={PreventiveMaintenanceScreen} />
      <Stack.Screen
        name="PmCreate"
        component={CreatePreventiveMaintenanceScreen}
      />
      <Stack.Screen
        name="PmUpdate"
        component={UpdatePreventiveMaintenanceScreen}
      />
    </Stack.Navigator>
  );
}
