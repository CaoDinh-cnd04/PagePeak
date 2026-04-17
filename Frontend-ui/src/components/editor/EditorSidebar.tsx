import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { getLucideIcon } from "@/lib/editor/iconMap";
import ImagePickerPanel from "./ImagePickerPanel";
import VideoPickerPanel from "./VideoPickerPanel";
import IconPickerPanel from "./IconPickerPanel";
import LinePickerPanel from "./LinePickerPanel";
import FormPickerPanel from "./FormPickerPanel";
import type { FormPreset } from "@/lib/editor/data/formData";
import { DraggableToolItem, PresetPreview } from "./DndCanvas";
import type { ToolCategoryData, ToolItemData, ElementPresetData, EditorSection } from "@/types/editor";
import { getDefaultContentForVariant, FRAME_VARIANT_LABELS } from "@/lib/editor/frameContent";
import type { EditorElementType } from "@/types/editor";
import { BlogSidebarPanel } from "./BlogSidebarPanel";
import { PopupSidebarPanel } from "./PopupSidebarPanel";
import { UtilitiesSidebarPanel } from "./UtilitiesSidebarPanel";

const FRAME_SIDEBAR_ORDER = ["quote", "split-feature", "profile-cta", "numbered", "blank"] as const;

function frameSidebarPreset(variant: (typeof FRAME_SIDEBAR_ORDER)[number], index: number): ElementPresetData {
  const fc = getDefaultContentForVariant(variant);
  const heights: Record<(typeof FRAME_SIDEBAR_ORDER)[number], number> = {
    quote: 240,
    "split-feature": 220,
    "profile-cta": 280,
    numbered: 200,
    blank: 220,
  };
  return {
    id: -(100 + index),
    name: FRAME_VARIANT_LABELS[variant],
    defaultContent: JSON.stringify(fc),
    stylesJson: JSON.stringify({ border: "none", borderRadius: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" }),
    defaultWidth: 680,
    defaultHeight: heights[variant],
    order: index,
  };
}

type EditorSidebarProps = {
  categories: ToolCategoryData[];
  activeCatId: number | null;
  onSelectCategory: (id: number | null) => void;
  activeItemId: number | null;
  onSelectItem: (id: number | null) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
  onAddSectionTemplate?: (template: "blank" | "hero") => void;
  onInsertImage: (url: string, name: string, width?: number, height?: number) => void;
  onInsertIcon?: (iconId: string, color?: string) => void;
  onInsertLine?: (preset: { style: string; color: string; thickness: number; dashArray?: number[] }) => void;
  onInsertForm?: (preset: FormPreset) => void;
  onInsertVideo?: (url: string, name: string) => void;
  onOpenMedia?: () => void;
  onClose?: () => void;
  /** Blog panel LadiPage-style */
  sections?: EditorSection[];
  onSelectElement?: (elementId: number) => void;
  /** Mở modal chọn mẫu popup */
  onOpenPopupLibrary?: () => void;
  /** Tạo popup mới (popup trắng) và vào chế độ edit popup */
  onCreatePopup?: () => void;
  /** Mở chế độ edit popup theo ID */
  onEditPopup?: (id: string) => void;
  /** Mở thư viện tiện ích (hiệu ứng + widget + tích hợp) */
  onOpenUtilitiesLibrary?: () => void;
};

export function EditorSidebar({
  categories,
  activeCatId,
  onSelectCategory,
  activeItemId,
  onSelectItem,
  onAddElement,
  onAddSection,
  onAddSectionTemplate,
  onInsertImage,
  onInsertIcon,
  onInsertLine,
  onInsertForm,
  onInsertVideo,
  onOpenMedia,
  onClose,
  sections,
  onSelectElement,
  onOpenPopupLibrary,
  onCreatePopup,
  onEditPopup,
  onOpenUtilitiesLibrary,
}: EditorSidebarProps) {
  const [presetTab, setPresetTab] = useState<string | null>(null);
  const [editedPresetContent, setEditedPresetContent] = useState<Record<number, string>>({});
  const [imagePickerForPreset, setImagePickerForPreset] = useState<{ presetId: number; preset: ElementPresetData; onSelect: (url: string) => void } | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories],
  );
  const activeCat = sortedCategories.find((c) => c.id === activeCatId) ?? null;
  const activeItem = activeCat?.items.find((i) => i.id === activeItemId) ?? null;
  const isMediaCategory = activeCat?.sidebarAction === "media";
  const isIntegrationsCategory = activeCat?.sidebarAction === "integrations";
  const isBlogCategory = activeCat?.sidebarAction === "blog";
  const isPopupCategory = activeCat?.sidebarAction === "popup";
  const isUtilitiesCategory = activeCat?.sidebarAction === "utilities";

  const isImagePicker = activeItem?.elementType === "image";
  const isVideoPicker = activeItem?.elementType === "video";
  const isIconPicker = activeItem?.elementType === "icon";
  const isLinePicker = activeItem?.elementType === "divider";
  const isFormPicker = activeItem?.elementType === "form";
  const hasPresets = activeItem && activeItem.presets.length > 0 && !isImagePicker && !isIconPicker && !isLinePicker && !isFormPicker;
  /** Panel chọn mẫu Khung (frame) — giống luồng preset: nhấn mục → danh sách mẫu */
  const isFrameTemplates = activeItem?.elementType === "frame";
  const inSubPanel = Boolean(hasPresets || isFrameTemplates);

  const subTabs = activeItem?.hasSubTabs && activeItem.subTabs
    ? (typeof activeItem.subTabs === "string" ? (() => { try { return JSON.parse(activeItem.subTabs) as string[]; } catch { return []; } })() : (activeItem.subTabs as string[]))
    : [];
  const presetsByTab = hasPresets && subTabs.length > 0
    ? subTabs.map((tab) => ({ tab, presets: activeItem!.presets.filter((p) => (p.tabName ?? "") === tab) }))
    : hasPresets ? [{ tab: "Mặc định", presets: activeItem!.presets }] : [];
  const currentTab = presetTab ?? (presetsByTab[0]?.tab ?? null);
  const currentPresets = presetsByTab.find((g) => g.tab === currentTab)?.presets ?? activeItem?.presets ?? [];
  const secondaryPanelWidth = isBlogCategory
    ? 340
    : isUtilitiesCategory
      ? 300
    : isPopupCategory
      ? 260
    : isMediaCategory || isIntegrationsCategory
    ? 280
    : isImagePicker
      ? 336
      : isVideoPicker
        ? 320
        : isIconPicker
          ? 320
          : isLinePicker
            ? 280
            : isFormPicker
              ? 320
              : hasPresets || isFrameTemplates
                ? 320
                : 240;

  return (
    <div className="flex h-full bg-white border-r border-[#e0e0e0] shrink-0">
      {/* Main Sidebar - narrow */}
      <div className="w-14 flex flex-col border-r border-[#e0e0e0] shrink-0 bg-[#fafafa]">
        {sortedCategories.map((cat) => {
          const isActive = activeCatId === cat.id;
          const Icon = getLucideIcon(cat.icon, "w-4 h-4");
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isActive ? null : cat.id)}
              className={`flex flex-col items-center justify-center py-3 px-1.5 gap-0.5 transition relative ${
                isActive ? "bg-slate-100/90 text-[#1e2d7d]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
              title={cat.name}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#1e2d7d] rounded-r" />}
              <span className={isActive ? "text-[#1e2d7d]" : "text-slate-500"}>{Icon}</span>
              <span className="text-[9px] font-medium leading-snug text-center max-w-full line-clamp-2 break-words min-h-[2.25rem] flex items-center justify-center px-0.5">
                {cat.name}
              </span>
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
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">{activeCat.name}</p>
              {isUtilitiesCategory && (
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Kéo vào canvas hoặc mở thư viện</p>
              )}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 min-w-0">
            {isUtilitiesCategory && onOpenUtilitiesLibrary ? (
              <UtilitiesSidebarPanel
                items={activeCat.items ?? []}
                onAddElement={onAddElement}
                onOpenUtilitiesLibrary={onOpenUtilitiesLibrary}
              />
            ) : isPopupCategory ? (
              <PopupSidebarPanel
                onAddElement={onAddElement}
                onOpenTemplateLibrary={onOpenPopupLibrary ?? (() => {})}
                onCreatePopup={onCreatePopup ?? (() => {})}
                onEditPopup={onEditPopup ?? (() => {})}
              />
            ) : isBlogCategory && sections && onSelectElement ? (
              <BlogSidebarPanel sections={sections} onSelectElement={onSelectElement} onAddElement={onAddElement} />
            ) : isMediaCategory && onOpenMedia ? (
              <div className="p-4 flex flex-col gap-3">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Thư viện ảnh, video và file đã tải lên workspace. Dùng khi chèn từ{" "}
                  <span className="font-medium text-slate-700">Phần tử → Ảnh / Video</span> hoặc gắn vào khối có sẵn.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenMedia()}
                  className="w-full py-2.5 rounded-lg bg-[#1e2d7d] text-white text-[12px] font-medium hover:bg-[#162558] transition shadow-sm"
                >
                  Mở thư viện Media
                </button>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Gợi ý: chọn file trong Media rồi dán URL, hoặc kéo preset ảnh từ Phần tử vào canvas.
                </p>
              </div>
            ) : isIntegrationsCategory ? (
              <div className="p-4 flex flex-col gap-3">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kết nối dịch vụ lưu trữ (Google Drive, Dropbox, …) để chọn file nhanh khi thiết kế. Tính năng đang mở rộng theo API workspace.
                </p>
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sắp có</p>
                  <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside">
                    <li>OAuth Google Drive / Dropbox</li>
                    <li>Chọn file từ cloud vào Ảnh / Video</li>
                  </ul>
                </div>
                <p className="text-[10px] text-slate-400">
                  Hiện tại hãy dùng <span className="font-medium text-slate-600">Assets → Media</span> để tải file lên.
                </p>
              </div>
            ) : imagePickerForPreset ? (
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
                  onSelect={(iconKey) => { onInsertIcon(iconKey); onSelectItem(null); }}
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
            ) : !inSubPanel ? (
              <div className="p-2 space-y-0.5">
                {activeCat.items.length === 0 ? (
                  <div className="py-5 px-3 text-center space-y-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed">Chưa có mục trong nhóm này.</p>
                    {onOpenMedia ? (
                      <button
                        type="button"
                        onClick={() => onOpenMedia()}
                        className="text-[11px] font-medium text-[#1e2d7d] hover:underline"
                      >
                        Mở thư viện Media để chèn ảnh / video
                      </button>
                    ) : null}
                  </div>
                ) : (
                  activeCat.items.map((item) => (
                    <SidebarToolItem
                      key={item.id}
                      item={item}
                      activeItemId={activeItemId}
                      onSelect={onSelectItem}
                      onAddElement={onAddElement}
                      onAddSection={onAddSection}
                      onAddSectionTemplate={onAddSectionTemplate}
                      suppressAutoAdd={item.elementType === "frame"}
                    />
                  ))
                )}
              </div>
            ) : (
              <>
                {hasPresets && subTabs.length > 0 && (
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
                  <button
                    type="button"
                    onClick={() => {
                      onSelectItem(null);
                      setPresetTab(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    ← Quay lại danh sách
                  </button>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {hasPresets ? (
                    currentPresets.map((preset) => (
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
                    ))
                  ) : isFrameTemplates && activeItem ? (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
                      <div className="px-2.5 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[10px] font-bold text-slate-700 tracking-wide">{activeItem.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">Chọn mẫu có sẵn — kéo hoặc nhấn (giống các phần tử có mẫu)</p>
                      </div>
                      <div className="p-1.5 space-y-1">
                        {FRAME_SIDEBAR_ORDER.map((variant, idx) => (
                          <DraggableToolItem
                            key={`${activeItem.id}-${variant}`}
                            item={activeItem}
                            activeItemId={activeItemId}
                            onSelect={onSelectItem}
                            onAddElement={onAddElement}
                            onAddSection={onAddSection}
                            onAddSectionTemplate={onAddSectionTemplate}
                            forceAddWithPreset={frameSidebarPreset(variant, idx)}
                            surfaceClassName="rounded-lg py-1.5 border border-transparent hover:border-slate-200 hover:bg-white bg-slate-50/40"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
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
  onAddSectionTemplate,
  suppressAutoAdd,
}: {
  item: ToolItemData;
  activeItemId: number | null;
  onSelect: (id: number | null) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
  onAddSectionTemplate?: (template: "blank" | "hero") => void;
  suppressAutoAdd?: boolean;
}) {
  return (
    <DraggableToolItem
      item={item}
      activeItemId={activeItemId}
      onSelect={(id) => onSelect(id)}
      onAddElement={onAddElement}
      onAddSection={onAddSection}
      onAddSectionTemplate={onAddSectionTemplate}
      suppressAutoAdd={suppressAutoAdd}
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
