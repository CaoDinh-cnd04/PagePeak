"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Eye, Save, Smartphone, Monitor,
  Layers, Undo2, Redo2, Copy, Trash2,
  Lock, Unlock, EyeOff, ArrowUp, ArrowDown,
  Globe, X, ChevronDown, Plus,
  CheckCircle2, XCircle, AlertTriangle,
  ZoomIn, ZoomOut, Download, FileImage, FileText, FileCode,
  ChevronsUp, ChevronsDown, MoveUp, MoveDown,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Magnet,
  LayoutGrid, Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/stores/editorStore";
import { pagesApi, editorToolsApi, type PublishCheck } from "@/lib/api";
import MediaPanel from "@/components/editor/MediaPanel";
import { generatePreviewHtml, downloadHtml } from "@/lib/generatePreviewHtml";
import { getLucideIcon } from "@/lib/iconMap";
import FabricCanvas from "@/components/editor/FabricCanvas";
import FontPicker from "@/components/editor/FontPicker";
import { exportCanvasToPng } from "@/lib/exportPng";
import { exportCanvasToPdf } from "@/lib/exportPdf";
import { loadFontsFromSections } from "@/lib/fontLoader";
import type {
  EditorElementType,
  EditorElement,
  ToolCategoryData,
  ToolItemData,
  ElementPresetData,
} from "@/types/editor";
import { ZOOM_PRESETS } from "@/types/editor";
import type { Canvas } from "fabric";

type DesignType = "responsive" | "mobile" | "adaptive";
type ToastState = { show: boolean; message: string; type: "success" | "error" | "info" };

