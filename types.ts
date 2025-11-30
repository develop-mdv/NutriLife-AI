
export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  imageUri?: string; // base64
  macros: Macros;
  rating: number; // 1-10
  recommendation: string;
  timestamp: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
  timestamp: number;
}

export interface SleepEntry {
  id: string;
  durationHours: number;
  quality: number; // 1-10
  timestamp: number; // Date of the sleep record
}

export interface SleepConfig {
  targetHours: number;
  bedTime: string; // "23:00"
  wakeTime: string; // "07:00"
  bedTimeReminderEnabled: boolean;
  wakeAlarmEnabled: boolean;
}

export interface UserProfile {
  name: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female' | 'other';
  goal: 'lose_weight' | 'gain_muscle' | 'maintain';
  activityLevel: 'sedentary' | 'active' | 'athletic';
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  allergies?: string;
  preferences?: string;
  healthConditions?: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface ReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM"
}

export interface MealRemindersConfig {
  breakfast: ReminderConfig;
  lunch: ReminderConfig;
  dinner: ReminderConfig;
}

export interface WalkingRoute {
  title: string;
  description: string;
  estimatedSteps: number;
  durationMinutes: number;
  distanceKm: number;
  startLocation: string;
  endLocation: string;
  isRoundTrip?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  FOOD_LOG = 'FOOD_LOG',
  ACTIVITY = 'ACTIVITY',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  WALKS = 'WALKS',
  SLEEP = 'SLEEP'
}
