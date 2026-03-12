"use client";

import { useEffect, useMemo, useState } from "react";
import { templatesApi, pagesApi, workspacesApi } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
};

type Template = {
  id: number;
  name: string;
  category: string;
  thumbnailUrl?: string;
  createdAt: string;
};

export default function TemplatesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState<number | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  useEffect(() => {
    (async () => {
      try {
        const ws = await workspacesApi.list();
        setWorkspaces(ws);
        const defaultWs = ws.find((w) => w.isDefault) ?? ws[0];
        setActiveWorkspaceId(defaultWs ? defaultWs.id : null);
        const tpls = await templatesApi.list();
        setTemplates(tpls);
      } catch {
        setError("Không tải được templates/workspaces.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = category.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.category.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [templates, category]);

  const handleCreateFromTemplate = async (templateId: number) => {
    if (!activeWorkspaceId) {
      setError("Bạn cần tạo workspace trước.");
      return;
    }
    setError("");
    setCreating(templateId);
    try {
      const name = createName.trim() || "Landing page mới";
      const slug =
        (createSlug.trim() || name)
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      await pagesApi.create(activeWorkspaceId, name, slug, templateId);
      setCreateName("");
      setCreateSlug("");
      alert("Đã tạo page từ template!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo page thất bại.");
    } finally {
      setCreating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-600 mt-1">
            {activeWorkspace ? (
              <>
                Workspace: <span className="font-semibold text-slate-800">{activeWorkspace.name}</span>
              </>
            ) : (
              "Chưa có workspace."
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            label="Tìm theo tên / category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ví dụ: Bán hàng, Sự kiện..."
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <Card>
        <CardHeader title="Tạo page nhanh" subtitle="Nhập tên/slug (tùy chọn), sau đó bấm 'Dùng template'." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Tên page" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Landing Page Sale" />
          <Input label="Slug" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="landing-page-sale" />
        </div>
        <div className="mt-4">
          {workspaces.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Workspace:</span>
              <select
                value={activeWorkspaceId ?? ""}
                onChange={(e) => setActiveWorkspaceId(e.target.value ? Number(e.target.value) : null)}
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
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((t) => (
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
                <Button
                  size="sm"
                  className="w-full"
                  loading={creating === t.id}
                  onClick={() => handleCreateFromTemplate(t.id)}
                >
                  Dùng template
                </Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-sm text-slate-600 py-8">
            Chưa có template phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}

