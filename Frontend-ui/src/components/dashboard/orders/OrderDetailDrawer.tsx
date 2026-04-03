import { X } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { useT } from "@/lib/shared/i18n";
import type { OrderItem } from "@/lib/shared/api";

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function OrderDetailDrawer({ order, onClose }: { order: OrderItem | null; onClose: () => void }) {
  const t = useT();
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("orders.detailTitle")}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600" aria-label={t("orders.detailClose")}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.colCode")}</dt>
            <dd className="font-mono text-primary-600 dark:text-primary-400 mt-0.5">DH-{order.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.colCustomer")}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.email")}</dt>
            <dd className="mt-0.5">{order.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.phone")}</dt>
            <dd className="mt-0.5">{order.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.colProduct")}</dt>
            <dd className="mt-0.5">{order.productName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.colAmount")}</dt>
            <dd className="text-lg font-semibold tabular-nums mt-0.5">{order.amount.toLocaleString()} ₫</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">{t("orders.colDate")}</dt>
            <dd className="mt-0.5">{formatDt(order.createdAt)}</dd>
          </div>
        </dl>
        <div className="mt-8">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            {t("orders.detailClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}
