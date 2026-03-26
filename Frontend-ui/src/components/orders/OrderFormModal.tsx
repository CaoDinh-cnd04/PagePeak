import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { productsApi, type ProductItem } from "@/lib/api";
import type { OrderItem } from "@/lib/api";

const STATUS_OPTIONS = ["pending", "shipping", "completed", "cancelled"] as const;

type Props = {
  open: boolean;
  workspaceId: number | null;
  editing: OrderItem | null;
  onClose: () => void;
  onSave: (payload: {
    customerName: string;
    email?: string;
    phone?: string;
    amount?: number;
    productId?: number;
    status?: string;
  }) => Promise<void>;
  saving: boolean;
};

export function OrderFormModal({ open, workspaceId, editing, onClose, onSave, saving }: Props) {
  const t = useT();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (!open || !workspaceId) return;
    productsApi
      .list(workspaceId)
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCustomerName(editing.customerName);
      setEmail(editing.email ?? "");
      setPhone(editing.phone ?? "");
      setAmount(String(editing.amount));
      setProductId(editing.productId != null ? String(editing.productId) : "");
      setStatus(editing.status);
    } else {
      setCustomerName("");
      setEmail("");
      setPhone("");
      setAmount("");
      setProductId("");
      setStatus("pending");
    }
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    const pid = productId ? Number(productId) : undefined;
    if (editing) {
      await onSave({
        customerName: customerName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        amount: editing.amount,
        status,
      });
    } else {
      await onSave({
        customerName: customerName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        amount: Number(amount) || 0,
        productId: pid,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div
        className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editing ? t("orders.modalEdit") : t("orders.modalCreate")}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.customerName")}</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.phone")}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.productOptional")}</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">{t("orders.productNone")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.amount")}</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          )}
          {editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("orders.statusLabel")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "pending"
                      ? t("orders.statusPending")
                      : s === "shipping"
                        ? t("orders.statusShipping")
                        : s === "completed"
                          ? t("orders.statusCompleted")
                          : t("orders.statusCancelled")}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("orders.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !customerName.trim()} loading={saving}>
              {saving ? t("orders.saving") : t("orders.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
