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

export const sendChatMessage = (history: ChatMessage[], message: string, context?: string) =>
  api.post<ChatResponse>('/ai/chat', { history, message, context });
