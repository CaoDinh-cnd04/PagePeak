import { Eye, Zap, Star, LayoutGrid, Crown } from "lucide-react";
import type { TemplateItem } from "@/lib/api";

type Props = {
  template: TemplateItem;
  onPreview: () => void;
  onUse: () => void;
  formatUsage: (n: number) => string;
};

export function TemplateListItem({ template: t, onPreview, onUse, formatUsage }: Props) {
  return (
    <div className="group flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-primary-200 transition-all">
      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {t.thumbnailUrl ? (
          <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <LayoutGrid className="w-6 h-6" />
          </div>
        )}
        {t.isFeatured ? (
          <div className="absolute top-1 left-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{t.name}</h3>
          {t.isPremium ? (
            <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wide text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
              <Crown className="w-3 h-3" />
              Pro
            </span>
          ) : null}
        </div>
        {t.description ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p> : null}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-medium">{t.category}</span>
          <span className="text-xs text-slate-400">{formatUsage(t.usageCount)} lượt dùng</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onPreview}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Xem
        </button>
        <button
          type="button"
          onClick={onUse}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Dùng
        </button>
      </div>
    </div>
  );
}
