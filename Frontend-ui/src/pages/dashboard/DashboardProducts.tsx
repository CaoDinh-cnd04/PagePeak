import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { productsApi, workspacesApi, type ProductItem } from "@/lib/shared/api";
import { t as translate, useT } from "@/lib/shared/i18n";
import { useLangStore } from "@/stores/shared/langStore";
import { useAuthStore } from "@/stores/shared/authStore";
import {
  Box,
  Pencil,
  Trash2,
  X,
  LayoutGrid,
  Database,
  ArrowUpDown,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { ProductsModuleLayout } from "@/components/dashboard/products/ProductsModuleLayout";
import { ProductsSubNav } from "@/components/dashboard/products/ProductsSubNav";
import { ProductsPageHeader } from "@/components/dashboard/products/ProductsPageHeader";
import { ProductsToolbar } from "@/components/dashboard/products/ProductsToolbar";

type TabKey = "all" | "categories" | "tags" | "inventory" | "reviews" | "custom";

const TAB_TO_NUM: Record<TabKey, number> = {
  all: 1,
  categories: 2,
  tags: 3,
  inventory: 4,
  reviews: 5,
  custom: 6,
};

function parseProductsTab(searchParams: URLSearchParams): TabKey {
  const raw = searchParams.get("tab");
  if (raw === "all" || raw === "categories" || raw === "tags" || raw === "inventory" || raw === "reviews" || raw === "custom") {
    return raw;
  }
  const n = parseInt(raw ?? "1", 10);
  if (n === 2) return "categories";
  if (n === 3) return "tags";
  if (n === 4) return "inventory";
  if (n === 5) return "reviews";
  if (n === 6) return "custom";
  return "all";
}

function fillTemplate(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function DashboardProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProductsInner />
    </Suspense>
  );
}

