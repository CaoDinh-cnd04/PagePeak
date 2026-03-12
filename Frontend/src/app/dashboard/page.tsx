"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { templatesApi, pagesApi, workspacesApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CreateDesignModal, defaultCategories, type TemplateItem } from "@/components/modals/CreateDesignModal";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  isDefault: boolean;
  createdAt: string;
};

type Template = {
  id: number;
  name: string;
  category: string;
  thumbnailUrl?: string;
};

type PageItem = {
  id: number;
  workspaceId: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  updatedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [afterWsCreateOpen, setAfterWsCreateOpen] = useState(false);
  const [afterWsId, setAfterWsId] = useState<number | null>(null);
  const [modalTemplates, setModalTemplates] = useState<TemplateItem[]>([]);

  const loadAll = async () => {
    try {
      const list = await workspacesApi.list();
      setWorkspaces(list);
      const defaultWs = list.find((w) => w.isDefault) ?? list[0];
      const wsId = defaultWs ? defaultWs.id : null;
      setActiveWorkspaceId(wsId);

      const [tpls, pgs] = await Promise.all([
        templatesApi.list().catch(() => [] as Template[]),
        wsId ? pagesApi.list(wsId).catch(() => [] as PageItem[]) : Promise.resolve([] as PageItem[]),
      ]);
      setTemplates(tpls);
      setPages(pgs);
    } catch {
      setError("Không tải được danh sách workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setModalTemplates(
      templates.slice(0, 24).map((t) => ({
        id: t.id,
        tenMau: t.name,
        danhMuc: t.category ? slugifyKey(t.category) : "mien-phi",
        loai: "mienPhi",
        anhThumbnail: t.thumbnailUrl || `https://picsum.photos/seed/pagepeak-api-${t.id}/600/800`,
        moTa: `Template: ${t.category}`,
      }))
    );
  }, [templates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const created = await workspacesApi.create(createName, createSlug);
      setCreateName("");
      setCreateSlug("");
      setShowCreate(false);
      setAfterWsId(created.id);
      setAfterWsCreateOpen(true);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo workspace thất bại");
    } finally {
      setCreating(false);
    }
  };

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            {activeWorkspace ? (
              <>
                Workspace hiện tại:{" "}
                <span className="font-semibold text-slate-800">{activeWorkspace.name}</span>{" "}
                <span className="text-slate-500">/{activeWorkspace.slug}</span>
              </>
            ) : (
              "Chưa có workspace. Tạo workspace để bắt đầu."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowCreate(true)}>
            Tạo workspace
          </Button>
          <Link href="/dashboard/templates">
            <Button>Chọn template</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Workspace quick switch (in-page) */}
      {workspaces.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Đổi workspace:</span>
          <select
            value={activeWorkspaceId ?? ""}
            onChange={async (e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setActiveWorkspaceId(id);
              if (id) setPages(await pagesApi.list(id).catch(() => [] as PageItem[]));
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{pages.length}</p>
            <p className="text-xs text-slate-500 mt-2">Trong workspace hiện tại</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Templates</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{templates.length}</p>
            <p className="text-xs text-slate-500 mt-2">Có sẵn để sử dụng</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">0</p>
            <p className="text-xs text-slate-500 mt-2">Sẽ cập nhật ở sprint sau</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">—</p>
            <p className="text-xs text-slate-500 mt-2">Analytics sẽ bổ sung sau</p>
          </div>
        </Card>
      </div>

      {/* Templates highlight */}
      <Card>
        <CardHeader
          title="Templates nổi bật"
          subtitle="Chọn nhanh mẫu thiết kế để tạo landing page"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.slice(0, 8).map((t) => (
            <div key={t.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition">
              <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                {t.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  "Preview"
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-500 mt-1">{t.category}</p>
                <div className="mt-3">
                  <Link href="/dashboard/templates">
                    <Button size="sm" className="w-full">Xem & chọn</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-sm text-slate-600 py-6">
              Chưa có templates. (Sprint này sẽ seed dữ liệu mẫu từ backend.)
            </div>
          )}
        </div>
      </Card>

      {/* Recent pages */}
      <Card>
        <CardHeader title="Pages gần đây" subtitle="Danh sách landing page mới cập nhật" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-3 px-3 font-semibold">Tên</th>
                <th className="py-3 px-3 font-semibold">Slug</th>
                <th className="py-3 px-3 font-semibold">Trạng thái</th>
                <th className="py-3 px-3 font-semibold">Cập nhật</th>
                <th className="py-3 px-3 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 8).map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 px-3 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3 px-3 text-slate-600">/{p.slug}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{new Date(p.updatedAt).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/pages")}>
                      Quản lý
                    </Button>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-3 text-slate-600">
                    Chưa có landing page nào. Hãy chọn template để tạo page đầu tiên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && (
        <Card className="mb-8">
          <CardHeader title="Tạo workspace mới" subtitle="Nhập tên và slug (đường dẫn duy nhất)" />
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <Input
              label="Tên workspace"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ví dụ: Công ty của tôi"
              required
            />
            <Input
              label="Slug"
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
              placeholder="cong-ty-cua-toi"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" loading={creating}>
                Tạo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreate(false);
                  setError("");
                }}
              >
                Hủy
              </Button>
            </div>
          </form>
        </Card>
      )}

      <CreateDesignModal
        open={afterWsCreateOpen}
        onClose={() => setAfterWsCreateOpen(false)}
        categories={defaultCategories}
        templates={modalTemplates.length ? modalTemplates : undefined}
        onCreateBlank={async () => {
          const wsId = afterWsId ?? activeWorkspaceId;
          if (!wsId) {
            setError("Thiếu workspace để tạo landing page.");
            return;
          }
          const name = "Landing page trống";
          const slug = `blank-${Date.now().toString().slice(-6)}`;
          await pagesApi.create(wsId, name, slug);
          router.push("/dashboard/pages");
        }}
        onCreateWithAI={async (description) => {
          alert(`AI sẽ được tích hợp sau. Nội dung: ${description}`);
        }}
        onUpload={async (file) => {
          alert(`Đã nhận file: ${file.name} (tích hợp import .ladipage ở bước tiếp theo)`);
        }}
        onUseTemplate={async (t) => {
          const wsId = afterWsId ?? activeWorkspaceId;
          if (!wsId) {
            setError("Thiếu workspace để tạo landing page.");
            return;
          }
          const templateId = typeof t.id === "number" ? t.id : Number(t.id);
          if (!Number.isFinite(templateId)) {
            alert("Template này đang là mock. Vui lòng chọn template từ danh sách API.");
            return;
          }
          const name = `Landing - ${t.tenMau}`.slice(0, 60);
          const slug = slugifyKey(`${t.tenMau}-${Date.now().toString().slice(-4)}`).slice(0, 80);
          await pagesApi.create(wsId, name, slug, templateId);
          router.push("/dashboard/pages");
        }}
        designServiceUrl="https://app.ladipage.com/ladipage?tab=page_list"
      />
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
