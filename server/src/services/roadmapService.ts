import { GoogleGenAI, Type } from '@google/genai';
import { IRoadmap, Roadmap } from '../models/Roadmap';
import { Profile } from '../models/Profile';
import { Settings } from '../models/Settings';
import mongoose from 'mongoose';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface RoadmapGenerationResult {
  roadmap: IRoadmap;
}

export const generateWellnessRoadmapForUser = async (
  userId: mongoose.Types.ObjectId,
  wishes?: string,
): Promise<RoadmapGenerationResult | null> => {
  const profile = await Profile.findOne({ userId });
  const settings = await Settings.findOne({ userId });

  if (!profile) {
    throw new Error('Profile not found for roadmap generation');
  }

  const userProfile = {
    goal: profile.goal,
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    allergies: profile.allergies,
    preferences: profile.preferences,
    healthConditions: profile.healthConditions,
  };

  const prompt = `Создай план оздоровления из 5 конкретных шагов для пользователя.
  
  Данные профиля:
  - Цель: ${userProfile.goal}
  - Возраст: ${userProfile.age}, Вес: ${userProfile.weight}, Рост: ${userProfile.height}, Пол: ${userProfile.gender}, Активность: ${userProfile.activityLevel}
  ${userProfile.allergies ? `- Аллергии: ${userProfile.allergies}` : ''}
  ${userProfile.preferences ? `- Предпочтения в еде: ${userProfile.preferences}` : ''}
  ${userProfile.healthConditions ? `- Ограничения здоровья: ${userProfile.healthConditions}` : ''}
  
  ЗАДАЧА 1: Рассчитай конкретные целевые показатели (targets) на день:
  - dailyCalories: Используй формулу Миффлина-Сан Жеора с учетом активности и цели.
  - dailyWater: Рекомендуемый объем воды в мл (обычно 30-35 мл на кг).
  - dailySteps: Рекомендуемое количество шагов (например, 7000-12000).
  - sleepHours: Рекомендуемая продолжительность сна (обычно 7-9).
  
  ЗАДАЧА 2: Составь план (steps) из 5 пунктов.
  ВКЛЮЧИ в план хотя бы один пункт, касающийся РЕЖИМА СНА и восстановления, если это уместно.
  
  ${wishes ? `ОСОБЫЕ ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ (УЧТИ ОБЯЗАТЕЛЬНО): ${wishes}` : ''}
  
  Верни JSON объект.
  Язык: Русский.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targets: {
            type: Type.OBJECT,
            properties: {
              dailyCalories: { type: Type.NUMBER },
              dailyWater: { type: Type.NUMBER },
              dailySteps: { type: Type.NUMBER },
              sleepHours: { type: Type.NUMBER },
            },
            required: ['dailyCalories', 'dailyWater', 'dailySteps', 'sleepHours'],
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                status: { type: Type.STRING },
              },
              required: ['title', 'description', 'status'],
            },
          },
        },
        required: ['targets', 'steps'],
      },
    },
  });

  const text = response.text;
  if (!text) return null;

  const parsed = JSON.parse(text) as {
    targets: {
      dailyCalories: number;
      dailyWater: number;
      dailySteps: number;
      sleepHours: number;
    };
    steps: { title: string; description: string; status: string }[];
  };

  const { targets, steps } = parsed;

  // Обновим профиль и настройки на основе targets
  await Profile.findOneAndUpdate(
    { userId },
    {
      dailyCalorieGoal: targets.dailyCalories,
      dailyStepGoal: targets.dailySteps,
    },
    { new: true },
  );

  if (settings) {
    settings.waterGoal = targets.dailyWater;
    settings.sleep.targetHours = targets.sleepHours;
    await settings.save();
  } else {
    await Settings.create({
      userId,
      waterGoal: targets.dailyWater,
      sleep: {
        targetHours: targets.sleepHours,
        bedTime: '23:00',
        wakeTime: '07:00',
        bedTimeReminderEnabled: false,
        wakeAlarmEnabled: false,
      },
    });
  }

  const roadmap = await Roadmap.findOneAndUpdate(
    { userId },
    {
      userId,
      steps: steps.map((s) => ({
        title: s.title,
        description: s.description,
        status: (s.status as any) || 'pending',
      })),
      targets: {
        dailyCalories: targets.dailyCalories,
        dailyWater: targets.dailyWater,
        dailySteps: targets.dailySteps,
        sleepHours: targets.sleepHours,
      },
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return { roadmap };
};
