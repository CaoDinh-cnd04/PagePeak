import { create } from "zustand";
import { authApi } from "@/lib/api";
import { saveTokens, clearTokens, getAccessToken } from "@/lib/auth";

export type User = {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  currentPlanId?: number;
  planExpiresAt?: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone?: string, recaptchaToken?: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isHydrated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(email, password);
      saveTokens(data.accessToken, data.refreshToken, data.expiresAt);
      await get().fetchMe();
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName, phone, recaptchaToken) => {
    set({ isLoading: true });
    try {
      await authApi.register(email, password, fullName, phone, recaptchaToken);
      await get().login(email, password);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMe: async () => {
    if (!getAccessToken()) {
      set({ user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user });
    } catch {
      clearTokens();
      set({ user: null });
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null });
  },

  hydrate: () => {
    if (get().isHydrated) return;
    get().fetchMe().then(() => set({ isHydrated: true }));
  },
}));
