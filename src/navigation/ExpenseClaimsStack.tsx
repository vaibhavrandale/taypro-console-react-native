import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateExpenseClaimScreen } from '../screens/CreateExpenseClaimScreen';
import { ExpenseClaimsScreen } from '../screens/ExpenseClaimsScreen';
import { UpdateExpenseClaimScreen } from '../screens/UpdateExpenseClaimScreen';

export type ExpenseClaimsStackParamList = {
  ExpensesList: undefined;
  ExpensesCreate: undefined;
  ExpensesUpdate: { id: string };
};

const Stack = createNativeStackNavigator<ExpenseClaimsStackParamList>();

export function ExpenseClaimsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExpensesList" component={ExpenseClaimsScreen} />
      <Stack.Screen name="ExpensesCreate" component={CreateExpenseClaimScreen} />
      <Stack.Screen name="ExpensesUpdate" component={UpdateExpenseClaimScreen} />
    </Stack.Navigator>
  );
}
