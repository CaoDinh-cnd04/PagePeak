import { DraggableToolItem } from "@/components/editor/DndCanvas";
import { POPUP_BLANK_TOOL_ITEM } from "@/lib/popupTemplateCatalog";
import { getLucideIcon } from "@/lib/iconMap";
import type { EditorElementType, ElementPresetData } from "@/types/editor";

type PopupSidebarPanelProps = {
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onOpenTemplateLibrary: () => void;
};

export function PopupSidebarPanel({ onAddElement, onOpenTemplateLibrary }: PopupSidebarPanelProps) {
  return (
    <div className="p-2 space-y-0.5">
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
        className="flex-1 flex items-center gap-2 min-w-0 text-left"
      >
        {getLucideIcon("layout", "w-4 h-4 shrink-0")}
        <span className="flex-1 min-w-0 text-left line-clamp-2 break-words text-[11px] leading-snug">Mẫu popup</span>
      </button>
    </div>
  );
}
