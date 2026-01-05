import { api } from './client';

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  rating: number;
  ratingDescription: string;
  recommendation: string;
}

export const analyzeFoodImage = (base64Image: string) =>
  api.post<FoodAnalysis>('/ai/analyze-food', { image: base64Image });

// ---- Чат с ИИ-тренером ----

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  text: string;
}

export interface ChatHistoryItem extends ChatMessage {
  createdAt?: string;
  day?: string;
}

export interface ChatDaySummary {
  day: string; // YYYY-MM-DD
  count: number;
  lastCreatedAt?: string;
}

export const sendChatMessage = (history: ChatMessage[], message: string, context?: string) =>
  api.post<ChatResponse>('/ai/chat', { history, message, context });

export const getChatHistory = (day: string, limit = 100) =>
  api.get<ChatHistoryItem[]>('/ai/chat/history', { params: { day, limit } });

export const getChatDays = () => api.get<ChatDaySummary[]>('/ai/chat/days');
