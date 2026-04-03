import { Zap, X, LayoutGrid, Crown } from "lucide-react";
import type { TemplateItem } from "@/lib/shared/api";

type Props = {
  template: TemplateItem;
  onClose: () => void;
  onUse: () => void;
};

export function TemplatePreviewModal({ template, onClose, onUse }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white/95 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{template.name}</h3>
              {template.isPremium ? (
                <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-bold uppercase text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                  <Crown className="w-3 h-3" />
                  Pro
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {template.category}
              {template.description ? ` • ${template.description}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onUse}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Sử dụng template này
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center py-8 px-4">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full">
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="w-full"
              style={{ minHeight: 600 }}
            />
          ) : (
            <div className="w-full h-96 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4" />
                <p>Chưa có preview cho template này</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
