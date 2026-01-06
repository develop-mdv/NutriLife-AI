import { useEffect, useState, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateStepsToday, getTodayStats } from '../api/me';

const STEPS_STORAGE_KEY = 'steps_today';
const STEPS_DATE_KEY = 'steps_date';

export const useSteps = (enabled: boolean) => {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const stepsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let subscription: { remove: () => void } | null = null;

    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);
        if (!available) {
          console.log('Pedometer недоступен на этом устройстве');
          // Загрузим шаги с сервера для отображения
          try {
            const res = await getTodayStats();
            if (res.data?.steps) {
              setSteps(res.data.steps);
              stepsRef.current = res.data.steps;
            }
          } catch {}
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        // На Android getStepCountAsync не поддерживается
        // Используем AsyncStorage для сохранения накопленных шагов и сервер как источник правды
        if (Platform.OS === 'android') {
          console.log('Pedometer: Android, используем сохраненные шаги + шагомер');

          // Проверяем дату сохраненных шагов
          const [savedStepsStr, savedDate] = await Promise.all([
            AsyncStorage.getItem(STEPS_STORAGE_KEY),
            AsyncStorage.getItem(STEPS_DATE_KEY),
          ]);

          let baseSteps = 0;

          // Если это новый день - сбрасываем шаги
          if (savedDate !== today) {
            baseSteps = 0;
            await AsyncStorage.setItem(STEPS_DATE_KEY, today);
            await AsyncStorage.setItem(STEPS_STORAGE_KEY, '0');
          } else if (savedStepsStr) {
            baseSteps = parseInt(savedStepsStr, 10) || 0;
          }

          // Также проверяем сервер - возможно там больше шагов (если синхронизация была с другого устройства)
          try {
            const res = await getTodayStats();
            if (res.data?.steps && res.data.steps > baseSteps) {
              baseSteps = res.data.steps;
            }
          } catch {}

          setSteps(baseSteps);
          stepsRef.current = baseSteps;

          subscription = Pedometer.watchStepCount((res) => {
            const newSteps = stepsRef.current + (res.steps || 0);
            setSteps(newSteps);
            // Сохраняем в AsyncStorage
            AsyncStorage.setItem(STEPS_STORAGE_KEY, String(newSteps)).catch(() => {});
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
        stepsRef.current = base;
        console.log('Начальное значение шагов за сегодня:', base);

        subscription = Pedometer.watchStepCount((res) => {
          // res.steps — шаги с момента подписки, добавляем к базовому значению
          setSteps(base + (res.steps || 0));
        });
      } catch (e) {
        console.log('Ошибка работы шагомера:', e);
        setIsAvailable(false);
        // При ошибке пытаемся загрузить с сервера
        try {
          const res = await getTodayStats();
          if (res.data?.steps) {
            setSteps(res.data.steps);
            stepsRef.current = res.data.steps;
          }
        } catch {}
      }
    };

    subscribe();

    return () => {
      subscription && subscription.remove();
    };
  }, [enabled]);

  // синхронизация с сервером
  useEffect(() => {
    if (!enabled || steps === 0) return;
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
