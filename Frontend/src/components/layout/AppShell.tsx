"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { workspacesApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  FileText,
  Globe,
  Settings,
  Search,
  ShoppingBag,
  Box,
  Users,
  BarChart3,
  Zap,
  Link2,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  LayoutGrid,
  ClipboardCheck,
  Tag,
  Database,
  Menu,
  X,
  Plus,
  LogOut,
} from "lucide-react";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  isDefault: boolean;
  createdAt: string;
};

type MainMenuKey =
  | "landing-pages"
  | "orders"
  | "products"
  | "customers"
  | "reports"
  | "settings";

type SubMenuItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const MAIN_MENU: {
  key: MainMenuKey;
  label: string;
  icon: React.ReactNode;
  href: string;
}[] = [
  { key: "landing-pages", label: "Landing Pages", icon: <FileText className="w-5 h-5" />, href: "/dashboard/pages" },
  { key: "orders", label: "Đơn hàng", icon: <ShoppingBag className="w-5 h-5" />, href: "/dashboard/orders" },
  { key: "products", label: "Sản phẩm", icon: <Box className="w-5 h-5" />, href: "/dashboard/products" },
  { key: "customers", label: "Khách hàng", icon: <Users className="w-5 h-5" />, href: "/dashboard/customers" },
  { key: "reports", label: "Báo cáo", icon: <BarChart3 className="w-5 h-5" />, href: "/dashboard/reports" },
  { key: "settings", label: "Cài đặt", icon: <Settings className="w-5 h-5" />, href: "/dashboard/settings" },
];

const SUB_MENUS: Record<MainMenuKey, SubMenuItem[]> = {
  "landing-pages": [
    { key: "pages", label: "Pages", href: "/dashboard/pages", icon: <List className="w-4 h-4" /> },
    { key: "templates", label: "Thư viện mẫu", href: "/dashboard/templates", icon: <LayoutGrid className="w-4 h-4" /> },
    { key: "forms", label: "Cấu hình Form", href: "/dashboard/forms", icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: "tags", label: "Tags", href: "/dashboard/tags", icon: <Tag className="w-4 h-4" /> },
    { key: "domains", label: "Tên miền", href: "/dashboard/domains", icon: <Globe className="w-4 h-4" /> },
    { key: "data-leads", label: "Data Leads", href: "/dashboard/data-leads", icon: <Database className="w-4 h-4" /> },
  ],
  orders: [
    { key: "all-orders", label: "Tất cả đơn hàng", href: "/dashboard/orders", icon: <List className="w-4 h-4" /> },
    { key: "pending", label: "Chờ xác nhận", href: "/dashboard/orders?status=pending", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "shipping", label: "Đang giao", href: "/dashboard/orders?status=shipping", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "completed", label: "Hoàn thành", href: "/dashboard/orders?status=completed", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "cancelled", label: "Đã hủy", href: "/dashboard/orders?status=cancelled", icon: <ShoppingBag className="w-4 h-4" /> },
  ],
  products: [
    { key: "all-products", label: "Danh sách sản phẩm", href: "/dashboard/products", icon: <Box className="w-4 h-4" /> },
    { key: "categories", label: "Danh mục", href: "/dashboard/products?tab=categories", icon: <LayoutGrid className="w-4 h-4" /> },
    { key: "inventory", label: "Kho hàng", href: "/dashboard/products?tab=inventory", icon: <Database className="w-4 h-4" /> },
  ],
  customers: [
    { key: "all-customers", label: "Danh sách khách", href: "/dashboard/customers", icon: <Users className="w-4 h-4" /> },
    { key: "groups", label: "Nhóm khách hàng", href: "/dashboard/customers?tab=groups", icon: <Tag className="w-4 h-4" /> },
    { key: "import", label: "Import khách hàng", href: "/dashboard/customers?tab=import", icon: <Database className="w-4 h-4" /> },
  ],
  reports: [
    { key: "overview", label: "Tổng quan", href: "/dashboard/reports", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "by-page", label: "Theo trang", href: "/dashboard/reports?tab=pages", icon: <FileText className="w-4 h-4" /> },
    { key: "by-traffic", label: "Theo nguồn traffic", href: "/dashboard/reports?tab=traffic", icon: <Globe className="w-4 h-4" /> },
    { key: "revenue", label: "Doanh thu", href: "/dashboard/reports?tab=revenue", icon: <BarChart3 className="w-4 h-4" /> },
  ],
  settings: [
    { key: "account", label: "Thông tin tài khoản", href: "/dashboard/settings", icon: <Users className="w-4 h-4" /> },
    { key: "members", label: "Thành viên & phân quyền", href: "/dashboard/settings?tab=members", icon: <Users className="w-4 h-4" /> },
    { key: "billing", label: "Thanh toán & gói", href: "/dashboard/settings?tab=billing", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "integrations", label: "Tích hợp", href: "/dashboard/integrations", icon: <Zap className="w-4 h-4" /> },
  ],
};

const APPS = [
  { label: "Automation", icon: <Zap className="w-4 h-4" />, color: "text-amber-500" },
  { label: "Website Builder", icon: <Globe className="w-4 h-4" />, color: "text-emerald-500" },
  { label: "Ecommerce Stores", icon: <ShoppingBag className="w-4 h-4" />, color: "text-green-700" },
  { label: "Short Links", icon: <Link2 className="w-4 h-4" />, color: "text-red-500" },
  { label: "Blog", icon: <BookOpen className="w-4 h-4" />, color: "text-blue-500" },
  { label: "Dynamic", icon: <Sparkles className="w-4 h-4" />, color: "text-violet-500" },
];

