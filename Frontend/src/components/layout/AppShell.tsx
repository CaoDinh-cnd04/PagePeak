"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useLangStore, type LangCode } from "@/stores/langStore";
import { useT } from "@/lib/i18n";
import { workspacesApi, notificationsApi, type NotificationItem } from "@/lib/api";
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
  Bell,
  Shield,
  Languages,
  UserCog,
  Crown,
  Check,
  HelpCircle,
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

type MenuDef = { key: MainMenuKey; i18nKey: string; icon: React.ReactNode; href: string };
type SubDef = { key: string; i18nKey: string; href: string; icon: React.ReactNode };

const MAIN_MENU: MenuDef[] = [
  { key: "landing-pages", i18nKey: "menu.landingPages", icon: <FileText className="w-5 h-5" />, href: "/dashboard/pages" },
  { key: "orders", i18nKey: "menu.orders", icon: <ShoppingBag className="w-5 h-5" />, href: "/dashboard/orders" },
  { key: "products", i18nKey: "menu.products", icon: <Box className="w-5 h-5" />, href: "/dashboard/products" },
  { key: "customers", i18nKey: "menu.customers", icon: <Users className="w-5 h-5" />, href: "/dashboard/customers" },
  { key: "reports", i18nKey: "menu.reports", icon: <BarChart3 className="w-5 h-5" />, href: "/dashboard/reports" },
  { key: "settings", i18nKey: "menu.settings", icon: <Settings className="w-5 h-5" />, href: "/dashboard/settings" },
];

