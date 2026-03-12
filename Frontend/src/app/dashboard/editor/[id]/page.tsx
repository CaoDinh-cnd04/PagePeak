"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/stores/editorStore";
import { pagesApi, editorToolsApi } from "@/lib/api";
import { generatePreviewHtml } from "@/lib/generatePreviewHtml";
import type {
  EditorElementType,
  EditorElement,
  EditorSection,
  ToolCategoryData,
  ToolItemData,
  ElementPresetData,
} from "@/types/editor";

const {
  ChevronLeft, ChevronRight, Eye, Save, Smartphone, Monitor, Type,
  Image: ImageIcon, Square, Layers, Heading1, AlignLeft,
  MousePointerClick, Play, Minus, Code, ListOrdered, LayoutGrid,
  Star, Timer, ClipboardList, Undo2, Redo2, Copy, Trash2,
  Lock, Unlock, EyeOff, ArrowUp, ArrowDown, Settings, Search,
  Globe, Palette, X, GripVertical, ChevronDown, ChevronUp, Plus,
  MoveVertical, Download,
} = LucideIcons;

function getLucideIcon(name: string, className = "w-4 h-4"): React.ReactNode {
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  if (Icon) return <Icon className={className} />;
  return <LucideIcons.HelpCircle className={className} />;
}

type DesignType = "responsive" | "mobile" | "adaptive";

