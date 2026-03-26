import { DraggableToolItem } from "@/components/editor/DndCanvas";
import { Sparkles, ChevronRight } from "lucide-react";
import type { ToolItemData } from "@/types/editor";
import type { EditorElementType } from "@/types/editor";

type UtilitiesSidebarPanelProps = {
  items: ToolItemData[];
  onAddElement: (elType: EditorElementType) => void;
  onOpenUtilitiesLibrary: () => void;
};

export function UtilitiesSidebarPanel({ items, onAddElement, onOpenUtilitiesLibrary }: UtilitiesSidebarPanelProps) {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-[#e8e8e8] bg-gradient-to-b from-slate-50/90 to-white">
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Kéo phần tử vào canvas hoặc mở <span className="font-semibold text-[#1e2d7d]">Thư viện</span> để bật hiệu ứng trang &amp; tích hợp.
        </p>
      </div>

      <div className="p-2 space-y-0.5 flex-1 overflow-y-auto min-h-0">
        <p className="px-2 pt-1 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Phần tử</p>
        {sorted.map((item) => (
          <DraggableToolItem
            key={item.id}
            item={item}
            onSelect={() => {}}
            onAddElement={onAddElement}
            onAddSection={() => {}}
          />
        ))}
      </div>

      <div className="p-2 pt-1 border-t border-[#e8e8e8] bg-slate-50/50">
        <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Thư viện</p>
        <button
          type="button"
          onClick={onOpenUtilitiesLibrary}
          className="w-full rounded-xl border-2 border-dashed border-[#1e2d7d]/25 bg-gradient-to-br from-[#1e2d7d]/[0.06] to-white px-3 py-3 text-left transition hover:border-[#1e2d7d]/45 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e2d7d] text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-800">Thư viện tiện ích</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Hiệu ứng trang · Widget · Ứng dụng &amp; API</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
          </div>
        </button>
      </div>
    </div>
  );
}
