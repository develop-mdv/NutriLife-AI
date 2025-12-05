import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/Main/DashboardScreen';
import { ChatScreen } from '../screens/Main/ChatScreen';
import { WalksScreen } from '../screens/Main/WalksScreen';
import { ProfileScreen } from '../screens/Main/ProfileScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Walks: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Сегодня' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Тренер' }} />
      <Tab.Screen name="Walks" component={WalksScreen} options={{ title: 'Прогулки' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
};
