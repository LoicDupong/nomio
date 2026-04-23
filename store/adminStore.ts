import { create } from 'zustand';

interface AdminStore {
  token: string | null;
  setToken: (t: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  token: null,

  setToken: (token) => {
    localStorage.setItem('admin_token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          localStorage.removeItem('admin_token');
          set({ token: null });
          return;
        }
        set({ token });
      } catch {
        localStorage.removeItem('admin_token');
        set({ token: null });
      }
    }
  },
}));
