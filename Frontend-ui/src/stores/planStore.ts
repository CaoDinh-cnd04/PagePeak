import { create } from "zustand";
import { settingsApi } from "@/lib/api";

export type PlanInfo = {
  plan: {
    id: number;
    name: string;
    code: string;
    price: number;
    billingCycle: string;
    maxPages: number;
    maxMembers: number;
    maxPageViews?: number;
    storageGb: number;
    hasAi: boolean;
    hasEcommerce: boolean;
    hasAutomation: boolean;
    hasAbTest: boolean;
    hasCustomDomain: boolean;
  } | null;
  usage: { totalPages: number; publishedPages: number; totalMembers: number };
  planExpiresAt?: string;
};

type PlanState = {
  planInfo: PlanInfo | null;
  isLoading: boolean;
  isHydrated: boolean;
  fetchPlan: () => Promise<void>;
  hydrate: () => void;
  hasAi: boolean;
  hasEcommerce: boolean;
  canCreatePage: boolean;
  canAddMember: boolean;
};

export const usePlanStore = create<PlanState>((set, get) => ({
  planInfo: null,
  isLoading: false,
  isHydrated: false,

  hasAi: false,
  hasEcommerce: false,
  canCreatePage: true,
  canAddMember: true,

  fetchPlan: async () => {
    set({ isLoading: true });
    try {
      const data = await settingsApi.getPlanInfo();
      const plan = data.plan;
      const usage = data.usage;
      set({
        planInfo: data,
        hasAi: plan?.hasAi ?? false,
        hasEcommerce: plan?.hasEcommerce ?? false,
        canCreatePage: !plan || usage.totalPages < plan.maxPages,
        canAddMember: !plan || usage.totalMembers < plan.maxMembers,
      });
    } catch {
      set({
        planInfo: null,
        hasAi: false,
        hasEcommerce: false,
        canCreatePage: true,
        canAddMember: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  hydrate: () => {
    if (get().isHydrated) return;
    get()
      .fetchPlan()
      .then(() => set({ isHydrated: true }));
  },
}));