/* ─── Toast ─── */
function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast.show, onClose]);
  if (!toast.show) return null;
  const colors = { success: "bg-emerald-600 text-white", error: "bg-red-600 text-white", info: "bg-indigo-600 text-white" };
  return (
    <div className="fixed top-14 right-4 z-[200]" style={{ animation: "toast-slide-in 0.3s ease-out" }}>
      <div className={`${colors[toast.type]} px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm`}>
        {toast.type === "success" && <span>&#10003;</span>}
        {toast.type === "error" && <span>&#10007;</span>}
        {toast.type === "info" && <span>&#9432;</span>}
        <span>{toast.message}</span>
        <button type="button" onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ─── Left Icon Strip (like LadiPage) ─── */
function LeftIconStrip({
  categories,
  activeCatId,
  onSelect,
  activeSpecial,
  onSpecialSelect,
}: {
  categories: ToolCategoryData[];
  activeCatId: number | null;
  onSelect: (id: number) => void;
  activeSpecial: "media" | "layers" | null;
  onSpecialSelect: (panel: "media" | "layers") => void;
}) {
  return (
    <div className="w-[56px] bg-indigo-700 flex flex-col shrink-0 overflow-y-auto">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`flex flex-col items-center gap-0.5 px-1 py-2.5 transition-all border-l-[3px] ${
            activeCatId === cat.id && !activeSpecial
              ? "border-white bg-indigo-800 text-white"
              : "border-transparent text-indigo-200 hover:bg-indigo-600 hover:text-white"
          }`}
        >
          {getLucideIcon(cat.icon, "w-[18px] h-[18px]")}
          <span className="text-[9px] font-medium leading-tight text-center">{cat.name}</span>
        </button>
      ))}
      <div className="mt-auto border-t border-indigo-600">
        <button
          type="button"
          onClick={() => onSpecialSelect("media")}
          className={`w-full flex flex-col items-center gap-0.5 px-1 py-2.5 transition-all border-l-[3px] ${
            activeSpecial === "media"
              ? "border-white bg-indigo-800 text-white"
              : "border-transparent text-indigo-200 hover:bg-indigo-600 hover:text-white"
          }`}
        >
          {getLucideIcon("image", "w-[18px] h-[18px]")}
          <span className="text-[9px] font-medium">Media</span>
        </button>
        <button
          type="button"
          onClick={() => onSpecialSelect("layers")}
          className={`w-full flex flex-col items-center gap-0.5 px-1 py-2.5 transition-all border-l-[3px] ${
            activeSpecial === "layers"
              ? "border-white bg-indigo-800 text-white"
              : "border-transparent text-indigo-200 hover:bg-indigo-600 hover:text-white"
          }`}
        >
          {getLucideIcon("layers", "w-[18px] h-[18px]")}
          <span className="text-[9px] font-medium">Layers</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Tool Items Column ─── */
function ToolItemsColumn({
  category,
  activeItemId,
  onSelect,
  onQuickAdd,
  onAddSection,
}: {
  category: ToolCategoryData;
  activeItemId: number | null;
  onSelect: (id: number) => void;
  onQuickAdd: (item: ToolItemData) => void;
  onAddSection: () => void;
}) {
  return (
    <div className="w-[120px] border-r border-slate-200 bg-white overflow-y-auto shrink-0">
      <div className="px-2 pt-3 pb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">{category.name}</p>
      </div>
      <div className="px-1.5 space-y-0.5 pb-3">
        {category.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelect(item.id);
              if (item.presets.length === 0) {
                if (item.elementType === "section") onAddSection();
                else onQuickAdd(item);
              }
            }}
            className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-md text-[11px] font-medium transition ${
              activeItemId === item.id
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {getLucideIcon(item.icon, "w-3.5 h-3.5 shrink-0")}
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Preset Column ─── */
function PresetColumn({
  item,
  onAddElement,
  onAddSection,
}: {
  item: ToolItemData;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
}) {
  const subTabs: string[] = useMemo(() => {
    if (!item.subTabs) return [];
    try { return JSON.parse(item.subTabs); } catch { return []; }
  }, [item]);

  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (subTabs.length > 0 && !subTabs.includes(activeTab ?? "")) setActiveTab(subTabs[0]);
    else if (subTabs.length === 0) setActiveTab(null);
  }, [subTabs, activeTab]);

  const filteredPresets = useMemo(() => {
    if (activeTab) return item.presets.filter((p) => p.tabName === activeTab);
    return item.presets;
  }, [item.presets, activeTab]);

  return (
    <div className="w-[200px] border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex flex-col">
      {subTabs.length > 0 && (
        <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10 shrink-0">
          {subTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[11px] font-semibold text-center transition border-b-2 ${
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
      <div className="flex-1 p-2.5 overflow-y-auto">
        {filteredPresets.length > 0 ? (
          <div className="space-y-1.5">
            {filteredPresets.map((preset) => {
              const styles = (() => { try { return JSON.parse(preset.stylesJson); } catch { return {}; } })();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onAddElement(item.elementType as EditorElementType, preset)}
                  className="w-full text-left px-3 py-2.5 rounded-md border border-transparent hover:border-indigo-200 hover:bg-indigo-50/30 transition group cursor-pointer"
                >
                  <span
                    style={{
                      fontSize: styles.fontSize ? `${Math.min(styles.fontSize, 32)}px` : "14px",
                      fontWeight: styles.fontWeight ?? 400,
                      color: styles.color ?? "#334155",
                      fontStyle: styles.fontStyle ?? "normal",
                      textTransform: styles.textTransform ?? "none",
                      letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : "normal",
                      fontFamily: styles.fontFamily ?? "inherit",
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
                if (item.elementType === "section") onAddSection();
                else onAddElement(item.elementType as EditorElementType);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition font-semibold text-xs"
            >
              <Plus className="w-4 h-4" /> Thêm {item.name}
            </button>
            <p className="text-[10px] text-slate-400 mt-2">Kéo hoặc nhấn để thêm</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Image/Video URL Inputs ─── */
function ImageUrlInput({ value, onApply }: { value: string; onApply: (url: string) => void }) {
  const [url, setUrl] = useState(value);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => { setUrl(value); if (value) tryPreview(value); }, [value]);

  function tryPreview(src: string) {
    if (!src.trim()) { setPreviewSrc(null); setStatus("idle"); return; }
    setStatus("loading");
    const img = new window.Image();
    img.onload = () => { setPreviewSrc(src); setStatus("ok"); };
    img.onerror = () => {
      const proxied = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      const img2 = new window.Image();
      img2.onload = () => { setPreviewSrc(proxied); setStatus("ok"); };
      img2.onerror = () => { setPreviewSrc(null); setStatus("error"); };
      img2.src = proxied;
    };
    img.src = src;
  }

  const apply = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onApply(trimmed);
    tryPreview(trimmed);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Nhập URL ảnh trực tiếp (.jpg, .png...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
      />
      <button
        type="button"
        onClick={apply}
        className="w-full py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
      >
        {status === "loading" ? "⏳ Đang tải..." : "Áp dụng ảnh"}
      </button>
      {status === "error" && (
        <p className="text-[9px] text-red-500">Không tải được ảnh. Hãy dùng URL ảnh trực tiếp (kết thúc bằng .jpg, .png, .webp).</p>
      )}
      {status === "ok" && previewSrc && (
        <div className="border border-green-300 rounded overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" className="w-full h-auto max-h-[120px] object-contain bg-slate-50" />
        </div>
      )}
      <p className="text-[9px] text-slate-400">Dùng URL ảnh trực tiếp. Ví dụ: https://example.com/hinh.jpg</p>
      <div className="flex flex-wrap gap-1">
        {["https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"].map((sampleUrl, i) => (
          <button key={i} type="button" onClick={() => { setUrl(sampleUrl); onApply(sampleUrl); tryPreview(sampleUrl); }}
            className="w-12 h-9 rounded border border-slate-200 overflow-hidden hover:border-indigo-400 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sampleUrl} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoUrlInput({ value, onApply }: { value: string; onApply: (url: string) => void }) {
  const [url, setUrl] = useState(value);
  useEffect(() => { setUrl(value); }, [value]);
  const apply = () => { onApply(url.trim()); };
  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Nhập URL video (YouTube, Vimeo...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
      />
      <button
        type="button"
        onClick={apply}
        className="w-full py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
      >
        Áp dụng video
      </button>
      <p className="text-[9px] text-slate-400">VD: https://www.youtube.com/embed/VIDEO_ID</p>
    </div>
  );
}

/* ─── Property Panel ─── */
function PropertyPanel() {
  const {
    selected, getSelectedElement, getSelectedSection,
    updateElement, updateSection, removeElement, duplicateElement,
    removeSection, duplicateSection, moveSectionUp, moveSectionDown,
    metaTitle, metaDescription, updatePageMeta, pushHistory,
    moveElementLayer,
  } = useEditorStore();

  const el = getSelectedElement();
  const sec = getSelectedSection();

  if (selected.type === "element" && el) {
    const isTextType = ["text", "headline", "paragraph", "button"].includes(el.type);
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">{el.type}</p>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => duplicateElement(el.id)} className="p-1.5 rounded hover:bg-slate-100" title="Nhân bản"><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
            <button type="button" onClick={() => { removeElement(el.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <PropSection title="Vị trí & Kích thước">
          <div className="grid grid-cols-2 gap-2">
            {[{ key: "x", label: "X" }, { key: "y", label: "Y" }, { key: "width", label: "W" }, { key: "height", label: "H" }].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 w-3 font-bold">{label}</span>
                <input type="number" value={el[key as keyof EditorElement] as number ?? 0}
                  onChange={(e) => updateElement(el.id, { [key]: Number(e.target.value) })}
                  onBlur={() => pushHistory()}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 w-6 font-bold">Xoay</span>
              <input type="number" value={el.rotation} onChange={(e) => updateElement(el.id, { rotation: Number(e.target.value) })} onBlur={() => pushHistory()}
                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 w-6 font-bold">Mờ</span>
              <input type="number" step={0.1} min={0} max={1} value={el.opacity} onChange={(e) => updateElement(el.id, { opacity: Number(e.target.value) })} onBlur={() => pushHistory()}
                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
            </label>
          </div>
        </PropSection>

        <PropSection title="Thứ tự lớp">
          <div className="flex gap-1">
            {([["front", <ChevronsUp key="f" className="w-3 h-3" />, "Trên cùng"], ["forward", <MoveUp key="fw" className="w-3 h-3" />, "Lên"], ["backward", <MoveDown key="bw" className="w-3 h-3" />, "Xuống"], ["back", <ChevronsDown key="b" className="w-3 h-3" />, "Dưới cùng"]] as const).map(([dir, icon, label]) => (
              <button key={dir} type="button" onClick={() => { moveElementLayer(el.id, dir); pushHistory(); }}
                className="flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-500" title={label}>{icon}</button>
            ))}
          </div>
        </PropSection>

        {["text", "headline", "paragraph", "button", "html", "list"].includes(el.type) && (
          <PropSection title="Nội dung">
            {el.type === "html" || el.type === "list" ? (
              <textarea value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white min-h-[60px] font-mono" />
            ) : (
              <input type="text" value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
            )}
          </PropSection>
        )}

        <PropSection title="Liên kết">
          <input type="text" placeholder="https://..." value={el.href ?? ""} onChange={(e) => updateElement(el.id, { href: e.target.value })} onBlur={() => pushHistory()}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
        </PropSection>

        {el.type === "image" && (
          <PropSection title="Hình ảnh">
            <ImageUrlInput
              value={el.imageUrl ?? ""}
              onApply={(url) => { updateElement(el.id, { imageUrl: url }); pushHistory(); }}
            />
          </PropSection>
        )}

        {el.type === "video" && (
          <PropSection title="Video">
            <VideoUrlInput
              value={el.videoUrl ?? ""}
              onApply={(url) => { updateElement(el.id, { videoUrl: url }); pushHistory(); }}
            />
          </PropSection>
        )}

        {isTextType && (
          <PropSection title="Typography">
            <label className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold">Font</span>
              <FontPicker value={(el.styles?.fontFamily as string) ?? "Inter"} onChange={(f) => { updateElement(el.id, { styles: { fontFamily: f } }); pushHistory(); }} />
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Cỡ chữ</span>
                <input type="number" value={(el.styles?.fontSize as number) ?? 14} onChange={(e) => updateElement(el.id, { styles: { fontSize: Number(e.target.value) } })} onBlur={() => pushHistory()}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Độ đậm</span>
                <select value={(el.styles?.fontWeight as number) ?? 400} onChange={(e) => { updateElement(el.id, { styles: { fontWeight: Number(e.target.value) } }); pushHistory(); }}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                  {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (<option key={w} value={w}>{w}</option>))}
                </select>
              </label>
            </div>
            <div className="flex gap-0.5 flex-wrap mt-2">
              <button type="button" onClick={() => { updateElement(el.id, { styles: { fontWeight: (el.styles?.fontWeight as number) === 700 ? 400 : 700 } }); pushHistory(); }}
                className={`w-7 h-7 rounded flex items-center justify-center text-xs ${(el.styles?.fontWeight as number) === 700 ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}><Bold className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => { updateElement(el.id, { styles: { fontStyle: el.styles?.fontStyle === "italic" ? "normal" : "italic" } }); pushHistory(); }}
                className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.fontStyle === "italic" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}><Italic className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => { updateElement(el.id, { styles: { textDecoration: el.styles?.textDecoration === "underline" ? "none" : "underline" } }); pushHistory(); }}
                className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textDecoration === "underline" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}><Underline className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => { updateElement(el.id, { styles: { textDecoration: el.styles?.textDecoration === "line-through" ? "none" : "line-through" } }); pushHistory(); }}
                className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textDecoration === "line-through" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}><Strikethrough className="w-3.5 h-3.5" /></button>
              <div className="w-px bg-slate-200 mx-0.5 self-stretch" />
              {(["left", "center", "right", "justify"] as const).map((align) => (
                <button key={align} type="button" onClick={() => { updateElement(el.id, { styles: { textAlign: align } }); pushHistory(); }}
                  className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textAlign === align ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}>
                  {align === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : align === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : align === "right" ? <AlignRight className="w-3.5 h-3.5" /> : <AlignJustify className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Màu chữ</span>
                <input type="color" value={(el.styles?.color as string) ?? "#1e293b"} onChange={(e) => updateElement(el.id, { styles: { color: e.target.value } })} onBlur={() => pushHistory()}
                  className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Màu nền</span>
                <input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                  className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Letter spacing</span>
                <input type="number" step={0.5} value={(el.styles?.letterSpacing as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { letterSpacing: Number(e.target.value) } })} onBlur={() => pushHistory()}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold">Line height</span>
                <input type="number" step={0.1} value={(el.styles?.lineHeight as number) ?? 1.5} onChange={(e) => updateElement(el.id, { styles: { lineHeight: Number(e.target.value) } })} onBlur={() => pushHistory()}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
              </label>
            </div>
            <label className="space-y-0.5 mt-2">
              <span className="text-[10px] text-slate-400 font-bold">Bo góc</span>
              <input type="number" value={(el.styles?.borderRadius as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
            </label>
          </PropSection>
        )}

        {!isTextType && (
          <PropSection title="Kiểu dáng">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-0.5"><span className="text-[10px] text-slate-400 font-bold">Màu nền</span>
                <input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { backgroundColor: e.target.value } })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" /></label>
              <label className="space-y-0.5"><span className="text-[10px] text-slate-400 font-bold">Bo góc</span>
                <input type="number" value={(el.styles?.borderRadius as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
            </div>
          </PropSection>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => { updateElement(el.id, { isLocked: !el.isLocked }); pushHistory(); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium border ${el.isLocked ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {el.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}{el.isLocked ? "Đã khóa" : "Khóa"}
          </button>
          <button type="button" onClick={() => { updateElement(el.id, { isHidden: !el.isHidden }); pushHistory(); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium border ${el.isHidden ? "border-slate-400 bg-slate-100 text-slate-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            <EyeOff className="w-3 h-3" />{el.isHidden ? "Đã ẩn" : "Ẩn"}
          </button>
        </div>
      </div>
    );
  }

  if (selected.type === "section" && sec) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Section</p>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => moveSectionUp(sec.id)} className="p-1.5 rounded hover:bg-slate-100"><ArrowUp className="w-3.5 h-3.5 text-slate-500" /></button>
            <button type="button" onClick={() => moveSectionDown(sec.id)} className="p-1.5 rounded hover:bg-slate-100"><ArrowDown className="w-3.5 h-3.5 text-slate-500" /></button>
            <button type="button" onClick={() => duplicateSection(sec.id)} className="p-1.5 rounded hover:bg-slate-100"><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
            <button type="button" onClick={() => { removeSection(sec.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <PropSection title="Thuộc tính">
          <label className="block space-y-0.5"><span className="text-[10px] text-slate-400 font-bold">Tên section</span>
            <input type="text" value={sec.name ?? ""} onChange={(e) => updateSection(sec.id, { name: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
          <label className="block space-y-0.5 mt-2"><span className="text-[10px] text-slate-400 font-bold">Chiều cao (px)</span>
            <input type="number" value={sec.height ?? 600} onChange={(e) => updateSection(sec.id, { height: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
          <label className="block space-y-0.5 mt-2"><span className="text-[10px] text-slate-400 font-bold">Màu nền</span>
            <input type="color" value={sec.backgroundColor ?? "#ffffff"} onChange={(e) => updateSection(sec.id, { backgroundColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" /></label>
          <label className="block space-y-0.5 mt-2"><span className="text-[10px] text-slate-400 font-bold">Ảnh nền URL</span>
            <input type="text" placeholder="https://..." value={sec.backgroundImageUrl ?? ""} onChange={(e) => updateSection(sec.id, { backgroundImageUrl: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
        </PropSection>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Trang</p>
      <PropSection title="Thiết lập trang">
        <p className="text-[10px] text-indigo-600 font-semibold mb-2">SEO & Social</p>
        <label className="block space-y-0.5"><span className="text-[10px] text-slate-400 font-bold">Tiêu đề Meta</span>
          <input type="text" value={metaTitle} onChange={(e) => updatePageMeta({ metaTitle: e.target.value })} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
        <label className="block space-y-0.5 mt-2"><span className="text-[10px] text-slate-400 font-bold">Mô tả Meta</span>
          <textarea value={metaDescription} onChange={(e) => updatePageMeta({ metaDescription: e.target.value })} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white min-h-[60px]" /></label>
      </PropSection>
    </div>
  );
}

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-lg p-2.5 space-y-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

/* ─── Layer Panel ─── */
function SectionLayerPanel() {
  const { sections, selected, selectSection, selectElement, addSection, moveElementLayer, removeElement, duplicateElement, pushHistory } = useEditorStore();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [ctx, setCtx] = useState<{ x: number; y: number; elId: number } | null>(null);

  const toggle = (id: number) => setExpandedSections((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  useEffect(() => { const h = () => setCtx(null); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, []);

  return (
    <div className="space-y-1 relative p-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layers</p>
        <button type="button" onClick={() => addSection()} className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-slate-500" /></button>
      </div>
      {sections.map((sec) => {
        const isExp = expandedSections.has(sec.id);
        const isSel = selected.type === "section" && selected.id === sec.id;
        return (
          <div key={sec.id}>
            <button type="button" className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition ${isSel ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-100"}`} onClick={() => selectSection(sec.id)}>
              <span className="p-0.5" onClick={(e) => { e.stopPropagation(); toggle(sec.id); }}>{isExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{sec.name ?? `Section ${sec.order}`}</span>
              <span className="ml-auto text-[10px] text-slate-400">{sec.elements.length}</span>
            </button>
            {isExp && (
              <div className="ml-5 border-l border-slate-200 pl-2 space-y-0.5 py-0.5">
                {sec.elements.map((el) => {
                  const isElSel = selected.type === "element" && selected.id === el.id;
                  return (
                    <button key={el.id} type="button"
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition ${isElSel ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-100"}`}
                      onClick={() => selectElement(el.id)}
                      onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, elId: el.id }); }}>
                      <span className="capitalize truncate">{el.type}</span>
                      {el.isLocked && <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                      {el.isHidden && <EyeOff className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {ctx && (
        <div className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-[200] min-w-[150px]" style={{ left: ctx.x, top: ctx.y }}>
          {[
            { label: "Lên trên cùng", action: () => { moveElementLayer(ctx.elId, "front"); pushHistory(); } },
            { label: "Lên 1 lớp", action: () => { moveElementLayer(ctx.elId, "forward"); pushHistory(); } },
            { label: "Xuống 1 lớp", action: () => { moveElementLayer(ctx.elId, "backward"); pushHistory(); } },
            { label: "Xuống dưới cùng", action: () => { moveElementLayer(ctx.elId, "back"); pushHistory(); } },
            null,
            { label: "Nhân bản", action: () => { duplicateElement(ctx.elId); pushHistory(); } },
            { label: "Xóa", action: () => { removeElement(ctx.elId); pushHistory(); }, danger: true },
          ].map((item, i) => item === null ? <div key={i} className="h-px bg-slate-100 my-1" /> : (
            <button key={i} type="button" onClick={() => { item.action(); setCtx(null); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${(item as { danger?: boolean }).danger ? "text-red-500" : "text-slate-700"}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Editor ─── */
function EditorInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const type = (search.get("type") ?? "responsive") as DesignType;
  const pageId = Number(params.id);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [activeSpecial, setActiveSpecial] = useState<"media" | "layers" | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishChecks, setPublishChecks] = useState<PublishCheck[] | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" });
  const [toolCategories, setToolCategories] = useState<ToolCategoryData[]>([]);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const canvasRef = useRef<Canvas | null>(null);
  const showToast = useCallback((message: string, type: ToastState["type"] = "info") => setToast({ show: true, message, type }), []);

  const deviceHint = useMemo(() => type === "mobile" ? "Mobile" : type === "adaptive" ? "Adaptive" : "Responsive", [type]);

  const {
    sections, deviceType, setDeviceType, loadFromContent, addSection, addElement,
    selectSection, selectElement, selectPage, selected, toContentPayload, markSaved,
    undo, redo, pushHistory, dirty, zoom, setZoom, copyElement, pasteElement, cutElement,
    snapToGrid, setSnapToGrid,
  } = useEditorStore();

  const activeCat = useMemo(() => toolCategories.find((c) => c.id === activeCatId) ?? null, [toolCategories, activeCatId]);
  const activeItem = useMemo(() => activeCat?.items.find((i) => i.id === activeItemId) ?? null, [activeCat, activeItemId]);

  useEffect(() => { setDeviceType(type === "mobile" ? "mobile" : "web"); }, [setDeviceType, type]);
  useEffect(() => {
    editorToolsApi.list().then((cats) => {
      setToolCategories(cats);
      if (cats.length > 0) {
        setActiveCatId(cats[0].id);
        if (cats[0].items.length > 0) setActiveItemId(cats[0].items[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeCat && activeCat.items.length > 0 && !activeCat.items.some(i => i.id === activeItemId)) {
      setActiveItemId(activeCat.items[0].id);
    }
  }, [activeCat, activeItemId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const content = await pagesApi.getContent(pageId);
        if (!content.sections || content.sections.length === 0) {
          content.sections = [{ id: Date.now(), pageId: content.pageId, order: 1, name: "Section 1", backgroundColor: "#ffffff", backgroundImageUrl: null, height: 800, visible: true, isLocked: false, customClass: null, elements: [] }];
        }
        if (!cancelled) { await loadFontsFromSections(content.sections); loadFromContent(content); }
      } catch (err) { console.error(err); setError("Không tải được nội dung trang."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pageId, loadFromContent]);

  const handleCategorySelect = useCallback((catId: number) => {
    setActiveCatId(catId);
    setActiveSpecial(null);
    setLeftPanelOpen(true);
  }, []);

  const handleSpecialSelect = useCallback((panel: "media" | "layers") => {
    setActiveSpecial((prev) => prev === panel ? null : panel);
    setActiveCatId(null);
    setLeftPanelOpen(true);
  }, []);

  const handleAddElement = useCallback((elType: EditorElementType, preset?: ElementPresetData) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? (() => { for (const s of sections) { if (s.elements.some((e) => e.id === selected.id)) return s.id; } return sections[0]?.id; })() : sections[0]?.id;
    if (!sid) return;
    if (preset) { let styles: Record<string, string | number> = {}; try { styles = JSON.parse(preset.stylesJson); } catch {} addElement(sid, { type: elType, content: preset.defaultContent ?? undefined, width: preset.defaultWidth ?? undefined, height: preset.defaultHeight ?? undefined, styles }); }
    else addElement(sid, { type: elType });
    pushHistory();
  }, [selected, sections, addElement, pushHistory]);

  const handleAddSection = useCallback(() => { addSection(); pushHistory(); }, [addSection, pushHistory]);

  const handleInsertImage = useCallback((url: string, name: string, width?: number, height?: number) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    addElement(sid, { type: "image", imageUrl: url, content: name, width: width ? Math.min(width, 600) : 300, height: height ? Math.min(height, 400) : 200 });
    pushHistory(); showToast("Đã chèn ảnh vào trang", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleInsertVideo = useCallback((url: string, name: string) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    addElement(sid, { type: "video", videoUrl: url, content: name, width: 480, height: 270 });
    pushHistory(); showToast("Đã chèn video vào trang", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleSave = useCallback(async () => {
    const p = toContentPayload(); if (!p) return;
    setSaving(true); setError("");
    try { await pagesApi.updateContent(pageId, p); markSaved(); showToast("Đã lưu thành công!", "success"); }
    catch (err) { const msg = err instanceof Error ? err.message : "Lưu thất bại."; setError(msg); showToast(msg, "error"); }
    finally { setSaving(false); }
  }, [pageId, toContentPayload, markSaved, showToast]);

  const handlePreview = useCallback(() => {
    const s = useEditorStore.getState();
    const html = generatePreviewHtml(s.sections, { metaTitle: s.metaTitle || s.name || "Preview", metaDescription: s.metaDescription || "", deviceWidth: s.canvasWidth });
    const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob);
    window.open(url, "_blank") ? showToast("Đang mở xem trước...", "info") : showToast("Trình duyệt chặn popup.", "error");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [deviceType, showToast]);

  const handlePublish = useCallback(async () => {
    const p = toContentPayload(); if (!p) return;
    setPublishing(true); setError("");
    try {
      await pagesApi.updateContent(pageId, p); markSaved();
      const result = await pagesApi.publish(pageId);
      if (!result.ok) { setPublishChecks(result.checks ?? []); setShowPublishModal(true); return; }
      useEditorStore.setState((s) => { s.status = "published"; });
      showToast("Xuất bản thành công!", "success");
    } catch (err) { const msg = err instanceof Error ? err.message : "Xuất bản thất bại."; setError(msg); showToast(msg, "error"); }
    finally { setPublishing(false); }
  }, [pageId, toContentPayload, markSaved, showToast]);

  const handleExportPng = useCallback(() => { if (canvasRef.current) { exportCanvasToPng(canvasRef.current); showToast("Đang xuất PNG...", "info"); } }, [showToast]);
  const handleExportPdf = useCallback(() => { if (canvasRef.current) { exportCanvasToPdf(canvasRef.current); showToast("Đang xuất PDF...", "info"); } }, [showToast]);
  const handleExportHtml = useCallback(() => {
    const s = useEditorStore.getState();
    downloadHtml(s.sections, { metaTitle: s.metaTitle || s.name || "Page", metaDescription: s.metaDescription || "", deviceWidth: s.canvasWidth, filename: `${s.slug || "page"}.html` });
    showToast("Đang tải HTML...", "info");
  }, [deviceType, showToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); copyElement(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); pasteElement(); pushHistory(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "x") { e.preventDefault(); cutElement(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); const st = useEditorStore.getState(); if (st.selected.type === "element") { st.duplicateElement(st.selected.id); st.pushHistory(); } }
      if (!isInput && (e.key === "Delete" || e.key === "Backspace")) { const st = useEditorStore.getState(); if (st.selected.type === "element") { st.removeElement(st.selected.id); st.pushHistory(); } }
      if ((e.ctrlKey || e.metaKey) && e.key === "=") { e.preventDefault(); setZoom(zoom + 0.1); }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setZoom(zoom - 0.1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleSave, copyElement, pasteElement, cutElement, pushHistory, zoom, setZoom]);

  useEffect(() => {
    const handler = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setZoom(zoom + (e.deltaY > 0 ? -0.05 : 0.05)); };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, [zoom, setZoom]);

  useEffect(() => {
    const h = () => { setShowZoomMenu(false); setShowExportMenu(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const showLeftContent = leftPanelOpen && (activeCatId !== null || activeSpecial !== null);

  const leftPanelWidth = useMemo(() => {
    if (!showLeftContent) return 0;
    if (activeSpecial === "media") return 320;
    if (activeSpecial === "layers") return 260;
    if (activeCat) {
      const base = 120;
      return activeItem ? base + 200 : base;
    }
    return 0;
  }, [showLeftContent, activeSpecial, activeCat, activeItem]);

  return (
    <div className="h-screen bg-slate-200 overflow-hidden flex flex-col">
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />

      {/* ═══ TOP TOOLBAR ═══ */}
      <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Link href="/dashboard/pages" className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center" title="Quay lại">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div className="min-w-0 hidden sm:block">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">Page #{pageId}</p>
            <p className="text-[9px] text-slate-400">{deviceHint}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            <button type="button" className={`px-2 py-1 rounded text-[10px] font-semibold transition ${deviceType === "web" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`} onClick={() => setDeviceType("web")}>
              <Monitor className="w-3 h-3 inline mr-0.5" />Web
            </button>
            <button type="button" className={`px-2 py-1 rounded text-[10px] font-semibold transition ${deviceType === "mobile" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`} onClick={() => setDeviceType("mobile")}>
              <Smartphone className="w-3 h-3 inline mr-0.5" />Mobile
            </button>
          </div>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setZoom(zoom - 0.1)} className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"><ZoomOut className="w-3 h-3" /></button>
            <button type="button" onClick={() => setShowZoomMenu(!showZoomMenu)} className="px-1 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded min-w-[36px] text-center">{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => setZoom(zoom + 0.1)} className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"><ZoomIn className="w-3 h-3" /></button>
            {showZoomMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-[90px]">
                {ZOOM_PRESETS.map((z) => (
                  <button key={z.value} type="button" onClick={() => { setZoom(z.value); setShowZoomMenu(false); }}
                    className={`w-full text-left px-3 py-1 text-[11px] hover:bg-slate-50 ${Math.abs(zoom - z.value) < 0.01 ? "text-indigo-600 font-semibold" : "text-slate-600"}`}>{z.label}</button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={() => setSnapToGrid(!snapToGrid)} title={snapToGrid ? "Snap: ON" : "Snap: OFF"}
            className={`w-6 h-6 rounded flex items-center justify-center ${snapToGrid ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100"}`}>
            <Magnet className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button type="button" onClick={undo} className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" title="Ctrl+Z"><Undo2 className="w-3 h-3" /></button>
          <button type="button" onClick={redo} className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" title="Ctrl+Y"><Redo2 className="w-3 h-3" /></button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button type="button" onClick={handlePreview}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition" title="Xem trước trang">
            <Eye className="w-3.5 h-3.5" /> Xem
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
              <Download className="w-3 h-3" /> Export
            </button>
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
                <button type="button" onClick={() => { handleExportHtml(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"><FileCode className="w-3.5 h-3.5" />HTML</button>
                <button type="button" onClick={() => { handleExportPng(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"><FileImage className="w-3.5 h-3.5" />PNG</button>
                <button type="button" onClick={() => { handleExportPdf(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"><FileText className="w-3.5 h-3.5" />PDF</button>
              </div>
            )}
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700 text-[10px] h-7 px-2.5" loading={saving} onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" />Lưu{dirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-[10px] h-7 px-2.5" loading={publishing} onClick={handlePublish} disabled={saving}>
            <Globe className="w-3 h-3 mr-1" />Xuất bản
          </Button>
        </div>
      </div>

      {/* ═══ MAIN AREA: Icon Strip + Tool Panel + Canvas + Right Panel ═══ */}
      <div className="flex-1 min-h-0 flex">
        {/* LEFT ICON STRIP (always visible) */}
        <LeftIconStrip
          categories={toolCategories}
          activeCatId={activeCatId}
          onSelect={handleCategorySelect}
          activeSpecial={activeSpecial}
          onSpecialSelect={handleSpecialSelect}
        />

        {/* LEFT EXPANDABLE PANEL with transition */}
        <div
          className="shrink-0 flex h-full bg-white overflow-hidden transition-all duration-300 ease-in-out border-r border-slate-200"
          style={{ width: showLeftContent ? leftPanelWidth : 0, minWidth: showLeftContent ? leftPanelWidth : 0 }}
        >
          {showLeftContent && (
            <>
              {activeSpecial === "media" ? (
                <div className="w-[320px] overflow-y-auto shrink-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Media</p>
                    <button type="button" onClick={() => setActiveSpecial(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <MediaPanel onInsertImage={handleInsertImage} onInsertVideo={handleInsertVideo} />
                </div>
              ) : activeSpecial === "layers" ? (
                <div className="w-[260px] overflow-y-auto shrink-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Layers</p>
                    <button type="button" onClick={() => setActiveSpecial(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <SectionLayerPanel />
                </div>
              ) : activeCat ? (
                <>
                  <ToolItemsColumn
                    category={activeCat}
                    activeItemId={activeItemId}
                    onSelect={setActiveItemId}
                    onQuickAdd={(item) => handleAddElement(item.elementType as EditorElementType)}
                    onAddSection={handleAddSection}
                  />
                  {activeItem && (
                    <PresetColumn
                      item={activeItem}
                      onAddElement={handleAddElement}
                      onAddSection={handleAddSection}
                    />
                  )}
                </>
              ) : null}
            </>
          )}
        </div>

        {/* LEFT SIDEBAR TOGGLE ARROW */}
        <button
          type="button"
          onClick={() => {
            if (showLeftContent) {
              setLeftPanelOpen(false);
              setActiveSpecial(null);
              setActiveCatId(null);
            } else {
              setLeftPanelOpen(true);
              if (toolCategories.length > 0 && !activeCatId && !activeSpecial) {
                setActiveCatId(toolCategories[0].id);
              }
            }
          }}
          className="w-4 shrink-0 bg-slate-100 hover:bg-indigo-100 flex items-center justify-center cursor-pointer transition-colors group border-r border-slate-200"
          title={showLeftContent ? "Thu gọn panel" : "Mở rộng panel"}
        >
          {showLeftContent
            ? <ChevronLeft className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
            : <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
          }
        </button>

        {/* CANVAS AREA - full page, centered horizontally */}
        <div
          className="flex-1 min-w-0 overflow-auto transition-all duration-300"
          style={{ background: "linear-gradient(135deg, #dde3ea 0%, #c9d2dc 100%)" }}
          onClick={(e) => { if (e.target === e.currentTarget) selectPage(); }}
        >
          <div className="min-h-full flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) selectPage(); }}>
            <div className="flex-1 flex justify-center" onClick={(e) => { if (e.target === e.currentTarget) selectPage(); }}>
              <div className="flex flex-col items-center">
                {loading ? (
                  <div className="flex justify-center items-center h-[60vh]">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <FabricCanvas onCanvasReady={(c) => { canvasRef.current = c; }} />
                    <button type="button" onClick={handleAddSection}
                      className="flex items-center gap-2 px-6 py-3 my-2 border-2 border-dashed border-slate-400/60 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 rounded-lg transition text-xs font-medium bg-white/40 hover:bg-white/70 backdrop-blur-sm">
                      <Plus className="w-4 h-4" /> Thêm Section mới
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR TOGGLE ARROW */}
        <button
          type="button"
          onClick={() => setRightOpen(!rightOpen)}
          className="w-4 shrink-0 bg-slate-100 hover:bg-indigo-100 flex items-center justify-center cursor-pointer transition-colors group border-l border-slate-200"
          title={rightOpen ? "Thu gọn panel" : "Mở rộng panel"}
        >
          {rightOpen
            ? <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
            : <ChevronLeft className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
          }
        </button>

        {/* RIGHT PANEL with transition */}
        <div
          className="shrink-0 bg-white flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-l border-slate-200"
          style={{ width: rightOpen ? 240 : 0, minWidth: rightOpen ? 240 : 0 }}
        >
          {rightOpen && (
            <>
              <div className="h-9 px-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {selected.type === "element" ? "Phần tử" : selected.type === "section" ? "Section" : "Trang"}
                </p>
                <button type="button" onClick={() => setRightOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5">
                {error && <div className="mb-2 rounded bg-red-50 text-red-700 text-[10px] px-2 py-1.5">{error}</div>}
                <PropertyPanel />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ PUBLISH MODAL ═══ */}
      {showPublishModal && publishChecks && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                <div><h3 className="text-base font-bold text-slate-900">Chưa đủ điều kiện xuất bản</h3><p className="text-xs text-slate-500">Vui lòng hoàn thành các mục bên dưới</p></div>
              </div>
              <button type="button" onClick={() => setShowPublishModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {publishChecks.map((check) => {
                const req = ["name", "slug", "sections", "elements"].includes(check.key);
                return (
                  <div key={check.key} className={`flex items-start gap-3 p-3 rounded-lg border ${check.passed ? "bg-emerald-50 border-emerald-200" : req ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                    {check.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : req ? <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                    <p className={`text-sm font-medium ${check.passed ? "text-emerald-700" : req ? "text-red-700" : "text-amber-700"}`}>{check.message}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end"><button type="button" onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Quay lại</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <EditorInner />
    </Suspense>
  );
}
