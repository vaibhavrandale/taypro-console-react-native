import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExternalUsersScreen } from '../screens/ExternalUsersScreen';
import { CreateExternalUserScreen } from '../screens/CreateExternalUserScreen';

export type ExternalUsersStackParamList = {
  ExternalUsersList: undefined;
  CreateExternalUser: undefined;
};

const Stack = createNativeStackNavigator<ExternalUsersStackParamList>();

export function ExternalUsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExternalUsersList" component={ExternalUsersScreen} />
      <Stack.Screen
        name="CreateExternalUser"
        component={CreateExternalUserScreen}
      />
    </Stack.Navigator>
  );
}