function getActiveMenu(pathname: string): MainMenuKey {
  if (pathname.startsWith("/dashboard/orders")) return "orders";
  if (pathname.startsWith("/dashboard/products")) return "products";
  if (pathname.startsWith("/dashboard/customers")) return "customers";
  if (pathname.startsWith("/dashboard/reports")) return "reports";
  if (pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/integrations")) return "settings";
  return "landing-pages";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const activeMenu = getActiveMenu(pathname);
  const subItems = SUB_MENUS[activeMenu];

  useEffect(() => {
    workspacesApi
      .list()
      .then((list) => {
        setWorkspaces(list);
        const defaultWs = list.find((w) => w.isDefault) ?? list[0];
        setActiveWorkspaceId(defaultWs ? defaultWs.id : null);
      })
      .catch(() => {
        setWorkspaces([]);
        setActiveWorkspaceId(null);
      });
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = (name?: string) => {
    if (!name) return "U";
    return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const col1Content = (
    <>
      {/* Workspace header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          onClick={() => setWsDropdownOpen((v) => !v)}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials(activeWorkspace?.name ?? user?.fullName)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate uppercase">
                {activeWorkspace?.name ?? user?.fullName ?? "Workspace"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email ?? ""}
              </p>
            </div>
          )}
          {!collapsed && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
        </button>
        {wsDropdownOpen && !collapsed && (
          <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-1 z-50">
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                  w.id === activeWorkspaceId
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => {
                  setActiveWorkspaceId(w.id);
                  setWsDropdownOpen(false);
                }}
              >
                {w.name}
              </button>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md font-medium"
                onClick={() => { setWsDropdownOpen(false); router.push("/dashboard"); }}
              >
                + Tạo workspace mới
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="p-2 flex-1 overflow-y-auto">
        {MAIN_MENU.map((item) => {
          const isActive = activeMenu === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition mb-0.5 ${
                isActive
                  ? "bg-violet-100 dark:bg-violet-500/15 text-violet-800 dark:text-violet-300"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className={isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Apps section */}
        {!collapsed && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ứng dụng</p>
              <button type="button" className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            {APPS.map((app) => (
              <button
                key={app.label}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <span className={app.color}>{app.icon}</span>
                {app.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: logout */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Đăng xuất"}
        </button>
      </div>
    </>
  );

  const col2Content = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {MAIN_MENU.find((m) => m.key === activeMenu)?.label}
        </p>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {subItems.map((sub) => {
          const isActive = pathname === sub.href || pathname.startsWith(sub.href + "?");
          return (
            <Link
              key={sub.key}
              href={sub.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition mb-0.5 ${
                isActive
                  ? "text-violet-700 dark:text-violet-300 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className={isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}>{sub.icon}</span>
              {sub.label}
            </Link>
          );
        })}
      </nav>

      {/* LadiPage Learning banner */}
      <div className="p-3 m-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/5 dark:to-slate-900">
        <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-indigo-500 uppercase tracking-wide">
          PagePeak Learning
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          Xem ngay các khóa học thực chiến tại đây!
        </p>
        <p className="text-[11px] text-emerald-600 font-semibold mt-1">New</p>
        <Link
          href="#"
          className="mt-2 text-xs font-bold text-violet-700 dark:text-violet-400 hover:underline uppercase tracking-wide inline-block"
        >
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Column 1: main menu */}
        <div
          className={`flex flex-col h-full border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ${
            collapsed ? "w-[56px]" : "w-[220px]"
          }`}
        >
          {/* Logo */}
          <div className="h-14 px-3 flex items-center border-b border-slate-200 dark:border-slate-800 gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition">
              <Image
                src="/logo.jpg"
                alt="PagePeak"
                width={32}
                height={32}
                className="w-8 h-8 rounded object-contain"
                style={{ width: "2rem", height: "2rem" }}
              />
              {!collapsed && (
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-slate-900 dark:text-slate-100">Page</span>
                  <span className="text-violet-600">Peak</span>
                </span>
              )}
            </Link>
          </div>
          {col1Content}
        </div>

        {/* Column 2: sub-menu */}
        <div className="w-[200px] flex flex-col h-full">
          {col2Content}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hidden lg:flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition z-50"
          aria-label="Thu gọn sidebar"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden md:block w-[480px] max-w-[50vw]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm Landing Page, domain, integration…"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              className="hidden sm:inline-flex border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 text-xs"
              onClick={() => router.push("/dashboard/settings?tab=billing")}
            >
              Nâng cấp tài khoản
            </Button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              onClick={() => router.push("/dashboard/settings")}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {initials(user?.fullName)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.fullName ?? "User"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[120px]">
                  {user?.email ?? ""}
                </p>
              </div>
            </button>
            <Button
              className="hidden md:inline-flex bg-indigo-600 hover:bg-indigo-700 text-xs"
              onClick={() => router.push("/dashboard/pages?create=1")}
            >
              <Plus className="w-4 h-4 mr-1" />
              Tạo Landing Page
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 py-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
