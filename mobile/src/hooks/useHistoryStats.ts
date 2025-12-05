import { useEffect, useState } from 'react';
import { DailyStats, getHistory } from '../api/me';

export interface HistorySummary {
  last7: {
    days: DailyStats[];
    avgCalories: number;
    avgSteps: number;
    avgWater: number;
    avgSleep: number;
  };
  last30: {
    days: DailyStats[];
    avgCalories: number;
    avgSteps: number;
    avgWater: number;
    avgSleep: number;
  };
}

const calcAvg = (items: DailyStats[]) => {
  if (items.length === 0) return { avgCalories: 0, avgSteps: 0, avgWater: 0, avgSleep: 0 };
  const total = items.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      steps: acc.steps + d.steps,
      water: acc.water + d.water,
      sleep: acc.sleep + d.sleepHours,
    }),
    { calories: 0, steps: 0, water: 0, sleep: 0 },
  );
  return {
    avgCalories: Math.round(total.calories / items.length),
    avgSteps: Math.round(total.steps / items.length),
    avgWater: Math.round(total.water / items.length),
    avgSleep: Number((total.sleep / items.length).toFixed(1)),
  };
};

export const useHistoryStats = () => {
  const [history, setHistory] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getHistory();
        setHistory(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const last7 = history.slice(-7);
  const last30 = history.slice(-30);

  return {
    loading,
    history,
    summary: {
      last7: { days: last7, ...calcAvg(last7) },
      last30: { days: last30, ...calcAvg(last30) },
    } as HistorySummary,
  };
};