function ProductsInner() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("tab") == null) {
      setSearchParams({ tab: "1" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const activeTab = parseProductsTab(searchParams);
  const activeTabNum = TAB_TO_NUM[activeTab];

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [sortName, setSortName] = useState<"asc" | "desc" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const selectTab = (tabNum: number) => {
    setSearchParams({ tab: String(tabNum) });
    setOpenMenuId(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ws = await workspacesApi.list();
        if (cancelled) return;
        const def = ws.find((w) => w.isDefault) ?? ws[0];
        if (def) {
          setActiveWorkspaceId(def.id);
          setWorkspaceName(def.name);
        }
      } catch {
        if (!cancelled) setError(translate("products.workspaceError", useLangStore.getState().lang));
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest?.("[data-product-menu-root]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const loadProducts = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setProductsLoading(true);
    setError("");
    try {
      const list = await productsApi.list(activeWorkspaceId);
      setProducts(list);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : translate("products.loadError", useLangStore.getState().lang),
      );
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspaceReady || !activeWorkspaceId) return;
    loadProducts();
  }, [workspaceReady, activeWorkspaceId, loadProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormName("");
    setFormPrice("");
    setFormDescription("");
    setFormCategory("");
    setFormStock("0");
    setFormImageUrl("");
    setModalOpen(true);
  };

  const openEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormDescription(p.description ?? "");
    setFormCategory(p.category ?? "");
    setFormStock(String(p.stock));
    setFormImageUrl(p.imageUrl ?? "");
    setModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    if (!formName.trim() || !activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, {
          name: formName.trim(),
          price: Number(formPrice) || 0,
          description: formDescription.trim() || undefined,
          category: formCategory.trim() || undefined,
          stock: Number(formStock) || 0,
          imageUrl: formImageUrl.trim() || undefined,
        });
        showToast("Đã cập nhật sản phẩm.");
      } else {
        await productsApi.create({
          workspaceId: activeWorkspaceId,
          name: formName.trim(),
          price: Number(formPrice) || 0,
          description: formDescription.trim() || undefined,
          category: formCategory.trim() || undefined,
          stock: Number(formStock) || 0,
          imageUrl: formImageUrl.trim() || undefined,
        });
        showToast("Đã thêm sản phẩm.");
      }
      await loadProducts();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("products.deleteConfirm"))) return;
    if (!activeWorkspaceId) return;
    try {
      await productsApi.delete(id);
      await loadProducts();
      showToast("Đã xóa sản phẩm.");
      setOpenMenuId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.category ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const sortedItems = useMemo(() => {
    const arr = [...filtered];
    if (sortName === "asc") arr.sort((a, b) => a.name.localeCompare(b.name, lang));
    else if (sortName === "desc") arr.sort((a, b) => b.name.localeCompare(a.name, lang));
    return arr;
  }, [filtered, sortName, lang]);

  const categories = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    for (const p of products) {
      const cat = p.category || "Chưa phân loại";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock),
    [products],
  );

  const creatorLabel = user?.fullName?.trim() || t("products.me");
  const storeLabel = workspaceName || "—";

  const toggleSortName = () => {
    setSortName((s) => (s === null ? "asc" : s === "asc" ? "desc" : null));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  function statusBadgeLadi(status: string) {
    if (status === "active") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          {t("products.statusDisplayed")}
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        {status}
      </span>
    );
  }

  function stockBadge(stock: number) {
    if (stock === 0)
      return <span className="text-xs font-medium text-red-600 dark:text-red-400">Hết hàng</span>;
    if (stock <= 5) return <span className="text-xs font-medium text-orange-600">Sắp hết ({stock})</span>;
    if (stock <= 10) return <span className="text-xs font-medium text-amber-600">Tồn thấp ({stock})</span>;
    return <span className="text-slate-700 dark:text-slate-300 tabular-nums">{stock}</span>;
  }

  const renderLadiTable = (items: ProductItem[], opts?: { showStock?: boolean; hideSort?: boolean }) => {
    const showStock = opts?.showStock ?? false;
    const hideSort = opts?.hideSort ?? false;
    const total = items.length;
    const from = total === 0 ? 0 : 1;
    const to = total;
    const allSelected = total > 0 && items.every((p) => selectedIds.has(p.id));
    const toggleSelectAllThis = () => {
      const ids = items.map((p) => p.id);
      setSelectedIds((prev) => {
        const n = new Set(prev);
        const every = ids.every((id) => n.has(id));
        if (every) ids.forEach((id) => n.delete(id));
        else ids.forEach((id) => n.add(id));
        return n;
      });
    };

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAllThis}
                    className="rounded border-slate-300 text-[#5e35b1] focus:ring-[#5e35b1]"
                  />
                </th>
                <th className="text-left px-3 py-3">
                  {hideSort ? (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("products.colProductName")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleSortName}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-[#5e35b1]"
                    >
                      {t("products.colProductName")}
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  )}
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {t("products.colStore")}
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {showStock ? t("products.colStock") : t("products.colProductType")}
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {t("products.colStatus")}
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {t("products.colCreator")}
                </th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-slate-300 text-[#5e35b1] focus:ring-[#5e35b1]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-11 h-11 rounded-md object-cover border border-slate-100 dark:border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
                          <Box className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{storeLabel}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {showStock ? stockBadge(p.stock) : t("products.typePhysical")}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{statusBadgeLadi(p.status)}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{creatorLabel}</td>
                  <td className="px-2 py-3 text-right relative" data-product-menu-root>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((id) => (id === p.id ? null : p.id));
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {openMenuId === p.id && (
                      <div
                        data-product-menu-root
                        className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg py-1 text-left"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="w-4 h-4" /> Sửa
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="w-4 h-4" /> Xóa
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
            {fillTemplate(t("products.showingTemplate"), { from, to, total })}
          </div>
        )}
      </div>
    );
  };

  const placeholderSoon = (message: string) => (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-8 py-16 text-center">
      <Box className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>
    </div>
  );

  const mainContent = (() => {
    if (!workspaceReady) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#5e35b1] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (!activeWorkspaceId) {
      return <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">{t("products.workspaceError")}</p>;
    }

    if (productsLoading && products.length === 0) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#5e35b1] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (activeTab === "tags") {
      return placeholderSoon(t("products.placeholderTags"));
    }
    if (activeTab === "reviews") {
      return placeholderSoon(t("products.placeholderReviews"));
    }
    if (activeTab === "custom") {
      return placeholderSoon(t("products.placeholderCustom"));
    }

    if (activeTab === "all") {
      return (
        <>
          <ProductsToolbar
            search={search}
            onSearchChange={setSearch}
            scopeFilter={scopeFilter}
            onScopeChange={setScopeFilter}
            onAdvancedFilter={() => showToast(t("products.toastComingSoon"))}
          />
          {sortedItems.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <Box className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("products.emptyAll")}</p>
            </div>
          ) : (
            renderLadiTable(sortedItems)
          )}
        </>
      );
    }

    if (activeTab === "categories") {
      return categories.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("products.emptyCategories")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(([cat, groupItems]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="w-5 h-5 text-[#5e35b1]" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{cat}</h2>
                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{groupItems.length}</span>
              </div>
              {renderLadiTable(groupItems, { hideSort: true })}
            </div>
          ))}
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{products.length}</p>
            <p className="text-xs text-slate-500 mt-1">Tổng sản phẩm</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{products.filter((p) => p.stock === 0).length}</p>
            <p className="text-xs text-slate-500 mt-1">Hết hàng</p>
          </div>
          <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-slate-900 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{products.filter((p) => p.stock > 0 && p.stock <= 10).length}</p>
            <p className="text-xs text-slate-500 mt-1">Tồn thấp (≤10)</p>
          </div>
        </div>
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("products.emptyInventory")}</p>
          </div>
        ) : (
          renderLadiTable(lowStockProducts, { showStock: true, hideSort: true })
        )}
      </>
    );
  })();

  return (
    <ProductsModuleLayout subNav={<ProductsSubNav activeTab={activeTabNum} onSelect={selectTab} />}>
      <ProductsPageHeader
        onAdd={openCreate}
        onImportExport={() => showToast(t("products.toastComingSoon"))}
      />

      {error ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <span className="flex-1">{error}</span>
          {activeWorkspaceId ? (
            <Button type="button" variant="outline" size="sm" onClick={() => loadProducts()}>
              {t("products.retry")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 bg-slate-900 text-white text-sm rounded-lg shadow-lg">{toast}</div>
      )}

      {mainContent}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Tên sản phẩm"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giá (₫)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tồn kho</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Danh mục"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mô tả</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả sản phẩm"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL hình ảnh</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e35b1] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()} loading={saving} className="bg-[#5e35b1] hover:bg-[#512da8]">
                {saving ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProductsModuleLayout>
  );
}
