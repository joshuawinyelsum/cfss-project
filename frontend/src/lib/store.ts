import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProvisioningStatus = 
  | 'UNPROVISIONED' 
  | 'AUTHENTICATING' 
  | 'AUTHENTICATED' 
  | 'PROVISIONING_DEVICE' 
  | 'PROVISIONING_DATA' 
  | 'VERIFYING_LOCAL_STATE' 
  | 'PROVISIONED' 
  | 'READY' 
  | 'PROVISIONING_FAILED';

export interface ProvisioningRecord {
  status: ProvisioningStatus;
  provisionedAt: string | null;
}

export interface UserProfile {
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
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  theme: string;
  provisionedUsers: Record<number, ProvisioningRecord>;
  currentProvisioningStatus: ProvisioningStatus;
  setProvisioningStatus: (userId: number, status: ProvisioningStatus) => void;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  setTheme: (theme: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      token: null,
      user: null,
      theme: 'light',
      provisionedUsers: {},
      currentProvisioningStatus: 'UNPROVISIONED',
      setProvisioningStatus: (userId: number, status: ProvisioningStatus) => 
        set((state: AuthState) => {
          const now = status === 'PROVISIONED' || status === 'READY' ? new Date().toISOString() : state.provisionedUsers[userId]?.provisionedAt || null;
          return {
            currentProvisioningStatus: status,
            provisionedUsers: {
              ...state.provisionedUsers,
              [userId]: { status, provisionedAt: now }
            }
          };
        }),
      setAuth: (token: string, user: UserProfile) => set({ token, user }),
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
    (set): AuthState => ({
      token: null,
      user: null,
      theme: 'light',
      provisionedUsers: {},
      currentProvisioningStatus: 'UNPROVISIONED',
      setProvisioningStatus: (userId: number, status: ProvisioningStatus) => 
        set((state: AuthState) => {
          const now = status === 'PROVISIONED' || status === 'READY' ? new Date().toISOString() : state.provisionedUsers[userId]?.provisionedAt || null;
          return {
            currentProvisioningStatus: status,
            provisionedUsers: {
              ...state.provisionedUsers,
              [userId]: { status, provisionedAt: now }
            }
          };
        }),
      setAuth: (token: string, user: UserProfile) => set({ token, user }),
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
