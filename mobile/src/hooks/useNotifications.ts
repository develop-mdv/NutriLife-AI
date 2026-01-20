import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Проверка, запущено ли приложение в Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export const useNotificationsSetup = () => {
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Уведомления не разрешены пользователем');
          return;
        }

        if (Platform.OS === 'android') {
          // Создаём канал для обычных уведомлений
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Общие',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
          // Канал для будильника с максимальным приоритетом
          await Notifications.setNotificationChannelAsync('alarm', {
            name: 'Будильник',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 500, 200, 500, 200, 500],
            enableVibrate: true,
          });
        }
      } catch (e) {
        console.log('Ошибка настройки уведомлений:', e);
      }
    })();
  }, []);
};

// ----- Вода -----
// Планируем ТОЛЬКО ОДНО повторяющееся напоминание о воде.
// Перед созданием нового сначала удаляем все старые water_interval-уведомления,
// чтобы не было "спам-атаки" из-за дублирующихся расписаний.
export const scheduleWaterReminder = async (intervalMinutes: number) => {
  try {
    // На всякий случай очищаем старые расписания воды
    await cancelWaterReminders();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Время пить воду 💧',
        body: 'Поддержите водный баланс для здоровья и энергии!',
        data: { type: 'water_interval' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalMinutes * 60,
        repeats: true,
      },
    });
  } catch (e) {
    console.log('Ошибка планирования напоминания о воде:', e);
  }
};

export const cancelWaterReminders = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content?.data?.type === 'water_interval')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (e) {
    console.log('Ошибка отмены напоминаний о воде:', e);
  }
};

// ----- Сон -----
export type SleepNotificationType = 'sleep_wake' | 'sleep_bed';

export const scheduleDailySleepNotification = async (
  type: SleepNotificationType,
  hour: number,
  minute: number,
) => {
  try {
    const common =
      type === 'sleep_wake'
        ? {
            title: 'Время просыпаться ⏰',
            body: 'Просыпайтесь вовремя, чтобы сохранить режим сна.',
            sound: true,
          }
        : {
            title: 'Пора готовиться ко сну 🌙',
            body: 'Отложите дела и начните вечерний ритуал перед сном.',
            sound: false,
          };

    // Для будильника используем канал alarm
    const channelId = type === 'sleep_wake' ? 'alarm' : 'default';

    await Notifications.scheduleNotificationAsync({
      content: {
        ...common,
        data: { type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? channelId : undefined,
      },
    });
  } catch (e) {
    console.log('Ошибка планирования уведомления сна:', e);
  }
};

export const cancelSleepNotifications = async (type: SleepNotificationType) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content?.data?.type === type)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (e) {
    console.log('Ошибка отмены уведомлений сна:', e);
  }
};

// ----- Будильник -----
// Запустить "будильник" - многократные уведомления с коротким интервалом
export const triggerAlarm = async (message?: string) => {
  try {
    // Отправляем мгновенное уведомление
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Будильник! ⏰',
        body: message || 'Время просыпаться!',
        data: { type: 'alarm_trigger' },
        sound: true,
      },
      trigger: null, // Мгновенная доставка
    });
  } catch (e) {
    console.log('Ошибка запуска будильника:', e);
  }
};

// Проверка, доступны ли уведомления
export const areNotificationsAvailable = () => !isExpoGo || Platform.OS === 'ios';
