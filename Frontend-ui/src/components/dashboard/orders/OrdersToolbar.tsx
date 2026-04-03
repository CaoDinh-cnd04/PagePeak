import { Search } from "lucide-react";
import { useT } from "@/lib/shared/i18n";
import type { OrdersListOpts } from "@/lib/shared/api";

type SortVal = NonNullable<OrdersListOpts["sort"]>;

export function OrdersToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: SortVal;
  onSortChange: (v: SortVal) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("orders.searchPlaceholder")}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortVal)}
        className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto w-full"
      >
        <option value="created_desc">{t("orders.sortCreatedDesc")}</option>
        <option value="created_asc">{t("orders.sortCreatedAsc")}</option>
        <option value="amount_desc">{t("orders.sortAmountDesc")}</option>
        <option value="amount_asc">{t("orders.sortAmountAsc")}</option>
      </select>
    </div>
  );
}
