import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    id: number | null;
    student_id: string;
    full_name: string;
    email: string | null;
    faculty: string | null;
    gender: string | null;
    phone_number: string | null;
    program: string;
    community: string | null;
    community_id: number | null;
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
      logout: () => {
        set({ token: null, user: null });
        // NOTE: We do NOT clear db.surveys here. 
        // Data isolation is enforced at query time via student_id.
        // This ensures unsynchronized offline fieldwork is not destroyed on logout.
      },
      setTheme: (theme: string) => set({ theme }),
    }),
    {
      name: 'cfss-auth-storage', // STUDENT ONLY
    }
  )
);

export const useAdminAuthStore = create<AuthState>()(
  persist(
    (set: any): AuthState => ({
      token: null,
      user: null,
      theme: 'light',
      setAuth: (token: string, user: any) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null });
      },
      setTheme: (theme: string) => set({ theme }),
    }),
    {
      name: 'cfss-admin-auth-storage', // ADMIN ONLY
    }
  )
);
