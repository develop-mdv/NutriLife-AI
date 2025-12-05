import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { Profile } from '../models/Profile';
import { DailyStats } from '../models/Stats';
import { Settings } from '../models/Settings';
import { FoodEntry } from '../models/FoodEntry';
import { Roadmap } from '../models/Roadmap';
import { generateWellnessRoadmapForUser } from '../services/roadmapService';

export const meRouter = Router();
meRouter.use(requireAuth);

const todayStr = () => new Date().toISOString().split('T')[0];

// Профиль
meRouter.get('/profile', async (req: AuthedRequest, res) => {
  const profile = await Profile.findOne({ userId: req.userId });
  res.json(profile);
});

meRouter.put('/profile', async (req: AuthedRequest, res) => {
  const data = req.body;
  const profile = await Profile.findOneAndUpdate(
    { userId: req.userId },
    { ...data, userId: req.userId },
    { upsert: true, new: true },
  );
  res.json(profile);
});

// Настройки (вода/напоминания/сон)
meRouter.get('/settings', async (req: AuthedRequest, res) => {
  const settings = await Settings.findOne({ userId: req.userId });
  res.json(settings);
});

meRouter.put('/settings', async (req: AuthedRequest, res) => {
  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { ...req.body, userId: req.userId },
    { upsert: true, new: true },
  );
  res.json(settings);
});

// Roadmap (Мой план)
meRouter.get('/roadmap', async (req: AuthedRequest, res) => {
  const doc = await Roadmap.findOne({ userId: req.userId });
  res.json(doc || null);
});

meRouter.post('/roadmap/generate', async (req: AuthedRequest, res) => {
  try {
    const { wishes } = req.body as { wishes?: string };
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const result = await generateWellnessRoadmapForUser(req.userId as any, wishes);
    if (!result) {
      return res.status(500).json({ error: 'Не удалось сгенерировать план' });
    }
    res.json(result.roadmap);
  } catch (e) {
    console.error('Roadmap generation error', e);
    res.status(500).json({ error: 'Ошибка генерации плана' });
  }
});

meRouter.put('/roadmap', async (req: AuthedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const { steps, targets } = req.body as { steps?: any[]; targets?: any };
    const doc = await Roadmap.findOneAndUpdate(
      { userId: req.userId },
      {
        ...(steps ? { steps } : {}),
        ...(targets ? { targets } : {}),
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
    res.json(doc);
  } catch (e) {
    console.error('Roadmap update error', e);
    res.status(500).json({ error: 'Ошибка обновления плана' });
  }
});

// Сегодняшняя статистика
meRouter.get('/stats/today', async (req: AuthedRequest, res) => {
  const stats = await DailyStats.findOne({ userId: req.userId, date: todayStr() });
  res.json(stats || null);
});

meRouter.put('/stats/today', async (req: AuthedRequest, res) => {
  const { calories, steps, water, sleepHours } = req.body;
  const stats = await DailyStats.findOneAndUpdate(
    { userId: req.userId, date: todayStr() },
    { $set: { calories, steps, water, sleepHours } },
    { upsert: true, new: true },
  );
  res.json(stats);
});

meRouter.get('/stats/history', async (req: AuthedRequest, res) => {
  const stats = await DailyStats.find({ userId: req.userId })
    .sort({ date: 1 })
    .limit(30);
  res.json(stats);
});

meRouter.put('/steps/today', async (req: AuthedRequest, res) => {
  const { steps } = req.body;
  const stats = await DailyStats.findOneAndUpdate(
    { userId: req.userId, date: todayStr() },
    { $set: { steps } },
    { upsert: true, new: true },
  );
  res.json(stats);
});

meRouter.put('/water/today', async (req: AuthedRequest, res) => {
  const { water } = req.body;
  const stats = await DailyStats.findOneAndUpdate(
    { userId: req.userId, date: todayStr() },
    { $set: { water } },
    { upsert: true, new: true },
  );
  res.json(stats);
});

meRouter.put('/sleep/today', async (req: AuthedRequest, res) => {
  const { sleepHours } = req.body;
  const stats = await DailyStats.findOneAndUpdate(
    { userId: req.userId, date: todayStr() },
    { $set: { sleepHours } },
    { upsert: true, new: true },
  );
  res.json(stats);
});

// ----- Питание -----

// Получить список записей питания (опционально за день)
meRouter.get('/food', async (req: AuthedRequest, res) => {
  const { date } = req.query as { date?: string };
  const filter: any = { userId: req.userId };
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    filter.timestamp = { $gte: dayStart.getTime(), $lt: dayEnd.getTime() };
  }
  const items = await FoodEntry.find(filter).sort({ timestamp: -1 });
  res.json(items);
});

// Создать запись о приёме пищи
meRouter.post('/food', async (req: AuthedRequest, res) => {
  const { name, imageUri, calories, protein, fat, carbs, rating, recommendation, timestamp } = req.body;
  const ts = typeof timestamp === 'number' ? timestamp : Date.now();

  const entry = await FoodEntry.create({
    userId: req.userId!,
    name,
    imageUri,
    calories,
    protein,
    fat,
    carbs,
    rating,
    recommendation,
    timestamp: ts,
  });

  // обновим калории на сегодня: суммируем все записи за день
  const dayStr = todayStr();
  const dayStart = new Date(dayStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const todayMeals = await FoodEntry.find({
    userId: req.userId,
    timestamp: { $gte: dayStart.getTime(), $lt: dayEnd.getTime() },
  });

  const totalCalories = todayMeals.reduce((sum, e) => sum + e.calories, 0);
  await DailyStats.findOneAndUpdate(
    { userId: req.userId, date: dayStr },
    { $set: { calories: totalCalories } },
    { upsert: true, new: true },
  );

  res.status(201).json(entry);
});

// Обновить запись
meRouter.put('/food/:id', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const updated = await FoodEntry.findOneAndUpdate(
    { _id: id, userId: req.userId },
    { ...req.body },
    { new: true },
  );
  if (!updated) return res.status(404).json({ error: 'Запись не найдена' });
  res.json(updated);
});

// Удалить запись
meRouter.delete('/food/:id', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const deleted = await FoodEntry.findOneAndDelete({ _id: id, userId: req.userId });
  if (!deleted) return res.status(404).json({ error: 'Запись не найдена' });
  res.json({ ok: true });
});
