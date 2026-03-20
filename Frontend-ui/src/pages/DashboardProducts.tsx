import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { productsApi, workspacesApi, type ProductItem } from "@/lib/api";
import { Box, Plus, Pencil, Trash2, X, Search, LayoutGrid, Database, List } from "lucide-react";
import { Button } from "@/components/ui/Button";

type TabKey = "all" | "categories" | "inventory";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Tất cả", icon: <List className="w-4 h-4" /> },
  { key: "categories", label: "Danh mục", icon: <LayoutGrid className="w-4 h-4" /> },
  { key: "inventory", label: "Tồn kho", icon: <Database className="w-4 h-4" /> },
];

export function DashboardProductsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProductsInner />
    </Suspense>
  );
}

function ProductsInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabKey) ?? "all";
  const activeTab = TABS.some((t) => t.key === tabParam) ? tabParam : "all";

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const switchTab = (t: TabKey) => {
    if (t === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: t });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ws = await workspacesApi.list();
        const def = ws.find((w) => w.isDefault) ?? ws[0];
        if (def) setActiveWorkspaceId(def.id);
      } catch {
        setError("Không tải được workspaces.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    productsApi
      .list(activeWorkspaceId)
      .then(setProducts)
      .catch(() => setError("Không tải được sản phẩm."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

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
      setProducts(await productsApi.list(activeWorkspaceId));
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeWorkspaceId) return;
    try {
      await productsApi.delete(id);
      setProducts(await productsApi.list(activeWorkspaceId));
      showToast("Đã xóa sản phẩm.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    for (const p of products) {
      const cat = p.category || "Chưa phân loại";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock), [products]);

  function statusBadge(status: string) {
    if (status === "active")
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>;
    return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{status}</span>;
  }

  function stockBadge(stock: number) {
    if (stock === 0)
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">Hết hàng</span>;
    if (stock <= 5)
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">Sắp hết ({stock})</span>;
    if (stock <= 10)
      return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">Tồn thấp ({stock})</span>;
    return <span className="text-slate-700 dark:text-slate-300">{stock}</span>;
  }

  const renderProductTable = (items: ProductItem[]) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sản phẩm</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Giá</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Danh mục</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tồn kho</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Box className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                      {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{p.price.toLocaleString()} ₫</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{p.category ?? "—"}</td>
                <td className="px-5 py-3">{activeTab === "inventory" ? stockBadge(p.stock) : <span className="text-slate-700 dark:text-slate-300">{p.stock}</span>}</td>
                <td className="px-5 py-3">{statusBadge(p.status)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sản phẩm</h1>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.key
                ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "all" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Box className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Không có sản phẩm nào.</p>
            </div>
          ) : renderProductTable(filtered)}
        </>
      )}

      {activeTab === "categories" && (
        loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có sản phẩm nào.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4 text-primary-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cat}</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {renderProductTable(items)}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "inventory" && (
        loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{products.length}</p>
                <p className="text-xs text-slate-500 mt-1">Tổng sản phẩm</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{products.filter((p) => p.stock === 0).length}</p>
                <p className="text-xs text-slate-500 mt-1">Hết hàng</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-orange-200 dark:border-orange-800 p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{products.filter((p) => p.stock > 0 && p.stock <= 10).length}</p>
                <p className="text-xs text-slate-500 mt-1">Tồn thấp (≤10)</p>
              </div>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Không có sản phẩm tồn kho thấp.</p>
              </div>
            ) : renderProductTable(lowStockProducts)}
          </div>
        )
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Tên sản phẩm" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Giá (₫)</label>
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tồn kho</label>
                  <input type="number" value={formStock} onChange={(e) => setFormStock(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Danh mục" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mô tả</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả sản phẩm" rows={3} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL hình ảnh</label>
                <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()} loading={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
