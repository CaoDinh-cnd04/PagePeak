import { ShoppingBag } from "lucide-react";
import { useT } from "@/lib/shared/i18n";

export function OrdersEmptyState() {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{t("orders.emptyTitle")}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">{t("orders.emptyDesc")}</p>
      </div>
    </div>
  );
}
