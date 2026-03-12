"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Globe,
  Grid3X3,
  Layout,
  List,
  Menu,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  ClipboardCheck,
  Database,
  X,
} from "lucide-react";

type MainMenuKey =
  | "landing-pages"
  | "don-hang"
  | "san-pham"
  | "khach-hang"
  | "bao-cao"
  | "cai-dat";

export type WorkspaceItem = {
  id: string;
  name: string;
  email?: string;
};

export type TagItem = {
  id: string;
  name: string;
};

export type NavigatePayload = {
  menu: MainMenuKey;
  subMenu: string;
};

type Props = {
  workspaces?: WorkspaceItem[];
  activeWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onManageWorkspace?: () => void;

  initialMenu?: MainMenuKey;
  initialSubMenu?: string;
  onNavigate?: (payload: NavigatePayload) => void;

  tags?: TagItem[];
  selectedTagIds?: string[];
  onTagsChange?: (tagIds: string[]) => void;
  onAddTag?: () => void;
  onSortTags?: () => void;

  onAddApp?: () => void;
};

const BRAND_ACTIVE_BG = "bg-[#EDE9FE]";
const BRAND_ACTIVE_TEXT = "text-[#6D28D9]";
const BRAND_PURPLE = "text-[#7C3AED]";

const MAIN_MENU: Array<{
  key: MainMenuKey;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "landing-pages", label: "Landing Pages", icon: <Layout className="w-4 h-4" /> },
  { key: "don-hang", label: "Đơn hàng", icon: <ShoppingBag className="w-4 h-4" /> },
  { key: "san-pham", label: "Sản phẩm", icon: <Box className="w-4 h-4" /> },
  { key: "khach-hang", label: "Khách hàng", icon: <Users className="w-4 h-4" /> },
  { key: "bao-cao", label: "Báo cáo", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "cai-dat", label: "Cài đặt", icon: <Settings className="w-4 h-4" /> },
];

const SUB_MENUS: Record<
  MainMenuKey,
  Array<{ key: string; label: string; icon?: React.ReactNode }>
> = {
  "landing-pages": [
    { key: "pages", label: "Pages", icon: <List className="w-4 h-4" /> },
    { key: "thu-vien-mau", label: "Thư viện mẫu", icon: <Grid3X3 className="w-4 h-4" /> },
    { key: "cau-hinh-form", label: "Cấu hình Form", icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: "tags", label: "Tags", icon: <Tag className="w-4 h-4" /> },
    { key: "ten-mien", label: "Tên miền", icon: <Globe className="w-4 h-4" /> },
    { key: "data-leads", label: "Data Leads", icon: <Database className="w-4 h-4" /> },
  ],
  "don-hang": [
    { key: "tat-ca", label: "Tất cả đơn hàng" },
    { key: "cho-xac-nhan", label: "Chờ xác nhận" },
    { key: "dang-giao", label: "Đang giao" },
    { key: "hoan-thanh", label: "Hoàn thành" },
    { key: "da-huy", label: "Đã hủy" },
  ],
  "san-pham": [
    { key: "danh-sach", label: "Danh sách sản phẩm" },
    { key: "danh-muc", label: "Danh mục" },
    { key: "kho-hang", label: "Kho hàng" },
  ],
  "khach-hang": [
    { key: "danh-sach", label: "Danh sách khách" },
    { key: "nhom", label: "Nhóm khách hàng" },
    { key: "import", label: "Import khách hàng" },
  ],
  "bao-cao": [
    { key: "tong-quan", label: "Tổng quan" },
    { key: "theo-trang", label: "Theo trang" },
    { key: "theo-nguon", label: "Theo nguồn traffic" },
    { key: "doanh-thu", label: "Doanh thu" },
  ],
  "cai-dat": [
    { key: "tai-khoan", label: "Thông tin tài khoản" },
    { key: "thanh-vien", label: "Thành viên & phân quyền" },
    { key: "thanh-toan", label: "Thanh toán & gói dịch vụ" },
    { key: "tich-hop", label: "Tích hợp" },
  ],
};

