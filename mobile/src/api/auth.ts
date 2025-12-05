import { api } from './client';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const register = (payload: { name: string; email: string; password: string }) =>
  api.post<AuthResponse>('/auth/register', payload);

export const login = (payload: { email: string; password: string }) =>
  api.post<AuthResponse>('/auth/login', payload);
