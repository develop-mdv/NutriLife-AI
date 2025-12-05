import { useEffect, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { updateStepsToday } from '../api/me';

export const useSteps = (enabled: boolean) => {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let subscription: { remove: () => void } | null = null;

    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);
        if (!available) {
          console.log('Pedometer недоступен на этом устройстве');
          return;
        }

        // На Android getStepCountAsync не поддерживается, считаем шаги только с момента запуска
        if (Platform.OS === 'android') {
          console.log('Pedometer: Android, считаем шаги только с момента подписки');
          let base = 0;
          subscription = Pedometer.watchStepCount((res) => {
            setSteps(base + (res.steps || 0));
          });
          return;
        }

        // iOS: можем получить шаги за день
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const result = await Pedometer.getStepCountAsync(start, end);
        let base = result.steps || 0;
        setSteps(base);
        console.log('Начальное значение шагов за сегодня:', base);

        subscription = Pedometer.watchStepCount((res) => {
          // res.steps — шаги с момента подписки, добавляем к базовому значению
          setSteps(base + (res.steps || 0));
        });
      } catch (e) {
        console.log('Ошибка работы шагомера:', e);
        setIsAvailable(false);
      }
    };

    subscribe();

    return () => {
      subscription && subscription.remove();
    };
  }, [enabled]);

  // синхронизация с сервером
  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        await updateStepsToday(steps);
      } catch {
        // можно добавить логирование
      }
    })();
  }, [steps, enabled]);

  return { steps, isAvailable };
};
