import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (guestToken) config.headers['x-guest-token'] = guestToken;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.replace('/');
    }
    return Promise.reject(error);
  }
);

export default api;
