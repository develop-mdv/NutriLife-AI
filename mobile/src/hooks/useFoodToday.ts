import { useCallback, useState } from 'react';
import { FoodEntryDto, listFood } from '../api/food';

export const useFoodToday = () => {
  const [items, setItems] = useState<FoodEntryDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // без даты — получаем всю историю и дальше фильтруем на клиенте, как в веб-версии
      const res = await listFood();
      const normalized = (res.data || []).map((e: any) => ({
        id: e.id ?? e._id,
        name: e.name,
        imageUri: e.imageUri,
        calories: e.calories,
        protein: e.protein,
        fat: e.fat,
        carbs: e.carbs,
        rating: e.rating,
        recommendation: e.recommendation,
        timestamp: e.timestamp,
      }));
      setItems(normalized);
    } catch (e) {
      console.log('Ошибка загрузки истории питания', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, load };
};
