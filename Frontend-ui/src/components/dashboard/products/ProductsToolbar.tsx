import { Search, Filter } from "lucide-react";
import { useT } from "@/lib/shared/i18n";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  scopeFilter: string;
  onScopeChange: (v: string) => void;
  onAdvancedFilter?: () => void;
};

export function ProductsToolbar({ search, onSearchChange, scopeFilter, onScopeChange, onAdvancedFilter }: Props) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <span className="inline-block pb-3 px-0.5 border-b-2 border-[#5e35b1] text-[#5e35b1] dark:text-[#a78bfa] dark:border-[#a78bfa] font-semibold text-sm">
          {t("products.tabAll")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[min(100%,240px)] max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("products.searchLadi")}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5e35b1]/40 focus:border-[#5e35b1]"
          />
        </div>
        <select
          value={scopeFilter}
          onChange={(e) => onScopeChange(e.target.value)}
          className="min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5e35b1]/40"
        >
          <option value="all">{t("products.filterAll")}</option>
        </select>
        <button
          type="button"
          onClick={onAdvancedFilter}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <Filter className="w-4 h-4 text-slate-500" />
          {t("products.filterAdvanced")}
        </button>
      </div>
    </div>
  );
}
