import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    student_id: string;
    full_name: string;
    program: string;
    community: string | null;
    group_number: number | null;
    registered_at: string | null;
    role: string;
  } | null;
  theme: string;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  setTheme: (theme: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: any): AuthState => ({
      token: null,
      user: null,
      theme: 'light',
      setAuth: (token: string, user: any) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setTheme: (theme: string) => set({ theme }),
    }),
    {
      name: 'cfss-auth-storage',
    }
  )
);
