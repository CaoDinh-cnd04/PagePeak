import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { getLucideIcon } from "@/lib/iconMap";
import ImagePickerPanel from "./ImagePickerPanel";
import VideoPickerPanel from "./VideoPickerPanel";
import IconPickerPanel from "./IconPickerPanel";
import LinePickerPanel from "./LinePickerPanel";
import FormPickerPanel from "./FormPickerPanel";
import { DraggableToolItem, PresetPreview } from "./DndCanvas";
import type { ToolCategoryData, ToolItemData, ElementPresetData } from "@/types/editor";
import type { EditorElementType } from "@/types/editor";

type EditorSidebarProps = {
  categories: ToolCategoryData[];
  activeCatId: number | null;
  onSelectCategory: (id: number | null) => void;
  activeItemId: number | null;
  onSelectItem: (id: number | null) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
  onInsertImage: (url: string, name: string, width?: number, height?: number) => void;
  onInsertIcon?: (iconId: string, color?: string) => void;
  onInsertLine?: (preset: { style: string; color: string; thickness: number; dashArray?: number[] }) => void;
  onInsertForm?: (preset: { formType: string; title: string; buttonText: string; fields: unknown[]; inputStyle?: string }) => void;
  onInsertVideo?: (url: string, name: string) => void;
  onOpenMedia?: () => void;
  onClose?: () => void;
};

