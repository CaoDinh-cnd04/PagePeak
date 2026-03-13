"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { templatesApi, pagesApi, workspacesApi, type TemplateItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Eye,
  Zap,
  Star,
  Filter,
  ChevronDown,
  X,
  LayoutGrid,
  List,
  TrendingUp,
  Sparkles,
  Globe,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  Calendar,
  Building2,
  Heart,
  UtensilsCrossed,
  Cpu,
  Wrench,
  Loader2,
} from "lucide-react";

type Workspace = { id: number; name: string; slug: string; isDefault: boolean };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Tất cả": <Globe className="w-4 h-4" />,
  "Thương mại điện tử": <ShoppingCart className="w-4 h-4" />,
  "Dịch vụ": <Briefcase className="w-4 h-4" />,
  "Giáo dục": <GraduationCap className="w-4 h-4" />,
  "Sự kiện": <Calendar className="w-4 h-4" />,
  "Bất động sản": <Building2 className="w-4 h-4" />,
  "Sức khỏe": <Heart className="w-4 h-4" />,
  "Nhà hàng": <UtensilsCrossed className="w-4 h-4" />,
  "Công nghệ": <Cpu className="w-4 h-4" />,
  "Tiện ích": <Wrench className="w-4 h-4" />,
};

const DESIGN_TYPES = [
  { value: "", label: "Tất cả" },
  { value: "responsive", label: "Responsive" },
  { value: "popup", label: "Popup" },
];

const TABS = [
  { id: "all", label: "Giao diện mẫu", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "featured", label: "Mẫu thiết kế nổi bật", icon: <Sparkles className="w-4 h-4" /> },
  { id: "trending", label: "Phổ biến nhất", icon: <TrendingUp className="w-4 h-4" /> },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [designType, setDesignType] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [creatingId, setCreatingId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTargetTemplate, setCreateTargetTemplate] = useState<TemplateItem | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

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

    return list;
  }, [templates, activeTab, selectedCategory, designType, searchQuery]);

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
        .replace(/[^a-z0-9-]/g, "");
      const p = await pagesApi.create(activeWorkspaceId, name, slug, createTargetTemplate.id);
      setShowCreateModal(false);
      if (p?.id) {
        window.location.href = `/dashboard/editor/${p.id}?type=responsive`;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Đang tải thư viện mẫu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Thư viện mẫu</h1>
              <p className="text-sm text-slate-500 mt-1">
                Những thiết kế chuyên nghiệp, đã được chọn lọc từ những mẫu thiết kế tốt nhất
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{filtered.length} mẫu</span>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold">PagePeak Template Store</h2>
              <p className="text-white/80 text-sm">Ưu đãi ra mắt: Tất cả template miễn phí!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-white/70">Template miễn phí</div>
              <div className="text-xl font-bold">{templates.length}+</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-white/70">Danh mục</div>
              <div className="text-xl font-bold">{categories.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !selectedCategory
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {CATEGORY_ICONS["Tất cả"]}
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {CATEGORY_ICONS[cat] ?? <Filter className="w-4 h-4" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm template..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={designType}
              onChange={(e) => setDesignType(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {DESIGN_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        </div>
      )}

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-12">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Không tìm thấy template</h3>
            <p className="text-sm text-slate-500 mt-1">Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setDesignType("");
                setActiveTab("all");
              }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
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

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            setPreviewTemplate(null);
            openUseModal(previewTemplate);
          }}
        />
      )}

      {/* Create Page Modal */}
      {showCreateModal && createTargetTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Tạo trang từ template</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-lg">
                {createTargetTemplate.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={createTargetTemplate.thumbnailUrl}
                    alt=""
                    className="w-16 h-12 object-cover rounded"
                  />
                )}
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Landing Page Sale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="landing-page-sale"
                  />
                </div>
                {workspaces.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Workspace</label>
                    <select
                      value={activeWorkspaceId ?? ""}
                      onChange={(e) => setActiveWorkspaceId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-100">
              <button
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
      )}
    </div>
  );
}

function TemplateCard({
  template: t,
  onPreview,
  onUse,
  formatUsage,
}: {
  template: TemplateItem;
  onPreview: () => void;
  onUse: () => void;
  formatUsage: (n: number) => string;
}) {
  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {t.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.thumbnailUrl}
            alt={t.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <LayoutGrid className="w-12 h-12" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors shadow-lg"
          >
            <Eye className="w-4 h-4" />
            Xem trước
          </button>
          <button
            onClick={onUse}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Sử dụng
          </button>
        </div>

        {/* Featured Badge */}
        {t.isFeatured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            <Star className="w-3 h-3" />
            Nổi bật
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{t.name}</h3>
        {t.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
            {CATEGORY_ICONS[t.category] ?? <Filter className="w-3 h-3" />}
            {t.category}
          </span>
          <span className="text-xs text-slate-400">{formatUsage(t.usageCount)} lượt dùng</span>
        </div>
      </div>
    </div>
  );
}

function TemplateListItem({
  template: t,
  onPreview,
  onUse,
  formatUsage,
}: {
  template: TemplateItem;
  onPreview: () => void;
  onUse: () => void;
  formatUsage: (n: number) => string;
}) {
  return (
    <div className="group flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {t.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <LayoutGrid className="w-6 h-6" />
          </div>
        )}
        {t.isFeatured && (
          <div className="absolute top-1 left-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{t.name}</h3>
        {t.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">{t.category}</span>
          <span className="text-xs text-slate-400">{formatUsage(t.usageCount)} lượt dùng</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onPreview}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Xem
        </button>
        <button
          onClick={onUse}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Dùng
        </button>
      </div>
    </div>
  );
}

function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: TemplateItem;
  onClose: () => void;
  onUse: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/95 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{template.name}</h3>
            <p className="text-xs text-slate-500">{template.category} • {template.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onUse}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Sử dụng template này
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-8 px-4">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full">
          {template.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="w-full"
              style={{ minHeight: 600 }}
            />
          ) : (
            <div className="w-full h-96 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4" />
                <p>Chưa có preview cho template này</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
