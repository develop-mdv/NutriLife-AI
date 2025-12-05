import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { FoodLoggerScreen } from '../screens/Main/FoodLoggerScreen';
import { SleepScreen } from '../screens/Main/SleepScreen';

export type MainStackParamList = {
  Tabs: undefined;
  FoodLogger: undefined;
  Sleep: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="FoodLogger"
        component={FoodLoggerScreen}
        options={{ title: 'Новая запись питания' }}
      />
      <Stack.Screen
        name="Sleep"
        component={SleepScreen}
        options={{ title: 'Сон' }}
      />
    </Stack.Navigator>
  );
};
