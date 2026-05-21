import { create } from 'zustand';

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'guest' | 'student' | 'admin' | 'superadmin';
  planId: 'free' | 'notes' | 'lectures' | 'premium';
  unlockedMaterials?: string[];
  streak?: number;
  lastStudyDate?: string;
  todayStudyMinutes?: number;
  lastStreakDate?: string;
  classGroup?: string;
  photoURL?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
