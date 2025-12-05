import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const useNotificationsSetup = () => {
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Уведомления не разрешены пользователем');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })();
  }, []);
};

export const scheduleWaterReminder = async (intervalMinutes: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Время пить воду 💧',
      body: 'Поддержите водный баланс для здоровья и энергии!',
    },
    trigger: {
      seconds: intervalMinutes * 60,
      repeats: true,
    },
  });
};
