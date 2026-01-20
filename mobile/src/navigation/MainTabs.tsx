import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  const handlePlusPress = () => {
    // перейти на экран добавления еды в родительском стек-навигаторе
    navigation.getParent()?.navigate('FoodLogger' as never);
  };

  return (

    <View style={[stylesTab.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={stylesTab.innerRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              const currentRoute = state.routes[state.index];
              const currentParams: any = currentRoute.params;

              const leavingProfileWithUnsaved =
                currentRoute.name === 'Profile' &&
                route.name !== 'Profile' &&
                currentParams?.hasUnsavedSettings;

              if (leavingProfileWithUnsaved) {
                // вместо прямого перехода отдаём действие экрану профиля,
                // чтобы он показал модалку и потом выполнил этот переход
                const navAction = CommonActions.navigate({ name: route.name });
                (navigation as any).navigate('Profile', {
                  profilePendingNavAction: navAction,
                });
              } else {
                (navigation as any).navigate(route.name);
              }
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Отодвигаем центральные вкладки от кнопки +
          const isNearCenter = route.name === 'Chat' || route.name === 'Walks';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[stylesTab.tabItem, isNearCenter && stylesTab.tabItemWithSpacer]}
              activeOpacity={0.8}
            >
              <Text style={[stylesTab.icon, isFocused && stylesTab.iconActive]}>
                {route.name === 'Dashboard' && '🏠'}
                {route.name === 'Chat' && '💬'}
                {route.name === 'Walks' && '🚶'}
                {route.name === 'Profile' && '👤'}
              </Text>
              <Text style={[stylesTab.label, isFocused && stylesTab.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Центральная кнопка + как на веб-версии */}
      <View style={stylesTab.plusWrapper}>
        <TouchableOpacity style={stylesTab.plusButtonShadow} onPress={handlePlusPress} activeOpacity={0.9}>
          <View style={stylesTab.plusButton}>
            <Text style={stylesTab.plusText}>+</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Сегодня' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Тренер' }} />
      <Tab.Screen name="Walks" component={WalksScreen} options={{ title: 'Прогулки' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
};

const stylesTab = StyleSheet.create({
  container: {
    backgroundColor: '#18181b', // Zinc-900
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  innerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12, // more breathing room
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemWithSpacer: {
    // немного сузим и отодвинем от центра, чтобы оставить место под +
    flex: 0.8,
    marginHorizontal: 12,
  },
  icon: {
    fontSize: 22,
    color: '#6b7280',
    marginBottom: 4,
  },
  iconActive: {
    color: '#10b981',
    textShadowColor: 'rgba(16, 185, 129, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
  },
  labelActive: {
    color: '#f3f4f6', // bright white-ish
    fontWeight: '600',
  },
  plusWrapper: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -32 }],
    top: -24,
  },
  plusButtonShadow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  plusButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#18181b', // matches tab bar bg
  },
  plusText: {
    fontSize: 32,
    color: '#ffffff',
    marginTop: -2,
    fontWeight: '300',
  },
});
