import { Search, X, ChevronDown } from "lucide-react";
import { DESIGN_TYPES, SORT_OPTIONS, type SortValue } from "./templateLibraryConstants";

type Props = {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  designType: string;
  onDesignTypeChange: (v: string) => void;
  sortBy: SortValue;
  onSortChange: (v: SortValue) => void;
};

export function TemplateFilterBar({
  searchQuery,
  onSearchQueryChange,
  designType,
  onDesignTypeChange,
  sortBy,
  onSortChange,
}: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm kiếm template..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:min-w-0">
          <div className="relative sm:min-w-[200px]">
            <select
              value={designType}
              onChange={(e) => onDesignTypeChange(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {DESIGN_TYPES.map((dt) => (
                <option key={dt.value || "all"} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative sm:min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortValue)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
