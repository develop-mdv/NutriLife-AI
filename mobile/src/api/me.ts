import { api } from './client';

export interface DailyStats {
  date: string;
  calories: number;
  steps: number;
  water: number;
  sleepHours: number;
  sleepQuality: number;
}

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain';
export type ActivityLevel = 'sedentary' | 'active' | 'athletic';

export interface UserProfileApi {
  name: string;
  height: number;
  weight: number;
  age: number;
  gender: Gender;
  goal: Goal;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  allergies?: string;
  preferences?: string;
  healthConditions?: string;
  // Простой аватар в виде emoji-иконки (хранится на сервере вместе с профилем)
  avatarEmoji?: string;
}

export interface ReminderConfigApi {
  enabled: boolean;
  time: string; // "HH:MM"
}

export interface MealRemindersApi {
  breakfast: ReminderConfigApi;
  lunch: ReminderConfigApi;
  dinner: ReminderConfigApi;
}

export interface SleepConfigApi {
  targetHours: number;
  bedTime: string;
  wakeTime: string;
  bedTimeReminderEnabled: boolean;
  wakeAlarmEnabled: boolean;
}

export interface SettingsApi {
  waterGoal: number;
  mealReminders: MealRemindersApi;
  sleep: SleepConfigApi;
}

export interface RoadmapStepApi {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RoadmapTargetsApi {
  dailyCalories: number;
  dailyWater: number;
  dailySteps: number;
  sleepHours: number;
}

export interface RoadmapApi {
  _id?: string;
  steps: RoadmapStepApi[];
  targets: RoadmapTargetsApi;
  updatedAt?: string;
}

export const getTodayStats = () => api.get<DailyStats | null>('/me/stats/today');
export const updateTodayStats = (data: Partial<DailyStats>) =>
  api.put<DailyStats>('/me/stats/today', data);

export const updateStepsToday = (steps: number) => api.put('/me/steps/today', { steps });
export const updateWaterToday = (water: number) => api.put('/me/water/today', { water });
export const updateSleepToday = (sleepHours: number, sleepQuality?: number) =>
  api.put('/me/sleep/today', { sleepHours, sleepQuality });
export const updateSleepByDate = (date: string, sleepHours: number, sleepQuality?: number) =>
  api.put(`/me/sleep/${date}`, { sleepHours, sleepQuality });

export const getHistory = () => api.get<DailyStats[]>('/me/stats/history');

export const getProfile = () => api.get<UserProfileApi>('/me/profile');
export const updateProfile = (profile: Partial<UserProfileApi>) =>
  api.put<UserProfileApi>('/me/profile', profile);

export const getSettings = () => api.get<SettingsApi>('/me/settings');
export const updateSettings = (settings: Partial<SettingsApi>) =>
  api.put<SettingsApi>('/me/settings', settings);

export const getRoadmap = () => api.get<RoadmapApi | null>('/me/roadmap');
export const generateRoadmap = (wishes?: string) =>
  api.post<RoadmapApi>('/me/roadmap/generate', wishes ? { wishes } : {});
export const updateRoadmap = (data: Partial<Pick<RoadmapApi, 'steps' | 'targets'>>) =>
  api.put<RoadmapApi>('/me/roadmap', data);
