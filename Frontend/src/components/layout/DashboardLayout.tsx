"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/pages" className="flex items-center gap-2 hover:opacity-90 transition">
            <Image src="/logo.jpg" alt="PagePeak" width={160} height={44} className="h-10 sm:h-11 w-auto object-contain" style={{ width: "auto", height: "auto" }} />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-slate-900">Page</span>
              <span className="text-primary-600">Peak</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard/pages"
              className={`text-sm font-medium ${
                pathname === "/dashboard/pages"
                  ? "text-primary-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Workspaces
            </Link>
            {user && (
              <span className="text-sm text-slate-600">{user.fullName}</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
