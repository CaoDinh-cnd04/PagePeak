import { useT } from "@/lib/i18n";

const KEYS = ["", "pending", "shipping", "completed", "cancelled"] as const;

export function OrdersStatusTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  const t = useT();
  const labels: Record<string, string> = {
    "": t("orders.tabAll"),
    pending: t("orders.tabPending"),
    shipping: t("orders.tabShipping"),
    completed: t("orders.tabCompleted"),
    cancelled: t("orders.tabCancelled"),
  };
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
      {KEYS.map((key) => (
        <button
          key={key || "all"}
          type="button"
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            active === key
              ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}
