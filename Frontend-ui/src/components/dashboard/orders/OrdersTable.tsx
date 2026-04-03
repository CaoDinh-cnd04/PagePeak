import { Pencil, Trash2, ShoppingBag } from "lucide-react";
import { useT } from "@/lib/shared/i18n";
import type { OrderItem } from "@/lib/shared/api";

function OrderStatusBadge({ status }: { status: string }) {
  const t = useT();
  const label =
    status === "pending"
      ? t("orders.statusPending")
      : status === "shipping"
        ? t("orders.statusShipping")
        : status === "completed"
          ? t("orders.statusCompleted")
          : status === "cancelled"
            ? t("orders.statusCancelled")
            : status;
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
    shipping: "bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
    completed: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
    cancelled: "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

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

type Props = {
  rows: OrderItem[];
  onEdit: (o: OrderItem) => void;
  onDelete: (id: number) => void;
  onRowClick: (o: OrderItem) => void;
};

export function OrdersTable({ rows, onEdit, onDelete, onRowClick }: Props) {
  const t = useT();
  const code = (id: number) => `DH-${id}`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t("orders.colCode")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("orders.colCustomer")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden xl:table-cell">{t("orders.colContact")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">{t("orders.colProduct")}</th>
              <th className="p-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t("orders.colAmount")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("orders.colStatus")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden xl:table-cell whitespace-nowrap">{t("orders.colDate")}</th>
              <th className="p-3 text-right font-semibold text-slate-600 dark:text-slate-300 w-28">{t("orders.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer"
                onClick={() => onRowClick(o)}
              >
                <td className="p-3 font-mono text-xs text-primary-600 dark:text-primary-400 whitespace-nowrap">{code(o.id)}</td>
                <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{o.customerName}</td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell">
                  <div>{o.email ?? "—"}</div>
                  <div>{o.phone ?? ""}</div>
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300 hidden md:table-cell max-w-[200px] truncate" title={o.productName ?? undefined}>
                  {o.productName ?? "—"}
                </td>
                <td className="p-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{o.amount.toLocaleString()} ₫</td>
                <td className="p-3">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell whitespace-nowrap">{formatDt(o.createdAt)}</td>
                <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(o)}
                      className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label={t("orders.modalEdit")}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(o.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      aria-label={t("orders.deleteConfirm")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              onClick={() => onRowClick(o)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-primary-600 dark:text-primary-400">{code(o.id)}</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{o.customerName}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate">{o.productName ?? "—"}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-sm font-semibold tabular-nums">{o.amount.toLocaleString()} ₫</span>
                  </div>
                </div>
                <ShoppingBag className="w-5 h-5 text-slate-300 shrink-0" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