const APPS: Array<{ key: string; label: string; icon: string; accent: string }> = [
  { key: "automation", label: "Automation", icon: "⚡", accent: "text-amber-500" },
  { key: "website", label: "Website Builder", icon: "🌐", accent: "text-emerald-600" },
  { key: "ecommerce", label: "Ecommerce Stores", icon: "🏪", accent: "text-emerald-700" },
  { key: "short-links", label: "Short Links", icon: "🔗", accent: "text-orange-600" },
  { key: "blog", label: "Blog", icon: "📝", accent: "text-blue-600" },
  { key: "dynamic", label: "Dynamic", icon: "🔀", accent: "text-indigo-600" },
];

function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, when = true) {
  useEffect(() => {
    if (!when) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

function getInitials(name: string) {
  const s = name.trim();
  if (!s) return "W";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "W";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export function LadiSidebar({
  workspaces = [
    { id: "ws-1", name: "CAO NHAT DINH", email: "caonhatdinh@gmail.com" },
    { id: "ws-2", name: "PAGEPEAK DEMO", email: "demo@pagepeak.vn" },
  ],
  activeWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  onManageWorkspace,
  initialMenu = "landing-pages",
  initialSubMenu = "pages",
  onNavigate,
  tags = [
    { id: "all", name: "Tất cả" },
    { id: "sale", name: "Sale" },
    { id: "lead", name: "Lead" },
    { id: "webinar", name: "Webinar" },
    { id: "ecom", name: "Ecommerce" },
    { id: "brand", name: "Brand" },
  ],
  selectedTagIds,
  onTagsChange,
  onAddTag,
  onSortTags,
  onAddApp,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<MainMenuKey>(initialMenu);
  const [subMenu, setSubMenu] = useState<string>(initialSubMenu);

  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(wsRef, () => setWsOpen(false), wsOpen);

  const [appModalOpen, setAppModalOpen] = useState(false);

  const effectiveWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? "ws-1";
  const activeWs = workspaces.find((w) => w.id === effectiveWorkspaceId) ?? workspaces[0];

  const [tagQuery, setTagQuery] = useState("");
  const [tagSelected, setTagSelected] = useState<string[]>(
    selectedTagIds ?? ["all"]
  );

  useEffect(() => {
    if (!selectedTagIds) return;
    setTagSelected(selectedTagIds);
  }, [selectedTagIds]);

  const visibleTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagQuery]);

  const subMenuList = SUB_MENUS[menu] ?? [];

  const emitNavigate = (m: MainMenuKey, s: string) => {
    onNavigate?.({ menu: m, subMenu: s });
  };

  const toggleTag = (id: string) => {
    let next = tagSelected.slice();
    if (id === "all") {
      next = ["all"];
    } else {
      next = next.filter((x) => x !== "all");
      if (next.includes(id)) next = next.filter((x) => x !== id);
      else next = [...next, id];
      if (next.length === 0) next = ["all"];
    }
    setTagSelected(next);
    onTagsChange?.(next);
  };

  const SidebarBody = (
    <div className="h-screen bg-white shadow-sm border-r border-slate-200 flex">
      {/* Column 1 */}
      <div
        className={`flex flex-col border-r border-slate-200 ${
          collapsed ? "w-[64px]" : "w-[220px]"
        } transition-[width] duration-200`}
      >
        {/* Workspace header */}
        <div className="px-3 py-3 border-b border-slate-200">
          <div ref={wsRef} className="relative">
            <button
              type="button"
              onClick={() => setWsOpen((v) => !v)}
              className={`w-full flex items-center gap-3 rounded-lg hover:bg-slate-50 transition px-2 py-2 ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-extrabold text-slate-700">
                {getInitials(activeWs?.name ?? "Workspace")}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-extrabold tracking-wide text-slate-900 truncate">
                    {(activeWs?.name ?? "WORKSPACE").toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {activeWs?.email ?? "—"}
                  </p>
                </div>
              )}
              {!collapsed && (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {wsOpen && !collapsed && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <div className="p-2">
                  <p className="text-xs font-semibold text-slate-500 px-2 pb-1">
                    Chọn workspace
                  </p>
                  {workspaces.map((w) => {
                    const active = w.id === effectiveWorkspaceId;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onWorkspaceChange?.(w.id);
                          setWsOpen(false);
                        }}
                        className={`w-full text-left px-2 py-2 rounded-lg text-sm font-semibold transition ${
                          active
                            ? `${BRAND_ACTIVE_BG} ${BRAND_ACTIVE_TEXT}`
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {w.name}
                      </button>
                    );
                  })}
                </div>
                <div className="h-px bg-slate-200" />
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWsOpen(false);
                      onCreateWorkspace?.();
                    }}
                    className="w-full px-2 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo workspace mới
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWsOpen(false);
                      onManageWorkspace?.();
                    }}
                    className="w-full px-2 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Quản lý
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main menu */}
        <div className="p-2">
          {MAIN_MENU.map((it) => {
            const active = it.key === menu;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => {
                  setMenu(it.key);
                  const first = SUB_MENUS[it.key]?.[0]?.key ?? "overview";
                  setSubMenu(first);
                  emitNavigate(it.key, first);
                }}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? `${BRAND_ACTIVE_BG} ${BRAND_ACTIVE_TEXT}`
                    : "text-slate-700 hover:bg-[#F3F4F6]"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <span className={`${active ? BRAND_ACTIVE_TEXT : "text-slate-500"}`}>
                  {it.icon}
                </span>
                {!collapsed && <span className="truncate">{it.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Apps */}
        <div className="mt-auto border-t border-slate-200 p-2">
          <div className={`flex items-center justify-between px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            {!collapsed && (
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                Ứng dụng
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (onAddApp) onAddApp();
                else setAppModalOpen(true);
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Thêm app"
            >
              <Plus className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          {!collapsed && (
            <div className="space-y-1">
              {APPS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F3F4F6] transition"
                >
                  <span className={`w-6 text-center ${a.accent}`}>{a.icon}</span>
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column 2 */}
      <div className={`border-r border-slate-200 w-[200px] ${collapsed ? "hidden" : "block"}`}>
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-extrabold text-slate-900">
            {MAIN_MENU.find((m) => m.key === menu)?.label ?? "Menu"}
          </p>
        </div>
        <div className="p-2 space-y-1">
          {subMenuList.map((s) => {
            const active = s.key === subMenu;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSubMenu(s.key);
                  emitNavigate(menu, s.key);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  active
                    ? `${BRAND_PURPLE}`
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className="text-slate-400">{s.icon ?? <span className="w-4 h-4" />}</span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column 3 */}
      <div className={`w-[220px] ${collapsed ? "hidden" : "block"}`}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Lọc theo Tags</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAddTag}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Thêm tag"
            >
              <Plus className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={onSortTags}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Sắp xếp"
            >
              <Filter className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Tag search */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>
        </div>

        {/* Tag list */}
        <div className="p-3 flex flex-wrap gap-2">
          {visibleTags.map((t) => {
            const active = tagSelected.includes(t.id) || (t.id === "all" && tagSelected.includes("all"));
            const isAll = t.id === "all";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition ${
                  isAll && active
                    ? "bg-[#7C3AED] text-white"
                    : active
                      ? `${BRAND_ACTIVE_BG} ${BRAND_ACTIVE_TEXT} border border-purple-200`
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-[#F3F4F6]"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {/* Banner */}
        <div className="p-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] bg-clip-text text-transparent">
                  LADIPAGE LEARNING
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Học nhanh để làm landing page chuyển đổi cao.
                </p>
              </div>
              <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                New
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 items-start">
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• Kho bài học thực chiến</li>
                <li>• Template & checklist</li>
              </ul>
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <Layout className="w-5 h-5 text-[#7C3AED]" />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 text-xs font-extrabold text-[#6D28D9] underline"
              onClick={() => window.open("https://example.com", "_blank")}
            >
              ĐĂNG KÝ NGAY
            </button>
          </div>
        </div>
      </div>

      {/* Collapse arrow */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 right-[-14px] w-7 h-7 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
        aria-label="Thu gọn sidebar"
      >
        {collapsed ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronLeft className="w-4 h-4 text-slate-600" />}
      </button>

      {/* App modal */}
      {appModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Thêm ứng dụng</p>
              <button
                type="button"
                onClick={() => setAppModalOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              {APPS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => alert(`Cài app: ${a.label} (tích hợp sau)`)}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 transition p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${a.accent}`}>{a.icon}</span>
                    <p className="text-sm font-extrabold text-slate-900">{a.label}</p>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Cài đặt nhanh trong 1 click.</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-[60]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden md:block relative">{SidebarBody}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[65] bg-slate-950/40" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setMobileOpen(false);
        }}>
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-[420px] bg-white shadow-lg">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="relative">{SidebarBody}</div>
          </div>
        </div>
      )}
    </>
  );
}

