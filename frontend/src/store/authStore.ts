import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/constants';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'expert';
  full_name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            set({ isLoading: false, error: data.detail || 'Ошибка входа' });
            return false;
          }

          const data = await res.json();
          set({ token: data.access_token, isLoading: false });

          // Fetch user profile
          await get().fetchMe();
          return true;
        } catch {
          set({ isLoading: false, error: 'Ошибка сети' });
          return false;
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, error: null });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            set({ token: null, user: null, isAuthenticated: false });
            return;
          }

          const user: AuthUser = await res.json();
          set({ user, isAuthenticated: true });
        } catch {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token }),
    }
  )
);
