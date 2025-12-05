import { useEffect, useState } from 'react';
import { DailyStats, getTodayStats, updateTodayStats, updateWaterToday } from '../api/me';

const emptyStats: DailyStats = {
  date: new Date().toISOString().split('T')[0],
  calories: 0,
  steps: 0,
  water: 0,
  sleepHours: 0,
};

export const useTodayStats = () => {
  const [stats, setStats] = useState<DailyStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTodayStats();
        if (res.data) setStats(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addWater = async (amount: number) => {
    const next = stats.water + amount;
    setStats((prev) => ({ ...prev, water: next }));
    try {
      await updateWaterToday(next);
    } catch {
      // можно откатить состояние или показать ошибку
    }
  };

  const setSleepHours = async (hours: number) => {
    const next = { ...stats, sleepHours: hours };
    setStats(next);
    try {
      await updateTodayStats(next);
    } catch {}
  };

  return { stats, setStats, loading, addWater, setSleepHours };
};
