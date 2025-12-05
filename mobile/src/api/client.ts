import axios from 'axios';

// Базовый URL сервера. Для устройства в одной сети с ПК укажи IP ПК, напр.:
// EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:4000/api
// Если переменная не задана, по умолчанию будет localhost (подходит для эмуляторов).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
