"use client";

import { Suspense, useEffect, useState } from "react";
import { ordersApi, workspacesApi, type OrderItem } from "@/lib/api";
import { ShoppingBag, Plus, Pencil, Trash2, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "shipping", label: "Đang giao" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
];

const STATUS_OPTIONS = ["pending", "shipping", "completed", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
    shipping: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrdersInner />
    </Suspense>
  );
}

function OrdersInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusParam = searchParams.get("status") ?? "";

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState(statusParam);

  useEffect(() => {
    setActiveStatus(statusParam);
  }, [statusParam]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

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

  const loadOrders = async (wsId: number | null, status?: string) => {
    if (!wsId) return;
    setLoading(true);
    try {
      setOrders(await ordersApi.list(wsId, status || undefined));
    } catch {
      setError("Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId) loadOrders(activeWorkspaceId, activeStatus);
  }, [activeWorkspaceId, activeStatus]);

  const openCreate = () => {
    setEditingOrder(null);
    setFormCustomerName("");
    setFormEmail("");
    setFormPhone("");
    setFormAmount("");
    setFormStatus("pending");
    setModalOpen(true);
  };

  const openEdit = (o: OrderItem) => {
    setEditingOrder(o);
    setFormCustomerName(o.customerName);
    setFormEmail(o.email ?? "");
    setFormPhone(o.phone ?? "");
    setFormAmount(String(o.amount));
    setFormStatus(o.status);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formCustomerName.trim() || !activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      if (editingOrder) {
        await ordersApi.update(editingOrder.id, {
          customerName: formCustomerName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          status: formStatus,
        });
      } else {
        await ordersApi.create({
          workspaceId: activeWorkspaceId,
          customerName: formCustomerName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          amount: Number(formAmount) || 0,
        });
      }
      await loadOrders(activeWorkspaceId, activeStatus);
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    if (!activeWorkspaceId) return;
    try {
      await ordersApi.delete(id);
      await loadOrders(activeWorkspaceId, activeStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đơn hàng</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Thêm đơn
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveStatus(tab.key);
              router.replace(tab.key ? `/dashboard/orders?status=${tab.key}` : "/dashboard/orders", { scroll: false });
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeStatus === tab.key
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Không có đơn hàng nào.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Khách hàng</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Số tiền</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ngày tạo</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{o.customerName}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{o.email ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{o.amount.toLocaleString()} ₫</td>
                    <td className="px-5 py-3">{statusBadge(o.status)}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button type="button" onClick={() => openEdit(o)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(o.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
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
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingOrder ? "Sửa đơn hàng" : "Thêm đơn hàng"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên khách hàng</label>
                <input type="text" value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                  <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09..." className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              {!editingOrder && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số tiền (₫)</label>
                  <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              )}
              {editingOrder && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                Hủy
              </button>
              <button type="button" onClick={handleSave} disabled={saving || !formCustomerName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50">
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
