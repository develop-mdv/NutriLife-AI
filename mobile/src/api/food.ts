import { api } from './client';

export interface FoodEntryDto {
  id?: string;
  name: string;
  imageUri?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  rating: number;
  recommendation: string;
  timestamp: number;
}

export const listFood = (date?: string) =>
  api.get<FoodEntryDto[]>('/me/food', { params: date ? { date } : undefined });

export const createFood = (entry: Omit<FoodEntryDto, 'id'>) =>
  api.post<FoodEntryDto>('/me/food', entry);

export const updateFood = (id: string, entry: Partial<FoodEntryDto>) =>
  api.put<FoodEntryDto>(`/me/food/${id}`, entry);

export const deleteFood = (id: string) => api.delete(`/me/food/${id}`);
