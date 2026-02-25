import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { FoodLoggerScreen } from '../screens/Main/FoodLoggerScreen';
import { SleepScreen } from '../screens/Main/SleepScreen';
import { ActivityLoggerScreen } from '../screens/Main/ActivityLoggerScreen';
import { AlarmListScreen } from '../screens/Main/AlarmListScreen';
import { AlarmEditScreen } from '../screens/Main/AlarmEditScreen';

export type MainStackParamList = {
  Tabs: undefined;
  FoodLogger: undefined;
  Sleep: undefined;
  ActivityLogger: undefined;
  AlarmList: undefined;
  AlarmEdit: { alarmId?: string };
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
      <Stack.Screen
        name="ActivityLogger"
        component={ActivityLoggerScreen}
        options={{ title: 'Новая активность' }}
      />
      <Stack.Screen
        name="AlarmList"
        component={AlarmListScreen}
        options={{ title: 'Будильники' }}
      />
      <Stack.Screen
        name="AlarmEdit"
        component={AlarmEditScreen}
        options={{ title: 'Настройка будильника' }}
      />
    </Stack.Navigator>
  );
};
