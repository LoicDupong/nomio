import { create } from 'zustand';
import { User } from '@/types';

interface AuthStore {
  token: string | null;
  guestToken: string | null;
  user: User | null;
  guestName: string | null;
  setAuth: (token: string, user: User) => void;
  setGuest: (guestToken: string, guestName: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  guestToken: null,
  user: null,
  guestName: null,

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.removeItem('guest_token');
    set({ token, user, guestToken: null, guestName: null });
  },

  setGuest: (guestToken, guestName) => {
    localStorage.setItem('guest_token', guestToken);
    localStorage.removeItem('token');
    set({ guestToken, guestName, token: null, user: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guest_token');
    set({ token: null, guestToken: null, user: null, guestName: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const guestToken = localStorage.getItem('guest_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        set({ token, user: { id: payload.id, email: payload.email, display_name: payload.display_name } });
      } catch {
        localStorage.removeItem('token');
        set({ token: null, user: null });
      }
    } else if (guestToken) {
      try {
        const payload = JSON.parse(atob(guestToken.split('.')[1]));
        set({ guestToken, guestName: payload.guest_name });
      } catch {
        localStorage.removeItem('guest_token');
        set({ guestToken: null, guestName: null });
      }
    }
  },
}));
