import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { pagesApi, templatesApi, workspacesApi, type PageItem } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ActionMenu } from "@/components/ui/ActionMenu";
import {
  MoreVertical,
  Plus,
  Pencil,
  Copy,
  BarChart3,
  Trash2,
  RefreshCw,
  Send,
  Search,
  LayoutGrid,
  List,
  Monitor,
  Smartphone,
} from "lucide-react";
import { CreateDesignModal, defaultCategories, type TemplateItem } from "@/components/modals/CreateDesignModal";
import { usePlanStore } from "@/stores/planStore";
import { CreateLandingPageDetailsModal, type DesignType } from "@/components/modals/CreateLandingPageDetailsModal";
import { RenamePageModal } from "@/components/modals/RenamePageModal";
import { PageStatsModal } from "@/components/modals/PageStatsModal";
import { PagePreviewThumbnail } from "@/components/PagePreviewThumbnail";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
};

type FilterKey = "all" | "published" | "draft";

function StatusBadge({ status }: { status: PageItem["status"] }) {
  const isPublished = status === "published";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        isPublished
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {isPublished ? "Đã xuất bản" : "Nháp"}
    </span>
  );
}

/** Nhãn trạng thái kiểu LadiPage (chữ hoa) */
function StatusBadgeLadiTable({ status }: { status: PageItem["status"] }) {
  const isPublished = status === "published";
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide ${
        isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/90 text-slate-700"
      }`}
    >
      {isPublished ? "Đã xuất bản" : "Chưa xuất bản"}
    </span>
  );
}

function PageCard({
  page,
  onEdit,
  onDuplicate,
  onRename,
  onViewStats,
  onPublish,
  onDelete,
}: {
  page: PageItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onViewStats: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const isDraft = page.status === "draft";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <PagePreviewThumbnail pageId={page.id} />
        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition">
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <Button onClick={onEdit} size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>
            {isDraft && (
              <Button onClick={onPublish} variant="outline" size="sm" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400">
                <Send className="w-4 h-4 mr-2" />
                Xuất bản
              </Button>
            )}
          </div>
        </div>
        <div className="absolute top-3 left-3 z-20">
          <StatusBadge status={page.status} />
        </div>
        <div className="absolute top-3 right-3 z-20">
          <ActionMenu
            trigger={<MoreVertical className="w-4 h-4" />}
            align="right"
            items={[
              { key: "duplicate", label: "Nhân bản", icon: <Copy className="w-4 h-4" />, onClick: onDuplicate },
              { key: "rename", label: "Đổi tên", icon: <Pencil className="w-4 h-4" />, onClick: onRename },
              { key: "stats", label: "Xem thống kê", icon: <BarChart3 className="w-4 h-4" />, onClick: onViewStats },
              ...(isDraft ? [{ key: "publish", label: "Xuất bản", icon: <Send className="w-4 h-4" />, onClick: onPublish }] : []),
              { key: "divider-delete", type: "divider" as const },
              { key: "delete", label: "Xóa", icon: <Trash2 className="w-4 h-4" />, onClick: onDelete, variant: "destructive" },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{page.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">/{page.slug}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Cập nhật: {new Date(page.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function PagesTableRow({
  page,
  onEdit,
  onDuplicate,
  onRename,
  onViewStats,
  onPublish,
  onDelete,
}: {
  page: PageItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onViewStats: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const isDraft = page.status === "draft";
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
      <td className="py-3 px-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-left font-semibold text-[#2563eb] hover:underline truncate block max-w-[240px] sm:max-w-md"
          >
            {page.name}
          </button>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>/{page.slug}</span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Monitor className="w-3.5 h-3.5" />
              <Smartphone className="w-3.5 h-3.5" />
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Sửa {new Date(page.updatedAt).toLocaleString("vi-VN")}
          </p>
        </div>
      </td>
      <td className="py-3 px-4 align-middle">
        <StatusBadgeLadiTable status={page.status} />
      </td>
      <td className="py-3 px-4 align-middle text-center">
        <button type="button" onClick={onViewStats} className="text-[#2563eb] font-semibold text-sm hover:underline">
          —
        </button>
      </td>
      <td className="py-3 px-4 align-middle text-center">
        <button type="button" onClick={onViewStats} className="text-[#2563eb] font-semibold text-sm hover:underline">
          —
        </button>
      </td>
      <td className="py-3 px-4 align-middle text-center text-slate-400 text-sm">—</td>
      <td className="py-3 px-4 align-middle text-right">
        <ActionMenu
          trigger={<MoreVertical className="w-4 h-4" />}
          align="right"
          items={[
            { key: "edit", label: "Chỉnh sửa giao diện", icon: <Pencil className="w-4 h-4" />, onClick: onEdit },
            { key: "rename", label: "Chỉnh sửa Tên/Tag", icon: <Pencil className="w-4 h-4" />, onClick: onRename },
            { key: "stats", label: "Báo cáo", icon: <BarChart3 className="w-4 h-4" />, onClick: onViewStats },
            { key: "duplicate", label: "Nhân bản", icon: <Copy className="w-4 h-4" />, onClick: onDuplicate },
            ...(isDraft ? [{ key: "publish", label: "Xuất bản", icon: <Send className="w-4 h-4" />, onClick: onPublish }] : []),
            { key: "divider-delete", type: "divider" as const },
            { key: "delete", label: "Xóa", icon: <Trash2 className="w-4 h-4" />, onClick: onDelete, variant: "destructive" },
          ]}
        />
      </td>
    </tr>
  );
}

export default function PagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PagesInner />
    </Suspense>
  );
}

function PagesInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreatePage = usePlanStore((s) => s.canCreatePage);
  const fetchPlan = usePlanStore((s) => s.fetchPlan);
  const hasAi = usePlanStore((s) => s.hasAi);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [, setCreating] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [tpls, setTpls] = useState<TemplateItem[]>([]);
  const [blankDetailsOpen, setBlankDetailsOpen] = useState(false);
  const [pageToRename, setPageToRename] = useState<PageItem | null>(null);
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [pageForStats, setPageForStats] = useState<PageItem | null>(null);
  const [statsData, setStatsData] = useState<{ viewCount: number; conversionCount: number; lastViewedAt: string | null } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const load = useCallback(async (wsId?: number | null) => {
    if (!wsId) {
      setPages([]);
      return;
    }
    setError("");
    try {
      const list = await pagesApi.list(wsId);
      setPages(list);
    } catch (err) {
      setPages([]);
      setError(err instanceof Error ? err.message : "Không tải được danh sách trang. Kiểm tra đăng nhập và kết nối API.");
    }
  }, []);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const ws = await workspacesApi.list();
        setWorkspaces(ws);
        const defaultWs = ws.find((w) => w.isDefault) ?? ws[0];
        const wsId = defaultWs ? defaultWs.id : null;
        setActiveWorkspaceId(wsId);
        const [apiPages, apiTemplates] = await Promise.all([
          wsId ? pagesApi.list(wsId).catch((err) => { setError(err instanceof Error ? err.message : "Lỗi tải pages"); return [] as PageItem[]; }) : Promise.resolve([] as PageItem[]),
          templatesApi.list().catch(() => [] as Array<{ id: number; name: string; category: string; thumbnailUrl?: string; description?: string; designType: string; isFeatured: boolean; usageCount: number; createdAt: string }>),
        ]);
        setPages(apiPages);
        setTpls(
          apiTemplates.slice(0, 24).map((t) => ({
            id: t.id,
            tenMau: t.name,
            danhMuc: t.category ? slugifyKey(t.category) : "mien-phi",
            loai: "mienPhi",
            anhThumbnail: t.thumbnailUrl || `https://picsum.photos/seed/pagepeak-api-${t.id}/600/800`,
            moTa: `Template: ${t.category}`,
          }))
        );
      } catch {
        setError("Không tải được pages/workspaces. Kiểm tra đăng nhập và kết nối API.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && pathname === "/dashboard/pages" && activeWorkspaceId) {
        load(activeWorkspaceId);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [pathname, activeWorkspaceId, load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!pageForStats?.id) return;
    setStatsLoading(true);
    setStatsData(null);
    pagesApi
      .getStats(pageForStats.id)
      .then((res) => {
        setStatsData({
          viewCount: res.viewCount,
          conversionCount: res.conversionCount,
          lastViewedAt: res.lastViewedAt ?? null,
        });
      })
      .catch(() => setStatsData({ viewCount: 0, conversionCount: 0, lastViewedAt: null }))
      .finally(() => setStatsLoading(false));
  }, [pageForStats?.id]);

  const _handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    if (!canCreatePage) {
      setError("Bạn đã đạt giới hạn trang của gói hiện tại. Vui lòng nâng cấp gói.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const name = createName.trim() || "Landing page mới";
      const slug =
        (createSlug.trim() || name)
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      await pagesApi.create(activeWorkspaceId, name, slug);
      setCreateName("");
      setCreateSlug("");
      await fetchPlan();
      await load(activeWorkspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo page thất bại.");
    } finally {
      setCreating(false);
    }
  };

  const _handlePublish = async (id: number) => {
    setError("");
    try {
      await pagesApi.publish(id);
      await load(activeWorkspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qParam = searchParams.get("q")?.toLowerCase() ?? "";
  const filteredPages = pages.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (qParam && !p.name.toLowerCase().includes(qParam) && !p.slug.toLowerCase().includes(qParam)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar — kiểu LadiPage */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Landing Pages
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {activeWorkspace ? (
              <>
                Workspace{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {activeWorkspace.name}
                </span>
                {" — "}
                Quản lý trang đích, trạng thái xuất bản và liên kết.
              </>
            ) : (
              "Chưa có workspace."
            )}
          </p>
          <div className="mt-4 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm kiếm Landing Page"
                value={searchParams.get("q") ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchParams(v.trim() ? { q: v } : {});
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1]/40"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1">
            {([
              { key: "all", label: "Tất cả" },
              { key: "published", label: "Đang chạy" },
              { key: "draft", label: "Nháp" },
            ] as Array<{ key: FilterKey; label: string }>).map((t) => {
              const active = filter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(t.key)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
                    active
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900/50">
            <button
              type="button"
              title="Dạng bảng"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition ${viewMode === "table" ? "bg-white dark:bg-slate-800 shadow-sm text-[#5e35b1]" : "text-slate-500"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Dạng lưới"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white dark:bg-slate-800 shadow-sm text-[#5e35b1]" : "text-slate-500"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeWorkspaceId && load(activeWorkspaceId)}
            disabled={!activeWorkspaceId}
            title="Làm mới danh sách"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button size="sm" className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo Landing Page
          </Button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>}

      {/* Create */}
      <Card id="create-form">
        <CardHeader title="Tạo Landing Page" subtitle="Tạo nhanh 1 landing page ở dạng nháp." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Tên trang"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Landing Page Sale"
          />
          <Input
            label="Slug"
            value={createSlug}
            onChange={(e) => setCreateSlug(e.target.value)}
            placeholder="landing-page-sale"
          />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {workspaces.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Workspace:</span>
              <select
                value={activeWorkspaceId ?? ""}
                onChange={async (e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setActiveWorkspaceId(id);
                  await load(id);
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="self-start sm:self-auto">
            <Button type="button" size="sm" disabled={!activeWorkspaceId} onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Landing Page
            </Button>
          </div>
        </div>
      </Card>

      <CreateDesignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={defaultCategories}
        templates={tpls.length ? tpls : undefined}
        hasAi={hasAi}
        onUpgradeClick={() => {
          setCreateOpen(false);
          navigate("/dashboard/settings?tab=billing");
        }}
        onCreateBlank={async () => {
          // Step 2 modal (name + type) like LadiPage
          setCreateOpen(false);
          setBlankDetailsOpen(true);
        }}
        onCreateWithAI={async () => {
          setCreateOpen(false);
        }}
        onUpload={async () => {
          setCreateOpen(false);
        }}
        onUseTemplate={async (t) => {
          if (!activeWorkspaceId) {
            setError("Bạn cần tạo workspace trước.");
            return;
          }
          if (!canCreatePage) {
            setError("Bạn đã đạt giới hạn trang của gói hiện tại. Vui lòng nâng cấp gói.");
            return;
          }
          const templateId = typeof t.id === "number" ? t.id : Number(t.id);
          if (!Number.isFinite(templateId)) return;
          const name = `Landing - ${t.tenMau}`.slice(0, 60);
          const slug = slugifyKey(`${t.tenMau}-${Date.now().toString().slice(-4)}`).slice(0, 80);
          await pagesApi.create(activeWorkspaceId, name, slug, templateId);
          await fetchPlan();
          await load(activeWorkspaceId);
        }}
        designServiceUrl="https://app.ladipage.com/ladipage?tab=page_list"
      />

      <CreateLandingPageDetailsModal
        open={blankDetailsOpen}
        onClose={() => setBlankDetailsOpen(false)}
        onCreate={async ({ name, tags, designType }: { name: string; tags: string[]; designType: DesignType }) => {
          if (!activeWorkspaceId) {
            setError("Bạn cần tạo workspace trước.");
            return;
          }
          if (!canCreatePage) {
            setError("Bạn đã đạt giới hạn trang của gói hiện tại. Vui lòng nâng cấp gói.");
            return;
          }
          const slug = slugifyKey(name);
          const created = await pagesApi.create(activeWorkspaceId, name, slug);
          await fetchPlan();
          await load(activeWorkspaceId);
          // Move to editor with selected design type
          navigate(`/dashboard/editor/${created.id}?type=${encodeURIComponent(designType)}&tags=${encodeURIComponent(tags.join(","))}`);
        }}
      />

      <RenamePageModal
        open={!!pageToRename}
        onClose={() => setPageToRename(null)}
        page={pageToRename}
        onSave={async (id, name, slug) => {
          setError("");
          await pagesApi.update(id, name, slug);
          await load(activeWorkspaceId);
        }}
      />

      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setPageToDelete(null); setDeleteError(""); }}>
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Xác nhận xóa</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bạn có chắc muốn xóa trang &quot;{pageToDelete.name}&quot;? Hành động này không thể hoàn tác.
            </p>
            {deleteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setPageToDelete(null); setDeleteError(""); }}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  setDeleteError("");
                  try {
                    await pagesApi.delete(pageToDelete.id);
                    setPageToDelete(null);
                    await load(activeWorkspaceId);
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : "Xóa thất bại.");
                  }
                }}
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      <PageStatsModal
        open={!!pageForStats}
        onClose={() => { setPageForStats(null); setStatsData(null); }}
        pageName={pageForStats?.name ?? ""}
        stats={statsData}
        loading={statsLoading}
      />

      {/* Grid */}
      {filteredPages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10">
          <div className="max-w-xl mx-auto text-center">
            <div className="mx-auto w-28 h-28 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-indigo-600">
                <path
                  d="M7 3h7l3 3v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Chưa có Landing Page nào
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tạo trang đầu tiên để bắt đầu thu lead và bán hàng. Bạn có thể tạo nhanh từ template hoặc từ trang trắng.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="sm"
                onClick={() => {
                  const el = document.getElementById("create-form");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo Landing Page
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/templates")}>
                Xem templates
              </Button>
            </div>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Landing Page</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold text-center">Truy cập</th>
                  <th className="py-3 px-4 font-semibold text-center">Chuyển đổi</th>
                  <th className="py-3 px-4 font-semibold text-center">Doanh thu</th>
                  <th className="py-3 px-4 font-semibold text-right w-12" />
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((p) => (
                  <PagesTableRow
                    key={p.id}
                    page={p}
                    onEdit={() => navigate(`/dashboard/editor/${p.id}?type=responsive`)}
                    onDuplicate={async () => {
                      setError("");
                      try {
                        await pagesApi.duplicate(p.id);
                        await load(activeWorkspaceId);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Nhân bản thất bại.");
                      }
                    }}
                    onRename={() => setPageToRename(p)}
                    onViewStats={() => setPageForStats(p)}
                    onPublish={async () => {
                      setError("");
                      try {
                        const res = await pagesApi.publish(p.id);
                        if (!res.ok && res.error) setError(res.error);
                        else await load(activeWorkspaceId);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Xuất bản thất bại.");
                      }
                    }}
                    onDelete={() => setPageToDelete(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-xs text-slate-500">
            {filteredPages.length === 0 ? (
              "Không có bản ghi."
            ) : (
              <>
                Đang hiển thị <span className="font-semibold text-slate-700 dark:text-slate-300">1</span> đến{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPages.length}</span> của{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPages.length}</span> bản ghi
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPages.map((p) => (
            <PageCard
              key={p.id}
              page={p}
              onEdit={() => navigate(`/dashboard/editor/${p.id}?type=responsive`)}
              onDuplicate={async () => {
                setError("");
                try {
                  await pagesApi.duplicate(p.id);
                  await load(activeWorkspaceId);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Nhân bản thất bại.");
                }
              }}
              onRename={() => setPageToRename(p)}
              onViewStats={() => setPageForStats(p)}
              onPublish={async () => {
                setError("");
                try {
                  const res = await pagesApi.publish(p.id);
                  if (!res.ok && res.error) setError(res.error);
                  else await load(activeWorkspaceId);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Xuất bản thất bại.");
                }
              }}
              onDelete={() => setPageToDelete(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function slugifyKey(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

