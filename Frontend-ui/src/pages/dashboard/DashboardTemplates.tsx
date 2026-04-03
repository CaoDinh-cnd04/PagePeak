import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { templatesApi, pagesApi, workspacesApi, type TemplateItem } from "@/lib/shared/api";
import { Button } from "@/components/shared/ui/Button";
import { Search, Zap, X } from "lucide-react";
import {
  TemplateLibraryHeader,
  TemplateLibrarySecondaryLinks,
  TemplatePromoBanner,
  TemplateMainTabs,
  TemplateCategoryChips,
  TemplateFilterBar,
  TemplateCard,
  TemplateListItem,
  TemplatePreviewModal,
  TemplateLibraryFullSkeleton,
  type SortValue,
} from "@/components/dashboard/templates";

type Workspace = { id: number; name: string; slug: string; isDefault: boolean };

type MainTab = "all" | "featured" | "trending";

function parseViewFromSearchParams(sp: URLSearchParams): MainTab {
  const tab = sp.get("tab");
  if (tab === "template") return "all";
  const v = sp.get("view") ?? tab;
  if (v === "featured" || v === "trending") return v;
  return "all";
}

function parseSortFromSearchParams(sp: URLSearchParams): SortValue {
  const s = sp.get("sort");
  if (s === "newest" || s === "popular" || s === "name") return s;
  return "popular";
}

export function DashboardTemplatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<MainTab>(() => parseViewFromSearchParams(new URLSearchParams(searchParams.toString())));
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("cat") ?? "");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get("q") ?? "");
  const [designType, setDesignType] = useState(() => searchParams.get("design") ?? "");
  const [sortBy, setSortBy] = useState<SortValue>(() => parseSortFromSearchParams(new URLSearchParams(searchParams.toString())));
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const l = searchParams.get("layout");
    return l === "list" ? "list" : "grid";
  });

  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [creatingId, setCreatingId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTargetTemplate, setCreateTargetTemplate] = useState<TemplateItem | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (activeTab !== "all") n.set("view", activeTab);
        else n.delete("view");
        if (selectedCategory) n.set("cat", selectedCategory);
        else n.delete("cat");
        if (debouncedQ.trim()) n.set("q", debouncedQ.trim());
        else n.delete("q");
        if (designType) n.set("design", designType);
        else n.delete("design");
        if (sortBy !== "popular") n.set("sort", sortBy);
        else n.delete("sort");
        if (viewMode !== "grid") n.set("layout", viewMode);
        else n.delete("layout");
        return n;
      },
      { replace: true }
    );
  }, [activeTab, selectedCategory, debouncedQ, designType, sortBy, viewMode, setSearchParams]);

  useEffect(() => {
    (async () => {
      try {
        const [tpls, cats, ws] = await Promise.all([
          templatesApi.list(),
          templatesApi.categories(),
          workspacesApi.list(),
        ]);
        setTemplates(tpls);
        setCategories(cats);
        setWorkspaces(ws);
        const defaultWs = ws.find((w) => w.isDefault) ?? ws[0];
        setActiveWorkspaceId(defaultWs?.id ?? null);
      } catch {
        setError("Không tải được dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...templates];

    if (activeTab === "featured") {
      list = list.filter((t) => t.isFeatured);
    } else if (activeTab === "trending") {
      list = list.sort((a, b) => b.usageCount - a.usageCount).slice(0, 20);
    }

    if (selectedCategory) {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (designType) {
      list = list.filter((t) => t.designType === designType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const out = [...list];
    if (sortBy === "newest") {
      out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "popular") {
      out.sort((a, b) => b.usageCount - a.usageCount);
    } else {
      out.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    return out;
  }, [templates, activeTab, selectedCategory, designType, searchQuery, sortBy]);

  const openUseModal = useCallback((tpl: TemplateItem) => {
    setCreateTargetTemplate(tpl);
    setCreateName(tpl.name);
    setCreateSlug(
      tpl.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
    setShowCreateModal(true);
  }, []);

  const handleCreateFromTemplate = async () => {
    if (!activeWorkspaceId || !createTargetTemplate) return;
    setCreatingId(createTargetTemplate.id);
    setError("");
    try {
      const name = createName.trim() || "Landing page mới";
      const slug = (createSlug.trim() || name)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9]/g, "");
      const p = await pagesApi.create(activeWorkspaceId, name, slug, createTargetTemplate.id);
      setShowCreateModal(false);
      if (p?.id) {
        navigate(`/dashboard/editor/${p.id}?type=responsive`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo page thất bại.");
    } finally {
      setCreatingId(null);
    }
  };

  const formatUsage = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedQ("");
    setSelectedCategory("");
    setDesignType("");
    setActiveTab("all");
    setSortBy("popular");
  }, []);

  const exploreMarketplace = useCallback(() => {
    setActiveTab("trending");
    setSortBy("popular");
    window.setTimeout(() => {
      document.getElementById("template-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  if (loading) {
    return <TemplateLibraryFullSkeleton layout={viewMode} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TemplateLibraryHeader resultCount={filtered.length} viewMode={viewMode} onViewModeChange={setViewMode} />

      <TemplateLibrarySecondaryLinks onExploreMarketplace={exploreMarketplace} />

      <TemplatePromoBanner templateCount={templates.length} categoryCount={categories.length} />

      <TemplateMainTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <TemplateCategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <TemplateFilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        designType={designType}
        onDesignTypeChange={setDesignType}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {error ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        </div>
      ) : null}

      <div id="template-grid" className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-12 scroll-mt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Không tìm thấy template</h3>
            <p className="text-sm text-slate-500 mt-1">Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onPreview={() => setPreviewTemplate(t)}
                onUse={() => openUseModal(t)}
                formatUsage={formatUsage}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <TemplateListItem
                key={t.id}
                template={t}
                onPreview={() => setPreviewTemplate(t)}
                onUse={() => openUseModal(t)}
                formatUsage={formatUsage}
              />
            ))}
          </div>
        )}
      </div>

      {previewTemplate ? (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            const tpl = previewTemplate;
            setPreviewTemplate(null);
            openUseModal(tpl);
          }}
        />
      ) : null}

      {showCreateModal && createTargetTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Tạo trang từ template</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-lg">
                {createTargetTemplate.thumbnailUrl ? (
                  <img
                    src={createTargetTemplate.thumbnailUrl}
                    alt=""
                    className="w-16 h-12 object-cover rounded"
                  />
                ) : null}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{createTargetTemplate.name}</p>
                  <p className="text-xs text-slate-500">{createTargetTemplate.category}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên trang</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => {
                      setCreateName(e.target.value);
                      setCreateSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                      );
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Landing Page Sale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="landing-page-sale"
                  />
                </div>
                {workspaces.length > 1 ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Workspace</label>
                    <select
                      value={activeWorkspaceId ?? ""}
                      onChange={(e) => setActiveWorkspaceId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Hủy
              </button>
              <Button
                className="flex-1"
                loading={creatingId === createTargetTemplate.id}
                onClick={handleCreateFromTemplate}
              >
                <Zap className="w-4 h-4 mr-1" />
                Sử dụng template
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
