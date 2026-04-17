import { DraggableToolItem } from "@/components/editor/DndCanvas";
import { POPUP_BLANK_TOOL_ITEM } from "@/lib/editor/popupTemplateCatalog";
import { getLucideIcon } from "@/lib/editor/iconMap";
import { useEditorStore } from "@/stores/editor/editorStore";
import type { EditorElementType, ElementPresetData } from "@/types/editor";
import { Pencil, Trash2 } from "lucide-react";

type PopupSidebarPanelProps = {
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onOpenTemplateLibrary: () => void;
  /** Mở trang / modal tạo popup trống (DashboardEditorFull) */
  onCreatePopup?: () => void;
  /** Vào chỉnh popup có sẵn theo id */
  onEditPopup?: (id: string) => void;
};

export function PopupSidebarPanel({
  onAddElement,
  onOpenTemplateLibrary,
  onCreatePopup,
  onEditPopup,
}: PopupSidebarPanelProps) {
  const popups = useEditorStore((s) => s.popups);
  const removePopup = useEditorStore((s) => s.removePopup);

  return (
    <div className="p-2 space-y-0.5">
      {onCreatePopup && (
        <button
          type="button"
          onClick={onCreatePopup}
          className="w-full mb-2 py-2 rounded-lg border border-[#1e2d7d]/30 bg-[#1e2d7d]/5 text-[12px] font-medium text-[#0f2167] hover:bg-[#1e2d7d]/10"
        >
          Tạo popup mới (trang chỉnh riêng)
        </button>
      )}

      <div className="mb-2 space-y-1">
        <p className="px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Popup trên trang này</p>
        {popups.length === 0 ? (
          <p className="px-2 py-2 text-[10px] text-slate-500 leading-snug rounded-lg bg-slate-50 border border-slate-100">
            Chưa có popup. Tạo mới ở trên — sau khi <span className="font-semibold">Lưu</span> trang, popup được giữ trong dữ liệu trang.
          </p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
            {popups.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:border-[#1e2d7d]/35 hover:bg-slate-50/80 transition"
              >
                <button
                  type="button"
                  onClick={() => onEditPopup?.(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-800">{p.name || p.id}</span>
                </button>
                <button
                  type="button"
                  title="Xóa popup khỏi trang"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Xóa popup "${p.name || p.id}" khỏi trang?`)) removePopup(p.id);
                  }}
                  className="shrink-0 p-2 rounded-r-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Chèn nhanh</p>
      <DraggableToolItem
        item={POPUP_BLANK_TOOL_ITEM}
        onSelect={() => {}}
        onAddElement={onAddElement}
        onAddSection={() => {}}
      />
      <TemplateLibraryRow onOpen={onOpenTemplateLibrary} />
    </div>
  );
}

function TemplateLibraryRow({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded text-[12px] text-slate-600 hover:bg-slate-50 transition">
      <span className="shrink-0 p-0.5 rounded pointer-events-none" aria-hidden>
        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 min-w-0 items-center gap-2 text-left"
      >
        {getLucideIcon("layout", "w-4 h-4 shrink-0")}
        <span className="min-w-0 flex-1 truncate text-left text-[11px] leading-snug">Mẫu popup</span>
      </button>
    </div>
  );
}