type ToastState = { show: boolean; message: string; type: "success" | "error" | "info" };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast.show, onClose]);

  if (!toast.show) return null;

  const colors = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-indigo-600 text-white",
  };

  return (
    <div className="fixed top-14 right-4 z-[100]" style={{ animation: "toast-slide-in 0.3s ease-out" }}>
      <div className={`${colors[toast.type]} px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm`}>
        {toast.type === "success" && <span>&#10003;</span>}
        {toast.type === "error" && <span>&#10007;</span>}
        {toast.type === "info" && <span>&#9432;</span>}
        <span>{toast.message}</span>
        <button type="button" onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ToolPanel({
  categories,
  onAddElement,
  onAddSection,
}: {
  categories: ToolCategoryData[];
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
}) {
  const [activeCatId, setActiveCatId] = useState<number | null>(categories[0]?.id ?? null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const activeCat = categories.find((c) => c.id === activeCatId);
  const activeItem = activeCat?.items.find((i) => i.id === activeItemId);
  const subTabs: string[] = useMemo(() => {
    if (!activeItem?.subTabs) return [];
    try { return JSON.parse(activeItem.subTabs); } catch { return []; }
  }, [activeItem]);

  useEffect(() => {
    if (activeCat && activeCat.items.length > 0 && !activeCat.items.some(i => i.id === activeItemId)) {
      setActiveItemId(activeCat.items[0].id);
    }
  }, [activeCat, activeItemId]);

  useEffect(() => {
    if (subTabs.length > 0 && !subTabs.includes(activeTab ?? "")) {
      setActiveTab(subTabs[0]);
    } else if (subTabs.length === 0) {
      setActiveTab(null);
    }
  }, [subTabs, activeTab]);

  const filteredPresets = useMemo(() => {
    if (!activeItem) return [];
    if (activeTab) return activeItem.presets.filter((p) => p.tabName === activeTab);
    return activeItem.presets;
  }, [activeItem, activeTab]);

  const handlePresetClick = (preset: ElementPresetData) => {
    if (!activeItem) return;
    onAddElement(activeItem.elementType as EditorElementType, preset);
  };

  const handleQuickAdd = (item: ToolItemData) => {
    if (item.elementType === "section") {
      onAddSection();
    } else if (item.presets.length === 0) {
      onAddElement(item.elementType as EditorElementType);
    }
  };

  return (
    <div className="flex h-full">
      {/* Column 1: Categories */}
      <div className="w-[90px] border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto shrink-0 bg-slate-50 dark:bg-slate-950/50">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCatId(cat.id)}
            className={`flex flex-col items-center gap-1 px-1 py-3 text-center transition-all border-l-2 ${
              activeCatId === cat.id
                ? "border-indigo-600 bg-white dark:bg-slate-900 text-indigo-600"
                : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
            }`}
          >
            {getLucideIcon(cat.icon, "w-5 h-5")}
            <span className="text-[10px] font-medium leading-tight">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Column 2: Items */}
      {activeCat && (
        <div className="w-[140px] border-r border-slate-200 dark:border-slate-800 overflow-y-auto shrink-0">
          <div className="p-2 space-y-0.5">
            {activeCat.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveItemId(item.id);
                  handleQuickAdd(item);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                  activeItemId === item.id
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {getLucideIcon(item.icon, "w-4 h-4 shrink-0")}
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Column 3: Presets / Content */}
      {activeItem && (
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Sub tabs */}
          {subTabs.length > 0 && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              {subTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-semibold text-center transition border-b-2 ${
                    activeTab === tab
                      ? "text-indigo-600 border-indigo-600"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="p-3">
            {filteredPresets.length > 0 ? (
              <div className="space-y-2">
                {activeTab === "Tiêu đề" && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">TIÊU ĐỀ</p>
                )}
                {filteredPresets.map((preset) => {
                  const styles = (() => { try { return JSON.parse(preset.stylesJson); } catch { return {}; } })();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition group"
                    >
                      <span
                        style={{
                          fontSize: styles.fontSize ? `${Math.min(styles.fontSize, 32)}px` : "14px",
                          fontWeight: styles.fontWeight ?? 400,
                          color: styles.color ?? "#334155",
                          fontStyle: styles.fontStyle ?? "normal",
                          textTransform: styles.textTransform ?? "none",
                          letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
                        }}
                        className="block truncate"
                      >
                        {preset.defaultContent || preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem.elementType === "section") onAddSection();
                    else onAddElement(activeItem.elementType as EditorElementType);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition font-semibold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Thêm {activeItem.name}
                </button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Nhấn để thêm {activeItem.name.toLowerCase()} vào section đang chọn
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ElementRenderer({ el, isSelected, onSelect, onDragStart }: {
  el: EditorElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const elStyle: React.CSSProperties = {
    left: el.x,
    top: el.y,
    width: el.width ?? "auto",
    height: el.height ?? "auto",
    zIndex: el.zIndex,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    fontSize: (el.styles?.fontSize as number) ?? 14,
    fontWeight: (el.styles?.fontWeight as number) ?? 400,
    color: (el.styles?.color as string) ?? "#1e293b",
    backgroundColor: el.type === "shape" || el.type === "divider" || el.type === "button"
      ? (el.styles?.backgroundColor as string) ?? undefined
      : undefined,
    borderRadius: (el.styles?.borderRadius as number) ?? 0,
  };

  if (el.isHidden) return null;

  const borderClass = isSelected
    ? "ring-2 ring-indigo-500 ring-offset-1"
    : "hover:ring-1 hover:ring-indigo-300";

  return (
    <div
      className={`absolute cursor-move select-none group ${borderClass} ${el.isLocked ? "pointer-events-none opacity-60" : ""}`}
      style={elStyle}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (!el.isLocked) onDragStart(e);
      }}
    >
      {el.type === "headline" && (
        <h2 style={{ fontSize: elStyle.fontSize, fontWeight: 700, color: elStyle.color, margin: 0, lineHeight: 1.2 }}>
          {el.content}
        </h2>
      )}
      {el.type === "paragraph" && (
        <p style={{ fontSize: elStyle.fontSize, color: elStyle.color, margin: 0, lineHeight: 1.6 }}>
          {el.content}
        </p>
      )}
      {el.type === "text" && (
        <span style={{ fontSize: elStyle.fontSize, color: elStyle.color }}>{el.content}</span>
      )}
      {el.type === "button" && (
        <div
          className="flex items-center justify-center h-full w-full text-white font-semibold cursor-pointer"
          style={{
            backgroundColor: (el.styles?.backgroundColor as string) ?? "#4f46e5",
            borderRadius: (el.styles?.borderRadius as number) ?? 8,
            fontSize: elStyle.fontSize,
          }}
        >
          {el.content ?? "Button"}
        </div>
      )}
      {el.type === "image" && (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded overflow-hidden">
          {el.imageUrl ? (
            <img src={el.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-slate-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-1" />
              <span className="text-xs">Hình ảnh</span>
            </div>
          )}
        </div>
      )}
      {el.type === "video" && (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center rounded overflow-hidden">
          {el.videoUrl ? (
            <iframe src={el.videoUrl} className="w-full h-full" allowFullScreen />
          ) : (
            <div className="text-center text-slate-400">
              <Play className="w-8 h-8 mx-auto mb-1" />
              <span className="text-xs">Video</span>
            </div>
          )}
        </div>
      )}
      {el.type === "shape" && (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: (el.styles?.backgroundColor as string) ?? "#e0e7ff",
            borderRadius: (el.styles?.borderRadius as number) ?? 0,
          }}
        />
      )}
      {el.type === "divider" && (
        <div className="w-full h-full" style={{ backgroundColor: (el.styles?.backgroundColor as string) ?? "#d1d5db" }} />
      )}
      {el.type === "icon" && (
        <div className="w-full h-full flex items-center justify-center text-indigo-600">
          <Star className="w-full h-full" />
        </div>
      )}
      {el.type === "countdown" && (
        <div className="w-full h-full flex items-center justify-center gap-2 font-mono text-2xl font-bold text-slate-800 dark:text-white">
          <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">00</span>:
          <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">00</span>:
          <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">00</span>
        </div>
      )}
      {el.type === "form" && (
        <div className="w-full h-full border border-dashed border-slate-300 rounded-lg p-4 bg-white dark:bg-slate-900">
          <div className="space-y-2">
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-10 bg-indigo-500 rounded flex items-center justify-center text-white text-sm font-semibold">
              Gửi
            </div>
          </div>
        </div>
      )}
      {el.type === "html" && (
        <div className="w-full h-full border border-dashed border-orange-300 rounded bg-orange-50 dark:bg-orange-900/10 p-2 text-xs text-orange-700 font-mono overflow-hidden">
          {el.content?.slice(0, 200)}
        </div>
      )}
      {el.type === "list" && (
        <ul className="list-disc list-inside space-y-1" style={{ fontSize: elStyle.fontSize, color: elStyle.color }}>
          {(el.content ?? "").split("\n").map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
      {el.type === "gallery" && (
        <div className="w-full h-full grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      )}
      {el.type === "carousel" && (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-center border border-dashed border-slate-300">
          <div className="text-center text-slate-400">
            <LucideIcons.GalleryHorizontal className="w-8 h-8 mx-auto mb-1" />
            <span className="text-xs">Carousel</span>
          </div>
        </div>
      )}
      {el.type === "tabs" && (
        <div className="w-full h-full border border-slate-200 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex border-b border-slate-200 text-xs">
            {(el.content ?? "Tab 1\nTab 2").split("\n").map((tab, i) => (
              <span key={i} className={`px-3 py-2 ${i === 0 ? "bg-indigo-50 text-indigo-600 font-semibold border-b-2 border-indigo-600" : "text-slate-500"}`}>{tab}</span>
            ))}
          </div>
          <div className="p-3 text-xs text-slate-400">Nội dung tab</div>
        </div>
      )}
      {el.type === "frame" && (
        <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs">
          Frame
        </div>
      )}
      {el.type === "accordion" && (
        <div className="w-full h-full space-y-1 overflow-hidden">
          {(el.content ?? "Câu hỏi 1|Trả lời 1").split("\n").map((line, i) => {
            const [q] = line.split("|");
            return (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs">
                <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-200">
                  <span>{q}</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {el.type === "table" && (
        <div className="w-full h-full overflow-auto text-xs">
          <table className="w-full border-collapse">
            {(el.content ?? "A,B\n1,2").split("\n").map((row, ri) => (
              <tr key={ri}>
                {row.split(",").map((cell, ci) => (
                  ri === 0
                    ? <th key={ci} className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-left">{cell}</th>
                    : <td key={ci} className="border border-slate-200 px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
          </table>
        </div>
      )}
      {el.type === "map" && (
        <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/20 rounded flex items-center justify-center border border-dashed border-emerald-300">
          <div className="text-center text-emerald-500">
            <LucideIcons.MapPin className="w-8 h-8 mx-auto mb-1" />
            <span className="text-xs">Google Maps</span>
          </div>
        </div>
      )}
      {el.type === "rating" && (
        <div className="w-full h-full flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-5 h-5" fill={s <= Number(el.content ?? 5) ? "#f59e0b" : "none"} stroke="#f59e0b" />
          ))}
        </div>
      )}
      {el.type === "progress" && (
        <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: (el.styles?.backgroundColor as string) ?? "#e2e8f0" }}>
          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${Math.min(100, Number(el.content ?? 75))}%` }} />
        </div>
      )}
      {["collection-list", "product", "product-list", "product-detail", "cart", "blog-list", "blog-detail", "popup", "social-share"].includes(el.type) && (
        <div className="w-full h-full border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50">
          {getLucideIcon(
            el.type === "product" || el.type === "product-detail" ? "package"
            : el.type === "product-list" ? "list"
            : el.type === "cart" ? "shopping-cart"
            : el.type === "blog-list" ? "list"
            : el.type === "blog-detail" ? "file-text"
            : el.type === "popup" ? "message-square"
            : el.type === "social-share" ? "share-2"
            : "layout-grid",
            "w-8 h-8 mb-1"
          )}
          <span className="text-xs capitalize">{el.type.replace(/-/g, " ")}</span>
        </div>
      )}

      {/* Resize handle */}
      {isSelected && !el.isLocked && (
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 rounded-sm cursor-se-resize z-50"
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = el.width ?? 200;
            const startH = el.height ?? 40;
            const onMove = (ev: MouseEvent) => {
              const w = Math.max(20, startW + (ev.clientX - startX));
              const h = Math.max(10, startH + (ev.clientY - startY));
              useEditorStore.getState().updateElement(el.id, {
                width: Math.round(w / 5) * 5,
                height: Math.round(h / 5) * 5,
              });
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
              useEditorStore.getState().pushHistory();
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        />
      )}
    </div>
  );
}

function PropertyPanel() {
  const {
    selected,
    getSelectedElement,
    getSelectedSection,
    updateElement,
    updateSection,
    removeElement,
    duplicateElement,
    removeSection,
    duplicateSection,
    moveSectionUp,
    moveSectionDown,
    name,
    metaTitle,
    metaDescription,
    updatePageMeta,
    pushHistory,
  } = useEditorStore();

  const el = getSelectedElement();
  const sec = getSelectedSection();

  if (selected.type === "element" && el) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider">
            {el.type}
          </p>
          <div className="flex gap-1">
            <button type="button" onClick={() => duplicateElement(el.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Nhân bản">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => { removeElement(el.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Xóa">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Position & Size */}
        <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
          <legend className="text-[11px] font-semibold text-slate-500 px-1">Vị trí & Kích thước</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "x", label: "X" },
              { key: "y", label: "Y" },
              { key: "width", label: "W" },
              { key: "height", label: "H" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 w-4">{label}</span>
                <input
                  type="number"
                  value={el[key as keyof EditorElement] as number ?? 0}
                  onChange={(e) => {
                    updateElement(el.id, { [key]: Number(e.target.value) });
                  }}
                  onBlur={() => pushHistory()}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 w-8">Xoay</span>
              <input
                type="number"
                value={el.rotation}
                onChange={(e) => updateElement(el.id, { rotation: Number(e.target.value) })}
                onBlur={() => pushHistory()}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 w-8">Mờ</span>
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                value={el.opacity}
                onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })}
                onBlur={() => pushHistory()}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
          </div>
        </fieldset>

        {/* Content */}
        {["text", "headline", "paragraph", "button", "html", "list"].includes(el.type) && (
          <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">Nội dung</legend>
            {el.type === "html" || el.type === "list" ? (
              <textarea
                value={el.content ?? ""}
                onChange={(e) => updateElement(el.id, { content: e.target.value })}
                onBlur={() => pushHistory()}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[80px] font-mono"
              />
            ) : (
              <input
                type="text"
                value={el.content ?? ""}
                onChange={(e) => updateElement(el.id, { content: e.target.value })}
                onBlur={() => pushHistory()}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            )}
          </fieldset>
        )}

        {/* Link */}
        <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
          <legend className="text-[11px] font-semibold text-slate-500 px-1">Liên kết</legend>
          <input
            type="text"
            placeholder="https://..."
            value={el.href ?? ""}
            onChange={(e) => updateElement(el.id, { href: e.target.value })}
            onBlur={() => pushHistory()}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <select
            value={el.target ?? "_self"}
            onChange={(e) => { updateElement(el.id, { target: e.target.value }); pushHistory(); }}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="_self">Cùng tab</option>
            <option value="_blank">Tab mới</option>
          </select>
        </fieldset>

        {/* Image URL */}
        {el.type === "image" && (
          <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">URL Hình ảnh</legend>
            <input
              type="text"
              placeholder="https://..."
              value={el.imageUrl ?? ""}
              onChange={(e) => updateElement(el.id, { imageUrl: e.target.value })}
              onBlur={() => pushHistory()}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </fieldset>
        )}

        {/* Video URL */}
        {el.type === "video" && (
          <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <legend className="text-[11px] font-semibold text-slate-500 px-1">URL Video</legend>
            <input
              type="text"
              placeholder="https://youtube.com/embed/..."
              value={el.videoUrl ?? ""}
              onChange={(e) => updateElement(el.id, { videoUrl: e.target.value })}
              onBlur={() => pushHistory()}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </fieldset>
        )}

        {/* Styles */}
        <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
          <legend className="text-[11px] font-semibold text-slate-500 px-1">Kiểu dáng</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className="text-[11px] text-slate-500">Cỡ chữ</span>
              <input
                type="number"
                value={(el.styles?.fontSize as number) ?? 14}
                onChange={(e) => updateElement(el.id, { styles: { fontSize: Number(e.target.value) } })}
                onBlur={() => pushHistory()}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[11px] text-slate-500">Độ đậm</span>
              <select
                value={(el.styles?.fontWeight as number) ?? 400}
                onChange={(e) => { updateElement(el.id, { styles: { fontWeight: Number(e.target.value) } }); pushHistory(); }}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className="text-[11px] text-slate-500">Màu chữ</span>
              <input
                type="color"
                value={(el.styles?.color as string) ?? "#1e293b"}
                onChange={(e) => updateElement(el.id, { styles: { color: e.target.value } })}
                onBlur={() => pushHistory()}
                className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[11px] text-slate-500">Màu nền</span>
              <input
                type="color"
                value={(el.styles?.backgroundColor as string) ?? "#ffffff"}
                onChange={(e) => updateElement(el.id, { styles: { backgroundColor: e.target.value } })}
                onBlur={() => pushHistory()}
                className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              />
            </label>
          </div>
          <label className="space-y-0.5">
            <span className="text-[11px] text-slate-500">Bo góc (px)</span>
            <input
              type="number"
              value={(el.styles?.borderRadius as number) ?? 0}
              onChange={(e) => updateElement(el.id, { styles: { borderRadius: Number(e.target.value) } })}
              onBlur={() => pushHistory()}
              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </label>
        </fieldset>

        {/* Lock/Hide */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { updateElement(el.id, { isLocked: !el.isLocked }); pushHistory(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium border ${
              el.isLocked ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {el.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {el.isLocked ? "Đã khóa" : "Khóa"}
          </button>
          <button
            type="button"
            onClick={() => { updateElement(el.id, { isHidden: !el.isHidden }); pushHistory(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium border ${
              el.isHidden ? "border-slate-400 bg-slate-100 text-slate-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            {el.isHidden ? "Đã ẩn" : "Ẩn"}
          </button>
        </div>
      </div>
    );
  }

  if (selected.type === "section" && sec) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider">Section</p>
          <div className="flex gap-1">
            <button type="button" onClick={() => moveSectionUp(sec.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Lên"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => moveSectionDown(sec.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Xuống"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => duplicateSection(sec.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Nhân bản"><Copy className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => { removeSection(sec.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold">Tên section</span>
          <input
            type="text"
            value={sec.name ?? ""}
            onChange={(e) => updateSection(sec.id, { name: e.target.value })}
            onBlur={() => pushHistory()}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold">Chiều cao (px)</span>
          <input
            type="number"
            value={sec.height ?? 600}
            onChange={(e) => updateSection(sec.id, { height: Number(e.target.value) })}
            onBlur={() => pushHistory()}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold">Màu nền</span>
          <input
            type="color"
            value={sec.backgroundColor ?? "#ffffff"}
            onChange={(e) => updateSection(sec.id, { backgroundColor: e.target.value })}
            onBlur={() => pushHistory()}
            className="w-full h-8 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold">Ảnh nền URL</span>
          <input
            type="text"
            placeholder="https://..."
            value={sec.backgroundImageUrl ?? ""}
            onChange={(e) => updateSection(sec.id, { backgroundImageUrl: e.target.value })}
            onBlur={() => pushHistory()}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </label>
      </div>
    );
  }

  // Page-level settings
  return (
    <div className="space-y-3 text-sm">
      <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider">Thiết lập toàn trang</p>

      <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
        <legend className="text-[11px] font-semibold text-slate-500 px-1">SEO & Social</legend>
        <label className="block space-y-0.5">
          <span className="text-[11px] text-slate-500">Tiêu đề Meta</span>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => updatePageMeta({ metaTitle: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </label>
        <label className="block space-y-0.5">
          <span className="text-[11px] text-slate-500">Mô tả Meta</span>
          <textarea
            value={metaDescription}
            onChange={(e) => updatePageMeta({ metaDescription: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[60px]"
          />
        </label>
      </fieldset>

      {[
        "Mã chuyển đổi",
        "JavaScript/CSS",
        "Tối ưu hóa tương tác",
        "Dynamic Content",
      ].map((t) => (
        <button
          key={t}
          type="button"
          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
        >
          {t}
        </button>
      ))}

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Thiết lập chung</p>
        <div className="grid gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Font chữ</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Inter</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Kích thước Desktop</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">960px</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Kích thước Mobile</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">420px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLayerPanel() {
  const { sections, selected, selectSection, selectElement, addSection } = useEditorStore();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layers</p>
        <button
          type="button"
          onClick={() => addSection()}
          className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
      {sections.map((sec) => {
        const isExpanded = expandedSections.has(sec.id);
        const isSecSelected = selected.type === "section" && selected.id === sec.id;
        return (
          <div key={sec.id}>
            <button
              type="button"
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition ${
                isSecSelected
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              onClick={() => selectSection(sec.id)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(sec.id); }}
                className="p-0.5"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{sec.name ?? `Section ${sec.order}`}</span>
              <span className="ml-auto text-[10px] text-slate-400">{sec.elements.length}</span>
            </button>
            {isExpanded && (
              <div className="ml-5 border-l border-slate-200 dark:border-slate-700 pl-2 space-y-0.5 py-0.5">
                {sec.elements.map((el) => {
                  const isElSelected = selected.type === "element" && selected.id === el.id;
                  return (
                    <button
                      key={el.id}
                      type="button"
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition ${
                        isElSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 font-semibold"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => selectElement(el.id)}
                    >
                      <span className="capitalize">{el.type}</span>
                      {el.isLocked && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                      {el.isHidden && <EyeOff className="w-2.5 h-2.5 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditorInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const type = (search.get("type") ?? "responsive") as DesignType;
  const pageId = Number(params.id);
  const [leftPanel, setLeftPanel] = useState<"tools" | "layers">("tools");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" });
  const [toolCategories, setToolCategories] = useState<ToolCategoryData[]>([]);

  const showToast = useCallback((message: string, type: ToastState["type"] = "info") => {
    setToast({ show: true, message, type });
  }, []);

  const deviceHint = useMemo(() => {
    if (type === "mobile") return "Mobile Only";
    if (type === "adaptive") return "Adaptive";
    return "Responsive";
  }, [type]);

  const {
    sections,
    deviceType,
    setDeviceType,
    loadFromContent,
    addSection,
    addElement,
    selectSection,
    selectElement,
    selectPage,
    selected,
    toContentPayload,
    markSaved,
    undo,
    redo,
    pushHistory,
    dirty,
  } = useEditorStore();

  useEffect(() => {
    setDeviceType(type === "mobile" ? "mobile" : "web");
  }, [setDeviceType, type]);

  useEffect(() => {
    editorToolsApi.list().then(setToolCategories).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const content = await pagesApi.getContent(pageId);
        if (!content.sections || content.sections.length === 0) {
          content.sections = [
            {
              id: Date.now(),
              pageId: content.pageId,
              order: 1,
              name: "Section 1",
              backgroundColor: "#ffffff",
              backgroundImageUrl: null,
              height: 800,
              visible: true,
              isLocked: false,
              customClass: null,
              elements: [],
            },
          ];
        }
        if (!cancelled) loadFromContent(content);
      } catch (err) {
        console.error(err);
        setError("Không tải được nội dung trang.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pageId, loadFromContent]);

  const handleAddElement = useCallback((elType: EditorElementType, preset?: ElementPresetData) => {
    const currentSectionId =
      selected.type === "section"
        ? selected.id
        : selected.type === "element"
        ? (() => {
            for (const s of sections) {
              if (s.elements.some((e) => e.id === selected.id)) return s.id;
            }
            return sections[0]?.id;
          })()
        : sections[0]?.id;
    if (!currentSectionId) return;

    if (preset) {
      let styles: Record<string, string | number> = {};
      try { styles = JSON.parse(preset.stylesJson); } catch { /* ignore */ }
      addElement(currentSectionId, {
        type: elType,
        content: preset.defaultContent ?? undefined,
        width: preset.defaultWidth ?? undefined,
        height: preset.defaultHeight ?? undefined,
        styles,
      });
    } else {
      addElement(currentSectionId, { type: elType });
    }
    pushHistory();
  }, [selected, sections, addElement, pushHistory]);

  const handleAddSection = useCallback(() => {
    addSection();
    pushHistory();
  }, [addSection, pushHistory]);

  const handleSave = useCallback(async () => {
    const payload = toContentPayload();
    if (!payload) return;
    setSaving(true);
    setError("");
    try {
      await pagesApi.updateContent(pageId, payload);
      markSaved();
      showToast("Đã lưu thành công!", "success");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Lưu thất bại.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }, [pageId, toContentPayload, markSaved, showToast]);

  const handlePreview = useCallback(() => {
    const state = useEditorStore.getState();
    const width = deviceType === "mobile" ? 420 : 960;
    const html = generatePreviewHtml(state.sections, {
      metaTitle: state.metaTitle || state.name || "Preview",
      metaDescription: state.metaDescription || "",
      deviceWidth: width,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      showToast("Đang mở xem trước...", "info");
    } else {
      showToast("Trình duyệt chặn popup. Vui lòng cho phép popup.", "error");
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [deviceType, showToast]);

  const handlePublish = useCallback(async () => {
    const payload = toContentPayload();
    if (!payload) return;
    setPublishing(true);
    setError("");
    try {
      await pagesApi.updateContent(pageId, payload);
      markSaved();
      await pagesApi.publish(pageId);
      useEditorStore.setState((s) => { s.status = "published"; });
      showToast("Xuất bản thành công! Trang đã được công khai.", "success");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Xuất bản thất bại.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setPublishing(false);
    }
  }, [pageId, toContentPayload, markSaved, showToast]);

  const handleElementDragStart = (el: EditorElement, e: React.MouseEvent) => {
    if (el.isLocked) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = el.x;
    const startTop = el.y;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      useEditorStore.getState().updateElement(el.id, {
        x: Math.round((startLeft + dx) / 5) * 5,
        y: Math.round((startTop + dy) / 5) * 5,
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      pushHistory();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        const st = useEditorStore.getState();
        if (st.selected.type === "element") {
          st.removeElement(st.selected.id);
          st.pushHistory();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleSave]);

  return (
    <div className="h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col">
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
      {/* Top editor bar */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/pages"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              Editor — Page #{pageId}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {deviceHint}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Device toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                deviceType === "web"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setDeviceType("web")}
            >
              <Monitor className="w-3.5 h-3.5 inline-block mr-1" />
              Web
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                deviceType === "mobile"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setDeviceType("mobile")}
            >
              <Smartphone className="w-3.5 h-3.5 inline-block mr-1" />
              Mobile
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Undo/Redo */}
          <button
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500"
            onClick={undo}
            title="Ctrl+Z"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500"
            onClick={redo}
            title="Ctrl+Y"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          <Button
            variant="secondary"
            className="text-xs h-8 px-3"
            onClick={handlePreview}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Xem trước
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 px-3"
            loading={saving}
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Lưu
            {dirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 px-3"
            loading={publishing}
            onClick={handlePublish}
            disabled={saving}
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Xem và xuất bản
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-0 flex">
        {/* Left panel - 3 column tool panel */}
        <div className="relative flex shrink-0">
          <aside
            className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ${
              leftCollapsed ? "w-0 overflow-hidden" : "w-[520px]"
            }`}
          >
            {/* Top tab switcher */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition border-b-2 ${
                  leftPanel === "tools"
                    ? "text-indigo-600 border-indigo-600"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
                onClick={() => setLeftPanel("tools")}
              >
                Công cụ
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition border-b-2 ${
                  leftPanel === "layers"
                    ? "text-indigo-600 border-indigo-600"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
                onClick={() => setLeftPanel("layers")}
              >
                Layers
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {leftPanel === "tools" ? (
                toolCategories.length > 0 ? (
                  <ToolPanel
                    categories={toolCategories}
                    onAddElement={handleAddElement}
                    onAddSection={handleAddSection}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )
              ) : (
                <div className="p-3 overflow-y-auto h-full">
                  <SectionLayerPanel />
                </div>
              )}
            </div>
          </aside>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setLeftCollapsed((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition z-30"
          >
            {leftCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>

        {/* Canvas area */}
        <div
          className="flex-1 min-w-0 overflow-auto p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) selectPage();
          }}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className={`bg-white dark:bg-slate-900 shadow-lg rounded-sm transition-all duration-200 ${
                  deviceType === "mobile" ? "w-[420px]" : "w-[960px]"
                }`}
                style={{ minHeight: 400 }}
              >
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={`relative border-b border-dashed transition cursor-pointer ${
                      selected.type === "section" && selected.id === section.id
                        ? "border-indigo-400 ring-1 ring-inset ring-indigo-400/40"
                        : "border-transparent hover:border-slate-300"
                    }`}
                    style={{
                      minHeight: section.height ?? 600,
                      backgroundColor: section.backgroundColor ?? "#ffffff",
                      backgroundImage: section.backgroundImageUrl
                        ? `url(${section.backgroundImageUrl})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) selectSection(section.id);
                    }}
                  >
                    {/* Section label */}
                    <div className="absolute top-0 left-0 bg-indigo-600/80 text-white text-[10px] px-2 py-0.5 rounded-br z-10 pointer-events-none">
                      {section.name ?? `Section ${section.order}`}
                    </div>

                    {section.elements.map((el) => (
                      <ElementRenderer
                        key={el.id}
                        el={el}
                        isSelected={selected.type === "element" && selected.id === el.id}
                        onSelect={() => selectElement(el.id)}
                        onDragStart={(e) => handleElementDragStart(el, e)}
                      />
                    ))}
                  </div>
                ))}

                {/* Add section button at bottom */}
                <button
                  type="button"
                  className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 text-sm font-medium"
                  onClick={() => { addSection(); pushHistory(); }}
                >
                  <Plus className="w-4 h-4" />
                  Thêm Section mới
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="relative flex shrink-0">
          <button
            type="button"
            onClick={() => setRightCollapsed((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition z-30"
          >
            {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          <aside
            className={`bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ${
              rightCollapsed ? "w-0 overflow-hidden" : "w-[300px]"
            }`}
          >
            <div className="h-10 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {selected.type === "element"
                  ? "Thuộc tính phần tử"
                  : selected.type === "section"
                  ? "Thuộc tính Section"
                  : "Thiết lập trang"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {error && (
                <div className="mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs px-3 py-2">
                  {error}
                </div>
              )}
              <PropertyPanel />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