export function EditorSidebar({
  categories,
  activeCatId,
  onSelectCategory,
  activeItemId,
  onSelectItem,
  onAddElement,
  onAddSection,
  onInsertImage,
  onInsertIcon,
  onInsertLine,
  onInsertForm,
  onInsertVideo,
  onOpenMedia,
  onClose,
}: EditorSidebarProps) {
  const [presetTab, setPresetTab] = useState<string | null>(null);
  const [editedPresetContent, setEditedPresetContent] = useState<Record<number, string>>({});
  const [imagePickerForPreset, setImagePickerForPreset] = useState<{ presetId: number; preset: ElementPresetData; onSelect: (url: string) => void } | null>(null);

  const activeCat = categories.find((c) => c.id === activeCatId) ?? null;
  const activeItem = activeCat?.items.find((i) => i.id === activeItemId) ?? null;

  const isImagePicker = activeItem?.elementType === "image";
  const isVideoPicker = activeItem?.elementType === "video";
  const isIconPicker = activeItem?.elementType === "icon";
  const isLinePicker = activeItem?.elementType === "divider";
  const isFormPicker = activeItem?.elementType === "form";
  const hasPresets = activeItem && activeItem.presets.length > 0 && !isImagePicker && !isIconPicker && !isLinePicker && !isFormPicker;

  const subTabs = activeItem?.hasSubTabs && activeItem.subTabs
    ? (typeof activeItem.subTabs === "string" ? (() => { try { return JSON.parse(activeItem.subTabs) as string[]; } catch { return []; } })() : (activeItem.subTabs as string[]))
    : [];
  const presetsByTab = hasPresets && subTabs.length > 0
    ? subTabs.map((tab) => ({ tab, presets: activeItem!.presets.filter((p) => (p.tabName ?? "") === tab) }))
    : hasPresets ? [{ tab: "Mặc định", presets: activeItem!.presets }] : [];
  const currentTab = presetTab ?? (presetsByTab[0]?.tab ?? null);
  const currentPresets = presetsByTab.find((g) => g.tab === currentTab)?.presets ?? activeItem?.presets ?? [];
  const secondaryPanelWidth = isImagePicker ? 336 : isVideoPicker ? 320 : isIconPicker ? 320 : isLinePicker ? 280 : isFormPicker ? 320 : hasPresets ? 320 : 240;

  return (
    <div className="flex h-full bg-white border-r border-[#e0e0e0] shrink-0">
      {/* Main Sidebar - narrow */}
      <div className="w-14 flex flex-col border-r border-[#e0e0e0] shrink-0 bg-[#fafafa]">
        {categories.map((cat) => {
          const isActive = activeCatId === cat.id;
          const Icon = getLucideIcon(cat.icon, "w-4 h-4");
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isActive ? null : cat.id)}
              className={`flex flex-col items-center justify-center py-3 px-2 gap-0.5 transition relative ${
                isActive ? "bg-[#f0f0f0] text-[#0055ff]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
              title={cat.name}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#0055ff] rounded-r" />}
              <span className="text-slate-500">{Icon}</span>
              <span className="text-[9px] font-medium leading-tight text-center max-w-full truncate">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Panel - content when category selected */}
      {activeCat && (
        <div
          className="flex flex-col bg-white shrink-0 overflow-hidden"
          style={{ width: secondaryPanelWidth, minWidth: secondaryPanelWidth }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#e0e0e0] shrink-0">
            <p className="text-xs font-semibold text-slate-700">{activeCat.name}</p>
            {onClose && (
              <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {imagePickerForPreset ? (
              <div className="p-2">
                <ImagePickerPanel
                  onUse={(url) => {
                    const { presetId, preset, onSelect } = imagePickerForPreset;
                    let pd: { images?: string[] } = {};
                    try { pd = JSON.parse(editedPresetContent[presetId] ?? preset.defaultContent ?? "{}"); } catch {}
                    const imgs = Array.isArray(pd.images) ? [...pd.images] : [];
                    imgs[0] = url;
                    if (imgs.length === 0) imgs.push(url);
                    setEditedPresetContent((prev) => ({ ...prev, [presetId]: JSON.stringify({ ...pd, images: imgs }) }));
                    onSelect(url);
                    setImagePickerForPreset(null);
                  }}
                  onClose={() => setImagePickerForPreset(null)}
                  onBack={() => setImagePickerForPreset(null)}
                />
              </div>
            ) : isVideoPicker && onInsertVideo ? (
              <VideoPickerPanel
                onUse={onInsertVideo}
                onClose={() => onSelectItem(null)}
                onBack={() => onSelectItem(null)}
                onOpenMedia={onOpenMedia}
              />
            ) : isImagePicker ? (
              <ImagePickerPanel
                onUse={onInsertImage}
                onClose={() => onSelectItem(null)}
                onBack={() => onSelectItem(null)}
              />
            ) : isIconPicker && onInsertIcon ? (
              <div className="p-2 min-h-[360px]">
                <IconPickerPanel
                  onSelect={(iconId, icon) => { onInsertIcon(iconId, icon.color); onSelectItem(null); }}
                  onClose={() => onSelectItem(null)}
                  onBack={() => onSelectItem(null)}
                />
              </div>
            ) : isLinePicker && onInsertLine ? (
              <div className="p-2 min-h-[360px]">
                <LinePickerPanel
                  onSelect={(preset) => { onInsertLine(preset); onSelectItem(null); }}
                  onClose={() => onSelectItem(null)}
                  onBack={() => onSelectItem(null)}
                />
              </div>
            ) : isFormPicker && onInsertForm ? (
              <div className="p-2 min-h-0">
                <FormPickerPanel
                  onSelect={(preset) => { onInsertForm(preset); onSelectItem(null); }}
                  onClose={() => onSelectItem(null)}
                  onBack={() => onSelectItem(null)}
                />
              </div>
            ) : !hasPresets ? (
              <div className="p-2 space-y-0.5">
                {activeCat.items.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-4 text-center">Đang phát triển</p>
                ) : activeCat.items.map((item) => (
                  <SidebarToolItem
                    key={item.id}
                    item={item}
                    activeItemId={activeItemId}
                    onSelect={onSelectItem}
                    onAddElement={onAddElement}
                    onAddSection={onAddSection}
                  />
                ))}
              </div>
            ) : (
              <>
                {subTabs.length > 0 && (
                  <div className="flex border-b border-[#e0e0e0] shrink-0 px-2">
                    {subTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPresetTab(tab)}
                        className={`flex-1 px-3 py-2 text-[11px] font-medium transition border-b-2 ${
                          currentTab === tab ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-2 border-b border-[#e0e0e0] shrink-0">
                  <button type="button" onClick={() => { onSelectItem(null); setPresetTab(null); }} className="text-[11px] text-slate-500 hover:text-slate-700">
                    ← Quay lại danh sách
                  </button>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {currentPresets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      activeItem={activeItem!}
                      editedContent={editedPresetContent[preset.id]}
                      onEditContent={(c) => setEditedPresetContent((prev) => ({ ...prev, [preset.id]: c }))}
                      onAdd={(modifiedPreset) => {
                        const p = modifiedPreset ?? preset;
                        const elType = (activeItem?.elementType as EditorElementType) ?? (
                          p.tabName === "Danh sách" ? "list" : p.tabName === "Đoạn văn" ? "paragraph" : p.tabName === "Tiêu đề" ? "headline" : "text"
                        ) as EditorElementType;
                        onAddElement(elType, p);
                        onSelectItem(null);
                      }}
                      onRequestImagePicker={() =>
                        setImagePickerForPreset({
                          presetId: preset.id,
                          preset,
                          onSelect: (url) => {
                            let pd: { images?: string[] } = {};
                            try { pd = JSON.parse(editedPresetContent[preset.id] ?? preset.defaultContent ?? "{}"); } catch {}
                            const imgs = Array.isArray(pd.images) ? [...pd.images] : [];
                            imgs[0] = url;
                            if (imgs.length === 0) imgs.push(url);
                            setEditedPresetContent((prev) => ({ ...prev, [preset.id]: JSON.stringify({ ...pd, images: imgs }) }));
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarToolItem({
  item,
  activeItemId,
  onSelect,
  onAddElement,
  onAddSection,
}: {
  item: ToolItemData;
  activeItemId: number | null;
  onSelect: (id: number | null) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
}) {
  return (
    <DraggableToolItem
      item={item}
      activeItemId={activeItemId}
      onSelect={(id) => onSelect(id)}
      onAddElement={onAddElement}
      onAddSection={onAddSection}
    />
  );
}

function ToolDragGrip() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function PresetCard({
  preset,
  activeItem,
  editedContent: _editedContent,
  onEditContent: _onEditContent,
  onAdd,
  onRequestImagePicker: _onRequestImagePicker,
}: {
  preset: ElementPresetData;
  activeItem: ToolItemData;
  editedContent?: string | null;
  onEditContent: (c: string) => void;
  onAdd: (modifiedPreset?: ElementPresetData) => void;
  onRequestImagePicker: () => void;
}) {
  const displayPreset = useMemo(() => {
    const ec = _editedContent;
    if (ec != null && String(ec).trim() !== "") {
      return { ...preset, defaultContent: ec };
    }
    return preset;
  }, [preset, _editedContent]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `preset-${activeItem.id}-${preset.id}`,
    data: {
      type: "tool-item" as const,
      item: activeItem,
      elementType: activeItem.elementType as EditorElementType,
      preset,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-slate-200 bg-slate-50/50 p-2 flex items-start gap-2 transition cursor-grab active:cursor-grabbing touch-none select-none ${
        isDragging ? "opacity-50 ring-2 ring-[#1e2d7d]/30" : ""
      }`}
      title="Giữ chuột và kéo vào trang để thả; hoặc nhấn để thêm"
    >
      <span className="shrink-0 p-0.5 pointer-events-none" aria-hidden>
        <ToolDragGrip />
      </span>
      <button
        type="button"
        onClick={() => onAdd()}
        className="flex-1 flex min-w-0 flex-col gap-2 text-left rounded-md px-1 py-0.5 -my-0.5 hover:bg-white/90 border border-transparent hover:border-slate-200 transition cursor-inherit"
        title="Nhấn để thêm vào trang"
      >
        <div className="flex w-full min-h-[72px] items-center justify-center overflow-hidden rounded-md border border-slate-200/90 bg-white px-2 py-2 shadow-sm">
          <div className="w-full max-w-full flex justify-center [&>*]:max-w-full">
            <PresetPreview
              preset={displayPreset}
              elementType={activeItem.elementType}
              variant="card"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[10px] font-medium text-slate-700 line-clamp-2">{preset.name}</span>
          <span className="shrink-0 text-[10px] font-semibold text-[#1e2d7d]">Thêm</span>
        </div>
      </button>
    </div>
  );
}
