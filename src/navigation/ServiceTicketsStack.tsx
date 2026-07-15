import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ServiceTicketsScreen } from '../screens/ServiceTicketsScreen';
import { CreateServiceTicketScreen } from '../screens/CreateServiceTicketScreen';
import { ResolveServiceTicketScreen } from '../screens/ResolveServiceTicketScreen';

export type ServiceTicketsStackParamList = {
  TicketsList: undefined;
  CreateTicket: undefined;
  ResolveTicket: { ticketId: string };
};

const Stack = createNativeStackNavigator<ServiceTicketsStackParamList>();

export function ServiceTicketsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TicketsList" component={ServiceTicketsScreen} />
      <Stack.Screen name="CreateTicket" component={CreateServiceTicketScreen} />
      <Stack.Screen
        name="ResolveTicket"
        component={ResolveServiceTicketScreen}
      />
    </Stack.Navigator>
  );
}
