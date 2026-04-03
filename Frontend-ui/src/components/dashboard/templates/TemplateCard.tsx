import { Eye, Zap, Star, LayoutGrid, Crown } from "lucide-react";
import type { TemplateItem } from "@/lib/shared/api";
import { CATEGORY_ICONS, Filter } from "./templateLibraryConstants";

type Props = {
  template: TemplateItem;
  onPreview: () => void;
  onUse: () => void;
  formatUsage: (n: number) => string;
};

export function TemplateCard({ template: t, onPreview, onUse, formatUsage }: Props) {
  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-300">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {t.thumbnailUrl ? (
          <img
            src={t.thumbnailUrl}
            alt={t.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <LayoutGrid className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors shadow-lg"
          >
            <Eye className="w-4 h-4" />
            Xem trước
          </button>
          <button
            type="button"
            onClick={onUse}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Sử dụng
          </button>
        </div>

        {t.isFeatured ? (
          <div className="absolute top-2 left-2 z-[1] flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
            <Star className="w-3 h-3" />
            Nổi bật
          </div>
        ) : null}
        {t.isPremium ? (
          <div className="absolute top-2 right-2 z-[1] flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
            <Crown className="w-3 h-3" />
            Pro
          </div>
        ) : null}
      </div>

      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{t.name}</h3>
        {t.description ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p> : null}
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-medium">
            {CATEGORY_ICONS[t.category] ?? <Filter className="w-3 h-3" />}
            {t.category}
          </span>
          <span className="text-xs text-slate-400">{formatUsage(t.usageCount)} lượt dùng</span>
        </div>
      </div>
    </div>
  );
}
