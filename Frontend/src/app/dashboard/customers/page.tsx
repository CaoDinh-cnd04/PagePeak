"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { customersApi, workspacesApi, type CustomerItem } from "@/lib/api";
import { Users, Plus, Pencil, Trash2, X, Search, Upload, Tag, Database } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

type TabKey = "all" | "groups" | "import";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Tất cả", icon: <Users className="w-4 h-4" /> },
  { key: "groups", label: "Nhóm", icon: <Tag className="w-4 h-4" /> },
  { key: "import", label: "Import", icon: <Database className="w-4 h-4" /> },
];

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <CustomersInner />
    </Suspense>
  );
}

function CustomersInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = (searchParams.get("tab") as TabKey) ?? "all";
  const activeTab = TABS.some((t) => t.key === tabParam) ? tabParam : "all";

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formSource, setFormSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const switchTab = (t: TabKey) => {
    router.replace(t === "all" ? "/dashboard/customers" : `/dashboard/customers?tab=${t}`, { scroll: false });
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;
    setImporting(true);
    setError("");
    setImportResult("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setError("File CSV trống hoặc chỉ có header."); return; }
      const headerLine = lines[0];
      const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const nameIdx = headers.findIndex((h) => ["name", "ten", "tên", "ho ten", "họ tên", "hovaten"].includes(h));
      const emailIdx = headers.findIndex((h) => ["email", "e-mail"].includes(h));
      const phoneIdx = headers.findIndex((h) => ["phone", "dien thoai", "điện thoại", "sdt", "số điện thoại"].includes(h));
      const groupIdx = headers.findIndex((h) => ["group", "nhom", "nhóm"].includes(h));
      const sourceIdx = headers.findIndex((h) => ["source", "nguon", "nguồn"].includes(h));
      if (nameIdx === -1) { setError("File CSV phải có cột 'name' hoặc 'tên'."); return; }
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx]?.trim();
        if (!name) continue;
        await customersApi.create({
          workspaceId: activeWorkspaceId,
          name,
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
          phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
          group: groupIdx >= 0 ? cols[groupIdx]?.trim() || undefined : undefined,
          source: sourceIdx >= 0 ? cols[sourceIdx]?.trim() || undefined : undefined,
        });
        imported++;
      }
      setCustomers(await customersApi.list(activeWorkspaceId));
      setImportResult(`Đã import ${imported} khách hàng thành công!`);
      showToast(`Import ${imported} khách hàng thành công!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import thất bại.");
    } finally {
      setImporting(false);
      e.target.value = "";
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
    customersApi
      .list(activeWorkspaceId)
      .then(setCustomers)
      .catch(() => setError("Không tải được khách hàng."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const openCreate = () => {
    setEditingCustomer(null);
    setFormName(""); setFormEmail(""); setFormPhone(""); setFormGroup(""); setFormSource("");
    setModalOpen(true);
  };

  const openEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormName(c.name); setFormEmail(c.email ?? ""); setFormPhone(c.phone ?? ""); setFormGroup(c.group ?? ""); setFormSource(c.source ?? "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !activeWorkspaceId) return;
    setSaving(true); setError("");
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, { name: formName.trim(), email: formEmail.trim() || undefined, phone: formPhone.trim() || undefined, group: formGroup.trim() || undefined, source: formSource.trim() || undefined });
        showToast("Đã cập nhật khách hàng.");
      } else {
        await customersApi.create({ workspaceId: activeWorkspaceId, name: formName.trim(), email: formEmail.trim() || undefined, phone: formPhone.trim() || undefined, group: formGroup.trim() || undefined, source: formSource.trim() || undefined });
        showToast("Đã thêm khách hàng.");
      }
      setCustomers(await customersApi.list(activeWorkspaceId));
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
      await customersApi.delete(id);
      setCustomers(await customersApi.list(activeWorkspaceId));
      showToast("Đã xóa khách hàng.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? "").toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search)
  );

  const groups = useMemo(() => {
    const map = new Map<string, CustomerItem[]>();
    for (const c of customers) {
      const g = c.group || "Chưa phân nhóm";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [customers]);

  const renderCustomerTable = (items: CustomerItem[]) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tên</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Điện thoại</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nhóm</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Nguồn</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ngày tạo</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{c.email ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{c.phone ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{c.group ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{c.source ?? "—"}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString("vi-VN")}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 className="w-4 h-4" /></button>
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Khách hàng</h1>
        <div className="flex items-center gap-2">
          <label className={`inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4" />
            {importing ? "Đang import…" : "Import CSV"}
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv} disabled={importing} />
          </label>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </div>
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
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
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
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm khách hàng..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Không có khách hàng nào.</p>
            </div>
          ) : renderCustomerTable(filtered)}
        </>
      )}

      {activeTab === "groups" && (
        loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có khách hàng nào.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group}</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {renderCustomerTable(items)}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "import" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="text-center mb-6">
              <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import khách hàng từ CSV</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tải lên file CSV chứa danh sách khách hàng</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Định dạng CSV yêu cầu:</p>
              <code className="text-xs text-slate-600 dark:text-slate-400 block">name,email,phone,group,source</code>
              <code className="text-xs text-slate-600 dark:text-slate-400 block mt-1">Nguyễn Văn A,a@email.com,0901234567,VIP,Facebook</code>
              <p className="text-xs text-slate-500 mt-3">Cột bắt buộc: <strong>name</strong> (hoặc tên). Các cột khác là tùy chọn.</p>
            </div>

            <label className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition ${
              importing ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20" : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
            }`}>
              <Upload className={`w-8 h-8 ${importing ? "text-indigo-400 animate-pulse" : "text-slate-400"}`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {importing ? "Đang import..." : "Nhấp để chọn file CSV"}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv} disabled={importing} />
            </label>

            {importResult && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{importResult}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Thống kê</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{customers.length}</p>
                <p className="text-xs text-slate-500">Tổng khách hàng</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{groups.length}</p>
                <p className="text-xs text-slate-500">Nhóm</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{new Set(customers.map((c) => c.source).filter(Boolean)).size}</p>
                <p className="text-xs text-slate-500">Nguồn</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingCustomer ? "Sửa khách hàng" : "Thêm khách hàng"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điện thoại</label>
                  <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm</label>
                  <input type="text" value={formGroup} onChange={(e) => setFormGroup(e.target.value)} placeholder="VIP, Regular..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nguồn</label>
                  <input type="text" value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="Facebook, Google..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">Hủy</button>
              <button type="button" onClick={handleSave} disabled={saving || !formName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50">{saving ? "Đang lưu…" : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
