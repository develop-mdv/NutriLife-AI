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

// ----- Вода -----
export const scheduleWaterReminder = async (intervalMinutes: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Время пить воду 💧',
      body: 'Поддержите водный баланс для здоровья и энергии!',
      data: { type: 'water_interval' },
    },
    trigger: {
      seconds: intervalMinutes * 60,
      repeats: true,
    },
  });
};

export const cancelWaterReminders = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n as any).content?.data?.type === 'water_interval')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};

// ----- Сон -----
export type SleepNotificationType = 'sleep_wake' | 'sleep_bed';

export const scheduleDailySleepNotification = async (
  type: SleepNotificationType,
  hour: number,
  minute: number,
) => {
  const common =
    type === 'sleep_wake'
      ? {
          title: 'Время просыпаться ⏰',
          body: 'Просыпайтесь вовремя, чтобы сохранить режим сна.',
        }
      : {
          title: 'Пора готовиться ко сну 🌙',
          body: 'Отложите дела и начните вечерний ритуал перед сном.',
        };

  await Notifications.scheduleNotificationAsync({
    content: {
      ...common,
      data: { type },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'default' : undefined,
    } as any,
  });
};

export const cancelSleepNotifications = async (type: SleepNotificationType) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n as any).content?.data?.type === type)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};
