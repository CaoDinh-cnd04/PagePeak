"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) router.replace("/login");
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Editor cần full màn hình, không bọc AppShell để tránh bị padding/sidebar/topbar chiếm diện tích
  if (pathname.startsWith("/dashboard/editor/")) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>;
  }

  return <AppShell>{children}</AppShell>;
}
