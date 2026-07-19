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
  onboardingCompleted?: boolean;
  privacyAccepted?: boolean;
  termsAccepted?: boolean;
  acceptedAt?: string | null;
  phoneNumber?: string;
  class?: string;
  targetExam?: string;
}

interface VerifiedGoogleAccount {
  email: string;
  uid: string;
  idToken: string;
  photoURL?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  verifiedGoogleAccount: VerifiedGoogleAccount | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setVerifiedGoogleAccount: (account: VerifiedGoogleAccount | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  verifiedGoogleAccount: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setVerifiedGoogleAccount: (verifiedGoogleAccount) => set({ verifiedGoogleAccount }),
}));
