import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guest_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (guestToken) {
    config.headers['x-guest-token'] = guestToken;
  }
  return config;
});

export default api;
