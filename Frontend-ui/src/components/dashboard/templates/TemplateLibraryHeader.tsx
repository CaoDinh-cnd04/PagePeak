import { LayoutGrid, List } from "lucide-react";

type Props = {
  resultCount: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
};

export function TemplateLibraryHeader({ resultCount, viewMode, onViewModeChange }: Props) {
  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white border-b border-slate-700/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary-300/90 mb-1">Thư viện</p>
            <h1 className="text-2xl font-bold text-white">Thư viện mẫu</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Những thiết kế chuyên nghiệp, đã được chọn lọc từ những mẫu thiết kế tốt nhất
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{resultCount} mẫu</span>
            <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5">
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={`p-2 transition-colors ${
                  viewMode === "grid" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                }`}
                aria-label="Lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={`p-2 transition-colors ${
                  viewMode === "list" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                }`}
                aria-label="Danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
