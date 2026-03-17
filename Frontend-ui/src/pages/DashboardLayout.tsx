import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { AppShell } from "@/components/layout/AppShell";

export function DashboardLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) navigate("/login", { replace: true });
  }, [isHydrated, user, navigate]);

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pathname.startsWith("/dashboard/editor/")) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
