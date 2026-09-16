import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientTicketsScreen } from '../screens/ClientTicketsScreen';
import { CreateClientTicketScreen } from '../screens/CreateClientTicketScreen';

export type ClientTicketsStackParamList = {
  ClientTicketsList: undefined;
  CreateClientTicket: undefined;
};

const Stack = createNativeStackNavigator<ClientTicketsStackParamList>();

export function ClientTicketsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ClientTicketsList"
        component={ClientTicketsScreen}
      />
      <Stack.Screen
        name="CreateClientTicket"
        component={CreateClientTicketScreen}
      />
    </Stack.Navigator>
  );
}
