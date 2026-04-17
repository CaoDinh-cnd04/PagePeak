import { Eye, Zap, Star, Crown } from "lucide-react";
import type { TemplateItem } from "@/lib/shared/api";
import type { StaticTemplateItem } from "@/lib/dashboard/templates/staticTemplates";
import { CATEGORY_ICONS, Filter } from "./templateLibraryConstants";

type Props = {
  template: TemplateItem;
  onPreview: () => void;
  onUse: () => void;
  formatUsage: (n: number) => string;
};

export function TemplateCard({ template: t, onPreview, onUse, formatUsage }: Props) {
  const previewUrl = (t as StaticTemplateItem).previewUrl;

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-300">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer" onClick={onPreview}>
        {t.thumbnailUrl ? (
          <img
            src={t.thumbnailUrl}
            alt={t.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : previewUrl ? (
          /* Mini iframe preview — scaled down to fit the card */
          <div className="w-full h-full overflow-hidden pointer-events-none">
            <iframe
              src={previewUrl}
              title={t.name}
              className="border-none"
              style={{
                width: "200%",
                height: "200%",
                transform: "scale(0.5)",
                transformOrigin: "top left",
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 gap-3 px-4">
            <div className="flex flex-col gap-1.5 w-full max-w-[140px]">
              <div className="h-3 rounded-full bg-indigo-200 w-full" />
              <div className="h-2 rounded-full bg-slate-200 w-4/5" />
              <div className="h-2 rounded-full bg-slate-200 w-3/5" />
            </div>
            <div className="flex gap-1.5 w-full max-w-[140px]">
              {[1,2,3].map(i => <div key={i} className="flex-1 h-10 rounded bg-indigo-100" />)}
            </div>
            <div className="h-2.5 rounded-full bg-indigo-300 w-[80px]" />
            <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase bg-indigo-100 px-2 py-0.5 rounded-full">
              ✏️ Có thể chỉnh sửa
            </span>
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
