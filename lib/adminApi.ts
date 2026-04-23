import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

adminApi.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      useAdminStore.getState().logout();
      window.location.replace('/admin/login');
    }
    return Promise.reject(error);
  }
);

export default adminApi;