const SUB_MENUS: Record<MainMenuKey, SubDef[]> = {
  "landing-pages": [
    { key: "pages", i18nKey: "sub.pages", href: "/dashboard/pages", icon: <List className="w-4 h-4" /> },
    { key: "templates", i18nKey: "sub.templates", href: "/dashboard/templates", icon: <LayoutGrid className="w-4 h-4" /> },
    { key: "forms", i18nKey: "sub.formConfig", href: "/dashboard/forms", icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: "tags", i18nKey: "sub.tags", href: "/dashboard/tags", icon: <Tag className="w-4 h-4" /> },
    { key: "domains", i18nKey: "sub.domains", href: "/dashboard/domains", icon: <Globe className="w-4 h-4" /> },
    { key: "data-leads", i18nKey: "sub.dataLeads", href: "/dashboard/data-leads", icon: <Database className="w-4 h-4" /> },
  ],
  orders: [
    { key: "all-orders", i18nKey: "sub.allOrders", href: "/dashboard/orders", icon: <List className="w-4 h-4" /> },
    { key: "pending", i18nKey: "sub.pending", href: "/dashboard/orders?status=pending", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "shipping", i18nKey: "sub.shipping", href: "/dashboard/orders?status=shipping", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "completed", i18nKey: "sub.completed", href: "/dashboard/orders?status=completed", icon: <ShoppingBag className="w-4 h-4" /> },
    { key: "cancelled", i18nKey: "sub.cancelled", href: "/dashboard/orders?status=cancelled", icon: <ShoppingBag className="w-4 h-4" /> },
  ],
  products: [
    { key: "all-products", i18nKey: "sub.allProducts", href: "/dashboard/products", icon: <Box className="w-4 h-4" /> },
    { key: "categories", i18nKey: "sub.categories", href: "/dashboard/products?tab=categories", icon: <LayoutGrid className="w-4 h-4" /> },
    { key: "inventory", i18nKey: "sub.inventory", href: "/dashboard/products?tab=inventory", icon: <Database className="w-4 h-4" /> },
  ],
  customers: [
    { key: "all-customers", i18nKey: "sub.allCustomers", href: "/dashboard/customers", icon: <Users className="w-4 h-4" /> },
    { key: "groups", i18nKey: "sub.groups", href: "/dashboard/customers?tab=groups", icon: <Tag className="w-4 h-4" /> },
    { key: "import", i18nKey: "sub.importCustomers", href: "/dashboard/customers?tab=import", icon: <Database className="w-4 h-4" /> },
  ],
  reports: [
    { key: "overview", i18nKey: "sub.overview", href: "/dashboard/reports", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "by-page", i18nKey: "sub.byPage", href: "/dashboard/reports?tab=pages", icon: <FileText className="w-4 h-4" /> },
    { key: "by-traffic", i18nKey: "sub.byTraffic", href: "/dashboard/reports?tab=traffic", icon: <Globe className="w-4 h-4" /> },
    { key: "revenue", i18nKey: "sub.revenue", href: "/dashboard/reports?tab=revenue", icon: <BarChart3 className="w-4 h-4" /> },
  ],
  settings: [
    { key: "account", i18nKey: "sub.account", href: "/dashboard/settings", icon: <Users className="w-4 h-4" /> },
    { key: "members", i18nKey: "sub.members", href: "/dashboard/settings?tab=members", icon: <Users className="w-4 h-4" /> },
    { key: "billing", i18nKey: "sub.billing", href: "/dashboard/settings?tab=billing", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "integrations", i18nKey: "sub.integrations", href: "/dashboard/integrations", icon: <Zap className="w-4 h-4" /> },
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

const LANG_OPTIONS: { code: LangCode; label: string; flag: string }[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
];

function initials(name?: string) {
  if (!name) return "U";
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

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
  const { lang, setLang } = useLangStore();
  const t = useT();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    notificationsApi.list().then((res) => {
      setNotifications(res.items);
      setUnreadCount(res.unread);
    }).catch(() => {});
  }, []);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setNotifOpen(false);
  };

  const currentLangOption = LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];
  const planName = "STARTER";

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
                onClick={() => { setWsDropdownOpen(false); router.push("/dashboard/pages"); }}
              >
                {t("sidebar.newWorkspace")}
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
              {!collapsed && t(item.i18nKey)}
            </Link>
          );
        })}

        {/* Apps section */}
        {!collapsed && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("apps.title")}</p>
              <button type="button" className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition" onClick={() => router.push("/dashboard/integrations")}>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            {APPS.map((app) => (
              <button
                key={app.label}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => router.push("/dashboard/integrations")}
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
          {!collapsed && t("sidebar.logout")}
        </button>
      </div>
    </>
  );

  const col2Content = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t(MAIN_MENU.find((m) => m.key === activeMenu)?.i18nKey ?? "menu.landingPages")}
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
              {t(sub.i18nKey)}
            </Link>
          );
        })}
      </nav>

      {/* PagePeak Learning banner */}
      <div className="p-3 m-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/5 dark:to-slate-900">
        <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-indigo-500 uppercase tracking-wide">
          {t("learning.title")}
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          {t("learning.desc")}
        </p>
        <p className="text-[11px] text-emerald-600 font-semibold mt-1">New</p>
        <Link
          href="/dashboard/templates"
          className="mt-2 text-xs font-bold text-violet-700 dark:text-violet-400 hover:underline uppercase tracking-wide inline-block"
        >
          {t("learning.cta")}
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
            <Link href="/dashboard/pages" className="flex items-center gap-2 hover:opacity-90 transition">
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
          aria-label={t("sidebar.collapse")}
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
                  placeholder={t("topbar.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      router.push(`/dashboard/pages?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
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
              {t("topbar.upgrade")}
            </Button>

            {/* Help */}
            <button
              type="button"
              className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={t("topbar.help")}
              onClick={() => window.open("https://docs.pagepeak.com", "_blank")}
            >
              <HelpCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => { setNotifOpen((v) => !v); setProfileDropdownOpen(false); }}
                title={t("topbar.notifications")}
              >
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("topbar.notifications")}</p>
                    <button type="button" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium" onClick={handleMarkAllRead}>
                      {t("topbar.markRead")}
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t("topbar.noNotifications")}</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`px-4 py-3 text-sm ${n.isRead ? "opacity-60" : ""}`}>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{n.message}</p>
                          <p className="text-slate-400 text-[10px] mt-1">{new Date(n.createdAt).toLocaleString("vi-VN")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full pl-1 pr-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 transition ring-2 ring-transparent hover:ring-indigo-200 dark:hover:ring-indigo-800"
                onClick={() => { setProfileDropdownOpen((v) => !v); setNotifOpen(false); }}
              >
                {user?.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" width={34} height={34} className="w-[34px] h-[34px] rounded-full object-cover" />
                ) : (
                  <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold">
                    {initials(user?.fullName)}
                  </div>
                )}
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] overflow-hidden">
                  {/* User info */}
                  <div className="px-4 pt-4 pb-3 text-center border-b border-slate-100 dark:border-slate-800">
                    {user?.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="" width={56} height={56} className="w-14 h-14 rounded-full object-cover mx-auto mb-2 ring-2 ring-indigo-100 dark:ring-indigo-900" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-2 ring-2 ring-indigo-100 dark:ring-indigo-900">
                        {initials(user?.fullName)}
                      </div>
                    )}
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.fullName ?? "User"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.email ?? ""}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("profile.expires")}: <span className="font-semibold text-slate-700 dark:text-slate-200">{t("profile.permanent")}</span>
                    </p>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
                      onClick={() => { setProfileDropdownOpen(false); router.push("/dashboard/settings?tab=verify"); }}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {t("profile.verify")}
                    </button>
                  </div>

                  {/* Plan badge */}
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <Crown className="w-3.5 h-3.5" />
                      {planName}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {/* Language selector */}
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        onClick={() => setLangOpen((v) => !v)}
                      >
                        <Languages className="w-4 h-4 text-slate-400" />
                        <span className="flex-1 text-left">{t("profile.language")} ({currentLangOption.label})</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
                      </button>
                      {langOpen && (
                        <div className="mx-3 mb-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                          {LANG_OPTIONS.map((lo) => (
                            <button
                              key={lo.code}
                              type="button"
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${
                                lang === lo.code
                                  ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                              }`}
                              onClick={() => { setLang(lo.code); setLangOpen(false); }}
                            >
                              <span className="text-base">{lo.flag}</span>
                              <span className="flex-1 text-left">{lo.label}</span>
                              {lang === lo.code && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Account management */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      onClick={() => { setProfileDropdownOpen(false); router.push("/dashboard/settings"); }}
                    >
                      <UserCog className="w-4 h-4 text-slate-400" />
                      {t("profile.manageAccount")}
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                    >
                      <LogOut className="w-4 h-4" />
                      {t("profile.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 py-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
