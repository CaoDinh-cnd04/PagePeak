"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { pagesApi, templatesApi, workspacesApi, type PageItem } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MoreVertical, Plus, Pencil, Copy, BarChart3, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CreateDesignModal, defaultCategories, type TemplateItem } from "@/components/modals/CreateDesignModal";
import { CreateLandingPageDetailsModal, type DesignType } from "@/components/modals/CreateLandingPageDetailsModal";
import { RenamePageModal } from "@/components/modals/RenamePageModal";
import { PageStatsModal } from "@/components/modals/PageStatsModal";

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
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

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

function PageCard({
  page,
  onEdit,
  onDuplicate,
  onRename,
  onViewStats,
  onDelete,
}: {
  page: PageItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onViewStats: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-indigo-600/20 via-slate-100 to-slate-50 dark:from-indigo-500/20 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
          <div className="absolute inset-0 bg-slate-950/35" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={onEdit} className="bg-indigo-600 hover:bg-indigo-700">
              <Pencil className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <StatusBadge status={page.status} />
        </div>
        <div className="absolute top-3 right-3" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-sm ring-1 ring-slate-200 transition"
            aria-label="Menu"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-10">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDuplicate();
                }}
                className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <Copy className="w-4 h-4" />
                Nhân bản
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
                className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <Pencil className="w-4 h-4" />
                Đổi tên
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onViewStats();
                }}
                className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <BarChart3 className="w-4 h-4" />
                Xem thống kê
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </div>
          )}
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
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState(false);
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

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const load = async (wsId?: number | null) => {
    if (!wsId) {
      setPages([]);
      return;
    }
    setPages(await pagesApi.list(wsId).catch(() => [] as PageItem[]));
  };

  useEffect(() => {
    (async () => {
      try {
        const ws = await workspacesApi.list();
        setWorkspaces(ws);
        const defaultWs = ws.find((w) => w.isDefault) ?? ws[0];
        const wsId = defaultWs ? defaultWs.id : null;
        setActiveWorkspaceId(wsId);
        const [apiPages, apiTemplates] = await Promise.all([
          wsId ? pagesApi.list(wsId).catch(() => [] as PageItem[]) : Promise.resolve([] as PageItem[]),
          templatesApi.list().catch(() => [] as Array<{ id: number; name: string; category: string; thumbnailUrl?: string; createdAt?: string }>),
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
        setError("Không tải được pages/workspaces.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
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
      await load(activeWorkspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo page thất bại.");
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (id: number) => {
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

  const filteredPages =
    filter === "all" ? pages : pages.filter((p) => p.status === filter);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Danh sách Landing Page
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">
            {activeWorkspace ? (
              <>
                Workspace:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {activeWorkspace.name}
                </span>
              </>
            ) : (
              "Chưa có workspace."
            )}
          </p>
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

          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo trang mới
          </Button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Create */}
      <Card id="create-form">
        <CardHeader title="Tạo trang mới" subtitle="Tạo nhanh 1 landing page ở dạng nháp." />
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
          <form onSubmit={handleCreate} className="self-start sm:self-auto">
            <Button type="submit" loading={creating} disabled={!activeWorkspaceId} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Tạo trang mới
            </Button>
          </form>
        </div>
      </Card>

      <CreateDesignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={defaultCategories}
        templates={tpls.length ? tpls : undefined}
        onCreateBlank={async () => {
          // Step 2 modal (name + type) like LadiPage
          setCreateOpen(false);
          setBlankDetailsOpen(true);
        }}
        onCreateWithAI={async (description) => {
          alert(`AI sẽ được tích hợp sau. Nội dung: ${description}`);
        }}
        onUpload={async (file) => {
          alert(`Đã nhận file: ${file.name} (tích hợp import .ladipage ở bước tiếp theo)`);
        }}
        onUseTemplate={async (t) => {
          if (!activeWorkspaceId) {
            setError("Bạn cần tạo workspace trước.");
            return;
          }
          const templateId = typeof t.id === "number" ? t.id : Number(t.id);
          if (!Number.isFinite(templateId)) {
            alert("Template này đang là mock. Vui lòng chọn template từ danh sách API.");
            return;
          }
          const name = `Landing - ${t.tenMau}`.slice(0, 60);
          const slug = slugifyKey(`${t.tenMau}-${Date.now().toString().slice(-4)}`).slice(0, 80);
          await pagesApi.create(activeWorkspaceId, name, slug, templateId);
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
          const slug = slugifyKey(name);
          const created = await pagesApi.create(activeWorkspaceId, name, slug);
          await load(activeWorkspaceId);
          // Move to editor with selected design type
          window.location.href = `/dashboard/editor/${created.id}?type=${encodeURIComponent(designType)}&tags=${encodeURIComponent(tags.join(","))}`;
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
              <Button variant="outline" onClick={() => { setPageToDelete(null); setDeleteError(""); }}>
                Hủy
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
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
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  const el = document.getElementById("create-form");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo trang mới
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard/templates")}>
                Xem templates
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPages.map((p) => (
            <PageCard
              key={p.id}
              page={p}
              onEdit={() => {
                window.location.href = `/dashboard/editor/${p.id}?type=responsive`;
              }}
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

