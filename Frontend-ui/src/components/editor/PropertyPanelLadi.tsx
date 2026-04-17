import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X, GripVertical, Maximize2, Pencil, Zap, Wand2, Settings,
  Copy, Trash2, Lock, Unlock, Eye, EyeOff, ArrowUp, ArrowDown,
  ChevronsUp, ChevronsDown, MoveUp, MoveDown,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Paintbrush, Image as ImageIcon, Layers, RotateCcw,
  AlignHorizontalSpaceAround, AlignHorizontalSpaceBetween,
  Type, Upload, Plus, Crosshair, Code2,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor/editorStore";
import { type EditorElement } from "@/types/editor";
import FontPicker from "./FontPicker";
import ImagePickerPanel from "./ImagePickerPanel";
import { mediaApi } from "@/lib/shared/api";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { mergeCarouselStyle, parseCarouselContent, parseTabsContent, type TabsItem } from "@/lib/editor/tabsContent";
import { parseBlogListContent, parseBlogDetailContent, parsePopupContent, parseSocialShareContent } from "@/lib/editor/blogContent";
import { parseCartContent, type CartLineItem } from "@/lib/editor/cartContent";
import {
  parseFrameContent,
  FRAME_VARIANT_LABELS,
  persistFrameSnapshotLayer,
  applyFrameVariantSwitch,
  type FrameVariant,
  type FrameContent,
} from "@/lib/editor/frameContent";
import { productsApi, formsApi, settingsApi, type ProductItem } from "@/lib/shared/api";
import { parseFieldsJson, type FormFieldDefinition } from "@/lib/dashboard/forms/formConfigSchema";
import { saveMyPopup } from "@/lib/editor/popupTemplateCatalog";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

type PropPanelTab = "design" | "events" | "effects" | "advanced";

function PropertyPanelHeader({
  title,
  onClose,
  onRename,
  dragHandleClassName,
}: {
  title: string;
  onClose: () => void;
  onRename?: () => void;
  dragHandleClassName?: string;
}) {
  return (
    <div className="flex flex-col shrink-0">
      <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 ${dragHandleClassName ?? ""}`}>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing" title="Kéo để di chuyển">
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Mở rộng">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Đóng">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 py-2.5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
        {onRename && (
          <button type="button" onClick={onRename} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Đổi tên">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function PropertyPanelTabs({ activeTab, onTab }: { activeTab: PropPanelTab; onTab: (t: PropPanelTab) => void }) {
  const tabs: { id: PropPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "design", label: "Thiết kế", icon: <Paintbrush className="w-4 h-4" /> },
    { id: "events", label: "Sự kiện", icon: <Zap className="w-4 h-4" /> },
    { id: "effects", label: "Hiệu ứng", icon: <Wand2 className="w-4 h-4" /> },
    { id: "advanced", label: "Nâng cao", icon: <Settings className="w-4 h-4" /> },
  ];
  return (
    <div className="flex border-b border-slate-200 bg-white shrink-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[11px] font-medium transition border-b-2 ${
            activeTab === t.id ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600"
          }`}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function ImageUrlInput({ value, onApply }: { value: string; onApply: (url: string) => void }) {
  const [url, setUrl] = useState(value);
  useEffect(() => { setUrl(value); }, [value]);
  const apply = () => { const t = url.trim(); if (t) onApply(t); };
  return (
    <div className="space-y-2">
      <input type="text" placeholder="Nhập URL ảnh..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()}
        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
      <button type="button" onClick={apply} className="w-full py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700">Áp dụng ảnh</button>
    </div>
  );
}

function HtmlCodeEditorPanel({
  elementId,
  content,
  onUpdate,
  onPushHistory,
}: {
  elementId: number;
  content: string;
  onUpdate: (id: number, p: Partial<{ content: string }>) => void;
  onPushHistory: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  let hc: { subType?: string; code?: string; iframeSrc?: string } = {};
  try { hc = JSON.parse(content || "{}"); } catch {}
  const subType = hc.subType ?? "html-js";
  const updateHc = (next: Partial<typeof hc>) => {
    onUpdate(elementId, { content: JSON.stringify({ ...hc, ...next }) });
    onPushHistory();
  };
  return (
    <div className="border-t border-slate-100 pt-3 space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mã HTML</p>
      <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Loại</span>
        <select value={subType} onChange={(e) => updateHc({ subType: e.target.value })}
          className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
          <option value="html-js">HTML/JAVASCRIPT</option>
          <option value="iframe">IFRAME</option>
        </select></label>
      {subType === "iframe" ? (
        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">URL nhúng</span>
          <input type="url" value={hc.iframeSrc ?? ""} onChange={(e) => updateHc({ iframeSrc: e.target.value })} onBlur={onPushHistory}
            placeholder="https://..." className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
      ) : null}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#1e2d7d] hover:bg-[#162558] text-white text-[12px] font-semibold"
      >
        <Code2 className="w-4 h-4" />
        Sửa HTML
      </button>
      {showModal && (
        <HtmlCodeModal
          code={hc.code ?? ""}
          onSave={(code) => { updateHc({ code }); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function HtmlCodeModal({ code, onSave, onClose }: { code: string; onSave: (code: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(code);
  useEffect(() => { setValue(code); }, [code]);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[90vw] max-w-700 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Chỉnh sửa mã HTML/CSS/JS</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => onSave(value)} className="px-4 py-2 rounded-lg bg-[#1e2d7d] text-white text-sm font-medium hover:bg-[#162558]">
              Lưu
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-[60vh] px-3 py-2 text-[12px] font-mono rounded border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Nhập HTML, CSS, JavaScript... Ví dụ:&#10;&lt;div style='color:red'&gt;Xin chào&lt;/div&gt;&#10;&lt;script&gt;alert('Hello');&lt;/script&gt;"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

function FrameImageInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !IMAGE_TYPES.includes(file.type)) { setError("Chỉ JPG, PNG, GIF, WebP, SVG"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Tối đa 10MB"); return; }
    setUploading(true); setError("");
    try {
      const item = await mediaApi.upload(file);
      const url = item.url.startsWith("http") ? item.url : `${API_URL}${item.url}`;
      onChange(url);
    } catch { setError("Tải lên thất bại"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="space-y-1.5">
      {value?.trim() && (
        <div className="relative w-full h-28 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center text-xs leading-none hover:bg-black/70">×</button>
        </div>
      )}
      <input
        type="text" value={value} placeholder="https://..."
        onChange={e => onChange(e.target.value)}
        className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono"
      />
      <div>
        <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={handleUpload} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-semibold hover:border-indigo-400 transition disabled:opacity-60">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Đang tải lên..." : "Tải ảnh từ máy tính"}
        </button>
        {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
      </div>
    </div>
  );
}

function ImageSettings({
  elementId,
  imageUrl,
  onUpdate,
  onPushHistory,
  styles,
}: {
  elementId: number;
  imageUrl: string;
  onUpdate: (id: number, partial: { imageUrl?: string; content?: string; styles?: Record<string, string | number> }) => void;
  onPushHistory: () => void;
  styles: Record<string, string | number>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !IMAGE_TYPES.includes(file.type)) {
      setUploadError("Chỉ hỗ trợ JPG, PNG, GIF, WebP, SVG");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ảnh tối đa 10MB");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const item = await mediaApi.upload(file);
      const url = item.url.startsWith("http") ? item.url : `${API_URL}${item.url}`;
      onUpdate(elementId, { imageUrl: url });
      onPushHistory();
    } catch {
      setUploadError("Tải ảnh lên thất bại");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const upd = (patch: Record<string, string | number>) => onUpdate(elementId, { styles: { ...styles, ...patch } });

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thiết lập ảnh</p>

      {/* Nguồn ảnh */}
      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Link ảnh (URL)</span>
          <ImageUrlInput value={imageUrl} onApply={(url) => { onUpdate(elementId, { imageUrl: url }); onPushHistory(); }} />
        </label>
        <div>
          <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={handleUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold transition disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Đang tải lên..." : "+ Tải ảnh từ máy tính"}
          </button>
          {uploadError && <p className="text-[10px] text-red-500 mt-0.5">{uploadError}</p>}
        </div>
      </div>

      {/* Object-fit */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Cách hiển thị ảnh</span>
        <div className="grid grid-cols-3 gap-1">
          {([
            { v: "cover",      l: "Lấp đầy" },
            { v: "contain",    l: "Vừa khung" },
            { v: "fill",       l: "Kéo dãn" },
          ] as const).map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => { upd({ objectFit: v }); onPushHistory(); }}
              className={`py-1.5 text-[10px] rounded border transition-colors font-medium ${(styles?.objectFit ?? "cover") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Object-position */}
      <div>
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Vị trí ảnh</span>
        <div className="grid grid-cols-3 gap-1">
          {([
            { v: "top left",    l: "Trên trái" },
            { v: "top",         l: "Trên giữa" },
            { v: "top right",   l: "Trên phải" },
            { v: "left",        l: "Trái" },
            { v: "center",      l: "Giữa" },
            { v: "right",       l: "Phải" },
            { v: "bottom left", l: "Dưới trái" },
            { v: "bottom",      l: "Dưới giữa" },
            { v: "bottom right",l: "Dưới phải" },
          ] as const).map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => { upd({ objectPosition: v }); onPushHistory(); }}
              className={`py-1 text-[9px] rounded border transition-colors ${(styles?.objectPosition ?? "center") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Bo góc nhanh + bo góc tùy chỉnh */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Bo góc</span>
        <div className="flex gap-1 mb-2">
          {[{ r: 0, l: "Vuông" }, { r: 8, l: "Nhỏ" }, { r: 16, l: "Vừa" }, { r: 999, l: "Tròn" }].map(({ r, l }) => (
            <button key={r} type="button"
              onClick={() => { upd({ borderRadius: r }); onPushHistory(); }}
              className={`flex-1 py-1 text-[10px] rounded border transition-colors ${(styles?.borderRadius as number) === r ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >{l}</button>
          ))}
        </div>
        <input type="number" min={0} max={999} placeholder="Tùy chỉnh (px)"
          value={(styles?.borderRadius as number) ?? 0}
          onChange={(e) => upd({ borderRadius: Number(e.target.value) })} onBlur={onPushHistory}
          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white" />
      </div>

      {/* Viền */}
      <div>
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Viền</span>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="text-[10px] text-slate-400 block mb-0.5">Độ dày (px)</span>
            <input type="number" min={0}
              value={(styles?.borderWidth as number) ?? 0}
              onChange={(e) => upd({ borderWidth: Number(e.target.value) })} onBlur={onPushHistory}
              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
          <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu viền</span>
            <div className="flex gap-1">
              <input type="color" value={(styles?.borderColor as string) ?? "#e2e8f0"}
                onChange={(e) => upd({ borderColor: e.target.value })} onBlur={onPushHistory}
                className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
              <input type="text" value={(styles?.borderColor as string) ?? ""}
                onChange={(e) => upd({ borderColor: e.target.value })} onBlur={onPushHistory}
                placeholder="#e2e8f0" className="flex-1 px-1 py-1 text-[10px] rounded border border-slate-200 font-mono" />
            </div></label>
        </div>
      </div>

      {/* Bộ lọc màu sắc */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-2">Bộ lọc ảnh</span>
        {([
          { key: "filterBrightness", label: "Độ sáng",   min: 0,   max: 200, def: 100, unit: "%" },
          { key: "filterContrast",   label: "Độ tương phản", min: 0, max: 200, def: 100, unit: "%" },
          { key: "filterSaturate",   label: "Độ bão hòa", min: 0,  max: 200, def: 100, unit: "%" },
          { key: "filterBlur",       label: "Làm mờ",    min: 0,   max: 20,  def: 0,   unit: "px" },
        ] as const).map(({ key, label, min, max, def, unit }) => (
          <div key={key} className="mb-2">
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px] text-slate-400">{label}</span>
              <span className="text-[10px] text-slate-500 font-mono">{(styles?.[key] as number) ?? def}{unit}</span>
            </div>
            <input type="range" min={min} max={max}
              value={(styles?.[key] as number) ?? def}
              onChange={(e) => upd({ [key]: Number(e.target.value) })}
              onMouseUp={onPushHistory}
              className="w-full h-1.5 accent-indigo-600" />
          </div>
        ))}
        {/* Grayscale toggle */}
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input type="checkbox"
            checked={!!(styles?.filterGrayscale)}
            onChange={(e) => { upd({ filterGrayscale: e.target.checked ? 1 : 0 }); onPushHistory(); }}
            className="w-3.5 h-3.5 accent-indigo-600" />
          <span className="text-[11px] text-slate-600">Ảnh đen trắng (grayscale)</span>
        </label>
        {/* Lật ảnh */}
        <div className="flex gap-2 mt-2">
          <button type="button"
            onClick={() => { upd({ flipX: (styles?.flipX as number) === 1 ? 0 : 1 }); onPushHistory(); }}
            className={`flex-1 py-1.5 text-[10px] rounded border transition-colors font-medium ${styles?.flipX ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >↔ Lật ngang</button>
          <button type="button"
            onClick={() => { upd({ flipY: (styles?.flipY as number) === 1 ? 0 : 1 }); onPushHistory(); }}
            className={`flex-1 py-1.5 text-[10px] rounded border transition-colors font-medium ${styles?.flipY ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >↕ Lật dọc</button>
        </div>
      </div>

      {/* Overlay màu */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Lớp phủ màu (overlay)</span>
        <div className="flex gap-2 items-center mb-2">
          <input type="color"
            value={(styles?.overlayColor as string) ?? "#000000"}
            onChange={(e) => upd({ overlayColor: e.target.value })} onBlur={onPushHistory}
            className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
          <input type="text"
            value={(styles?.overlayColor as string) ?? ""}
            onChange={(e) => upd({ overlayColor: e.target.value })} onBlur={onPushHistory}
            placeholder="#000000 hoặc transparent"
            className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="text-[10px] text-slate-400">Độ mờ overlay</span>
            <span className="text-[10px] text-slate-500 font-mono">{Math.round(Number(styles?.overlayOpacity ?? 0) * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01}
            value={(styles?.overlayOpacity as number) ?? 0}
            onChange={(e) => upd({ overlayOpacity: Number(e.target.value) })}
            onMouseUp={onPushHistory}
            className="w-full h-1.5 accent-indigo-600" />
        </div>
      </div>

      {/* Đổ bóng */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đổ bóng (box-shadow)</span>
        <input type="text" placeholder="0 8px 24px rgba(0,0,0,0.15)"
          value={(styles?.boxShadow as string) ?? ""}
          onChange={(e) => upd({ boxShadow: e.target.value })} onBlur={onPushHistory}
          className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white font-mono" />
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
      <input type="text" placeholder="Nhập URL video (YouTube embed)..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()}
        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
      <button type="button" onClick={apply} className="w-full py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700">Áp dụng video</button>
    </div>
  );
}

function VideoSettings({
  elementId,
  videoUrl,
  onUpdate,
  onPushHistory,
  styles,
  onOpenMedia,
  workspaceId,
}: {
  elementId: number;
  videoUrl: string;
  onUpdate: (id: number, partial: { videoUrl?: string; styles?: Record<string, string | number> }) => void;
  onPushHistory: () => void;
  styles: Record<string, string | number>;
  onOpenMedia?: () => void;
  workspaceId?: number | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) {
      setUploadErr("Chỉ hỗ trợ MP4, WebM, OGG. Vui lòng chọn file video hợp lệ.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadErr(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.`);
      return;
    }
    setUploadErr(null);
    setUploading(true);
    try {
      const item = await mediaApi.upload(file, workspaceId ?? undefined);
      onUpdate(elementId, { videoUrl: item.url });
      onPushHistory();
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Tải lên thất bại. Thử lại.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toBool = (v: string | number | undefined) => v !== 0 && v !== "0" && v !== undefined && v !== "";
  const controls = toBool(styles?.videoControls as string | number) ?? true;
  const autoplay = toBool(styles?.videoAutoplay as string | number) ?? false;
  const loop = toBool(styles?.videoLoop as string | number) ?? false;
  const muted = toBool(styles?.videoMuted as string | number) ?? false;
  const poster = (styles?.videoPoster as string) ?? "";

  const isYoutube = videoUrl.includes("youtube") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo");
  const isEmbed = isYoutube || isVimeo;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">🎬 Video</p>

      {/* Current video preview thumbnail */}
      {videoUrl && !isEmbed && (
        <div className="w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200" style={{ aspectRatio: "16/9" }}>
          {/* biome-ignore lint/a11y/useMediaCaption: editor preview */}
          <video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted preload="metadata" />
        </div>
      )}
      {videoUrl && isEmbed && (
        <div className="w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 px-3 py-2">
          <span className="text-[18px]">{isYoutube ? "▶️" : "🎬"}</span>
          <div>
            <p className="text-[10px] font-semibold text-slate-700">{isYoutube ? "YouTube" : "Vimeo"} đã nhúng</p>
            <p className="text-[9px] text-slate-400 truncate max-w-[160px]">{videoUrl}</p>
          </div>
        </div>
      )}

      {/* URL input */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nhập URL</p>
        <VideoUrlInput value={videoUrl} onApply={(url) => { onUpdate(elementId, { videoUrl: url }); onPushHistory(); }} />
        <p className="text-[9px] text-slate-400">Hỗ trợ: YouTube, Vimeo, URL file MP4/WebM trực tiếp</p>
      </div>

      {/* Upload from device */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tải lên từ máy tính</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={handleVideoUpload}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => { setUploadErr(null); fileInputRef.current?.click(); }}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white text-indigo-700 text-[11px] font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Đang tải lên...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Chọn file video (MP4, WebM)
            </>
          )}
        </button>
        <p className="text-[9px] text-slate-400 text-center">Tối đa 10MB — MP4 hoặc WebM</p>
        {uploadErr && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[10px] text-red-700 font-medium">
            ✗ {uploadErr}
          </div>
        )}
      </div>

      {/* Open media library */}
      {onOpenMedia && (
        <button
          type="button"
          onClick={onOpenMedia}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white text-slate-600 text-[11px] font-medium transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Thư viện Media
        </button>
      )}

      {/* Poster URL */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Ảnh bìa (Poster)</p>
        <input type="text" placeholder="URL ảnh bìa (tùy chọn)" value={poster}
          onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoPoster: e.target.value } }); onPushHistory(); }}
          className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300" />
      </div>

      {/* Playback settings — only for native video (not iframe) */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tùy chọn phát ({isEmbed ? "N/A cho embed" : "file MP4"})</p>
        {[
          { label: "Hiện control", key: "videoControls" as const, val: controls },
          { label: "Tự động chạy", key: "videoAutoplay" as const, val: autoplay },
          { label: "Lặp lại", key: "videoLoop" as const, val: loop },
          { label: "Tắt tiếng", key: "videoMuted" as const, val: muted },
        ].map(({ label, key, val }) => (
          <label key={key} className={`flex items-center justify-between ${isEmbed ? "opacity-40 pointer-events-none" : ""}`}>
            <span className="text-[10px] text-slate-600">{label}</span>
            <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${val ? "bg-indigo-600" : "bg-slate-200"}`}
              onClick={() => { onUpdate(elementId, { styles: { ...styles, [key]: val ? 0 : 1 } }); onPushHistory(); }}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${val ? "left-4" : "left-0.5"}`} />
            </div>
          </label>
        ))}
        {isEmbed && <p className="text-[9px] text-slate-400">Các tùy chọn này không áp dụng cho YouTube/Vimeo embed.</p>}
      </div>
    </div>
  );
}

function EventsTab({ el, onUpdate, onPushHistory }: { el: EditorElement, onUpdate: (id: number, partial: any) => void, onPushHistory: () => void }) {
  const sections = useEditorStore((s) => s.sections);
  const standalonePopups = useEditorStore((s) => s.popups);
  const popupTargets = useMemo(
    () => [
      // Popup độc lập (popup editor riêng)
      ...standalonePopups.map((p) => ({ id: p.id, label: p.name })),
      // Popup cũ dạng element trong section
      ...sections.flatMap((sec) =>
        (sec.elements ?? [])
          .filter((e) => e.type === "popup" && e.id !== el.id)
          .map((e) => {
            const p = parsePopupContent(e.content ?? undefined);
            return { id: String(e.id), label: p.title?.trim() || `Popup #${e.id}` };
          }),
      ),
    ],
    [sections, standalonePopups, el.id],
  );
  const actionType = (el.styles?.actionType as string) ?? "none";
  const actionTarget = (el.styles?.actionTarget as string) ?? "";
  const actionOpenNewTab = (el.styles?.actionOpenNewTab as string) === "true";

  const updateAction = (type: string) => {
    onUpdate(el.id, { styles: { ...el.styles, actionType: type, actionTarget: "" } });
    onPushHistory();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Loại sự kiện (Nhấp chuột)</span>
          <select value={actionType} onChange={(e) => updateAction(e.target.value)}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
            <option value="none">Không có sự kiện</option>
            <option value="link">Mở liên kết</option>
            <option value="section">Chuyển hướng Section</option>
            <option value="popup">Mở Popup</option>
            <option value="phone">Gọi điện thoại</option>
            <option value="email">Gửi Email</option>
            <option value="javascript">Mã JavaScript</option>
          </select>
        </label>
      </div>

      {actionType === "link" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Đường dẫn đích (URL)</span>
            <input type="text" placeholder="https://..." value={actionTarget}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={actionOpenNewTab}
              onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, actionOpenNewTab: e.target.checked ? "true" : "false" } }); onPushHistory(); }}
              className="rounded border-slate-300 text-indigo-600" />
            <span className="text-[11px] text-slate-600">Mở cửa sổ mới (New window)</span>
          </label>
        </div>
      )}

      {actionType === "section" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Chọn Section đích</span>
            <select value={actionTarget}
              onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } }); onPushHistory(); }}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
              <option value="">-- Chọn Section --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id.toString()}>{s.name || `Section ${s.order}`}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {actionType === "popup" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Chọn Popup</span>
            <select value={actionTarget}
              onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } }); onPushHistory(); }}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
              <option value="">-- Chọn --</option>
              <option value="close">Đóng mọi popup đang mở</option>
              {popupTargets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          {popupTargets.length === 0 && el.type !== "popup" && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">Chưa có popup nào. Tạo popup từ tab Popup bên trái.</p>
          )}
        </div>
      )}

      {actionType === "phone" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Số điện thoại</span>
            <input type="text" placeholder="09xxxx..." value={actionTarget}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
          </label>
        </div>
      )}

      {actionType === "email" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Địa chỉ Email</span>
            <input type="email" placeholder="example@email.com" value={actionTarget}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
          </label>
        </div>
      )}

      {actionType === "javascript" && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Mã JavaScript (Bỏ thẻ {"<script>"})</span>
            <textarea placeholder="console.log('clicked!');" value={actionTarget}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono min-h-[80px]" />
          </label>
        </div>
      )}
    </div>
  );
}

function EffectsTab({ el, onUpdate, onPushHistory }: { el: EditorElement, onUpdate: (id: number, partial: any) => void, onPushHistory: () => void }) {
  const animName = (el.styles?.animationName as string) ?? "none";
  const animDuration = (el.styles?.animationDuration as number) ?? 1;
  const animDelay = (el.styles?.animationDelay as number) ?? 0;
  const animLoop = (el.styles?.animationIterationCount as string) === "infinite";
  const hoverAnim = (el.styles?.hoverAnimation as string) ?? "none";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Hiệu ứng xuất hiện</span>
          <select value={animName}
            onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, animationName: e.target.value } }); onPushHistory(); }}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
            <option value="none">Không có hiệu ứng</option>
            <optgroup label="Hiện ra (Fade)">
              <option value="fadeIn">Mờ dần vào (Fade In)</option>
              <option value="fadeInUp">Trượt lên (Fade In Up)</option>
              <option value="fadeInDown">Trượt xuống (Fade In Down)</option>
              <option value="fadeInLeft">Trượt phải (Fade In Left)</option>
              <option value="fadeInRight">Trượt trái (Fade In Right)</option>
            </optgroup>
            <optgroup label="Nảy (Bounce)">
              <option value="bounceIn">Nảy vào (Bounce In)</option>
              <option value="bounceInUp">Nảy lên (Bounce In Up)</option>
              <option value="bounceInDown">Nảy xuống (Bounce In Down)</option>
            </optgroup>
            <optgroup label="Thu/Phóng (Zoom)">
              <option value="zoomIn">Phóng to (Zoom In)</option>
              <option value="zoomOut">Thu nhỏ (Zoom Out)</option>
            </optgroup>
            <optgroup label="Trượt (Slide)">
              <option value="slideInUp">Trượt lên (Slide In Up)</option>
              <option value="slideInDown">Trượt xuống (Slide In Down)</option>
            </optgroup>
            <optgroup label="Khác">
              <option value="flipInX">Lật dọc (Flip In X)</option>
              <option value="flipInY">Lật ngang (Flip In Y)</option>
              <option value="pulse">Mạch đập (Pulse)</option>
              <option value="flash">Nhấp nháy (Flash)</option>
              <option value="tada">Ta-da</option>
            </optgroup>
          </select>
        </label>
      </div>

      {animName !== "none" && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Thời gian (giây)</span>
            <input type="number" step={0.1} min={0} value={animDuration}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, animationDuration: Number(e.target.value) } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
          </label>
          <label className="block">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Độ trễ (giây)</span>
            <input type="number" step={0.1} min={0} value={animDelay}
              onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, animationDelay: Number(e.target.value) } })}
              onBlur={onPushHistory}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
          </label>
          <label className="flex items-center gap-2 col-span-2 mt-1">
            <input type="checkbox" checked={animLoop}
              onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, animationIterationCount: e.target.checked ? "infinite" : "1" } }); onPushHistory(); }}
              className="rounded border-slate-300 text-indigo-600" />
            <span className="text-[11px] text-slate-600 font-medium">Lặp lại liên tục (Loop)</span>
          </label>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Hiệu ứng di chuột (Hover)</span>
          <select value={hoverAnim}
            onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, hoverAnimation: e.target.value } }); onPushHistory(); }}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
            <option value="none">Không có</option>
            <option value="hoverScaleUp">Phóng to (Scale Up)</option>
            <option value="hoverScaleDown">Thu nhỏ (Scale Down)</option>
            <option value="hoverShadow">Đổ bóng (Shadow)</option>
            <option value="hoverShake">Lắc (Shake)</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function AdvancedTab({ el, onUpdate, onPushHistory }: { el: EditorElement, onUpdate: (id: number, partial: any) => void, onPushHistory: () => void }) {
  const hideOnDesktop = (el.styles?.hideOnDesktop as string) === "true";
  const hideOnMobile = (el.styles?.hideOnMobile as string) === "true";
  const customId = (el.styles?.customId as string) ?? "";
  const customClass = (el.styles?.customClass as string) ?? "";
  const trackingGa = (el.styles?.trackingGoogleAds as string) ?? "";
  const trackingFb = (el.styles?.trackingFacebook as string) ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tuỳ chỉnh thiết bị (Responsive)</p>
        <label className="flex items-center justify-between">
          <span className="text-[11px] text-slate-700 font-medium">Ẩn trên máy tính (Desktop)</span>
          <input type="checkbox" checked={hideOnDesktop}
            onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, hideOnDesktop: e.target.checked ? "true" : "false" } }); onPushHistory(); }}
            className="rounded border-slate-300 text-indigo-600" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-[11px] text-slate-700 font-medium">Ẩn trên điện thoại (Mobile)</span>
          <input type="checkbox" checked={hideOnMobile}
            onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, hideOnMobile: e.target.checked ? "true" : "false" } }); onPushHistory(); }}
            className="rounded border-slate-300 text-indigo-600" />
        </label>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CSS Class & ID</p>
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">ID phần tử (Tùy chọn)</span>
          <input type="text" placeholder="vidu-id" value={customId}
            onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, customId: e.target.value } })}
            onBlur={onPushHistory}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">CSS Class (Tùy chọn)</span>
          <input type="text" placeholder="my-custom-class" value={customClass}
            onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, customClass: e.target.value } })}
            onBlur={onPushHistory}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
        </label>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sự kiện chuyển đổi (Tracking)</p>
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Google Ads / Analytics</span>
          <input type="text" placeholder="AW-123456789/AbCd-EfG..." value={trackingGa}
            onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, trackingGoogleAds: e.target.value } })}
            onBlur={onPushHistory}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Facebook Pixel Event</span>
          <input type="text" placeholder="AddToCart" value={trackingFb}
            onChange={(e) => onUpdate(el.id, { styles: { ...el.styles, trackingFacebook: e.target.value } })}
            onBlur={onPushHistory}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
        </label>
      </div>
    </div>
  );
}


interface PropertyPanelLadiProps {
  onClose: () => void;
  dragHandleClassName?: string;
  onRequestAddImage?: (elementId: number, itemIndex?: number, field?: "avatar" | "image") => void;
  onRequestChangeIcon?: (elementId: number) => void;
  onOpenMedia?: () => void;
  onScrollToElement?: () => void;
  onToast?: (message: string, type?: "success" | "info" | "error") => void;
}

export function PropertyPanelLadi({ onClose, dragHandleClassName, onRequestAddImage, onRequestChangeIcon, onOpenMedia, onScrollToElement, onToast }: PropertyPanelLadiProps) {
  const {
    selected, getSelectedElement, getSelectedSection,
    updateElement, updateSection, removeElement, duplicateElement,
    removeSection, duplicateSection, moveSectionUp, moveSectionDown,
    moveSectionToIndex, addSection,
    metaTitle, metaDescription, updatePageMeta, pushHistory,
    moveElementLayer,
    ungroupElement,
    workspaceId,
  } = useEditorStore();
  const sections = useEditorStore((s) => s.sections);
  const standalonePopups = useEditorStore((s) => s.popups);
  const carouselPopupTargets = useMemo(
    () => [
      ...standalonePopups.map((p) => ({ id: p.id, label: p.name })),
      ...sections.flatMap((sec) =>
        (sec.elements ?? [])
          .filter((e) => e.type === "popup")
          .map((e) => {
            const p = parsePopupContent(e.content ?? undefined);
            return { id: String(e.id), label: p.title?.trim() || `Popup #${e.id}` };
          }),
      ),
    ],
    [sections, standalonePopups],
  );

  const [activeTab, setActiveTab] = useState<PropPanelTab>("design");
  const el = getSelectedElement();
  const sec = getSelectedSection();

  // ─── SMTP modal state ─────────────────────────────────────────────────────
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpOwnerEmail, setSmtpOwnerEmail] = useState<string>("");
  const [smtpSettings, setSmtpSettings] = useState<import("@/lib/shared/api").SmtpSettings>({
    enabled: false, host: "smtp.gmail.com", port: 587,
    username: "", password: "", fromEmail: "", fromName: "", useSsl: true,
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [smtpLoaded, setSmtpLoaded] = useState(false);

  const loadSmtpSettings = async () => {
    if (!workspaceId || smtpLoaded) return;
    setSmtpLoading(true);
    try {
      const res = await settingsApi.getSmtp(workspaceId);
      setSmtpOwnerEmail(res.ownerEmail ?? "");
      setSmtpSettings({ ...res.smtp, password: res.smtp.password ? "••••••••" : "" });
      setSmtpLoaded(true);
    } catch { /* silent */ }
    finally { setSmtpLoading(false); }
  };

  // ─── SMTP Configuration Modal (declared before early returns) ──────────────
  const SmtpModal = showSmtpModal ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setShowSmtpModal(false); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">⚙ Cấu hình SMTP</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Email thông báo form sẽ được gửi qua máy chủ này</p>
          </div>
          <button type="button" onClick={() => setShowSmtpModal(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">×</button>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {smtpLoading ? (
            <div className="text-center py-6 text-slate-400 text-sm">Đang tải...</div>
          ) : (<>
            {/* Owner email info */}
            {smtpOwnerEmail && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide mb-1">📬 Email nhận thông báo</p>
                <p className="text-sm font-semibold text-indigo-700">{smtpOwnerEmail}</p>
                <p className="text-[10px] text-indigo-400 mt-1">Email tài khoản đăng nhập — tự động nhận thông báo khi có form mới.</p>
              </div>
            )}

            {/* Toggle SMTP */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-700">Bật SMTP tùy chỉnh</span>
                <p className="text-[10px] text-slate-400">Gửi email qua máy chủ riêng (Gmail, Outlook...)</p>
              </div>
              <div className={`relative w-10 h-5 rounded-full cursor-pointer transition ${smtpSettings.enabled ? "bg-indigo-600" : "bg-slate-200"}`}
                onClick={() => setSmtpSettings(s => ({ ...s, enabled: !s.enabled }))}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${smtpSettings.enabled ? "left-5" : "left-0.5"}`} />
              </div>
            </div>

            {smtpSettings.enabled && (<>
              {/* Quick presets */}
              <div>
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium">Cài nhanh</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Gmail", host: "smtp.gmail.com", port: 587 },
                    { label: "Outlook", host: "smtp.office365.com", port: 587 },
                    { label: "Yahoo", host: "smtp.mail.yahoo.com", port: 587 },
                    { label: "Mailgun", host: "smtp.mailgun.org", port: 587 },
                    { label: "SendGrid", host: "smtp.sendgrid.net", port: 587 },
                  ].map(p => (
                    <button key={p.label} type="button"
                      onClick={() => setSmtpSettings(s => ({ ...s, host: p.host, port: p.port, useSsl: true }))}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition font-medium ${smtpSettings.host === p.host ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gmail App Password warning */}
              {smtpSettings.host === "smtp.gmail.com" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-700">⚠ Gmail yêu cầu App Password</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    Gmail <strong>không cho phép</strong> dùng mật khẩu thông thường. Bạn cần tạo <strong>App Password</strong>:
                  </p>
                  <ol className="text-[10px] text-amber-700 space-y-0.5 list-decimal list-inside">
                    <li>Vào <strong>myaccount.google.com</strong> → Bảo mật</li>
                    <li>Bật <strong>Xác minh 2 bước</strong> (nếu chưa bật)</li>
                    <li>Tìm <strong>"Mật khẩu ứng dụng"</strong> → Tạo mới</li>
                    <li>Chọn ứng dụng: <em>Thư</em> → Thiết bị: <em>Khác</em></li>
                    <li>Copy mật khẩu 16 ký tự và dán vào ô <strong>Mật khẩu</strong> bên dưới</li>
                  </ol>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:underline mt-1">
                    → Tạo App Password ngay
                  </a>
                </div>
              )}

              {/* Outlook instructions */}
              {smtpSettings.host === "smtp.office365.com" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-blue-700">ℹ Outlook / Microsoft 365</p>
                  <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
                    Dùng email và mật khẩu tài khoản Microsoft. Nếu bật 2FA, cần tạo App Password tại <strong>account.microsoft.com</strong>.
                  </p>
                </div>
              )}

              {/* Form fields */}
              {[
                { label: "SMTP Host", key: "host" as const, type: "text", placeholder: "smtp.gmail.com" },
                { label: "Port", key: "port" as const, type: "number", placeholder: "587" },
                { label: "Tài khoản email (Username)", key: "username" as const, type: "email", placeholder: "you@gmail.com" },
                { label: "Mật khẩu ứng dụng (App Password)", key: "password" as const, type: "password", placeholder: smtpSettings.host === "smtp.gmail.com" ? "16 ký tự từ App Password" : "Mật khẩu" },
                { label: "Email gửi đi (From Email)", key: "fromEmail" as const, type: "email", placeholder: "you@gmail.com" },
                { label: "Tên hiển thị (From Name)", key: "fromName" as const, type: "text", placeholder: "Tên công ty / thương hiệu" },
              ].map(f => (
                <label key={f.key}>
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">{f.label}</span>
                  <input type={f.type} placeholder={f.placeholder}
                    value={String(smtpSettings[f.key] ?? "")}
                    onChange={(e) => setSmtpSettings(s => ({ ...s, [f.key]: f.type === "number" ? Number(e.target.value) || 587 : e.target.value }))}
                    className="w-full px-3 py-2 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </label>
              ))}

              <div className="flex items-center gap-2">
                <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${smtpSettings.useSsl ? "bg-indigo-600" : "bg-slate-200"}`}
                  onClick={() => setSmtpSettings(s => ({ ...s, useSsl: !s.useSsl }))}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${smtpSettings.useSsl ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-[10px] text-slate-600 font-medium">Dùng SSL/TLS (khuyến nghị)</span>
              </div>
            </>)}

            {/* Result message */}
            {smtpMsg && (
              <div className={`rounded-xl p-3 text-[11px] font-medium space-y-1 ${smtpMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                <p className="font-bold">{smtpMsg.ok ? "✓ Thành công" : "✗ Gửi thất bại"}</p>
                <p className="leading-relaxed">{smtpMsg.text}</p>
                {!smtpMsg.ok && smtpSettings.host === "smtp.gmail.com" && (
                  <p className="text-[10px] text-red-600 border-t border-red-200 pt-1 mt-1">
                    💡 Gợi ý: Kiểm tra bạn đã dùng <strong>App Password</strong> (16 ký tự) thay vì mật khẩu Gmail thông thường.
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="ml-1 underline font-bold">Tạo App Password</a>
                  </p>
                )}
              </div>
            )}
          </>)}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          {smtpSettings.enabled && (
            <button type="button" disabled={smtpTesting}
              onClick={async () => {
                if (!workspaceId) return;
                setSmtpTesting(true); setSmtpMsg(null);
                try {
                  const r = await settingsApi.testSmtp(workspaceId, smtpSettings);
                  if (r.ok) {
                    setSmtpMsg({ ok: true, text: `Đã gửi email test tới ${r.sentTo}. Kiểm tra hộp thư!` });
                  } else {
                    const errText = r.error ?? "Lỗi không xác định";
                    const isAuthErr = errText.toLowerCase().includes("authentication") || errText.includes("5.7.0") || errText.includes("535");
                    setSmtpMsg({ ok: false, text: isAuthErr ? "Xác thực thất bại — Gmail yêu cầu App Password, không dùng mật khẩu thông thường." : errText });
                  }
                } catch (e: unknown) {
                  setSmtpMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi kết nối tới server" });
                } finally { setSmtpTesting(false); }
              }}
              className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
              {smtpTesting ? "⏳ Đang gửi test..." : "📤 Gửi email test"}
            </button>
          )}
          <button type="button" disabled={smtpSaving}
            onClick={async () => {
              if (!workspaceId) return;
              setSmtpSaving(true); setSmtpMsg(null);
              try {
                await settingsApi.updateSmtp(workspaceId, smtpSettings);
                setSmtpMsg({ ok: true, text: "Đã lưu cài đặt SMTP thành công!" });
                setTimeout(() => setShowSmtpModal(false), 1200);
              } catch (e: unknown) {
                setSmtpMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi lưu cài đặt" });
              } finally { setSmtpSaving(false); }
            }}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {smtpSaving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  /** Helper: render danh sách preset từ DB cho một elementType */
  // Section background panel state
  const [showSectionBgPicker, setShowSectionBgPicker] = useState(false);
  const [sectionBgTab, setSectionBgTab] = useState<"color" | "image">("color");
  const [sectionBgUploading, setSectionBgUploading] = useState(false);
  const [sectionBgError, setSectionBgError] = useState("");
  const sectionBgFileRef = useRef<HTMLInputElement>(null);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);
  const [workspaceForms, setWorkspaceForms] = useState<{ id: number; name: string; fieldsJson: string }[]>([]);
  useEffect(() => {
    if (!el || el.type !== "form" || workspaceId == null) {
      setWorkspaceForms([]);
      return;
    }
    let cancelled = false;
    formsApi
      .list(workspaceId)
      .then((list) => {
        if (!cancelled) setWorkspaceForms(list);
      })
      .catch(() => {
        if (!cancelled) setWorkspaceForms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [el?.type, el?.id, workspaceId]);

  useEffect(() => {
    if (!el || el.type !== "cart" || workspaceId == null) {
      return;
    }
    let cancelled = false;
    productsApi
      .list(workspaceId)
      .then((list) => {
        if (!cancelled) setCatalogProducts(list);
      })
      .catch(() => {
        if (!cancelled) setCatalogProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [el?.id, el?.type, workspaceId]);

  const getPanelTitle = () => {
    if (selected.type === "element" && el) {
      if (el.type === "group") return "NHÓM";
      if (el.type === "frame") return "KHUNG";
      return el.type.toUpperCase();
    }
    if (selected.type === "section" && sec) return (sec.name ?? `Section ${sec.order}`).toUpperCase();
    return "Trang";
  };

  if (selected.type === "element" && el) {
    const isTextType = ["text", "headline", "paragraph", "button", "form"].includes(el.type);
    return (
      <div className="flex flex-col h-full bg-white">
        {SmtpModal}
        <PropertyPanelHeader title={getPanelTitle()} onClose={onClose} onRename={() => {}} dragHandleClassName={dragHandleClassName} />
        <PropertyPanelTabs activeTab={activeTab} onTab={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {activeTab === "design" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{el.type}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => duplicateElement(el.id)} className="p-1.5 rounded hover:bg-slate-100" title="Nhân bản"><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
                  <button type="button" onClick={() => { removeElement(el.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vị trí & Kích thước</p>
                  {onScrollToElement && (
                    <button type="button" onClick={onScrollToElement} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 rounded" title="Đưa phần tử vào khung nhìn">
                      <Crosshair className="w-3 h-3" /> Hiển thị
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "x" as const, label: "X (px)", val: el.x ?? 0 },
                    { key: "y" as const, label: "Y (px)", val: el.y ?? 0 },
                    { key: "width" as const, label: "W (px)", val: el.width ?? 0 },
                    { key: "height" as const, label: "H (px)", val: el.height ?? 0 },
                  ].map(({ key, label, val }) => (
                    <label key={key} className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 w-10 font-bold shrink-0">{label}</span>
                      <input type="number" value={val}
                        onChange={(e) => updateElement(el.id, { [key]: Number(e.target.value) })}
                        onBlur={() => { pushHistory(); (key === "x" || key === "y") && setTimeout(() => onScrollToElement?.(), 100); }}
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" title={key === "x" || key === "y" ? "Thay đổi xong sẽ tự cuộn để hiển thị phần tử" : undefined} />
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
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thứ tự lớp</p>
                <div className="flex gap-1">
                  {([["front", <ChevronsUp key="f" className="w-3 h-3" />], ["forward", <MoveUp key="fw" className="w-3 h-3" />], ["backward", <MoveDown key="bw" className="w-3 h-3" />], ["back", <ChevronsDown key="b" className="w-3 h-3" />]] as const).map(([dir, icon]) => (
                    <button key={dir} type="button" onClick={() => { moveElementLayer(el.id, dir); pushHistory(); }}
                      className="flex-1 flex items-center justify-center py-1.5 rounded text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-500">{icon}</button>
                  ))}
                </div>
              </div>
              {el.type === "group" && (() => {
                let childCount = 0;
                try {
                  const parsed = JSON.parse(el.content || "{}") as { items?: unknown[] };
                  childCount = Array.isArray(parsed.items) ? parsed.items.length : 0;
                } catch {
                  childCount = 0;
                }
                const st = el.styles ?? {};
                // Parse border shorthand → width / style / color
                const borderRaw = (st.border as string) || "none";
                const bm = borderRaw !== "none" ? borderRaw.match(/^(\d+(?:\.\d+)?)px\s+(\S+)\s+(.+)$/) : null;
                const bWidth = bm ? Number(bm[1]) : 0;
                const bStyle = bm ? bm[2] : "solid";
                const bColor = bm ? bm[3].trim() : "#6366f1";
                const setBorder = (w: number, bs: string, bc: string) =>
                  updateElement(el.id, { styles: { ...st, border: w > 0 ? `${w}px ${bs} ${bc}` : "none" } });
                return (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhóm</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Gồm <span className="font-semibold text-slate-800">{childCount}</span> phần tử.
                    </p>
                    <button
                      type="button"
                      onClick={() => { ungroupElement(el.id); pushHistory(); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 text-[12px] font-semibold hover:bg-indigo-100"
                    >
                      <Layers className="w-4 h-4" />
                      Huỷ nhóm (tách phần tử)
                    </button>

                    {/* Background */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Nền</span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={typeof st.backgroundColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(st.backgroundColor) ? st.backgroundColor : "#ffffff"}
                          onChange={(e) => updateElement(el.id, { styles: { ...st, backgroundColor: e.target.value } })}
                          onBlur={() => pushHistory()}
                          className="h-8 w-10 rounded border border-slate-200 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={(st.backgroundColor as string) ?? "transparent"}
                          onChange={(e) => updateElement(el.id, { styles: { ...st, backgroundColor: e.target.value } })}
                          onBlur={() => pushHistory()}
                          className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white"
                          placeholder="transparent / #hex / rgba()"
                        />
                      </div>
                    </div>

                    {/* Border */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Viền</span>
                      <div className="grid grid-cols-3 gap-2">
                        <label>
                          <span className="text-[9px] text-slate-400 block mb-0.5">Dày (px)</span>
                          <input
                            type="number" min={0} max={20}
                            value={bWidth}
                            onChange={(e) => setBorder(Number(e.target.value), bStyle, bColor)}
                            onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                        <label>
                          <span className="text-[9px] text-slate-400 block mb-0.5">Kiểu</span>
                          <select
                            value={bStyle}
                            onChange={(e) => { setBorder(bWidth, e.target.value, bColor); pushHistory(); }}
                            className="w-full px-1 py-1 text-[11px] rounded border border-slate-200 bg-white"
                          >
                            <option value="solid">Liền</option>
                            <option value="dashed">Nét đứt</option>
                            <option value="dotted">Chấm</option>
                            <option value="double">Kép</option>
                          </select>
                        </label>
                        <label>
                          <span className="text-[9px] text-slate-400 block mb-0.5">Màu</span>
                          <input
                            type="color"
                            value={/^#[0-9a-fA-F]{3,8}$/.test(bColor) ? bColor : "#6366f1"}
                            onChange={(e) => setBorder(bWidth, bStyle, e.target.value)}
                            onBlur={() => pushHistory()}
                            className="h-8 w-full rounded border border-slate-200 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Border radius + Padding */}
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc (px)</span>
                        <input
                          type="number" min={0}
                          value={Number(st.borderRadius ?? 0)}
                          onChange={(e) => updateElement(el.id, { styles: { ...st, borderRadius: Number(e.target.value) } })}
                          onBlur={() => pushHistory()}
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white"
                        />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đệm trong (px)</span>
                        <input
                          type="number" min={0}
                          value={Number(st.padding ?? 0)}
                          onChange={(e) => updateElement(el.id, { styles: { ...st, padding: Number(e.target.value) } })}
                          onBlur={() => pushHistory()}
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white"
                        />
                      </label>
                    </div>

                    {/* Box shadow */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Đổ bóng (CSS)</span>
                      <input
                        type="text"
                        value={(st.boxShadow as string) || ""}
                        onChange={(e) => updateElement(el.id, { styles: { ...st, boxShadow: e.target.value || "" } })}
                        onBlur={() => pushHistory()}
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white font-mono"
                        placeholder="0 2px 8px rgba(0,0,0,0.15)"
                      />
                    </div>
                  </div>
                );
              })()}
              {["text", "headline", "paragraph", "button", "html", "list"].includes(el.type) && el.type !== "html-code" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nội dung</p>
                  {/* text/headline/paragraph dùng textarea để hỗ trợ đa dòng */}
                  {["text", "headline", "paragraph"].includes(el.type) ? (
                    <textarea
                      value={el.content ?? ""}
                      onChange={(e) => updateElement(el.id, { content: e.target.value })}
                      onBlur={() => pushHistory()}
                      rows={3}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[56px]"
                      placeholder="Nhập nội dung..."
                    />
                  ) : el.type === "html" || el.type === "list" ? (
                    <textarea value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white min-h-[60px] font-mono" />
                  ) : (
                    <input type="text" value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                  )}
                </div>
              )}
              {el.type !== "group" && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Liên kết</p>
                <input type="text" placeholder="https://..." value={el.href ?? ""} onChange={(e) => updateElement(el.id, { href: e.target.value })} onBlur={() => pushHistory()}
                  className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                {/* Mở trong tab mới */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={el.target === "_blank"}
                    onChange={(e) => { updateElement(el.id, { target: e.target.checked ? "_blank" : "_self" }); pushHistory(); }}
                    className="w-3.5 h-3.5 accent-indigo-600"
                  />
                  <span className="text-[11px] text-slate-600">Mở trong tab mới</span>
                </label>
              </div>
              )}
              {el.type === "image" && (
                <div className="border-t border-slate-100 pt-3">
                  <ImageSettings
                    elementId={el.id}
                    imageUrl={el.imageUrl ?? ""}
                    onUpdate={(id, p) => updateElement(id, p)}
                    onPushHistory={pushHistory}
                    styles={el.styles ?? {}}
                  />
                </div>
              )}
              {el.type === "video" && (
                <div className="border-t border-slate-100 pt-3">
                  <VideoSettings
                    elementId={el.id}
                    videoUrl={el.videoUrl ?? ""}
                    onUpdate={updateElement}
                    onPushHistory={pushHistory}
                    styles={el.styles ?? {}}
                    onOpenMedia={onOpenMedia}
                    workspaceId={workspaceId}
                  />
                </div>
              )}
              {el.type === "html-code" && (
                <HtmlCodeEditorPanel
                  elementId={el.id}
                  content={el.content ?? ""}
                  onUpdate={(id, p) => updateElement(id, p)}
                  onPushHistory={pushHistory}
                />
              )}
              {el.type === "form" && (
                <div className="border-t border-slate-100 pt-3 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thiết lập Form</p>
                  {(() => {
                    type FormCfg = {
                      formType?: string;
                      title?: string;
                      titleColor?: string;
                      buttonText?: string;
                      buttonColor?: string;
                      buttonTextColor?: string;
                      backgroundColor?: string;
                      accentColor?: string;
                      formBorderRadius?: number;
                      inputRadius?: number;
                      formConfigId?: number;
                      redirectUrl?: string;
                      successMessage?: string;
                      fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string; required?: boolean }[];
                      inputStyle?: string;
                      formOtp?: boolean;
                      autoComplete?: boolean;
                      // Email notifications
                      emailNotifyEnabled?: boolean;
                      emailNotifyRecipient?: string;
                      sendConfirmationEmail?: boolean;
                    };
                    let cfg: FormCfg = {};
                    try { cfg = JSON.parse(el.content || "{}"); } catch {}
                    const fields = Array.isArray(cfg.fields) ? cfg.fields : [];

                    const updateForm = (next: Partial<FormCfg>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...cfg, ...next }) });
                      pushHistory();
                    };
                    const addField = (type = "text") => {
                      const id = `field_${Date.now()}`;
                      updateForm({ fields: [...fields, { id, name: id, label: type === "email" ? "Email" : type === "phone" ? "Số điện thoại" : type === "textarea" ? "Tin nhắn" : "Trường mới", placeholder: "Nhập...", type }] });
                    };
                    const removeField = (idx: number) => {
                      updateForm({ fields: fields.filter((_, i) => i !== idx) });
                    };
                    const updateField = (idx: number, key: string, val: string | boolean) => {
                      const next = [...fields];
                      (next[idx] as Record<string, string | boolean>)[key] = val;
                      updateForm({ fields: next });
                    };
                    const moveField = (idx: number, dir: -1 | 1) => {
                      const next = [...fields];
                      const target = idx + dir;
                      if (target < 0 || target >= next.length) return;
                      [next[idx], next[target]] = [next[target], next[idx]];
                      updateForm({ fields: next });
                    };
                    const syncFromWorkspace = () => {
                      const id = cfg.formConfigId;
                      if (id == null) { onToast?.("Chọn cấu hình form workspace trước.", "info"); return; }
                      const wf = workspaceForms.find((x) => x.id === id);
                      if (!wf) { onToast?.("Không tìm thấy cấu hình. Hãy tạo tại Cấu hình Form.", "error"); return; }
                      const defs = parseFieldsJson(wf.fieldsJson);
                      const mapped = defs.map((d: FormFieldDefinition) => ({
                        id: d.id,
                        name: d.name,
                        label: d.label,
                        placeholder: d.placeholder ?? "",
                        type: d.type,
                        ...(d.required !== undefined ? { required: d.required } : {}),
                        ...(d.options?.length ? { options: d.options } : {}),
                        ...(d.min !== undefined ? { min: d.min } : {}),
                        ...(d.max !== undefined ? { max: d.max } : {}),
                        ...(d.minLabel ? { minLabel: d.minLabel } : {}),
                        ...(d.maxLabel ? { maxLabel: d.maxLabel } : {}),
                        ...(d.maxRating !== undefined ? { maxRating: d.maxRating } : {}),
                        ...(d.description !== undefined ? { description: d.description } : {}),
                        ...(d.accept ? { accept: d.accept } : {}),
                        ...(d.maxSizeMb !== undefined ? { maxSizeMb: d.maxSizeMb } : {}),
                      }));
                      updateForm({ fields: mapped, formConfigId: id });
                      onToast?.("Đã đồng bộ trường từ cấu hình workspace.", "success");
                    };

                    const fieldTypeLabel: Record<string, string> = {
                      text: "Văn bản", email: "Email", phone: "SĐT", textarea: "Đoạn văn",
                      select: "Chọn", radio: "Radio", checkbox: "Checkbox", number: "Số", date: "Ngày",
                    };
                    const fieldTypeBadgeColor: Record<string, string> = {
                      text: "bg-blue-100 text-blue-700",
                      email: "bg-violet-100 text-violet-700",
                      phone: "bg-emerald-100 text-emerald-700",
                      textarea: "bg-orange-100 text-orange-700",
                      select: "bg-amber-100 text-amber-700",
                      radio: "bg-pink-100 text-pink-700",
                      checkbox: "bg-teal-100 text-teal-700",
                      number: "bg-cyan-100 text-cyan-700",
                      date: "bg-rose-100 text-rose-700",
                    };

                    return (
                      <div className="space-y-4">

                        {/* ── Workspace config ───────────────────────────── */}
                        {workspaceId != null && (
                          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2.5 space-y-2">
                            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Cấu hình Workspace</p>
                            <select
                              value={cfg.formConfigId != null ? String(cfg.formConfigId) : ""}
                              onChange={(e) => { const v = e.target.value; updateForm({ formConfigId: v ? Number(v) : undefined }); }}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-indigo-200 bg-white"
                            >
                              <option value="">— Chỉnh trực tiếp bên dưới —</option>
                              {workspaceForms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                              <button type="button" onClick={syncFromWorkspace}
                                className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                                Đồng bộ trường
                              </button>
                              <a href="/dashboard/forms" target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline flex items-center">
                                Mở cấu hình ↗
                              </a>
                            </div>
                          </div>
                        )}

                        {/* ── Loại form + cơ bản ────────────────────────── */}
                        <div className="space-y-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Loại form</span>
                            <select value={cfg.formType ?? "contact"} onChange={(e) => updateForm({ formType: e.target.value })}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                              <option value="contact">Liên hệ</option>
                              <option value="registration">Đăng ký</option>
                              <option value="login">Đăng nhập</option>
                              <option value="otp">OTP</option>
                              <option value="checkout">Checkout</option>
                            </select>
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kiểu ô nhập</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(["outlined", "filled", "underlined"] as const).map((v) => (
                                <button key={v} type="button"
                                  onClick={() => updateForm({ inputStyle: v })}
                                  className={`py-1.5 text-[10px] font-medium rounded border transition ${cfg.inputStyle === v || (!cfg.inputStyle && v === "outlined") ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                  {v === "outlined" ? "Viền" : v === "filled" ? "Nền" : "Gạch chân"}
                                </button>
                              ))}
                            </div>
                          </label>
                        </div>

                        {/* ── Giao diện form ────────────────────────────── */}
                        <div className="rounded-lg border border-slate-200 p-2.5 space-y-2.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Giao diện Form</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Màu nền form</span>
                              <div className="flex gap-1">
                                <input type="color" value={cfg.backgroundColor ?? "#ffffff"}
                                  onChange={(e) => updateForm({ backgroundColor: e.target.value })}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cfg.backgroundColor ?? "#ffffff"}
                                  onChange={(e) => updateForm({ backgroundColor: e.target.value })}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Màu nhấn (accent)</span>
                              <div className="flex gap-1">
                                <input type="color" value={cfg.accentColor ?? cfg.buttonColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ accentColor: e.target.value })}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cfg.accentColor ?? cfg.buttonColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ accentColor: e.target.value })}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Màu tiêu đề</span>
                              <div className="flex gap-1">
                                <input type="color" value={cfg.titleColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ titleColor: e.target.value })}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cfg.titleColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ titleColor: e.target.value })}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Bo góc form (px)</span>
                              <input type="number" min={0} max={40} value={cfg.formBorderRadius ?? 8}
                                onChange={(e) => updateForm({ formBorderRadius: Number(e.target.value) })}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                            </label>
                          </div>
                          <label>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Bo góc ô nhập (px)</span>
                            <input type="number" min={0} max={24} value={cfg.inputRadius ?? 4}
                              onChange={(e) => updateForm({ inputRadius: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề form</span>
                            <input type="text" value={cfg.title ?? ""} onChange={(e) => updateForm({ title: e.target.value })} onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Tiêu đề (để trống nếu không cần)" />
                          </label>
                        </div>

                        {/* ── Nút gửi ───────────────────────────────────── */}
                        <div className="rounded-lg border border-slate-200 p-2.5 space-y-2.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nút gửi</p>
                          <label>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Nội dung nút</span>
                            <input type="text" value={cfg.buttonText ?? "Gửi"} onChange={(e) => updateForm({ buttonText: e.target.value })} onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Màu nền nút</span>
                              <div className="flex gap-1">
                                <input type="color" value={cfg.buttonColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ buttonColor: e.target.value })}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cfg.buttonColor ?? "#1e293b"}
                                  onChange={(e) => updateForm({ buttonColor: e.target.value })}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Màu chữ nút</span>
                              <div className="flex gap-1">
                                <input type="color" value={cfg.buttonTextColor ?? "#ffffff"}
                                  onChange={(e) => updateForm({ buttonTextColor: e.target.value })}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cfg.buttonTextColor ?? "#ffffff"}
                                  onChange={(e) => updateForm({ buttonTextColor: e.target.value })}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                            </label>
                          </div>
                          {/* Preview nút */}
                          <div className="rounded overflow-hidden" style={{ borderRadius: cfg.inputRadius ?? 4, background: cfg.buttonColor ?? "#1e293b", color: cfg.buttonTextColor ?? "#ffffff", textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>
                            {cfg.buttonText || "Gửi"}
                          </div>
                          <label>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Chuyển hướng sau khi gửi</span>
                            <input type="url" value={cfg.redirectUrl ?? ""} onChange={(e) => updateForm({ redirectUrl: e.target.value || undefined })} onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="https://... (trang cảm ơn)" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Thông báo sau khi gửi</span>
                            <input type="text" value={cfg.successMessage ?? ""} onChange={(e) => updateForm({ successMessage: e.target.value || undefined })} onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Cảm ơn! Chúng tôi sẽ liên hệ sớm." />
                          </label>
                        </div>

                        {/* ── Thông báo Email ────────────────────────────── */}
                        <div className="rounded-lg border border-slate-200 p-2.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Gửi Email khi có form mới</p>
                            <button type="button"
                              onClick={() => { loadSmtpSettings(); setShowSmtpModal(true); }}
                              className="text-[9px] font-medium px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                              ⚙ Cấu hình SMTP
                            </button>
                          </div>

                          {/* Notify admin */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-600 font-medium block">Thông báo đến admin</span>
                                {smtpOwnerEmail && (
                                  <span className="text-[9px] text-indigo-500">→ {smtpOwnerEmail}</span>
                                )}
                              </div>
                              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                                <div className={`relative w-8 h-4 rounded-full transition ${cfg.emailNotifyEnabled ? "bg-indigo-600" : "bg-slate-200"}`}
                                  onClick={() => { updateForm({ emailNotifyEnabled: !cfg.emailNotifyEnabled }); if (!smtpLoaded) loadSmtpSettings(); }}>
                                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cfg.emailNotifyEnabled ? "left-4" : "left-0.5"}`} />
                                </div>
                                <span className="text-[10px] text-slate-500">{cfg.emailNotifyEnabled ? "Bật" : "Tắt"}</span>
                              </label>
                            </div>
                            {cfg.emailNotifyEnabled && (
                              <label>
                                <span className="text-[9px] text-slate-400 block mb-0.5">Email nhận khác (để trống = dùng email tài khoản)</span>
                                <input type="email" value={cfg.emailNotifyRecipient ?? ""}
                                  onChange={(e) => updateForm({ emailNotifyRecipient: e.target.value || undefined })}
                                  onBlur={() => pushHistory()}
                                  className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                                  placeholder={smtpOwnerEmail || "admin@domain.com"} />
                              </label>
                            )}
                          </div>

                          {/* Send confirmation to submitter */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-600 font-medium block">Gửi xác nhận cho người gửi</span>
                              <span className="text-[9px] text-slate-400">Gửi email tự động đến trường email trong form</span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                              <div className={`relative w-8 h-4 rounded-full transition ${cfg.sendConfirmationEmail ? "bg-emerald-500" : "bg-slate-200"}`}
                                onClick={() => updateForm({ sendConfirmationEmail: !cfg.sendConfirmationEmail })}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cfg.sendConfirmationEmail ? "left-4" : "left-0.5"}`} />
                              </div>
                            </label>
                          </div>

                          {/* SMTP status hint */}
                          {smtpLoaded ? (
                            smtpSettings.enabled && smtpSettings.username ? (
                              <div className="flex gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                                <span className="text-emerald-500 text-[12px] shrink-0">✓</span>
                                <p className="text-[10px] text-emerald-700">SMTP đã cấu hình: {smtpSettings.host}</p>
                              </div>
                            ) : (
                              <div className="flex gap-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 cursor-pointer hover:bg-amber-100 transition"
                                onClick={() => setShowSmtpModal(true)}>
                                <span className="text-amber-500 text-[12px] shrink-0">⚠</span>
                                <p className="text-[10px] text-amber-700">Chưa cấu hình SMTP. Nhấn <strong>Cấu hình SMTP</strong> để thiết lập.</p>
                              </div>
                            )
                          ) : (
                            <div className="flex gap-1.5 rounded-lg bg-slate-50 border border-slate-200 p-2 cursor-pointer hover:bg-slate-100 transition"
                              onClick={() => { loadSmtpSettings(); setShowSmtpModal(true); }}>
                              <span className="text-slate-400 text-[12px] shrink-0">⚙</span>
                              <p className="text-[10px] text-slate-500">Nhấn <strong>Cấu hình SMTP</strong> để thiết lập gửi email.</p>
                            </div>
                          )}
                        </div>

                        {/* ── Trường dữ liệu ────────────────────────────── */}
                        <div className="rounded-lg border border-slate-200 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trường dữ liệu ({fields.length})</p>
                          </div>

                          {/* Field list */}
                          <div className="space-y-1.5">
                            {fields.map((f, idx) => (
                              <div key={f.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  {/* Type badge */}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${fieldTypeBadgeColor[f.type ?? "text"] ?? "bg-slate-100 text-slate-600"}`}>
                                    {fieldTypeLabel[f.type ?? "text"] ?? f.type}
                                  </span>
                                  {/* Label input */}
                                  <input type="text" value={f.label ?? ""} onChange={(e) => updateField(idx, "label", e.target.value)} onBlur={() => pushHistory()}
                                    className="flex-1 min-w-0 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Nhãn" />
                                  {/* Move up/down */}
                                  <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 text-[10px]">▲</button>
                                  <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 text-[10px]">▼</button>
                                  {/* Delete */}
                                  <button type="button" onClick={() => removeField(idx)}
                                    className="p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 text-[11px] font-bold">×</button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <label>
                                    <span className="text-[9px] text-slate-400 block">Placeholder</span>
                                    <input type="text" value={f.placeholder ?? ""} onChange={(e) => updateField(idx, "placeholder", e.target.value)} onBlur={() => pushHistory()}
                                      className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Placeholder..." />
                                  </label>
                                  <label>
                                    <span className="text-[9px] text-slate-400 block">Kiểu trường</span>
                                    <select value={f.type ?? "text"} onChange={(e) => updateField(idx, "type", e.target.value)}
                                      className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white">
                                      <option value="text">Văn bản</option>
                                      <option value="email">Email</option>
                                      <option value="phone">SĐT</option>
                                      <option value="textarea">Đoạn văn</option>
                                      <option value="select">Chọn</option>
                                      <option value="radio">Radio</option>
                                      <option value="checkbox">Checkbox</option>
                                      <option value="number">Số</option>
                                      <option value="date">Ngày</option>
                                    </select>
                                  </label>
                                </div>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(idx, "required", e.target.checked)}
                                    className="rounded w-3 h-3 accent-indigo-600" />
                                  <span className="text-[10px] text-slate-500">Bắt buộc nhập</span>
                                </label>
                              </div>
                            ))}
                          </div>

                          {/* Add field buttons */}
                          <div className="pt-1">
                            <p className="text-[9px] text-slate-400 mb-1.5">Thêm trường:</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { type: "text", label: "Văn bản", cls: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                                { type: "email", label: "Email", cls: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
                                { type: "phone", label: "SĐT", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                                { type: "textarea", label: "Đoạn văn", cls: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
                                { type: "select", label: "Chọn", cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                                { type: "number", label: "Số", cls: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100" },
                                { type: "date", label: "Ngày", cls: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
                              ].map(({ type, label, cls }) => (
                                <button key={type} type="button" onClick={() => addField(type)}
                                  className={`text-[9px] font-semibold px-2 py-0.5 rounded border transition ${cls}`}>
                                  + {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Tùy chọn khác ─────────────────────────────── */}
                        <div className="flex gap-3 flex-wrap">
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={cfg.formOtp ?? false} onChange={(e) => updateForm({ formOtp: e.target.checked })} className="rounded w-3 h-3 accent-indigo-600" />
                            Có OTP
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={cfg.autoComplete !== false} onChange={(e) => updateForm({ autoComplete: e.target.checked })} className="rounded w-3 h-3 accent-indigo-600" />
                            Auto Complete
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "icon" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Biểu tượng</p>
                  <div className="space-y-2">
                    {onRequestChangeIcon && (
                      <button
                        type="button"
                        onClick={() => onRequestChangeIcon(el.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
                      >
                        <Upload className="w-4 h-4" />
                        Thay biểu tượng
                      </button>
                    )}
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu</span>
                      <div className="flex gap-1">
                        <input type="color" value={(el.styles?.color as string) ?? "#4f46e5"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, color: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                        <input type="text" value={(el.styles?.color as string) ?? "#4f46e5"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, color: e.target.value } })} onBlur={() => pushHistory()}
                          className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                      </div></label>
                  </div>
                </div>
              )}
              {el.type === "gallery" && (() => {
                let urls: string[] = [];
                try {
                  const p = JSON.parse(el.content || "[]");
                  urls = Array.isArray(p) ? p.filter((u: unknown) => typeof u === "string") : [];
                } catch {}
                const updGallery = (next: string[]) => { updateElement(el.id, { content: JSON.stringify(next) }); pushHistory(); };
                const removeImg = (idx: number) => updGallery(urls.filter((_, i) => i !== idx));
                const moveImg = (idx: number, dir: number) => {
                  const j = idx + dir;
                  if (j < 0 || j >= urls.length) return;
                  const a = [...urls]; [a[idx], a[j]] = [a[j], a[idx]]; updGallery(a);
                };
                const gs = el.styles ?? {};
                const updStyle = (patch: Record<string, string | number>) => { updateElement(el.id, { styles: { ...gs, ...patch } }); pushHistory(); };

                return (
                  <div className="border-t border-slate-100 pt-3 space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gallery — {urls.length} ảnh</p>

                    {/* Danh sách ảnh */}
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                      {urls.map((url, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white transition-colors">
                          <div className="w-12 h-10 rounded overflow-hidden shrink-0 bg-slate-200">
                            <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                          </div>
                          <span className="flex-1 text-[10px] text-slate-500 truncate">Ảnh {idx + 1}</span>
                          <div className="flex gap-0.5">
                            <button type="button" onClick={() => moveImg(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="Lên"><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3l5 6H3z"/></svg></button>
                            <button type="button" onClick={() => moveImg(idx, 1)} disabled={idx === urls.length - 1} className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="Xuống"><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 13l-5-6h10z"/></svg></button>
                            <button type="button" onClick={() => removeImg(idx)} className="p-1 rounded hover:bg-red-50 text-red-400" title="Xóa"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {onRequestAddImage && (
                      <button type="button" onClick={() => onRequestAddImage(el.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold transition-colors">
                        <Plus className="w-4 h-4" /> Thêm ảnh vào gallery
                      </button>
                    )}

                    {/* Tự động chạy */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tự động chạy</p>
                      <label className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-600">Tự động chuyển ảnh</span>
                        <button type="button" onClick={() => { updStyle({ autoPlay: Number(gs.autoPlay ?? 1) ? 0 : 1 }); }}
                          className={`w-9 h-5 rounded-full transition-colors relative ${Number(gs.autoPlay ?? 1) ? "bg-indigo-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${Number(gs.autoPlay ?? 1) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                      {Number(gs.autoPlay ?? 1) ? (
                        <label className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">Thời gian chạy (giây)</span>
                          <input type="number" min={1} max={30}
                            value={(gs.autoPlaySpeed as number) ?? 5}
                            onChange={(e) => updateElement(el.id, { styles: { ...gs, autoPlaySpeed: Number(e.target.value) } })}
                            onBlur={() => pushHistory()}
                            className="w-16 px-2 py-1 text-[11px] rounded border border-slate-200 text-right" />
                        </label>
                      ) : null}
                    </div>

                    {/* Hiệu ứng chuyển */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hiệu ứng chuyển</p>
                      <div className="flex gap-1">
                        {[{ v: "fade", l: "Mờ dần" }, { v: "slide", l: "Trượt" }].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => updStyle({ transition: v })}
                            className={`flex-1 py-1.5 text-[10px] rounded border font-medium transition-colors ${(gs.transition ?? "fade") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                          >{l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Mũi tên & chấm tròn */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Điều hướng</p>
                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">Hiện mũi tên</span>
                          <button type="button" onClick={() => updStyle({ showArrows: Number(gs.showArrows ?? 1) ? 0 : 1 })}
                            className={`w-9 h-5 rounded-full transition-colors relative ${Number(gs.showArrows ?? 1) ? "bg-indigo-500" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${Number(gs.showArrows ?? 1) ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">Hiện chấm tròn (dots)</span>
                          <button type="button" onClick={() => updStyle({ showDots: Number(gs.showDots ?? 0) ? 0 : 1 })}
                            className={`w-9 h-5 rounded-full transition-colors relative ${Number(gs.showDots ?? 0) ? "bg-indigo-500" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${Number(gs.showDots ?? 0) ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </label>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <label className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ảnh Thumbnail</p>
                        <button type="button" onClick={() => updStyle({ showThumbnails: Number(gs.showThumbnails ?? 1) ? 0 : 1 })}
                          className={`w-9 h-5 rounded-full transition-colors relative ${Number(gs.showThumbnails ?? 1) ? "bg-indigo-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${Number(gs.showThumbnails ?? 1) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                      {Number(gs.showThumbnails ?? 1) ? (
                        <>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">Vị trí Thumb</span>
                            <div className="grid grid-cols-4 gap-1">
                              {[{ v: "bottom", l: "Dưới" }, { v: "top", l: "Trên" }, { v: "left", l: "Trái" }, { v: "right", l: "Phải" }].map(({ v, l }) => (
                                <button key={v} type="button" onClick={() => updStyle({ thumbnailPosition: v })}
                                  className={`py-1 text-[10px] rounded border font-medium transition-colors ${(gs.thumbnailPosition ?? "bottom") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}
                                >{l}</button>
                              ))}
                            </div>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chiều rộng (px)</span>
                              <input type="number" min={40} max={200} value={(gs.thumbWidth as number) ?? 80}
                                onChange={(e) => updateElement(el.id, { styles: { ...gs, thumbWidth: Number(e.target.value) } })} onBlur={() => pushHistory()}
                                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                            <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chiều cao (px)</span>
                              <input type="number" min={30} max={200} value={(gs.thumbHeight as number) ?? 60}
                                onChange={(e) => updateElement(el.id, { styles: { ...gs, thumbHeight: Number(e.target.value) } })} onBlur={() => pushHistory()}
                                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                            <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">K/cách Thumb (px)</span>
                              <input type="number" min={0} max={20} value={(gs.thumbGap as number) ?? 6}
                                onChange={(e) => updateElement(el.id, { styles: { ...gs, thumbGap: Number(e.target.value) } })} onBlur={() => pushHistory()}
                                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                            <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">K/cách với Gallery (px)</span>
                              <input type="number" min={0} max={40} value={(gs.galleryGap as number) ?? 8}
                                onChange={(e) => updateElement(el.id, { styles: { ...gs, galleryGap: Number(e.target.value) } })} onBlur={() => pushHistory()}
                                className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                          </div>
                        </>
                      ) : null}
                    </div>

                    {/* Bo góc & object-fit */}
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kiểu dáng</p>
                      <div className="space-y-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-1">Cách hiển thị ảnh chính</span>
                          <div className="flex gap-1">
                            {[{ v: "cover", l: "Lấp đầy" }, { v: "contain", l: "Vừa khung" }].map(({ v, l }) => (
                              <button key={v} type="button" onClick={() => updStyle({ mainObjectFit: v })}
                                className={`flex-1 py-1 text-[10px] rounded border font-medium ${(gs.mainObjectFit ?? "cover") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}
                              >{l}</button>
                            ))}
                          </div>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc ảnh chính (px)</span>
                            <input type="number" min={0} max={80} value={(gs.borderRadius as number) ?? 8}
                              onChange={(e) => updateElement(el.id, { styles: { ...gs, borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc Thumb (px)</span>
                            <input type="number" min={0} max={40} value={(gs.thumbnailBorderRadius as number) ?? 4}
                              onChange={(e) => updateElement(el.id, { styles: { ...gs, thumbnailBorderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {el.type === "product-detail" && (() => {
                const pd = parseProductDetailContent(el.content ?? undefined);
                const updatePd = (next: Partial<typeof pd>) => {
                  updateElement(el.id, { content: JSON.stringify({ ...pd, ...next }) });
                  pushHistory();
                };
                const imgs = pd.images;
                const removeImage = (idx: number) => updatePd({ images: imgs.filter((_, i) => i !== idx) });
                const moveImage = (idx: number, dir: number) => {
                  const j = idx + dir;
                  if (j < 0 || j >= imgs.length) return;
                  const next = [...imgs]; [next[idx], next[j]] = [next[j], next[idx]];
                  updatePd({ images: next });
                };
                const addImageUrl = (url: string) => { if (url.trim()) updatePd({ images: [...imgs, url.trim()] }); };
                return (
                  <div className="border-t border-slate-100 pt-3 space-y-4">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Sản phẩm chi tiết</p>

                    {/* Presets */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mẫu có sẵn</p>
                    </div>

                    {/* ── LAYOUT ── */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Bố cục</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => updatePd({ layout: "horizontal" })}
                          className={`py-2 rounded-lg border text-[10px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${pd.layout === "horizontal" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                          <span className="text-base">⬛◻️</span> Ngang
                        </button>
                        <button type="button" onClick={() => updatePd({ layout: "vertical" })}
                          className={`py-2 rounded-lg border text-[10px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${pd.layout === "vertical" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                          <span className="text-base">⬛</span> Dọc
                        </button>
                      </div>
                    </div>

                    {/* ── THÔNG TIN CƠ BẢN ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Thông tin cơ bản</p>
                      <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tên sản phẩm</span>
                        <textarea value={pd.title} onChange={(e) => updatePd({ title: e.target.value })} onBlur={() => pushHistory()}
                          rows={2} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-none" /></label>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Giá gốc</span>
                          <input type="text" value={pd.price} onChange={(e) => updatePd({ price: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="1.290.000đ" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Giá KM</span>
                          <input type="text" value={pd.salePrice} onChange={(e) => updatePd({ salePrice: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="990.000đ" /></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Badge</span>
                          <input type="text" value={pd.badge} onChange={(e) => updatePd({ badge: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="-30%" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Danh mục</span>
                          <input type="text" value={pd.category} onChange={(e) => updatePd({ category: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Thời trang" /></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mã SKU</span>
                          <input type="text" value={pd.sku} onChange={(e) => updatePd({ sku: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="SP-001" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tình trạng</span>
                          <select value={pd.stockStatus} onChange={(e) => updatePd({ stockStatus: e.target.value as "instock" | "outofstock" | "limited" })}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                            <option value="instock">Còn hàng</option>
                            <option value="limited">Sắp hết</option>
                            <option value="outofstock">Hết hàng</option>
                          </select></label>
                      </div>
                      <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Text tình trạng</span>
                        <input type="text" value={pd.stockText} onChange={(e) => updatePd({ stockText: e.target.value })} onBlur={() => pushHistory()}
                          className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Lượng tối kho thấp" /></label>
                      <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mô tả sản phẩm</span>
                        <textarea value={pd.description} onChange={(e) => updatePd({ description: e.target.value })} onBlur={() => pushHistory()}
                          rows={4} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[72px]" /></label>
                    </div>

                    {/* ── ĐÁNH GIÁ ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Đánh giá & Doanh số</p>
                      <div className="grid grid-cols-3 gap-2">
                        <label><span className="text-[9px] text-slate-400 font-bold block mb-0.5">Sao (0–5)</span>
                          <input type="number" min={0} max={5} step={0.1} value={pd.rating} onChange={(e) => updatePd({ rating: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[9px] text-slate-400 font-bold block mb-0.5">Số đánh giá</span>
                          <input type="number" min={0} value={pd.reviewCount} onChange={(e) => updatePd({ reviewCount: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[9px] text-slate-400 font-bold block mb-0.5">Đã bán</span>
                          <input type="number" min={0} value={pd.totalSold ?? 0} onChange={(e) => updatePd({ totalSold: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                      </div>
                    </div>

                    {/* ── HÌNH ẢNH ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Hình ảnh sản phẩm</p>
                      {imgs.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {imgs.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 bg-slate-50/50">
                              <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-200" style={{ backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "cover" }} />
                              <div className="flex-1 min-w-0"><p className="text-[9px] text-slate-500 truncate">Ảnh {idx + 1}</p></div>
                              <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronsUp className="w-3 h-3" /></button>
                              <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === imgs.length - 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronsDown className="w-3 h-3" /></button>
                              <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {onRequestAddImage && (
                        <button type="button" onClick={() => onRequestAddImage(el.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold">
                          <Plus className="w-4 h-4" /> Thêm ảnh từ thư viện
                        </button>
                      )}
                      <div className="flex gap-1.5">
                        <input id={`pd-img-url-${el.id}`} type="text" placeholder="https://... URL ảnh" onKeyDown={(e) => { if (e.key === "Enter") { addImageUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                          className="flex-1 px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        <button type="button" onClick={() => { const inp = document.getElementById(`pd-img-url-${el.id}`) as HTMLInputElement; addImageUrl(inp?.value ?? ""); if (inp) inp.value = ""; }}
                          className="px-3 py-1.5 text-[10px] font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700">Thêm</button>
                      </div>
                    </div>

                    {/* ── BIẾN THỂ ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Biến thể sản phẩm</p>
                        <button type="button" onClick={() => updatePd({ variants: [...pd.variants, { label: "Biến thể", type: "text", options: ["Lựa chọn 1"] }] })}
                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Thêm
                        </button>
                      </div>
                      {pd.variants.map((v, vi) => (
                        <div key={vi} className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input type="text" value={v.label} onChange={(e) => { const next = [...pd.variants]; next[vi] = { ...next[vi], label: e.target.value }; updatePd({ variants: next }); }}
                              className="flex-1 px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white font-semibold" placeholder="Tên biến thể" />
                            <select value={v.type ?? "text"} onChange={(e) => { const next = [...pd.variants]; next[vi] = { ...next[vi], type: e.target.value as "color" | "size" | "text" }; updatePd({ variants: next }); }}
                              className="px-1 py-1 text-[10px] rounded border border-slate-200 bg-white w-20">
                              <option value="text">Chữ</option>
                              <option value="size">Size</option>
                              <option value="color">Màu</option>
                            </select>
                            <button type="button" onClick={() => updatePd({ variants: pd.variants.filter((_, i) => i !== vi) })} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {v.options.map((opt, oi) => (
                              <span key={oi} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]">
                                {opt}
                                <button type="button" onClick={() => { const next = [...pd.variants]; next[vi] = { ...next[vi], options: next[vi].options.filter((_, i) => i !== oi) }; updatePd({ variants: next }); }} className="ml-0.5 text-indigo-400 hover:text-red-500">×</button>
                              </span>
                            ))}
                            <button type="button" onClick={() => {
                              const val = prompt(`Thêm lựa chọn cho "${v.label}"`);
                              if (val?.trim()) { const next = [...pd.variants]; next[vi] = { ...next[vi], options: [...next[vi].options, val.trim()] }; updatePd({ variants: next }); }
                            }} className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold px-1">+ Thêm</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── ĐIỂM NỔI BẬT ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Điểm nổi bật</p>
                        <button type="button" onClick={() => updatePd({ features: [...pd.features, "Tính năng mới"] })}
                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Thêm</button>
                      </div>
                      {pd.features.map((f, fi) => (
                        <div key={fi} className="flex items-center gap-1.5">
                          <input type="text" value={f} onChange={(e) => { const next = [...pd.features]; next[fi] = e.target.value; updatePd({ features: next }); }}
                            className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                          <button type="button" onClick={() => updatePd({ features: pd.features.filter((_, i) => i !== fi) })} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>

                    {/* ── NÚT BẤM ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Nút bấm</p>
                      {/* Text */}
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nút mua ngay</span>
                          <input type="text" value={pd.buyButtonText} onChange={(e) => updatePd({ buyButtonText: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Thêm vào giỏ</span>
                          <input type="text" value={pd.addCartText} onChange={(e) => updatePd({ addCartText: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                      </div>
                      {/* Nút Mua ngay style */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Kiểu "Mua ngay"</p>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Màu nền</span>
                            <div className="flex gap-1">
                              <input type="color" value={(el.styles?.buyButtonBg as string) ?? pd.accentColor ?? "#6366f1"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buyButtonBg: e.target.value } })} onBlur={() => pushHistory()} className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5" />
                              <input type="text" value={(el.styles?.buyButtonBg as string) ?? pd.accentColor ?? "#6366f1"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buyButtonBg: e.target.value } })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                            </div></label>
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Màu chữ</span>
                            <div className="flex gap-1">
                              <input type="color" value={(el.styles?.buyButtonColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buyButtonColor: e.target.value } })} onBlur={() => pushHistory()} className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5" />
                              <input type="text" value={(el.styles?.buyButtonColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buyButtonColor: e.target.value } })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                            </div></label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Bo góc</span>
                            <input type="number" min={0} max={50} value={(el.styles?.buyButtonRadius as number) ?? 6} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buyButtonRadius: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" /></label>
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Padding (dọc)</span>
                            <input type="number" min={2} max={24} value={(el.styles?.buttonPaddingV as number) ?? 8} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buttonPaddingV: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                      </div>
                      {/* Nút Thêm vào giỏ style */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Kiểu "Thêm vào giỏ"</p>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Màu viền & chữ</span>
                            <div className="flex gap-1">
                              <input type="color" value={(el.styles?.cartButtonBorderColor as string) ?? pd.accentColor ?? "#6366f1"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, cartButtonBorderColor: e.target.value, cartButtonColor: e.target.value } })} onBlur={() => pushHistory()} className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5" />
                              <input type="text" value={(el.styles?.cartButtonBorderColor as string) ?? pd.accentColor ?? "#6366f1"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, cartButtonBorderColor: e.target.value, cartButtonColor: e.target.value } })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                            </div></label>
                          <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Bo góc</span>
                            <input type="number" min={0} max={50} value={(el.styles?.cartButtonRadius as number) ?? 6} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, cartButtonRadius: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                        <label><span className="text-[9px] text-slate-400 font-semibold block mb-0.5">Cỡ chữ nút (px)</span>
                          <input type="number" min={8} max={20} value={(el.styles?.buttonFontSize as number) ?? 12} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, buttonFontSize: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" /></label>
                      </div>
                      {/* Preview nút */}
                      <div className="flex gap-2 pt-1">
                        <div style={{
                          flex: 1, padding: `${(el.styles?.buttonPaddingV as number) ?? 8}px 8px`,
                          border: `1.5px solid ${(el.styles?.cartButtonBorderColor as string) ?? pd.accentColor ?? "#6366f1"}`,
                          borderRadius: (el.styles?.cartButtonRadius as number) ?? 6,
                          color: (el.styles?.cartButtonColor as string) ?? pd.accentColor ?? "#6366f1",
                          fontSize: (el.styles?.buttonFontSize as number) ?? 12,
                          fontWeight: 700, textAlign: "center",
                        }}>{pd.addCartText || "Thêm vào giỏ"}</div>
                        <div style={{
                          flex: 1, padding: `${(el.styles?.buttonPaddingV as number) ?? 8}px 8px`,
                          background: (el.styles?.buyButtonBg as string) ?? pd.accentColor ?? "#6366f1",
                          borderRadius: (el.styles?.buyButtonRadius as number) ?? 6,
                          color: (el.styles?.buyButtonColor as string) ?? "#ffffff",
                          fontSize: (el.styles?.buttonFontSize as number) ?? 12,
                          fontWeight: 700, textAlign: "center",
                        }}>{pd.buyButtonText || "Mua ngay"}</div>
                      </div>
                    </div>

                    {/* ── HIỂN THỊ ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Hiển thị</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                        {([["showRating", "Hiện đánh giá"], ["showBadge", "Hiện badge"], ["showVariants", "Hiện biến thể"], ["showQuantity", "Hiện số lượng"], ["showFeatures", "Hiện điểm nổi bật"], ["showDescription", "Hiện mô tả"], ["showActions", "Hiện nút bấm"]] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={pd[key] as boolean} onChange={(e) => updatePd({ [key]: e.target.checked })}
                              className="w-3.5 h-3.5 rounded accent-indigo-600" />
                            <span className="text-[10px] text-slate-600">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ── MÀU SẮC & KIỂU DÁNG ── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1">Màu sắc & Kiểu dáng</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chủ đạo</span>
                          <div className="flex gap-1"><input type="color" value={pd.accentColor || "#6366f1"} onChange={(e) => updatePd({ accentColor: e.target.value })} onBlur={() => pushHistory()} className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                            <input type="text" value={pd.accentColor || "#6366f1"} onChange={(e) => updatePd({ accentColor: e.target.value })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></div></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                          <div className="flex gap-1"><input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()} className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                            <input type="text" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></div></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc card</span>
                          <input type="number" min={0} value={pd.cardRadius} onChange={(e) => updatePd({ cardRadius: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc ảnh</span>
                          <input type="number" min={0} value={pd.imageRadius} onChange={(e) => updatePd({ imageRadius: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                      </div>
                      <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Box shadow</span>
                        <input type="text" value={(el.styles?.boxShadow as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, boxShadow: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="0 4px 24px rgba(0,0,0,0.08)" /></label>
                    </div>
                  </div>
                );
              })()}
              {el.type === "collection-list" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Danh sách sản phẩm</p>
                  {(() => {
                    type CLItem = { image?: string; title?: string; price?: string; originalPrice?: string; badge?: string; rating?: number };
                    type CLData = { columns?: number; gap?: number; cardRadius?: number; showBadge?: boolean; showRating?: boolean; showOriginalPrice?: boolean; accentColor?: string; items?: CLItem[] };
                    let cl: CLData = {};
                    try { cl = JSON.parse(el.content || "{}"); } catch {}
                    const items: CLItem[] = cl.items ?? [];
                    const updateCl = (next: Partial<CLData>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...cl, ...next }) });
                      pushHistory();
                    };
                    const updateItem = (idx: number, next: Partial<CLItem>) => {
                      const newItems = [...items];
                      if (idx >= 0 && idx < newItems.length) {
                        newItems[idx] = { ...newItems[idx], ...next };
                        updateCl({ items: newItems });
                      }
                    };
                    const removeItem = (idx: number) => updateCl({ items: items.filter((_, i) => i !== idx) });
                    const moveItem = (idx: number, dir: number) => {
                      const j = idx + dir;
                      if (j < 0 || j >= items.length) return;
                      const newItems = [...items];
                      [newItems[idx], newItems[j]] = [newItems[j], newItems[idx]];
                      updateCl({ items: newItems });
                    };
                    return (
                      <div className="space-y-3">
                        {/* Preset picker từ DB */}

                        {/* Layout */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bố cục</p>
                          <div className="grid grid-cols-3 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Số cột</span>
                              <input type="number" min={1} max={6} value={cl.columns ?? 3}
                                onChange={(e) => updateCl({ columns: Number(e.target.value) })}
                                onBlur={() => pushHistory()}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Khoảng cách</span>
                              <input type="number" min={0} max={40} value={cl.gap ?? 10}
                                onChange={(e) => updateCl({ gap: Number(e.target.value) })}
                                onBlur={() => pushHistory()}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc thẻ</span>
                              <input type="number" min={0} max={24} value={cl.cardRadius ?? 8}
                                onChange={(e) => updateCl({ cardRadius: Number(e.target.value) })}
                                onBlur={() => pushHistory()}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                            </label>
                          </div>
                        </div>

                        {/* Style */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Màu sắc</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu giá</span>
                              <div className="flex gap-1">
                                <input type="color" value={cl.accentColor || "#ee4d2d"}
                                  onChange={(e) => updateCl({ accentColor: e.target.value })}
                                  onBlur={() => pushHistory()}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={cl.accentColor || "#ee4d2d"}
                                  onChange={(e) => updateCl({ accentColor: e.target.value })}
                                  onBlur={() => pushHistory()}
                                  className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                              </div>
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                              <div className="flex gap-1">
                                <input type="color" value={(el.styles?.backgroundColor as string) ?? "#f8fafc"}
                                  onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                                  onBlur={() => pushHistory()}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="number" min={0} placeholder="Bo góc"
                                  value={(el.styles?.borderRadius as number) ?? 12}
                                  onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })}
                                  onBlur={() => pushHistory()}
                                  className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Display toggles */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hiển thị</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                            {([
                              { key: "showBadge", label: "Badge", def: true },
                              { key: "showRating", label: "Đánh giá ★", def: false },
                              { key: "showOriginalPrice", label: "Giá gốc gạch", def: true },
                            ] as { key: keyof CLData; label: string; def: boolean }[]).map(({ key, label, def }) => (
                              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox"
                                  checked={key === "showRating" ? (cl[key] === true) : (cl[key] !== false ? def : false)}
                                  onChange={(e) => updateCl({ [key]: e.target.checked })}
                                  className="w-3.5 h-3.5 accent-indigo-600" />
                                <span className="text-[10px] text-slate-600">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Danh sách sản phẩm ({items.length})</p>
                          <button type="button"
                            onClick={() => updateCl({ items: [...items, { image: "", title: `Sản phẩm ${items.length + 1}`, price: "299.000đ" }] })}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-indigo-600 text-[11px] font-semibold transition-colors mb-2">
                            <Plus className="w-4 h-4" /> Thêm sản phẩm
                          </button>
                          <div className="space-y-2 max-h-[420px] overflow-y-auto">
                            {items.length === 0 && (
                              <p className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">Chưa có sản phẩm — nhấn "Thêm" hoặc chọn mẫu dữ liệu bên trên.</p>
                            )}
                            {items.map((item, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-sm space-y-1.5">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Sản phẩm {idx + 1}</span>
                                  <div className="flex items-center gap-0.5">
                                    <button type="button" disabled={idx === 0} onClick={() => moveItem(idx, -1)}
                                      className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500" title="Lên">
                                      <ChevronsUp className="w-3 h-3" />
                                    </button>
                                    <button type="button" disabled={idx >= items.length - 1} onClick={() => moveItem(idx, 1)}
                                      className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500" title="Xuống">
                                      <ChevronsDown className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => removeItem(idx)}
                                      className="p-0.5 rounded hover:bg-red-100 text-red-500" title="Xóa">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {/* Image + basic fields */}
                                <div className="flex items-start gap-1.5">
                                  <div className="w-11 h-11 rounded-md overflow-hidden shrink-0 bg-slate-100 border border-slate-200 cursor-pointer flex items-center justify-center text-[9px] text-slate-400"
                                    style={{ backgroundImage: item.image ? `url(${item.image})` : undefined, backgroundSize: "cover" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx)} role="presentation">
                                    {!item.image && "Ảnh"}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <input type="text" value={item.title ?? ""} onChange={(e) => updateItem(idx, { title: e.target.value })} onBlur={() => pushHistory()}
                                      className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Tên sản phẩm" />
                                    <div className="flex gap-1">
                                      <input type="text" value={item.price ?? ""} onChange={(e) => updateItem(idx, { price: e.target.value })} onBlur={() => pushHistory()}
                                        className="w-1/2 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Giá KM" />
                                      <input type="text" value={item.originalPrice ?? ""} onChange={(e) => updateItem(idx, { originalPrice: e.target.value })} onBlur={() => pushHistory()}
                                        className="w-1/2 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Giá gốc (gạch)" />
                                    </div>
                                  </div>
                                  {onRequestAddImage && (
                                    <button type="button" onClick={() => onRequestAddImage(el.id, idx)}
                                      className="p-1 rounded hover:bg-indigo-100 text-indigo-600 shrink-0" title="Thư viện ảnh">
                                      <Upload className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {/* URL ảnh */}
                                <input type="text" value={item.image ?? ""} onChange={(e) => updateItem(idx, { image: e.target.value })} onBlur={() => pushHistory()}
                                  className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="URL ảnh" />
                                {/* Badge + Rating */}
                                <div className="flex gap-1">
                                  <input type="text" value={item.badge ?? ""} onChange={(e) => updateItem(idx, { badge: e.target.value })} onBlur={() => pushHistory()}
                                    className="flex-1 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Badge (vd: HOT, -30%)" />
                                  <input type="number" min={0} max={5} step={0.1} value={item.rating ?? ""} onChange={(e) => updateItem(idx, { rating: e.target.value ? Number(e.target.value) : undefined })} onBlur={() => pushHistory()}
                                    className="w-16 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="★ 0-5" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "blog-list" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Danh sách bài viết</p>
                  <p className="text-[10px] text-slate-600 leading-snug rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2">
                    Khối hiển thị <strong>danh sách bài</strong> (ảnh, tiêu đề, mô tả). Kéo từ sidebar hoặc chọn mẫu bên dưới, rồi chỉnh từng bài ở phần sau.
                  </p>
                  {(() => {
                    const bl = parseBlogListContent(el.content ?? undefined);
                    const posts = bl.posts ?? [];
                    const updateBl = (next: Partial<{ columns?: number; posts?: typeof posts }>) => {
                      updateElement(el.id, { content: JSON.stringify({ columns: bl.columns ?? 2, posts: bl.posts ?? [], ...next }) });
                      pushHistory();
                    };
                    const updatePost = (idx: number, next: Partial<{ title: string; excerpt: string; date: string; image: string }>) => {
                      const newPosts = [...posts];
                      if (idx >= 0 && idx < newPosts.length) {
                        newPosts[idx] = { ...newPosts[idx], ...next };
                        updateBl({ posts: newPosts });
                      }
                    };
                    const removePost = (idx: number) => updateBl({ posts: posts.filter((_, i) => i !== idx) });
                    const movePost = (idx: number, dir: number) => {
                      const j = idx + dir;
                      if (j < 0 || j >= posts.length) return;
                      const newPosts = [...posts];
                      [newPosts[idx], newPosts[j]] = [newPosts[j], newPosts[idx]];
                      updateBl({ posts: newPosts });
                    };
                    return (
                      <div className="space-y-2">
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Số cột</span>
                          <input
                            type="number"
                            min={1}
                            max={3}
                            value={bl.columns ?? 2}
                            onChange={(e) => updateBl({ columns: Number(e.target.value) })}
                            onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateBl({
                              posts: [...posts, { title: `Bài ${posts.length + 1}`, excerpt: "", date: "", image: "" }],
                            })
                          }
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
                        >
                          <Plus className="w-4 h-4" /> Thêm bài
                        </button>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {posts.map((post, idx) => (
                            <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50/50 space-y-1.5">
                              <div className="flex items-start gap-1.5">
                                <div
                                  className="w-12 h-10 rounded overflow-hidden shrink-0 bg-slate-200 cursor-pointer"
                                  style={{ backgroundImage: post.image ? `url(${post.image})` : undefined, backgroundSize: "cover" }}
                                  onClick={() => onRequestAddImage?.(el.id, idx)}
                                  role="presentation"
                                />
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <input
                                    type="text"
                                    value={post.title ?? ""}
                                    onChange={(e) => updatePost(idx, { title: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-semibold"
                                    placeholder="Tiêu đề"
                                  />
                                  <input
                                    type="text"
                                    value={post.excerpt ?? ""}
                                    onChange={(e) => updatePost(idx, { excerpt: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                                    placeholder="Mô tả ngắn"
                                  />
                                  <input
                                    type="text"
                                    value={post.date ?? ""}
                                    onChange={(e) => updatePost(idx, { date: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                                    placeholder="Ngày"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button type="button" onClick={() => onRequestAddImage?.(el.id, idx)} className="p-1 rounded hover:bg-indigo-100 text-indigo-600" title="Ảnh">
                                    <Upload className="w-3 h-3" />
                                  </button>
                                  <button type="button" onClick={() => removePost(idx)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Xóa">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-0.5">
                                <button type="button" disabled={idx === 0} onClick={() => movePost(idx, -1)} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">
                                  ↑
                                </button>
                                <button type="button" disabled={idx >= posts.length - 1} onClick={() => movePost(idx, 1)} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">
                                  ↓
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <input
                              type="color"
                              value={(el.styles?.backgroundColor as string) ?? "#f8fafc"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ</span>
                            <input
                              type="number"
                              min={10}
                              max={24}
                              value={(el.styles?.fontSize as number) ?? 14}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, fontSize: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "blog-detail" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Chi tiết bài viết</p>
                  <p className="text-[10px] text-slate-600 leading-snug rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2">
                    Khối <strong> một bài đầy đủ</strong> (tiêu đề, tác giả, ngày, nội dung). Chọn mẫu để nạp nhanh, sau đó sửa trực tiếp các ô bên dưới.
                  </p>
                  {(() => {
                    const bd = parseBlogDetailContent(el.content ?? undefined);
                    const updateBd = (next: Partial<typeof bd>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...bd, ...next }) });
                      pushHistory();
                    };
                    return (
                      <div className="space-y-2">
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề</span>
                          <input type="text" value={bd.title ?? ""} onChange={(e) => updateBd({ title: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tác giả</span>
                          <input type="text" value={bd.author ?? ""} onChange={(e) => updateBd({ author: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Ngày</span>
                          <input type="text" value={bd.date ?? ""} onChange={(e) => updateBd({ date: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nội dung (HTML hoặc văn bản)</span>
                          <textarea value={bd.body ?? ""} onChange={(e) => updateBd({ body: e.target.value })} onBlur={() => pushHistory()} rows={8} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[120px] font-mono" />
                        </label>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <input
                              type="color"
                              value={(el.styles?.backgroundColor as string) ?? "#ffffff"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ</span>
                            <input
                              type="number"
                              min={10}
                              max={28}
                              value={(el.styles?.fontSize as number) ?? 15}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, fontSize: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "popup" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">💬 Popup</p>
                  {(() => {
                    const pop = parsePopupContent(el.content ?? undefined);
                    const updatePop = (next: Partial<typeof pop>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...pop, ...next }) });
                      pushHistory();
                    };
                    const updateStyle = (next: Record<string, string | number>) => {
                      updateElement(el.id, { styles: { ...el.styles, ...next } });
                      pushHistory();
                    };
                    const layout = pop.layout ?? "flat";
                    const isHeader = layout === "header";
                    return (
                      <div className="space-y-3">
                        {/* Layout */}
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Kiểu bố cục</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "flat", label: "📋 Một khối" },
                              { id: "header", label: "🗂 Có tiêu đề" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => updatePop({ layout: opt.id })}
                                className={`py-1.5 px-2 rounded-lg border text-[10px] font-medium transition ${layout === opt.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emoji icon */}
                        <label>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Icon / Emoji (tùy chọn)</span>
                          <input type="text" value={pop.imageEmoji ?? ""} onChange={(e) => updatePop({ imageEmoji: e.target.value })} onBlur={() => pushHistory()} placeholder="🎁 hoặc bỏ trống" className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>

                        {/* Title */}
                        <label>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Tiêu đề</span>
                          <input type="text" value={pop.title ?? ""} onChange={(e) => updatePop({ title: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>

                        {/* Body */}
                        <label>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Nội dung</span>
                          <textarea value={pop.body ?? ""} onChange={(e) => updatePop({ body: e.target.value })} onBlur={() => pushHistory()} rows={4} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[64px]" />
                        </label>

                        {/* CTA Button */}
                        <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nút bấm (CTA)</p>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pop.showBtn === true}
                                onChange={(e) => updatePop({ showBtn: e.target.checked })}
                                className="rounded border-slate-300"
                              />
                              <span className="text-[10px] text-slate-600">Hiển thị</span>
                            </label>
                          </div>
                          {pop.showBtn && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <label>
                                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Nội dung nút</span>
                                  <input type="text" value={pop.btnText ?? ""} onChange={(e) => updatePop({ btnText: e.target.value })} onBlur={() => pushHistory()} placeholder="Tìm hiểu thêm" className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                                </label>
                                <label>
                                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Bo góc nút</span>
                                  <input type="number" min={0} max={99} value={(el.styles?.btnRadius as number) ?? 8} onChange={(e) => updateStyle({ btnRadius: Number(e.target.value) })} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                                </label>
                              </div>
                              <label>
                                <span className="text-[9px] text-slate-400 font-bold block mb-0.5">URL liên kết</span>
                                <input type="url" value={pop.btnUrl ?? ""} onChange={(e) => updatePop({ btnUrl: e.target.value })} onBlur={() => pushHistory()} placeholder="https://..." className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <label>
                                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Nền nút</span>
                                  <input type="color" value={(el.styles?.btnColor as string) ?? "#1e2d7d"} onChange={(e) => updateStyle({ btnColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                                </label>
                                <label>
                                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Chữ nút</span>
                                  <input type="color" value={(el.styles?.btnTextColor as string) ?? "#ffffff"} onChange={(e) => updateStyle({ btnTextColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                                </label>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Colors */}
                        <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Màu sắc</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Nền popup</span>
                              <input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateStyle({ backgroundColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Chữ nội dung</span>
                              <input type="color" value={(el.styles?.bodyTextColor as string) ?? "#334155"} onChange={(e) => updateStyle({ bodyTextColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">{isHeader ? "Nền thanh tiêu đề" : "Màu tiêu đề"}</span>
                              <input type="color" value={(el.styles?.headerBackgroundColor as string) ?? (isHeader ? "#1e293b" : "#ffffff")} onChange={(e) => updateStyle({ headerBackgroundColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Chữ tiêu đề</span>
                              <input type="color" value={(el.styles?.headerTextColor as string) ?? (isHeader ? "#ffffff" : "#0f172a")} onChange={(e) => updateStyle({ headerTextColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                          <label>
                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Bo góc (px)</span>
                            <input type="number" min={0} value={(el.styles?.borderRadius as number) ?? 12} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                          </label>
                        </div>

                        {/* Animation & Trigger */}
                        <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Hiệu ứng & Kích hoạt</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Hiệu ứng xuất hiện</span>
                              <select value={pop.animation ?? "fade"} onChange={(e) => updatePop({ animation: e.target.value })} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                                <option value="fade">Fade</option>
                                <option value="slide-up">Trượt lên</option>
                                <option value="zoom">Thu phóng</option>
                                <option value="none">Không</option>
                              </select>
                            </label>
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Kích hoạt bằng</span>
                              <select value={pop.trigger ?? "click"} onChange={(e) => updatePop({ trigger: e.target.value })} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                                <option value="click">Nhấn nút</option>
                                <option value="delay">Sau X giây</option>
                                <option value="exit">Exit intent</option>
                                <option value="scroll">Khi cuộn</option>
                              </select>
                            </label>
                          </div>
                          {pop.trigger === "delay" && (
                            <label>
                              <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Hiển thị sau (giây)</span>
                              <input type="number" min={0} max={60} value={pop.triggerDelay ?? 3} onChange={(e) => updatePop({ triggerDelay: Number(e.target.value) })} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                            </label>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pop.closeOnOverlay !== false}
                              onChange={(e) => updatePop({ closeOnOverlay: e.target.checked })}
                              className="rounded border-slate-300"
                            />
                            <span className="text-[10px] text-slate-700">Đóng khi click ra ngoài</span>
                          </label>
                        </div>

                        {/* Save as my template */}
                        <button
                          type="button"
                          onClick={() => {
                            const name = window.prompt("Tên mẫu (hiển thị trong Popup của tôi)", pop.title?.trim() || "Popup của tôi");
                            if (name == null || !String(name).trim()) return;
                            saveMyPopup({
                              id: `my-${Date.now()}`,
                              name: String(name).trim(),
                              content: el.content ?? "{}",
                              width: el.width ?? 500,
                              height: el.height ?? 400,
                              styles: { ...el.styles },
                            });
                            window.dispatchEvent(new CustomEvent("ladipage-my-popups-changed"));
                            onToast?.("Đã lưu vào mục Popup của tôi", "success");
                          }}
                          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition"
                        >
                          💾 Lưu làm mẫu của tôi
                        </button>
                        <p className="text-[9px] text-slate-400 leading-snug">Mẫu lưu trong trình duyệt. Mở Quản lý Popup → tab "Popup của tôi" để chèn lại.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "social-share" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Chia sẻ MXH</p>
                  {(() => {
                    const sd = parseSocialShareContent(el.content ?? undefined);
                    const nets = sd.networks ?? ["facebook", "twitter", "linkedin", "link"];
                    const all = ["facebook", "twitter", "linkedin", "instagram", "zalo", "link"] as const;
                    const toggle = (id: string) => {
                      const has = nets.includes(id);
                      const next = has ? nets.filter((n) => n !== id) : [...nets, id];
                      updateElement(el.id, { content: JSON.stringify({ networks: next.length ? next : ["facebook"] }) });
                      pushHistory();
                    };
                    return (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500">Chọn nút hiển thị khi xuất bản</p>
                        <div className="flex flex-wrap gap-1.5">
                          {all.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggle(id)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border ${nets.includes(id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                            >
                              {id}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "carousel" && (() => {
                const cd = parseCarouselContent(el.content ?? undefined);
                const cs = cd.carouselStyle ?? {};
                const updateCd = (next: Partial<typeof cd>) => {
                  updateElement(el.id, { content: JSON.stringify({ ...cd, ...next }) });
                  pushHistory();
                };
                const updateItem = (idx: number, patch: Record<string, unknown>) => {
                  const next = [...cd.items];
                  if (idx >= 0 && idx < next.length) { next[idx] = { ...next[idx], ...patch }; updateCd({ items: next }); }
                };
                const moveItem = (idx: number, dir: number) => {
                  const next = [...cd.items];
                  const ni = idx + dir;
                  if (ni < 0 || ni >= next.length) return;
                  [next[idx], next[ni]] = [next[ni], next[idx]];
                  updateCd({ items: next });
                };
                const removeItem = (idx: number) => updateCd({ items: cd.items.filter((_, i) => i !== idx) });
                const updateCs = (patch: Record<string, unknown>) => updateCd({ carouselStyle: { ...cs, ...patch } });

                const lt = cd.layoutType;
                const isT = lt === "testimonial";
                const isM = lt === "media";
                const isH = lt === "hero";
                const isL = lt === "logos";
                const isSt = lt === "stats";
                const isC = lt === "cards";
                const isP = lt === "product";

                const LAYOUT_OPTIONS = [
                  { v: "product", icon: "🛍️", label: "Gallery" },
                  { v: "testimonial", icon: "💬", label: "Nhận xét" },
                  { v: "media", icon: "🖼️", label: "Media" },
                  { v: "hero", icon: "🦸", label: "Hero" },
                  { v: "cards", icon: "🃏", label: "Cards" },
                  { v: "logos", icon: "🏷️", label: "Logos" },
                  { v: "stats", icon: "📊", label: "Thống kê" },
                ];

                const addItem = () => {
                  const base: Record<string, string | number> = {};
                  if (isT) { base.avatar = ""; base.quote = "Nhận xét của khách hàng..."; base.name = "Khách hàng"; base.role = ""; base.rating = 5; }
                  else if (isM) { base.image = ""; base.title = "Tiêu đề slide"; base.desc = ""; }
                  else if (isH) { base.bgImage = ""; base.bgColor = "#1e293b"; base.title = "Tiêu đề hero"; base.subtitle = "Mô tả ngắn"; base.btnText = "Khám phá ngay"; base.btnUrl = "#"; }
                  else if (isL) { base.image = ""; base.name = "Logo"; }
                  else if (isSt) { base.number = "99+"; base.label = "Khách hàng"; }
                  else if (isC) { base.image = ""; base.title = "Tính năng"; base.desc = "Mô tả tính năng."; }
                  else if (isP) { base.image = ""; base.title = "Sản phẩm"; base.desc = ""; }
                  updateCd({ items: [...cd.items, base] });
                };

                // Sub-tab state (shared via closure, re-renders with el change)
                const carouselPanelTab = "slides";

                const inputCls = "w-full px-2 py-1 text-[10px] rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300";
                const label10 = "text-[9px] text-slate-500 font-medium block mb-0.5";

                return (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">🎠 Carousel</p>

                    {/* DB Presets */}
                    {/* Layout type */}
                    <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Kiểu layout</p>
                      <div className="grid grid-cols-3 gap-1">
                        {LAYOUT_OPTIONS.map(({ v, icon, label }) => (
                          <button key={v} type="button"
                            onClick={() => updateCd({ layoutType: v })}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-[9px] font-semibold transition ${lt === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                            <span className="text-base leading-none">{icon}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Slides editor */}
                    <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Slides ({cd.items.length})</p>
                        <button type="button" onClick={addItem}
                          className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition">
                          <Plus className="w-3.5 h-3.5" /> Thêm
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                        {cd.items.map((item, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {/* Slide header */}
                            <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border-b border-slate-100">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Slide {idx + 1}</span>
                              <div className="flex gap-0.5">
                                <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx===0}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 text-[10px]">▲</button>
                                <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx===cd.items.length-1}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 text-[10px]">▼</button>
                                <button type="button" onClick={() => removeItem(idx)}
                                  className="p-0.5 rounded hover:bg-red-100 text-red-500 ml-0.5">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="p-2 space-y-1.5">
                              {isT && (<>
                                {/* Ảnh avatar + URL */}
                                <div>
                                  <span className={label10}>Avatar</span>
                                  <div className="flex gap-1">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center cursor-pointer"
                                      style={{ backgroundImage: item.avatar?.trim() ? `url(${item.avatar})` : undefined, backgroundSize: "cover" }}
                                      onClick={() => onRequestAddImage?.(el.id, idx, "avatar")}>
                                      {!item.avatar?.trim() && <span className="text-[8px] text-slate-400">+</span>}
                                    </div>
                                    <input className={inputCls} placeholder="URL ảnh" value={item.avatar ?? ""}
                                      onChange={(e) => updateItem(idx, { avatar: e.target.value })} onBlur={() => pushHistory()} />
                                  </div>
                                </div>
                                <div>
                                  <span className={label10}>Đánh giá sao</span>
                                  <div className="flex gap-1">
                                    {[1,2,3,4,5].map(s => (
                                      <button key={s} type="button" onClick={() => updateItem(idx, { rating: s })}
                                        className={`text-sm transition ${(item.rating ?? 5) >= s ? "text-amber-400" : "text-slate-300"}`}>★</button>
                                    ))}
                                  </div>
                                </div>
                                <label><span className={label10}>Trích dẫn</span>
                                  <textarea className={inputCls + " resize-none"} rows={2} placeholder="Nhận xét của khách..."
                                    value={item.quote ?? ""} onChange={(e) => updateItem(idx, { quote: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Tên</span>
                                  <input className={inputCls} placeholder="Nguyễn Văn A" value={item.name ?? ""}
                                    onChange={(e) => updateItem(idx, { name: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Chức vụ / Vai trò</span>
                                  <input className={inputCls} placeholder="CEO — Công ty ABC" value={item.role ?? ""}
                                    onChange={(e) => updateItem(idx, { role: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                              </>)}

                              {(isM || isC) && (<>
                                <div>
                                  <span className={label10}>Hình ảnh</span>
                                  <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer flex items-center justify-center text-[9px] text-slate-400 mb-1"
                                    style={{ backgroundImage: item.image?.trim() ? `url(${item.image})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx, "image")}>
                                    {!item.image?.trim() && "Nhấn để chọn ảnh"}
                                  </div>
                                  <input className={inputCls} placeholder="URL ảnh" value={item.image ?? ""}
                                    onChange={(e) => updateItem(idx, { image: e.target.value })} onBlur={() => pushHistory()} />
                                </div>
                                <label><span className={label10}>Tiêu đề</span>
                                  <input className={inputCls} placeholder="Tiêu đề slide" value={item.title ?? ""}
                                    onChange={(e) => updateItem(idx, { title: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Mô tả</span>
                                  <textarea className={inputCls + " resize-none"} rows={2} placeholder="Mô tả ngắn..."
                                    value={item.desc ?? ""} onChange={(e) => updateItem(idx, { desc: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                              </>)}

                              {isH && (<>
                                <div>
                                  <span className={label10}>Hình nền (bgImage)</span>
                                  <div className="w-full h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer flex items-center justify-center text-[9px] text-slate-400 mb-1"
                                    style={{ backgroundImage: item.bgImage?.trim() ? `url(${item.bgImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx, "image")}>
                                    {!item.bgImage?.trim() && "Nhấn để chọn ảnh nền"}
                                  </div>
                                  <input className={inputCls} placeholder="URL ảnh nền" value={item.bgImage ?? ""}
                                    onChange={(e) => updateItem(idx, { bgImage: e.target.value })} onBlur={() => pushHistory()} />
                                </div>
                                <div className="flex gap-2">
                                  <label className="flex-1"><span className={label10}>Màu nền (nếu ko có ảnh)</span>
                                    <input type="color" value={item.bgColor ?? "#1e293b"}
                                      onChange={(e) => updateItem(idx, { bgColor: e.target.value })} onBlur={() => pushHistory()}
                                      className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                                  </label>
                                </div>
                                <label><span className={label10}>Tiêu đề lớn</span>
                                  <input className={inputCls} placeholder="Tiêu đề hero" value={item.title ?? ""}
                                    onChange={(e) => updateItem(idx, { title: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Phụ đề</span>
                                  <input className={inputCls} placeholder="Mô tả ngắn" value={item.subtitle ?? ""}
                                    onChange={(e) => updateItem(idx, { subtitle: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <div className="space-y-1.5">
                                  <label className="block"><span className={label10}>Nút CTA</span>
                                    <input className={inputCls} placeholder="Khám phá ngay" value={item.btnText ?? ""}
                                      onChange={(e) => updateItem(idx, { btnText: e.target.value })} onBlur={() => pushHistory()} />
                                  </label>
                                  <label className="block"><span className={label10}>Liên kết nút</span>
                                    <div className="flex gap-1 mb-1">
                                      {(["url", "section", "popup"] as const).map((lt) => (
                                        <button
                                          key={lt}
                                          type="button"
                                          onClick={() => {
                                            updateItem(idx, {
                                              btnLinkType: lt,
                                              ...(lt === "url" ? { btnSectionId: undefined, btnPopupTarget: undefined } : {}),
                                              ...(lt === "section" ? { btnPopupTarget: undefined } : {}),
                                              ...(lt === "popup" ? { btnSectionId: undefined } : {}),
                                            });
                                            pushHistory();
                                          }}
                                          className={`flex-1 py-0.5 text-[9px] rounded border transition-colors ${
                                            (item.btnLinkType ?? "url") === lt
                                              ? "bg-indigo-500 text-white border-indigo-500"
                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          }`}
                                        >
                                          {lt === "url" ? "URL" : lt === "section" ? "Section" : "Popup"}
                                        </button>
                                      ))}
                                    </div>
                                    {(item.btnLinkType ?? "url") === "url" && (
                                      <input
                                        className={inputCls}
                                        placeholder="https://..."
                                        value={item.btnUrl ?? ""}
                                        onChange={(e) => updateItem(idx, { btnUrl: e.target.value })}
                                        onBlur={() => pushHistory()}
                                      />
                                    )}
                                    {(item.btnLinkType ?? "url") === "section" && (
                                      <select
                                        value={item.btnSectionId != null ? String(item.btnSectionId) : ""}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const sid = v === "" ? undefined : Number(v);
                                          updateItem(idx, {
                                            btnSectionId: sid,
                                            btnUrl: sid != null ? `#lp-section-${sid}` : "",
                                          });
                                          pushHistory();
                                        }}
                                        className="w-full px-2 py-1 text-[10px] rounded border border-slate-200 bg-white"
                                      >
                                        <option value="">-- Chọn Section --</option>
                                        {sections.map((s, si) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name || `Section ${si + 1}`}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    {(item.btnLinkType ?? "url") === "popup" && (
                                      <select
                                        value={item.btnPopupTarget ?? ""}
                                        onChange={(e) => {
                                          updateItem(idx, { btnPopupTarget: e.target.value });
                                          pushHistory();
                                        }}
                                        className="w-full px-2 py-1 text-[10px] rounded border border-slate-200 bg-white"
                                      >
                                        <option value="">-- Chọn Popup --</option>
                                        <option value="close">Đóng mọi popup đang mở</option>
                                        {carouselPopupTargets.map((p) => (
                                          <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                      </select>
                                    )}
                                    {carouselPopupTargets.length === 0 && (item.btnLinkType ?? "url") === "popup" && (
                                      <p className="text-[9px] text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                                        Chưa có popup. Tạo popup từ tab Popup bên trái.
                                      </p>
                                    )}
                                  </label>
                                </div>
                              </>)}

                              {isL && (<>
                                <div>
                                  <span className={label10}>Logo</span>
                                  <div className="w-full h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-center mb-1"
                                    style={{ backgroundImage: item.image?.trim() ? `url(${item.image})` : undefined, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx, "image")}>
                                    {!item.image?.trim() && <span className="text-[9px] text-slate-400">Nhấn để chọn logo</span>}
                                  </div>
                                  <input className={inputCls} placeholder="URL logo" value={item.image ?? ""}
                                    onChange={(e) => updateItem(idx, { image: e.target.value })} onBlur={() => pushHistory()} />
                                </div>
                                <label><span className={label10}>Tên thương hiệu</span>
                                  <input className={inputCls} placeholder="Tên" value={item.name ?? ""}
                                    onChange={(e) => updateItem(idx, { name: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                              </>)}

                              {isSt && (<>
                                <label><span className={label10}>Con số</span>
                                  <input className={inputCls} placeholder="1000+" value={item.number ?? ""}
                                    onChange={(e) => updateItem(idx, { number: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Nhãn</span>
                                  <input className={inputCls} placeholder="Khách hàng hài lòng" value={item.label ?? ""}
                                    onChange={(e) => updateItem(idx, { label: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                              </>)}

                              {isP && (<>
                                <div>
                                  <span className={label10}>Hình ảnh</span>
                                  <div className="w-full h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer flex items-center justify-center text-[9px] text-slate-400 mb-1"
                                    style={{ backgroundImage: item.image?.trim() ? `url(${item.image})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx, "image")}>
                                    {!item.image?.trim() && "Nhấn để chọn ảnh"}
                                  </div>
                                  <input className={inputCls} placeholder="URL ảnh sản phẩm" value={item.image ?? ""}
                                    onChange={(e) => updateItem(idx, { image: e.target.value })} onBlur={() => pushHistory()} />
                                </div>
                                <label><span className={label10}>Tên sản phẩm</span>
                                  <input className={inputCls} placeholder="Tên sản phẩm" value={item.title ?? ""}
                                    onChange={(e) => updateItem(idx, { title: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                                <label><span className={label10}>Giá / Mô tả ngắn</span>
                                  <input className={inputCls} placeholder="299.000đ" value={item.desc ?? ""}
                                    onChange={(e) => updateItem(idx, { desc: e.target.value })} onBlur={() => pushHistory()} />
                                </label>
                              </>)}
                            </div>
                          </div>
                        ))}
                        {cd.items.length === 0 && (
                          <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg">
                            <p className="text-[10px] text-slate-400">Chưa có slide</p>
                            <button type="button" onClick={addItem} className="mt-2 text-[10px] text-indigo-600 font-semibold hover:underline">+ Thêm slide đầu tiên</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Style settings */}
                    <div className="rounded-xl border border-slate-200 p-2.5 space-y-2.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Hiển thị & Màu sắc</p>

                      {/* Background */}
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className={label10}>Màu nền</span>
                          <input type="color" value={(el.styles?.backgroundColor as string) ?? "#f8fafc"}
                            onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                            onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <label><span className={label10}>Bo góc (px)</span>
                          <input type="number" min={0} max={50} value={Number(el.styles?.borderRadius ?? 12)}
                            onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })}
                            onBlur={() => pushHistory()} className={inputCls} />
                        </label>
                      </div>

                      {/* Product-specific: slides per view, gap, caption */}
                      {isP && (
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-2 space-y-2">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide">Cấu hình Gallery</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className={label10}>Số slide hiện (1-5)</span>
                              <input type="number" min={1} max={5} value={cs.slidesPerView ?? 3}
                                onChange={(e) => updateCs({ slidesPerView: Math.max(1, Math.min(5, Number(e.target.value))) })}
                                onBlur={() => pushHistory()} className={inputCls} />
                            </label>
                            <label><span className={label10}>Khoảng cách (px)</span>
                              <input type="number" min={0} max={40} value={cs.slideGap ?? 12}
                                onChange={(e) => updateCs({ slideGap: Number(e.target.value) })}
                                onBlur={() => pushHistory()} className={inputCls} />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={cs.showCaption ?? false}
                              onChange={(e) => updateCs({ showCaption: e.target.checked })}
                              className="rounded border-slate-300" />
                            <span className="text-[10px] text-slate-600">Hiện tên & giá dưới ảnh</span>
                          </label>
                        </div>
                      )}

                      {/* Dot colors */}
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className={label10}>Dot nền</span>
                          <input type="color" value={cs.dotColor ?? "#d1d5db"}
                            onChange={(e) => updateCs({ dotColor: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <label><span className={label10}>Dot active</span>
                          <input type="color" value={cs.dotActiveColor ?? "#6366f1"}
                            onChange={(e) => updateCs({ dotActiveColor: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                        </label>
                      </div>

                      {/* Dot style */}
                      <div>
                        <span className={label10}>Kiểu dot</span>
                        <div className="flex gap-1">
                          {(["circle","bar","pill"] as const).map(ds => (
                            <button key={ds} type="button" onClick={() => updateCs({ dotStyle: ds })}
                              className={`flex-1 py-1 text-[9px] font-semibold rounded border transition ${(cs.dotStyle ?? "circle") === ds ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"}`}>
                              {ds === "circle" ? "●●●" : ds === "bar" ? "───" : "━━━"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Arrows */}
                      <div>
                        <span className={label10}>Mũi tên điều hướng</span>
                        <div className="flex gap-2 items-center">
                          <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${(cs.showArrows ?? true) ? "bg-indigo-600" : "bg-slate-200"}`}
                            onClick={() => updateCs({ showArrows: !(cs.showArrows ?? true) })}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(cs.showArrows ?? true) ? "left-4" : "left-0.5"}`} />
                          </div>
                          <span className="text-[9px] text-slate-500">{(cs.showArrows ?? true) ? "Hiện" : "Ẩn"}</span>
                          {(cs.showArrows ?? true) && (
                            <>
                              <div className="ml-2 flex gap-1">
                                {(["circle","pill","minimal"] as const).map(as => (
                                  <button key={as} type="button" onClick={() => updateCs({ arrowStyle: as })}
                                    className={`px-1.5 py-0.5 text-[8px] font-semibold rounded border transition ${(cs.arrowStyle ?? "circle") === as ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white text-slate-400 border-slate-200"}`}>
                                    {as}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        {(cs.showArrows ?? true) && (
                          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                            <label><span className={label10}>Nền mũi tên</span>
                              <input type="color" value={cs.arrowBg ?? "rgba(255,255,255,0.9)".replace(/rgba\(.*\)/, "#ffffff")}
                                onChange={(e) => updateCs({ arrowBg: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label><span className={label10}>Màu mũi tên</span>
                              <input type="color" value={cs.arrowColor ?? "#374151"}
                                onChange={(e) => updateCs({ arrowColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Show dots toggle */}
                      <div className="flex items-center gap-2">
                        <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${(cs.showDots ?? true) ? "bg-indigo-600" : "bg-slate-200"}`}
                          onClick={() => updateCs({ showDots: !(cs.showDots ?? true) })}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(cs.showDots ?? true) ? "left-4" : "left-0.5"}`} />
                        </div>
                        <span className="text-[9px] text-slate-500">Hiện dots</span>
                      </div>

                      {/* Testimonial specific */}
                      {isT && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Nhận xét</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className={label10}>Cỡ chữ quote</span>
                              <input type="number" min={8} max={24} value={cs.quoteFontSize ?? 13}
                                onChange={(e) => updateCs({ quoteFontSize: Number(e.target.value) })} onBlur={() => pushHistory()}
                                className={inputCls} />
                            </label>
                            <label><span className={label10}>Màu quote</span>
                              <input type="color" value={cs.quoteColor ?? "#374151"}
                                onChange={(e) => updateCs({ quoteColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label><span className={label10}>Cỡ chữ tên</span>
                              <input type="number" min={8} max={24} value={cs.nameFontSize ?? 13}
                                onChange={(e) => updateCs({ nameFontSize: Number(e.target.value) })} onBlur={() => pushHistory()}
                                className={inputCls} />
                            </label>
                            <label><span className={label10}>Màu tên</span>
                              <input type="color" value={cs.nameColor ?? "#111827"}
                                onChange={(e) => updateCs({ nameColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${cs.showRating ? "bg-amber-500" : "bg-slate-200"}`}
                              onClick={() => updateCs({ showRating: !cs.showRating })}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cs.showRating ? "left-4" : "left-0.5"}`} />
                            </div>
                            <span className="text-[9px] text-slate-500">Hiện sao đánh giá</span>
                            {cs.showRating && (
                              <input type="color" value={cs.ratingColor ?? "#f59e0b"}
                                onChange={(e) => updateCs({ ratingColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-10 h-6 rounded border border-slate-200 cursor-pointer ml-auto" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Media/Cards specific */}
                      {(isM || isC) && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Media</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className={label10}>Cỡ chữ tiêu đề</span>
                              <input type="number" min={8} max={28} value={cs.titleFontSize ?? 16}
                                onChange={(e) => updateCs({ titleFontSize: Number(e.target.value) })} onBlur={() => pushHistory()}
                                className={inputCls} />
                            </label>
                            <label><span className={label10}>Màu tiêu đề</span>
                              <input type="color" value={cs.titleColor ?? "#111827"}
                                onChange={(e) => updateCs({ titleColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                          {isC && (
                            <div className="grid grid-cols-2 gap-2">
                              <label><span className={label10}>Màu nền card</span>
                                <input type="color" value={cs.cardBg ?? "#ffffff"}
                                  onChange={(e) => updateCs({ cardBg: e.target.value })} onBlur={() => pushHistory()}
                                  className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                              </label>
                              <label><span className={label10}>Bo góc card</span>
                                <input type="number" min={0} max={24} value={cs.cardRadius ?? 12}
                                  onChange={(e) => updateCs({ cardRadius: Number(e.target.value) })} onBlur={() => pushHistory()}
                                  className={inputCls} />
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hero specific */}
                      {isH && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Hero</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className={label10}>Màu overlay</span>
                              <input type="color" value={cs.overlayColor ?? "#000000"}
                                onChange={(e) => updateCs({ overlayColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label><span className={label10}>Độ mờ overlay (0-1)</span>
                              <input type="number" min={0} max={1} step={0.05} value={cs.overlayOpacity ?? 0.35}
                                onChange={(e) => updateCs({ overlayOpacity: Number(e.target.value) })} onBlur={() => pushHistory()}
                                className={inputCls} />
                            </label>
                            <label><span className={label10}>Màu nút CTA</span>
                              <input type="color" value={cs.btnBg ?? "#6366f1"}
                                onChange={(e) => updateCs({ btnBg: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                            <label><span className={label10}>Chữ nút CTA</span>
                              <input type="color" value={cs.btnColor ?? "#ffffff"}
                                onChange={(e) => updateCs({ btnColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Logos specific */}
                      {isL && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Logos</p>
                          <label><span className={label10}>Chiều cao logo (px)</span>
                            <input type="number" min={20} max={120} value={cs.logoHeight ?? 48}
                              onChange={(e) => updateCs({ logoHeight: Number(e.target.value) })} onBlur={() => pushHistory()}
                              className={inputCls} />
                          </label>
                          <div className="flex items-center gap-2">
                            <div className={`relative w-8 h-4 rounded-full cursor-pointer transition ${cs.logoGrayscale ? "bg-slate-600" : "bg-slate-200"}`}
                              onClick={() => updateCs({ logoGrayscale: !cs.logoGrayscale })}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cs.logoGrayscale ? "left-4" : "left-0.5"}`} />
                            </div>
                            <span className="text-[9px] text-slate-500">Grayscale logo</span>
                          </div>
                        </div>
                      )}

                      {/* Stats specific */}
                      {isSt && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Thống kê</p>
                          <div className="grid grid-cols-2 gap-2">
                            <label><span className={label10}>Cỡ số</span>
                              <input type="number" min={16} max={60} value={cs.numberFontSize ?? 28}
                                onChange={(e) => updateCs({ numberFontSize: Number(e.target.value) })} onBlur={() => pushHistory()}
                                className={inputCls} />
                            </label>
                            <label><span className={label10}>Màu số</span>
                              <input type="color" value={cs.numberColor ?? "#6366f1"}
                                onChange={(e) => updateCs({ numberColor: e.target.value })} onBlur={() => pushHistory()}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Autoplay & Transition */}
                    <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tự chạy & Hiệu ứng</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className={label10}>Tốc độ tự chạy (ms)</span>
                          <input type="number" min={0} step={500} value={cs.autoplayMs ?? 5000}
                            onChange={(e) => updateCs({ autoplayMs: Number(e.target.value) })} onBlur={() => pushHistory()}
                            className={inputCls} />
                        </label>
                        <label><span className={label10}>Hiệu ứng chuyển</span>
                          <select value={cs.transitionType ?? "slide"}
                            onChange={(e) => updateCs({ transitionType: e.target.value })} onBlur={() => pushHistory()}
                            className={inputCls}>
                            <option value="slide">Trượt</option>
                            <option value="fade">Mờ dần</option>
                            <option value="none">Không</option>
                          </select>
                        </label>
                      </div>
                      <p className="text-[8px] text-slate-400">0 = tắt tự chạy. Thời gian tính bằng millisecond.</p>
                    </div>

                    {/* Font family */}
                    <div className="rounded-xl border border-slate-200 p-2.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2">Font chữ</p>
                      <FontPicker
                        value={cs.fontFamily ?? ""}
                        onChange={(v) => { updateCs({ fontFamily: v }); pushHistory(); }}
                      />
                    </div>
                  </div>
                );
                void carouselPanelTab;
              })()}
              {el.type === "cart" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Giỏ hàng</p>
                  {(() => {
                    const cart = parseCartContent(el.content ?? undefined);
                    const fmt = (n: number) =>
                      `${n.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}${cart.currency === "USD" ? " $" : "đ"}`;
                    const productLine = (p: ProductItem): CartLineItem => ({
                      productId: p.id,
                      title: p.name,
                      price: fmt(p.salePrice != null && p.salePrice > 0 ? Number(p.salePrice) : Number(p.price)),
                      qty: 1,
                      image: p.imageUrl ?? "",
                    });
                    const updateCart = (next: Partial<typeof cart>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...cart, ...next }) });
                      pushHistory();
                    };
                    const setSource = (dataSource: "static" | "catalog") => {
                      if (dataSource === "catalog" && workspaceId && catalogProducts.length) {
                        const ids = cart.productIds?.length
                          ? cart.productIds
                          : catalogProducts.slice(0, 3).map((p) => p.id);
                        const items = ids.map((id) => {
                          const p = catalogProducts.find((x) => x.id === id);
                          return p ? productLine(p) : ({ productId: id, title: `#${id}`, price: "—", qty: 1, image: "" } satisfies CartLineItem);
                        });
                        updateCart({ dataSource: "catalog", productIds: ids, items });
                      } else {
                        updateCart({ dataSource: "static", productIds: [] });
                      }
                    };
                    const toggleProductId = (pid: number) => {
                      const cur = new Set(cart.productIds ?? []);
                      if (cur.has(pid)) cur.delete(pid);
                      else cur.add(pid);
                      const ids = [...cur];
                      const items = ids
                        .map((id) => catalogProducts.find((x) => x.id === id))
                        .filter((p): p is ProductItem => !!p)
                        .map(productLine);
                      updateCart({ dataSource: "catalog", productIds: ids, items });
                    };
                    const items = cart.items ?? [];
                    const updateItem = (idx: number, patch: Partial<CartLineItem>) => {
                      const next = [...items];
                      if (idx >= 0 && idx < next.length) {
                        next[idx] = { ...next[idx], ...patch };
                        updateCart({ items: next });
                      }
                    };
                    const addStaticRow = () => updateCart({ items: [...items, { title: `SP ${items.length + 1}`, price: "0đ", qty: 1, image: "" }] });
                    const removeItem = (idx: number) => updateCart({ items: items.filter((_, i) => i !== idx) });
                    return (
                      <div className="space-y-2">
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nguồn dữ liệu</span>
                          <select
                            value={cart.dataSource ?? "static"}
                            onChange={(e) => setSource(e.target.value as "static" | "catalog")}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          >
                            <option value="static">Tĩnh (nhập tay)</option>
                            <option value="catalog" disabled={!workspaceId}>
                              Theo sản phẩm workspace
                            </option>
                          </select>
                        </label>
                        {(cart.dataSource ?? "static") === "catalog" && (
                          <div className="space-y-1 max-h-40 overflow-y-auto rounded border border-slate-200 p-2 bg-slate-50/50">
                            {!workspaceId && <p className="text-[10px] text-amber-600">Chưa gắn workspace cho trang.</p>}
                            {workspaceId && catalogProducts.length === 0 && (
                              <p className="text-[10px] text-slate-500">Chưa có sản phẩm — thêm tại mục Sản phẩm dashboard.</p>
                            )}
                            {catalogProducts.map((p) => {
                              const on = (cart.productIds ?? []).includes(p.id);
                              return (
                                <label key={p.id} className="flex items-center gap-2 text-[10px] cursor-pointer">
                                  <input type="checkbox" checked={on} onChange={() => toggleProductId(p.id)} />
                                  <span className="truncate flex-1">{p.name}</span>
                                  <span className="text-slate-400 shrink-0">{fmt(Number(p.salePrice ?? p.price))}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {(cart.dataSource ?? "static") === "static" && (
                          <>
                            <button
                              type="button"
                              onClick={addStaticRow}
                              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
                            >
                              <Plus className="w-4 h-4" /> Thêm dòng
                            </button>
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                              {items.map((row, idx) => (
                                <div key={idx} className="p-2 rounded border border-slate-200 bg-white space-y-1">
                                  <input
                                    type="text"
                                    value={row.title}
                                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200"
                                    placeholder="Tên"
                                  />
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={row.price}
                                      onChange={(e) => updateItem(idx, { price: e.target.value })}
                                      onBlur={() => pushHistory()}
                                      className="flex-1 px-1.5 py-0.5 text-[10px] rounded border border-slate-200"
                                      placeholder="Giá"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={row.qty ?? 1}
                                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 1 })}
                                      onBlur={() => pushHistory()}
                                      className="w-12 px-1 py-0.5 text-[10px] rounded border border-slate-200"
                                    />
                                  </div>
                                  <button type="button" onClick={() => removeItem(idx)} className="text-[10px] text-red-500 hover:underline">
                                    Xóa dòng
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Khi giỏ trống</span>
                          <input
                            type="text"
                            value={cart.emptyMessage ?? ""}
                            onChange={(e) => updateCart({ emptyMessage: e.target.value })}
                            onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nút thanh toán</span>
                          <input
                            type="text"
                            value={cart.checkoutButtonText ?? ""}
                            onChange={(e) => updateCart({ checkoutButtonText: e.target.value })}
                            onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                        <div className="flex gap-3 text-[10px]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cart.showThumbnail !== false}
                              onChange={(e) => updateCart({ showThumbnail: e.target.checked })}
                            />
                            Ảnh nhỏ
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cart.showQty !== false}
                              onChange={(e) => updateCart({ showQty: e.target.checked })}
                            />
                            Số lượng
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <input
                              type="color"
                              value={(el.styles?.backgroundColor as string) ?? "#ffffff"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc</span>
                            <input
                              type="number"
                              min={0}
                              value={(el.styles?.borderRadius as number) ?? 12}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "menu" && (() => {
                type MenuItem = { label: string; href?: string; target?: string; linkType?: "url" | "section"; sectionId?: number };
                type MenuCfg = { items?: MenuItem[]; activeIndex?: number; variant?: number; align?: string; activeColor?: string; activeBgColor?: string; textColor?: string; fontSize?: number; fontWeight?: number; fontFamily?: string; textTransform?: string; gap?: number; backgroundColor?: string; borderRadius?: number };
                let mc: MenuCfg = {};
                try { mc = JSON.parse(el.content || "{}"); } catch {}
                const items: MenuItem[] = mc.items ?? [{ label: "Trang chủ", href: "#" }, { label: "Giới thiệu", href: "#" }, { label: "Dịch vụ", href: "#" }, { label: "Liên hệ", href: "#" }];
                const updateMc = (patch: Partial<MenuCfg>) => {
                  updateElement(el.id, { content: JSON.stringify({ ...mc, ...patch }) });
                  pushHistory();
                };
                const updateItem = (idx: number, patch: Partial<MenuItem>) => {
                  const next = [...items]; next[idx] = { ...next[idx], ...patch };
                  updateMc({ items: next });
                };
                const removeItem = (idx: number) => updateMc({ items: items.filter((_, i) => i !== idx) });
                const moveItem = (idx: number, dir: number) => {
                  const j = idx + dir; if (j < 0 || j >= items.length) return;
                  const next = [...items]; [next[idx], next[j]] = [next[j], next[idx]];
                  updateMc({ items: next });
                };
                return (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Menu</p>

                    {/* Style variant */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Kiểu hiển thị</span>
                      <div className="grid grid-cols-3 gap-1">
                        {([
                          [1,"Boxed"],[2,"Plain"],[3,"Màu sắc"],[4,"Underline"],[5,"Bold Upper"],[6,"Large"],[7,"Nhỏ xám"],[8,"Viền dưới"],[9,"Tối giản"],
                        ] as [number,string][]).map(([v, label]) => (
                          <button key={v} type="button"
                            onClick={() => updateMc({ variant: v })}
                            className={`px-1 py-1 text-[10px] rounded border transition-colors ${(mc.variant??1)===v ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alignment */}
                    <div className="grid grid-cols-3 gap-1">
                      {(["left","center","right"] as const).map(a => (
                        <button key={a} type="button"
                          onClick={() => updateMc({ align: a })}
                          className={`py-1 text-[10px] rounded border ${(mc.align??"left")===a?"bg-indigo-600 text-white border-indigo-600":"border-slate-200 bg-white text-slate-600"}`}>
                          {a==="left"?"Trái":a==="center"?"Giữa":"Phải"}
                        </button>
                      ))}
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chữ</span>
                        <input type="color" value={(mc.textColor??"#1e293b")} onChange={e => updateElement(el.id,{content:JSON.stringify({...mc,textColor:e.target.value})})} onBlur={()=>pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu active</span>
                        <input type="color" value={(mc.activeColor??"#f97316")} onChange={e => updateElement(el.id,{content:JSON.stringify({...mc,activeColor:e.target.value})})} onBlur={()=>pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nền active</span>
                        <input type="color" value={(mc.activeBgColor??"#fff7ed")} onChange={e => updateElement(el.id,{content:JSON.stringify({...mc,activeBgColor:e.target.value})})} onBlur={()=>pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nền menu</span>
                        <input type="color" value={(mc.backgroundColor??"#ffffff")} onChange={e => updateElement(el.id,{content:JSON.stringify({...mc,backgroundColor:e.target.value})})} onBlur={()=>pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                      </label>
                    </div>

                    {/* Font & spacing */}
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ</span>
                        <input type="number" min={10} max={36} value={(mc.fontSize??14)} onChange={e=>updateMc({fontSize:Number(e.target.value)})} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Khoảng cách</span>
                        <input type="number" min={0} max={60} value={(mc.gap??8)} onChange={e=>updateMc({gap:Number(e.target.value)})} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Độ đậm</span>
                        <select value={(mc.fontWeight??600)} onChange={e=>updateMc({fontWeight:Number(e.target.value)})} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                          {[400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}
                        </select>
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Transform</span>
                        <select value={(mc.textTransform??"none")} onChange={e=>updateMc({textTransform:e.target.value})} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                          <option value="none">Bình thường</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="capitalize">Capitalize</option>
                        </select>
                      </label>
                    </div>

                    {/* Menu items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mục menu</span>
                        <button type="button"
                          onClick={() => updateMc({ items: [...items, { label: `Mục ${items.length + 1}`, href: "#", target: "_self" }] })}
                          className="flex items-center gap-1 py-1 px-2 text-[10px] rounded border border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-500">
                          <Plus className="w-3 h-3" /> Thêm mục
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {items.map((item, idx) => (
                          <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50 space-y-1">
                            <div className="flex gap-1 items-center">
                              <button type="button" onClick={() => updateMc({ activeIndex: idx })}
                                className={`shrink-0 w-4 h-4 rounded-full border-2 ${(mc.activeIndex??0)===idx?"bg-indigo-500 border-indigo-500":"border-slate-300"}`} title="Đặt làm active" />
                              <input type="text" value={item.label} placeholder="Nhãn"
                                onChange={e => updateItem(idx, { label: e.target.value })}
                                onBlur={() => pushHistory()}
                                className="flex-1 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-semibold min-w-0" />
                              <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx===0} className="px-1 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">↑</button>
                              <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx>=items.length-1} className="px-1 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">↓</button>
                              <button type="button" onClick={() => removeItem(idx)} className="p-0.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            {/* Link type toggle */}
                            <div className="flex gap-1">
                              {(["url", "section"] as const).map(lt => (
                                <button key={lt} type="button"
                                  onClick={() => updateItem(idx, { linkType: lt, sectionId: lt === "url" ? undefined : item.sectionId })}
                                  className={`flex-1 py-0.5 text-[9px] rounded border transition-colors ${(item.linkType ?? "url") === lt ? "bg-indigo-500 text-white border-indigo-500" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                                  {lt === "url" ? "URL" : "Section"}
                                </button>
                              ))}
                            </div>
                            {(item.linkType ?? "url") === "section" ? (
                              <select
                                value={item.sectionId ?? ""}
                                onChange={e => {
                                  const sid = Number(e.target.value);
                                  const sec = sections.find(s => s.id === sid);
                                  updateItem(idx, { sectionId: sid, href: `#lp-section-${sid}`, target: "_self" });
                                  void sec;
                                }}
                                className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                              >
                                <option value="">-- Chọn section --</option>
                                {sections.map((sec, si) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.name ? sec.name : `Section ${si + 1}`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex gap-1">
                                <input type="text" value={item.href ?? ""} placeholder="URL (vd: #, https://...)"
                                  onChange={e => updateItem(idx, { href: e.target.value })}
                                  onBlur={() => pushHistory()}
                                  className="flex-1 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white min-w-0" />
                                <select value={item.target ?? "_self"} onChange={e => updateItem(idx, { target: e.target.value })}
                                  className="px-1 py-0.5 text-[9px] rounded border border-slate-200 bg-white">
                                  <option value="_self">Cùng tab</option>
                                  <option value="_blank">Tab mới</option>
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {el.type === "tabs" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Tabs</p>
                  {(() => {
                    const td = parseTabsContent(el.content ?? undefined);
                    const items = td.items;
                    const updateTd = (next: Partial<{ navStyle?: string; items: TabsItem[] }>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...td, ...next, items: next.items ?? td.items }) });
                      pushHistory();
                    };
                    const updateItem = (idx: number, next: Partial<TabsItem>) => {
                      const newItems = [...items];
                      if (idx >= 0 && idx < newItems.length) {
                        newItems[idx] = { ...newItems[idx], ...next };
                        updateTd({ items: newItems });
                      }
                    };
                    const removeItem = (idx: number) => updateTd({ items: items.filter((_, i) => i !== idx) });
                    const moveItem = (idx: number, dir: number) => {
                      const j = idx + dir;
                      if (j < 0 || j >= items.length) return;
                      const newItems = [...items];
                      [newItems[idx], newItems[j]] = [newItems[j], newItems[idx]];
                      updateTd({ items: newItems });
                    };
                    return (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => updateTd({ items: [...items, { label: `Tab ${items.length + 1}`, title: "", desc: "" }] })}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
                        >
                          <Plus className="w-4 h-4" /> Thêm tab
                        </button>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {items.map((item, idx) => (
                            <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50/50 space-y-1.5">
                              <div className="flex items-start gap-1.5">
                                <div
                                  className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-200 cursor-pointer"
                                  style={{ backgroundImage: item.image ? `url(${item.image})` : undefined, backgroundSize: "cover" }}
                                  onClick={() => onRequestAddImage?.(el.id, idx)}
                                  title="Ảnh tab (tùy chọn)"
                                  role="presentation"
                                />
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <input
                                    type="text"
                                    value={item.label ?? ""}
                                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-semibold"
                                    placeholder="Nhãn tab"
                                  />
                                  <input
                                    type="text"
                                    value={item.title ?? ""}
                                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                                    onBlur={() => pushHistory()}
                                    className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                                    placeholder="Tiêu đề"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button type="button" onClick={() => onRequestAddImage?.(el.id, idx)} className="p-1 rounded hover:bg-indigo-100 text-indigo-600" title="Chọn ảnh">
                                    <Upload className="w-3 h-3" />
                                  </button>
                                  <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Xóa tab">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={item.desc ?? ""}
                                onChange={(e) => updateItem(idx, { desc: e.target.value })}
                                onBlur={() => pushHistory()}
                                rows={3}
                                className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white resize-y min-h-[52px]"
                                placeholder="Mô tả / nội dung tab"
                              />
                              <div className="flex gap-0.5">
                                <button type="button" disabled={idx === 0} onClick={() => moveItem(idx, -1)} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">
                                  ↑
                                </button>
                                <button type="button" disabled={idx >= items.length - 1} onClick={() => moveItem(idx, 1)} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">
                                  ↓
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <input
                              type="color"
                              value={(el.styles?.backgroundColor as string) ?? "#ffffff"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc</span>
                            <input
                              type="number"
                              min={0}
                              value={(el.styles?.borderRadius as number) ?? 8}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Carousel settings merged into the Design tab block above — no duplicate block */}
              {el.type === "frame" && (() => {
                const fc = parseFrameContent(el.content);
                const fs = el.styles ?? {};
                const setFrame = (patch: Partial<FrameContent>) => {
                  const next = persistFrameSnapshotLayer({ ...fc, ...patch });
                  updateElement(el.id, { content: JSON.stringify(next) });
                };
                const applyVariant = (v: FrameVariant) => {
                  const next = applyFrameVariantSwitch(fc, v);
                  updateElement(el.id, { content: JSON.stringify(next) });
                  pushHistory();
                };
                const updStyle = (patch: Record<string, string | number>) => {
                  updateElement(el.id, { styles: { ...fs, ...patch } });
                  pushHistory();
                };
                const GRADIENT_PRESETS = [
                  "linear-gradient(180deg, #eff6ff 0%, #ffffff 55%)",
                  "linear-gradient(135deg,#667eea,#764ba2)",
                  "linear-gradient(135deg,#f093fb,#f5576c)",
                  "linear-gradient(135deg,#4facfe,#00f2fe)",
                  "linear-gradient(135deg,#43e97b,#38f9d7)",
                  "linear-gradient(135deg,#ffecd2,#fcb69f)",
                ];
                return (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-3 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Khung nội dung</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Cùng bộ mẫu với sidebar — chỉnh chi tiết bên dưới</p>
                      </div>
                    <label>
                      <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mẫu layout</span>
                      <select
                        value={fc.variant}
                        onChange={(e) => applyVariant(e.target.value as FrameVariant)}
                        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                      >
                        {(Object.keys(FRAME_VARIANT_LABELS) as FrameVariant[]).map((k) => (
                          <option key={k} value={k}>{FRAME_VARIANT_LABELS[k]}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Padding (px)</span>
                        <input
                          type="number"
                          min={0}
                          value={fc.padding}
                          onChange={(e) => setFrame({ padding: Number(e.target.value) })}
                          onBlur={() => pushHistory()}
                          className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                        />
                      </label>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc khung (px)</span>
                        <input
                          type="number"
                          min={0}
                          value={(fs.borderRadius as number) ?? 12}
                          onChange={(e) => updateElement(el.id, { styles: { ...fs, borderRadius: Number(e.target.value) } })}
                          onBlur={() => pushHistory()}
                          className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                        />
                      </label>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Nền khối (CSS)</span>
                      <div className="flex gap-1 mb-2">
                        <input
                          type="color"
                          value={fc.background.startsWith("#") && fc.background.length >= 7 ? fc.background.slice(0, 7) : "#ffffff"}
                          onChange={(e) => { setFrame({ background: e.target.value }); }}
                          onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={fc.background}
                          onChange={(e) => setFrame({ background: e.target.value })}
                          onBlur={() => pushHistory()}
                          placeholder="#fff hoặc linear-gradient(...)"
                          className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {GRADIENT_PRESETS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            title={g}
                            onClick={() => { setFrame({ background: g }); pushHistory(); }}
                            className="h-7 rounded border border-slate-200 hover:border-indigo-400"
                            style={{ background: g }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Đổ bóng (khung)</span>
                      <div className="flex gap-1 flex-wrap mb-1">
                        {[
                          { v: "", l: "Không" },
                          { v: "0 2px 8px rgba(0,0,0,0.12)", l: "Nhẹ" },
                          { v: "0 4px 20px rgba(0,0,0,0.15)", l: "Vừa" },
                          { v: "0 8px 32px rgba(0,0,0,0.2)", l: "Mạnh" },
                        ].map(({ v, l }) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => updStyle({ boxShadow: v })}
                            className={`px-2 py-0.5 text-[10px] rounded border ${(fs.boxShadow ?? "") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="0 4px 20px rgba(0,0,0,0.12)"
                        value={(fs.boxShadow as string) ?? ""}
                        onChange={(e) => updateElement(el.id, { styles: { ...fs, boxShadow: e.target.value } })}
                        onBlur={() => pushHistory()}
                        className="w-full px-2 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono"
                      />
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chữ &amp; kích thước khung</p>
                      <label>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Font chữ (toàn khung)</span>
                        <FontPicker
                          value={fc.fontFamily ?? "Inter"}
                          onChange={(f) => { setFrame({ fontFamily: f }); pushHistory(); }}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Rộng khung (px)</span>
                          <input
                            type="number"
                            min={160}
                            value={Math.round(Number(el.width) || 680)}
                            onChange={(e) => updateElement(el.id, { width: Number(e.target.value) })}
                            onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cao khung (px)</span>
                          <input
                            type="number"
                            min={100}
                            value={Math.round(Number(el.height) || 260)}
                            onChange={(e) => updateElement(el.id, { height: Number(e.target.value) })}
                            onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white"
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-snug">Thu nhỏ khung sẽ co chữ theo tỷ lệ; cỡ chữ riêng chỉnh theo từng mẫu bên dưới.</p>
                    </div>

                    {fc.variant === "quote" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trích dẫn</p>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu dấu ngoặc</span>
                          <div className="flex gap-1">
                            <input type="color" value={fc.quoteMarkColor ?? "#2563eb"} onChange={(e) => setFrame({ quoteMarkColor: e.target.value })} onBlur={() => pushHistory()} className="w-8 h-7 rounded border border-slate-200" />
                            <input type="text" value={fc.quoteMarkColor ?? ""} onChange={(e) => setFrame({ quoteMarkColor: e.target.value })} onBlur={() => pushHistory()} className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 font-mono" />
                          </div>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ dấu &ldquo; (px)</span>
                            <input type="number" min={8} max={72} value={fc.quoteMarkFontSize ?? 24} onChange={(e) => setFrame({ quoteMarkFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ đoạn (px)</span>
                            <input type="number" min={8} max={40} value={fc.quoteTextFontSize ?? 11} onChange={(e) => setFrame({ quoteTextFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chân (px)</span>
                            <input type="number" min={8} max={32} value={fc.quoteFooterFontSize ?? 10} onChange={(e) => setFrame({ quoteFooterFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nội dung</span>
                          <textarea
                            value={fc.quoteText ?? ""}
                            rows={3}
                            onChange={(e) => setFrame({ quoteText: e.target.value })}
                            onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[60px]"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chữ</span>
                            <input type="color" value={fc.quoteTextColor ?? "#475569"} onChange={(e) => setFrame({ quoteTextColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chân / link</span>
                            <input type="text" value={fc.quoteFooter ?? ""} onChange={(e) => setFrame({ quoteFooter: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chân</span>
                          <input type="color" value={fc.quoteFooterColor ?? "#2563eb"} onChange={(e) => setFrame({ quoteFooterColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                      </div>
                    )}

                    {fc.variant === "split-feature" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ảnh &amp; nội dung</p>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">Ảnh</span>
                          <FrameImageInput
                            value={fc.splitImage ?? ""}
                            onChange={(url) => { setFrame({ splitImage: url }); pushHistory(); }}
                          />
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Vị trí ảnh</span>
                          <select
                            value={fc.splitImagePosition ?? "left"}
                            onChange={(e) => { setFrame({ splitImagePosition: e.target.value as "left" | "right" }); pushHistory(); }}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          >
                            <option value="left">Trái</option>
                            <option value="right">Phải</option>
                          </select>
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc ảnh (px)</span>
                          <input type="number" min={0} value={fc.splitImageRadius ?? 8} onChange={(e) => setFrame({ splitImageRadius: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề</span>
                          <input type="text" value={fc.splitTitle ?? ""} onChange={(e) => setFrame({ splitTitle: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu tiêu đề</span>
                          <input type="color" value={fc.splitTitleColor ?? "#0f172a"} onChange={(e) => setFrame({ splitTitleColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ tiêu đề (px)</span>
                            <input type="number" min={8} max={36} value={fc.splitTitleFontSize ?? 12} onChange={(e) => setFrame({ splitTitleFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ mô tả (px)</span>
                            <input type="number" min={8} max={28} value={fc.splitBodyFontSize ?? 10} onChange={(e) => setFrame({ splitBodyFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mô tả</span>
                          <textarea value={fc.splitBody ?? ""} rows={3} onChange={(e) => setFrame({ splitBody: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 resize-y min-h-[56px]" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu mô tả</span>
                          <input type="color" value={fc.splitBodyColor ?? "#64748b"} onChange={(e) => setFrame({ splitBodyColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                      </div>
                    )}

                    {fc.variant === "profile-cta" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới thiệu &amp; CTA</p>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kiểu bố cục</span>
                          <select
                            value={fc.profileLayout ?? "vertical"}
                            onChange={(e) => {
                              setFrame({ profileLayout: e.target.value as "horizontal" | "vertical" });
                              pushHistory();
                            }}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                          >
                            <option value="vertical">Dọc — ảnh trên, căn giữa (kiểu LadiPage)</option>
                            <option value="horizontal">Ngang — ảnh trái, chữ phải</option>
                          </select>
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tên hiển thị (mẫu dọc)</span>
                          <input
                            type="text"
                            value={fc.profileName ?? ""}
                            onChange={(e) => setFrame({ profileName: e.target.value })}
                            onBlur={() => pushHistory()}
                            placeholder="VD: Trần Khánh Linh"
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200"
                          />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chức danh (mẫu dọc)</span>
                          <input
                            type="text"
                            value={fc.profileRole ?? ""}
                            onChange={(e) => setFrame({ profileRole: e.target.value })}
                            onBlur={() => pushHistory()}
                            placeholder="VD: Tổng giám đốc"
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu tên</span>
                            <input
                              type="color"
                              value={fc.profileNameColor ?? "#0f172a"}
                              onChange={(e) => setFrame({ profileNameColor: e.target.value })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chức danh</span>
                            <input
                              type="color"
                              value={fc.profileRoleColor ?? "#64748b"}
                              onChange={(e) => setFrame({ profileRoleColor: e.target.value })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ tên (px)</span>
                            <input type="number" min={8} max={28} value={fc.profileNameFontSize ?? 12} onChange={(e) => setFrame({ profileNameFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chức danh (px)</span>
                            <input type="number" min={8} max={22} value={fc.profileRoleFontSize ?? 10} onChange={(e) => setFrame({ profileRoleFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">Ảnh đại diện</span>
                          <FrameImageInput
                            value={fc.profileImage ?? ""}
                            onChange={(url) => { setFrame({ profileImage: url }); pushHistory(); }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 pt-5">
                            <input type="checkbox" checked={fc.profileImageRound !== false} onChange={(e) => { setFrame({ profileImageRound: e.target.checked }); pushHistory(); }} className="accent-indigo-600" />
                            <span className="text-[11px] text-slate-700">Ảnh tròn</span>
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kích ảnh (px)</span>
                            <input type="number" min={32} max={200} value={fc.profileImageSize ?? 96} onChange={(e) => setFrame({ profileImageSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề (có thể viết HOA)</span>
                          <input type="text" value={fc.profileTitle ?? ""} onChange={(e) => setFrame({ profileTitle: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu tiêu đề</span>
                          <input type="color" value={fc.profileTitleColor ?? "#0d9488"} onChange={(e) => setFrame({ profileTitleColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ tiêu đề (px)</span>
                            <input type="number" min={8} max={24} value={fc.profileTitleFontSize ?? 11} onChange={(e) => setFrame({ profileTitleFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ mô tả (px)</span>
                            <input type="number" min={8} max={22} value={fc.profileBodyFontSize ?? 10} onChange={(e) => setFrame({ profileBodyFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đoạn mô tả</span>
                          <textarea value={fc.profileBody ?? ""} rows={3} onChange={(e) => setFrame({ profileBody: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 resize-y min-h-[56px]" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu mô tả</span>
                          <input type="color" value={fc.profileBodyColor ?? "#64748b"} onChange={(e) => setFrame({ profileBodyColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chữ nút</span>
                            <input type="text" value={fc.profileBtnText ?? ""} onChange={(e) => setFrame({ profileBtnText: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Link nút</span>
                            <input type="text" value={fc.profileBtnUrl ?? ""} onChange={(e) => setFrame({ profileBtnUrl: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 font-mono" />
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nền nút</span>
                            <input type="color" value={fc.profileBtnBg ?? "#0d9488"} onChange={(e) => setFrame({ profileBtnBg: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chữ nút</span>
                            <input type="color" value={fc.profileBtnColor ?? "#ffffff"} onChange={(e) => setFrame({ profileBtnColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo nút (px)</span>
                            <input type="number" min={0} value={fc.profileBtnRadius ?? 6} onChange={(e) => setFrame({ profileBtnRadius: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ nút (px)</span>
                          <input type="number" min={8} max={22} value={fc.profileBtnFontSize ?? 10} onChange={(e) => setFrame({ profileBtnFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                        </label>
                      </div>
                    )}

                    {fc.variant === "numbered" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên &amp; số</p>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tên</span>
                          <input type="text" value={fc.numName ?? ""} onChange={(e) => setFrame({ numName: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chức danh</span>
                          <input type="text" value={fc.numRole ?? ""} onChange={(e) => setFrame({ numRole: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu tên</span>
                            <input type="color" value={fc.numNameColor ?? "#0f172a"} onChange={(e) => setFrame({ numNameColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chức danh</span>
                            <input type="color" value={fc.numRoleColor ?? "#64748b"} onChange={(e) => setFrame({ numRoleColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ tên (px)</span>
                            <input type="number" min={8} max={24} value={fc.numNameFontSize ?? 12} onChange={(e) => setFrame({ numNameFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chức danh (px)</span>
                            <input type="number" min={8} max={20} value={fc.numRoleFontSize ?? 10} onChange={(e) => setFrame({ numRoleFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Số / bước (text)</span>
                          <input type="text" value={fc.numValue ?? ""} onChange={(e) => setFrame({ numValue: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 font-mono" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu số</span>
                          <input type="color" value={fc.numValueColor ?? "#7c3aed"} onChange={(e) => setFrame({ numValueColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ số (px)</span>
                            <input type="number" min={12} max={72} value={fc.numValueFontSize ?? 30} onChange={(e) => setFrame({ numValueFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ mô tả (px)</span>
                            <input type="number" min={8} max={24} value={fc.numBodyFontSize ?? 10} onChange={(e) => setFrame({ numBodyFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                        </div>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đoạn mô tả</span>
                          <textarea value={fc.numBody ?? ""} rows={3} onChange={(e) => setFrame({ numBody: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 resize-y min-h-[56px]" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu mô tả</span>
                          <input type="color" value={fc.numBodyColor ?? "#64748b"} onChange={(e) => setFrame({ numBodyColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                        </label>
                      </div>
                    )}

                    {fc.variant === "blank" && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frame trống</p>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Dùng làm vùng bố cục: chỉnh nền, viền, đổ bóng ở trên. Có thể đặt phần tử khác chồng lên trên canvas.
                        </p>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Gợi ý / chú thích (hiển thị trong khung)</span>
                          <textarea
                            value={fc.blankHint ?? ""}
                            rows={3}
                            onChange={(e) => setFrame({ blankHint: e.target.value })}
                            onBlur={() => pushHistory()}
                            placeholder="Nhập gợi ý cho người thiết kế..."
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[56px]"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ gợi ý (px)</span>
                            <input type="number" min={8} max={24} value={fc.blankHintFontSize ?? 10} onChange={(e) => setFrame({ blankHintFontSize: Number(e.target.value) })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200" />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chữ gợi ý</span>
                            <input type="color" value={fc.blankHintColor ?? "#94a3b8"} onChange={(e) => setFrame({ blankHintColor: e.target.value })} onBlur={() => pushHistory()} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })()}
              {el.type === "shape" && (() => {
                const ss = el.styles ?? {};
                const upd = (patch: Record<string, string | number>) => { updateElement(el.id, { styles: { ...ss, ...patch } }); pushHistory(); };
                const curBg = (ss.backgroundColor as string) ?? "#e0e7ff";
                const isGradient = curBg.startsWith("linear-gradient") || curBg.startsWith("radial-gradient");

                // Preset màu nền
                const COLOR_PRESETS = [
                  { bg: "#e0e7ff", label: "Tím nhạt" },
                  { bg: "#dbeafe", label: "Xanh nhạt" },
                  { bg: "#d1fae5", label: "Xanh lá" },
                  { bg: "#fce7f3", label: "Hồng" },
                  { bg: "#fef3c7", label: "Vàng" },
                  { bg: "#f1f5f9", label: "Xám" },
                  { bg: "#1e293b", label: "Tối" },
                  { bg: "transparent", label: "Trong" },
                ];
                const GRADIENT_PRESETS = [
                  "linear-gradient(135deg,#667eea,#764ba2)",
                  "linear-gradient(135deg,#f093fb,#f5576c)",
                  "linear-gradient(135deg,#4facfe,#00f2fe)",
                  "linear-gradient(135deg,#43e97b,#38f9d7)",
                  "linear-gradient(135deg,#fa709a,#fee140)",
                  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
                  "linear-gradient(135deg,#ffecd2,#fcb69f)",
                  "linear-gradient(135deg,#2d3561,#c05c7e)",
                ];

                return (
                  <div className="border-t border-slate-100 pt-3 space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hình hộp</p>

                    {/* Preset màu nền */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Màu nền nhanh</span>
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        {COLOR_PRESETS.map(({ bg, label }) => (
                          <button key={bg} type="button" title={label}
                            onClick={() => upd({ backgroundColor: bg })}
                            className="w-full aspect-square rounded border-2 transition-all hover:scale-110"
                            style={{ background: bg === "transparent" ? "repeating-conic-gradient(#e5e7eb 0% 25%,white 0% 50%) 0 0/8px 8px" : bg, borderColor: curBg === bg ? "#4f46e5" : "#e2e8f0" }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1 items-center">
                        <input type="color" value={isGradient ? "#4f46e5" : curBg === "transparent" ? "#e0e7ff" : curBg}
                          onChange={(e) => upd({ backgroundColor: e.target.value })} onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                        <input type="text" value={curBg}
                          onChange={(e) => upd({ backgroundColor: e.target.value })} onBlur={() => pushHistory()}
                          placeholder="#e0e7ff hoặc linear-gradient(...)"
                          className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                      </div>
                    </div>

                    {/* Preset gradient */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Dải màu (gradient)</span>
                      <div className="grid grid-cols-4 gap-1">
                        {GRADIENT_PRESETS.map((g) => (
                          <button key={g} type="button"
                            onClick={() => upd({ backgroundColor: g })}
                            className="h-8 rounded border-2 transition-all hover:scale-105"
                            style={{ background: g, borderColor: curBg === g ? "#4f46e5" : "transparent" }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bo góc */}
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Bo góc</span>
                      <div className="flex gap-1 mb-2">
                        {[{ r: 0, l: "Vuông" }, { r: 8, l: "Nhỏ" }, { r: 16, l: "Vừa" }, { r: 32, l: "Lớn" }, { r: 999, l: "Tròn" }].map(({ r, l }) => (
                          <button key={r} type="button"
                            onClick={() => upd({ borderRadius: r, borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: r, borderBottomRightRadius: r })}
                            className={`flex-1 py-1 text-[9px] rounded border transition-colors ${Number(ss.borderRadius ?? 12) === r ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}
                          >{l}</button>
                        ))}
                      </div>
                      {/* Bo góc riêng lẻ */}
                      <div className="grid grid-cols-4 gap-1">
                        {([
                          { key: "borderTopLeftRadius",     label: "↖ TL" },
                          { key: "borderTopRightRadius",    label: "↗ TR" },
                          { key: "borderBottomRightRadius", label: "↘ BR" },
                          { key: "borderBottomLeftRadius",  label: "↙ BL" },
                        ] as const).map(({ key, label }) => (
                          <label key={key}>
                            <span className="text-[9px] text-slate-400 block text-center mb-0.5">{label}</span>
                            <input type="number" min={0} max={999}
                              value={(ss[key] as number) ?? (ss.borderRadius as number) ?? 12}
                              onChange={(e) => updateElement(el.id, { styles: { ...ss, [key]: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1 py-1 text-[10px] rounded border border-slate-200 bg-white text-center" />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Viền */}
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Viền</span>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Độ dày (px)</span>
                          <input type="number" min={0} max={20}
                            value={(ss.borderWidth as number) ?? 0}
                            onChange={(e) => updateElement(el.id, { styles: { ...ss, borderWidth: Number(e.target.value) } })} onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Kiểu viền</span>
                          <select value={(ss.borderStyle as string) ?? "solid"}
                            onChange={(e) => { upd({ borderStyle: e.target.value }); }}
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                            <option value="solid">Liền</option>
                            <option value="dashed">Nét đứt</option>
                            <option value="dotted">Nét chấm</option>
                            <option value="double">Đôi</option>
                          </select></label>
                      </div>
                      <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu viền</span>
                        <div className="flex gap-1">
                          <input type="color" value={(ss.borderColor as string) ?? "#6366f1"}
                            onChange={(e) => updateElement(el.id, { styles: { ...ss, borderColor: e.target.value } })} onBlur={() => pushHistory()}
                            className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                          <input type="text" value={(ss.borderColor as string) ?? ""}
                            onChange={(e) => updateElement(el.id, { styles: { ...ss, borderColor: e.target.value } })} onBlur={() => pushHistory()}
                            placeholder="#6366f1" className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 font-mono" />
                        </div></label>
                    </div>

                    {/* Đổ bóng */}
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Đổ bóng (box-shadow)</span>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {[
                          { v: "",                                              l: "Không" },
                          { v: "0 2px 8px rgba(0,0,0,0.12)",                  l: "Nhẹ" },
                          { v: "0 4px 20px rgba(0,0,0,0.15)",                 l: "Vừa" },
                          { v: "0 8px 32px rgba(0,0,0,0.2)",                  l: "Mạnh" },
                          { v: "0 4px 20px rgba(99,102,241,0.35)",            l: "Tím" },
                          { v: "inset 0 2px 8px rgba(0,0,0,0.15)",            l: "Trong" },
                        ].map(({ v, l }) => (
                          <button key={l} type="button" onClick={() => upd({ boxShadow: v })}
                            className={`px-2 py-1 text-[10px] rounded border transition-colors ${(ss.boxShadow ?? "") === v ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                          >{l}</button>
                        ))}
                      </div>
                      <input type="text" placeholder="0 4px 20px rgba(0,0,0,0.15)"
                        value={(ss.boxShadow as string) ?? ""}
                        onChange={(e) => updateElement(el.id, { styles: { ...ss, boxShadow: e.target.value } })} onBlur={() => pushHistory()}
                        className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                    </div>

                    {/* Overlay màu */}
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Lớp phủ màu (overlay)</span>
                      <div className="flex gap-1 mb-2">
                        <input type="color" value={(ss.overlayColor as string) ?? "#000000"}
                          onChange={(e) => updateElement(el.id, { styles: { ...ss, overlayColor: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                        <input type="text" value={(ss.overlayColor as string) ?? ""}
                          onChange={(e) => updateElement(el.id, { styles: { ...ss, overlayColor: e.target.value } })} onBlur={() => pushHistory()}
                          placeholder="Màu overlay..."
                          className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 font-mono" />
                      </div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] text-slate-400">Độ mờ overlay</span>
                        <span className="text-[10px] text-slate-500 font-mono">{Math.round(Number(ss.overlayOpacity ?? 0) * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01}
                        value={(ss.overlayOpacity as number) ?? 0}
                        onChange={(e) => updateElement(el.id, { styles: { ...ss, overlayOpacity: Number(e.target.value) } })}
                        onMouseUp={() => pushHistory()}
                        className="w-full h-1.5 accent-indigo-600" />
                    </div>
                  </div>
                );
              })()}
              {el.type === "divider" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Viền &amp; bo góc</p>
                  <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kích thước W (px)</span>
                    <input type="number" min={1} value={el.width ?? 400} onChange={(e) => updateElement(el.id, { width: Number(e.target.value) })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                  <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kiểu viền</span>
                    <select value={(el.styles?.lineStyle as string) ?? "solid"} onChange={(e) => {
                      const style = e.target.value;
                      const next: Record<string, string | number> = { ...el.styles, lineStyle: style };
                      if (style === "dashed") next.strokeDashArray = JSON.stringify([8, 4]);
                      else if (style === "dotted") next.strokeDashArray = JSON.stringify([2, 4]);
                      else if (style === "solid" || style === "double") delete next.strokeDashArray;
                      updateElement(el.id, { styles: next });
                      pushHistory();
                    }}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                      <option value="solid">Nét liền</option>
                      <option value="dashed">Nét đứt</option>
                      <option value="dotted">Nét chấm</option>
                      <option value="double">Đường kép</option>
                    </select></label>
                  <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu viền</span>
                    <div className="flex gap-1">
                      <input type="color" value={(el.styles?.backgroundColor as string) ?? "#000000"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                        className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                      <input type="text" value={(el.styles?.backgroundColor as string) ?? "#000000"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                        className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                    </div></label>
                  <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Độ dày (px)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={20} value={(el.styles?.height as number) ?? 2} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, height: Number(e.target.value) } })} onBlur={() => pushHistory()}
                        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                    </div></label>
                </div>
              )}
              {isTextType && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thiết lập chữ (giống Word)</p>
                  <label className="block">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Font chữ</span>
                    <FontPicker value={(el.styles?.fontFamily as string) ?? "Inter"} onChange={(f) => { updateElement(el.id, { styles: { fontFamily: f } }); pushHistory(); }} />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Cỡ chữ (px)</span>
                      <input type="number" min={8} max={120} value={(el.styles?.fontSize as number) ?? 14} onChange={(e) => updateElement(el.id, { styles: { fontSize: Number(e.target.value) } })} onBlur={() => pushHistory()}
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Độ đậm</span>
                      <select value={(el.styles?.fontWeight as number) ?? 400} onChange={(e) => { updateElement(el.id, { styles: { fontWeight: Number(e.target.value) } }); pushHistory(); }}
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (<option key={w} value={w}>{w}</option>))}
                      </select></label>
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    <button type="button" onClick={() => { updateElement(el.id, { styles: { fontWeight: (el.styles?.fontWeight as number) === 700 ? 400 : 700 } }); pushHistory(); }}
                      className={`w-7 h-7 rounded flex items-center justify-center ${(el.styles?.fontWeight as number) === 700 ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`} title="Đậm"><Bold className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { updateElement(el.id, { styles: { ...el.styles, fontStyle: el.styles?.fontStyle === "italic" ? "normal" : "italic" } }); pushHistory(); }}
                      className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.fontStyle === "italic" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`} title="Nghiêng"><Italic className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { updateElement(el.id, { styles: { textDecoration: el.styles?.textDecoration === "underline" ? "none" : "underline" } }); pushHistory(); }}
                      className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textDecoration === "underline" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`} title="Gạch chân"><Underline className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { updateElement(el.id, { styles: { textDecoration: el.styles?.textDecoration === "line-through" ? "none" : "line-through" } }); pushHistory(); }}
                      className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textDecoration === "line-through" ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`} title="Gạch ngang"><Strikethrough className="w-3.5 h-3.5" /></button>
                    <div className="w-px bg-slate-200 mx-0.5 self-stretch" />
                    {(["left", "center", "right", "justify"] as const).map((align) => (
                      <button key={align} type="button" onClick={() => { updateElement(el.id, { styles: { textAlign: align } }); pushHistory(); }}
                        className={`w-7 h-7 rounded flex items-center justify-center ${el.styles?.textAlign === align ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}>
                        {align === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : align === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : align === "right" ? <AlignRight className="w-3.5 h-3.5" /> : <AlignJustify className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu chữ</span>
                      <div className="flex gap-1 items-center">
                        <input type="color" value={(el.styles?.color as string) ?? "#1e293b"} onChange={(e) => updateElement(el.id, { styles: { color: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                        <input type="text" value={(el.styles?.color as string) ?? "#1e293b"} onChange={(e) => updateElement(el.id, { styles: { color: e.target.value } })} onBlur={() => pushHistory()}
                          className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                      </div></label>
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                      <div className="flex gap-1 items-center">
                        <input type="color" value={(el.styles?.backgroundColor as string) ?? "transparent"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                        <input type="text" value={(el.styles?.backgroundColor as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                          placeholder="transparent" className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                      </div></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[10px] text-slate-400 font-bold mb-0.5 flex items-center gap-1"><Type className="w-3 h-3" /> Khoảng cách chữ</span>
                      <input type="number" value={(el.styles?.letterSpacing as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { letterSpacing: Number(e.target.value) } })} onBlur={() => pushHistory()}
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" placeholder="0" /></label>
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chiều cao dòng</span>
                      <input type="number" step={0.1} min={0.5} max={3} value={(el.styles?.lineHeight as number) ?? 1.5} onChange={(e) => updateElement(el.id, { styles: { lineHeight: Number(e.target.value) } })} onBlur={() => pushHistory()}
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" placeholder="1.5" /></label>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Chữ hoa/thường</span>
                    <select value={(el.styles?.textTransform as string) ?? "none"} onChange={(e) => { updateElement(el.id, { styles: { ...el.styles, textTransform: e.target.value } }); pushHistory(); }}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                      <option value="none">Bình thường</option>
                      <option value="uppercase">CHỮ HOA</option>
                      <option value="lowercase">chữ thường</option>
                      <option value="capitalize">Chữ Hoa Đầu Dòng</option>
                    </select>
                  </div>
                  {el.type === "list" && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Kiểu danh sách</span>
                      <select value={(el.styles?.listStyle as string) ?? "disc"} onChange={(e) => { updateElement(el.id, { styles: { listStyle: e.target.value } }); pushHistory(); }}
                        className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                        <option value="disc">• Dấu chấm tròn</option>
                        <option value="decimal">1. Đánh số</option>
                        <option value="check">✓ Dấu tick</option>
                      </select>
                    </div>
                  )}
                  {/* Padding */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Khoảng đệm (padding px)</span>
                    <div className="grid grid-cols-4 gap-1">
                      {(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const).map((key) => {
                        const labels: Record<string, string> = { paddingTop: "Trên", paddingRight: "Phải", paddingBottom: "Dưới", paddingLeft: "Trái" };
                        return (
                          <label key={key}>
                            <span className="text-[9px] text-slate-400 block text-center mb-0.5">{labels[key]}</span>
                            <input type="number" min={0} max={120}
                              value={(el.styles?.[key] as number) ?? 0}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, [key]: Number(e.target.value) } })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1 py-1 text-[10px] rounded border border-slate-200 bg-white text-center" />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Viền & bo góc */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Viền & bo góc</span>
                    <div className="grid grid-cols-2 gap-2">
                      <label><span className="text-[10px] text-slate-400 block mb-0.5">Độ dày viền</span>
                        <input type="number" min={0} value={(el.styles?.borderWidth as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { borderWidth: Number(e.target.value) } })} onBlur={() => pushHistory()}
                          className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                      <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu viền</span>
                        <input type="color" value={(el.styles?.borderColor as string) ?? "#e2e8f0"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderColor: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-full h-7 rounded border border-slate-200 cursor-pointer" /></label>
                      <label className="col-span-2"><span className="text-[10px] text-slate-400 block mb-0.5">Bo góc (px)</span>
                        <input type="number" min={0} value={(el.styles?.borderRadius as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                          className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                    </div>
                  </div>

                  {/* Đổ bóng */}
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    {["text", "headline", "paragraph"].includes(el.type) && (
                      <label className="block"><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bóng chữ (text-shadow)</span>
                        <input type="text" placeholder="1px 1px 4px rgba(0,0,0,0.3)" value={(el.styles?.textShadow as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, textShadow: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white font-mono" /></label>
                    )}
                    <label className="block"><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đổ bóng hộp (box-shadow)</span>
                      <input type="text" placeholder="0 4px 12px rgba(0,0,0,0.1)" value={(el.styles?.boxShadow as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, boxShadow: e.target.value } })} onBlur={() => pushHistory()}
                        className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white font-mono" /></label>
                  </div>
                </div>
              )}
              {/* === BUTTON SETTINGS === */}
              {el.type === "button" && (() => {
                const btnBg = (el.styles?.backgroundColor as string) ?? "#4f46e5";
                const btnColor = (el.styles?.color as string) ?? "#ffffff";
                const VARIANTS = [
                  { key: "filled",   label: "Nền",    bg: btnBg,       color: btnColor,    bw: 0,  bc: btnBg },
                  { key: "outline",  label: "Viền",   bg: "transparent", color: btnBg,     bw: 2,  bc: btnBg },
                  { key: "ghost",    label: "Mờ",     bg: `${btnBg}1a`,  color: btnBg,     bw: 0,  bc: "transparent" },
                  { key: "gradient", label: "Dải màu", bg: `linear-gradient(135deg,${btnBg},#a855f7)`, color: "#fff", bw: 0, bc: btnBg },
                ];
                return (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kiểu nút</p>

                    {/* Preset variants */}
                    <div className="grid grid-cols-4 gap-1">
                      {VARIANTS.map((v) => (
                        <button key={v.key} type="button"
                          onClick={() => {
                            updateElement(el.id, { styles: { ...el.styles, backgroundColor: v.bg, color: v.color, borderWidth: v.bw, borderColor: v.bc } });
                            pushHistory();
                          }}
                          className="py-1.5 rounded text-[10px] font-semibold border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-slate-600"
                        >{v.label}</button>
                      ))}
                    </div>

                    {/* Bo góc nhanh */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Bo góc nhanh</span>
                      <div className="flex gap-1">
                        {[{ r: 0, l: "Vuông" }, { r: 8, l: "Nhỏ" }, { r: 16, l: "Vừa" }, { r: 999, l: "Tròn" }].map(({ r, l }) => (
                          <button key={r} type="button"
                            onClick={() => { updateElement(el.id, { styles: { ...el.styles, borderRadius: r } }); pushHistory(); }}
                            className={`flex-1 py-1 text-[10px] rounded border transition-colors ${(el.styles?.borderRadius as number) === r ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                          >{l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Hiệu ứng khi hover */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Màu khi rê chuột (hover)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu nền hover</span>
                          <div className="flex gap-1 items-center">
                            <input type="color"
                              value={(el.styles?.hoverBackgroundColor as string) || btnBg}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, hoverBackgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                            <input type="text"
                              value={(el.styles?.hoverBackgroundColor as string) ?? ""}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, hoverBackgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              placeholder={btnBg}
                              className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                          </div>
                        </label>
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu chữ hover</span>
                          <div className="flex gap-1 items-center">
                            <input type="color"
                              value={(el.styles?.hoverColor as string) || btnColor}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, hoverColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                            <input type="text"
                              value={(el.styles?.hoverColor as string) ?? ""}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, hoverColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              placeholder={btnColor}
                              className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Icon trong nút */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Icon trong nút (Iconify key)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Icon trái</span>
                          <input type="text" placeholder="mdi:arrow-right"
                            value={(el.styles?.iconLeft as string) ?? ""}
                            onChange={(e) => updateElement(el.id, { styles: { ...el.styles, iconLeft: e.target.value } })}
                            onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                        </label>
                        <label><span className="text-[10px] text-slate-400 block mb-0.5">Icon phải</span>
                          <input type="text" placeholder="mdi:chevron-right"
                            value={(el.styles?.iconRight as string) ?? ""}
                            onChange={(e) => updateElement(el.id, { styles: { ...el.styles, iconRight: e.target.value } })}
                            onBlur={() => pushHistory()}
                            className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                        </label>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block">Tìm icon tại <span className="text-indigo-500">iconify.design</span></span>
                    </div>

                    {/* Căn chỉnh nút */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Căn nội dung trong nút</span>
                      <div className="flex gap-1">
                        {(["flex-start", "center", "flex-end"] as const).map((align) => (
                          <button key={align} type="button"
                            onClick={() => { updateElement(el.id, { styles: { ...el.styles, justifyContent: align } }); pushHistory(); }}
                            className={`flex-1 py-1 text-[10px] rounded border transition-colors ${(el.styles?.justifyContent ?? "center") === align ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                          >{align === "flex-start" ? "Trái" : align === "center" ? "Giữa" : "Phải"}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {!isTextType && el.type !== "image" && el.type !== "divider" && el.type !== "form" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kiểu dáng</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                      <input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { backgroundColor: e.target.value } })} onBlur={() => pushHistory()} className="w-full h-7 rounded border border-slate-200 cursor-pointer" /></label>
                    <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc</span>
                      <input type="number" value={(el.styles?.borderRadius as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()} className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                  </div>
                </div>
              )}
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => { updateElement(el.id, { isLocked: !el.isLocked }); pushHistory(); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium border ${el.isLocked ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {el.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}{el.isLocked ? "Đã khóa" : "Khóa"}
                </button>
                <button type="button" onClick={() => { updateElement(el.id, { isHidden: !el.isHidden }); pushHistory(); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium border ${el.isHidden ? "border-slate-400 bg-slate-100 text-slate-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  <EyeOff className="w-3 h-3" />{el.isHidden ? "Đã ẩn" : "Ẩn"}
                </button>
              </div>
            </>
          )}
          {activeTab === "events" && <EventsTab el={el} onUpdate={updateElement} onPushHistory={pushHistory} />}
          {activeTab === "effects" && <EffectsTab el={el} onUpdate={updateElement} onPushHistory={pushHistory} />}
          {activeTab === "advanced" && <AdvancedTab el={el} onUpdate={updateElement} onPushHistory={pushHistory} />}
        </div>
      </div>
    );
  }

  if (selected.type === "section" && sec) {
    const layoutMode = sec.layoutMode ?? "manual";
    const sectionTabs = sec.sectionTabs ?? false;
    const secIdx = sections.findIndex((s) => s.id === sec.id);
    const isFirst = secIdx === 0;
    const isLast = secIdx === sections.length - 1;
    const bgType = sectionBgTab === "image" || sec.backgroundImageUrl ? "image" : "color";

    // Helper: small icon action button
    const SecBtn = ({
      onClick, title, disabled, danger, active, children,
    }: {
      onClick: () => void; title: string; disabled?: boolean; danger?: boolean;
      active?: boolean; children: React.ReactNode;
    }) => (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
          danger
            ? "hover:bg-red-50 text-red-500 hover:text-red-600"
            : active
              ? "bg-amber-50 text-amber-600 border border-amber-300"
              : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
        }`}
      >
        {children}
      </button>
    );

    // Upload bg image directly from disk
    const handleSectionBgFileUpload = async (files: FileList | null) => {
      if (!files || !files[0]) return;
      const file = files[0];
      if (!IMAGE_TYPES.includes(file.type)) {
        setSectionBgError("Chỉ hỗ trợ JPG, PNG, GIF, WebP, SVG");
        return;
      }
      setSectionBgUploading(true);
      setSectionBgError("");
      try {
        const item = await mediaApi.upload(file);
        const url = item.url.startsWith("http") ? item.url : `${API_URL}${item.url}`;
        updateSection(sec.id, { backgroundImageUrl: url, backgroundSize: "cover" });
        pushHistory();
        setSectionBgTab("image");
      } catch {
        setSectionBgError("Tải ảnh thất bại. Thử lại.");
      } finally {
        setSectionBgUploading(false);
        if (sectionBgFileRef.current) sectionBgFileRef.current.value = "";
      }
    };

    // If image picker (library) is open → show full-panel picker
    if (showSectionBgPicker) {
      return (
        <div className="flex flex-col h-full bg-white">
          <PropertyPanelHeader title={getPanelTitle()} onClose={onClose} dragHandleClassName={dragHandleClassName} />
          <button
            type="button"
            onClick={() => setShowSectionBgPicker(false)}
            className="flex items-center gap-1 px-3 py-2 text-[11px] text-slate-500 hover:text-slate-700 border-b border-slate-100 hover:bg-slate-50 transition"
          >
            <ArrowUp className="w-3 h-3 rotate-[-90deg]" />
            ← Quay lại cài đặt section
          </button>
          <div className="flex-1 overflow-y-auto">
            <ImagePickerPanel
              onUse={(url: string) => {
                updateSection(sec.id, { backgroundImageUrl: url, backgroundSize: "cover" });
                pushHistory();
                setSectionBgTab("image");
                setShowSectionBgPicker(false);
              }}
              onClose={() => setShowSectionBgPicker(false)}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white">
        <PropertyPanelHeader title={getPanelTitle()} onClose={onClose} onRename={() => {}} dragHandleClassName={dragHandleClassName} />
        <PropertyPanelTabs activeTab={activeTab} onTab={setActiveTab} />
        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4">
          {activeTab === "design" && (
            <>
              {/* ── THAO TÁC ── */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thao tác</p>

                {/* Move buttons */}
                <div className="flex items-center gap-0.5 mb-2 rounded-lg border border-slate-200 p-1 bg-slate-50/50">
                  <SecBtn title="Lên đầu trang" onClick={() => { moveSectionToIndex(sec.id, 0); pushHistory(); }} disabled={isFirst}>
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </SecBtn>
                  <SecBtn title="Lên trên" onClick={() => moveSectionUp(sec.id)} disabled={isFirst}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </SecBtn>
                  <SecBtn title="Xuống dưới" onClick={() => moveSectionDown(sec.id)} disabled={isLast}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </SecBtn>
                  <SecBtn title="Xuống cuối trang" onClick={() => { moveSectionToIndex(sec.id, sections.length - 1); pushHistory(); }} disabled={isLast}>
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </SecBtn>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <SecBtn
                    title={sec.visible === false ? "Hiển thị section" : "Ẩn section"}
                    onClick={() => { updateSection(sec.id, { visible: sec.visible === false ? true : false }); pushHistory(); }}
                    active={sec.visible === false}
                  >
                    {sec.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </SecBtn>
                  <SecBtn
                    title={sec.isLocked ? "Mở khóa section" : "Khóa section"}
                    onClick={() => { updateSection(sec.id, { isLocked: !sec.isLocked }); pushHistory(); }}
                    active={sec.isLocked}
                  >
                    {sec.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </SecBtn>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <SecBtn title="Xóa section" onClick={() => { removeSection(sec.id); pushHistory(); }} danger>
                    <Trash2 className="w-3.5 h-3.5" />
                  </SecBtn>
                </div>

                {/* Status badges */}
                {(sec.visible === false || sec.isLocked) && (
                  <div className="flex gap-1 mb-2">
                    {sec.visible === false && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <EyeOff className="w-3 h-3" /> Đang ẩn
                      </span>
                    )}
                    {sec.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Lock className="w-3 h-3" /> Đã khóa
                      </span>
                    )}
                  </div>
                )}

                {/* Quick ops */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => duplicateSection(sec.id)}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 transition">
                    <Copy className="w-3 h-3" /> Nhân bản
                  </button>
                  <button type="button" onClick={() => { addSection(); pushHistory(); }}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 transition">
                    <Plus className="w-3 h-3" /> Thêm section
                  </button>
                </div>
              </div>

              {/* ── CHẾ ĐỘ LAYOUT ── */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chế độ layout</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { updateSection(sec.id, { layoutMode: "auto" }); pushHistory(); }}
                    className={`p-2.5 rounded-lg border-2 text-left transition ${layoutMode === "auto" ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 hover:bg-slate-50"}`}>
                    <AlignHorizontalSpaceAround className="w-4 h-4 text-slate-500 mb-1" />
                    <p className="text-[10px] font-semibold text-slate-800">Tự động</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Tự động căn chỉnh</p>
                  </button>
                  <button type="button" onClick={() => { updateSection(sec.id, { layoutMode: "manual" }); pushHistory(); }}
                    className={`p-2.5 rounded-lg border-2 text-left transition ${layoutMode === "manual" ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 hover:bg-slate-50"}`}>
                    <AlignHorizontalSpaceBetween className="w-4 h-4 text-slate-500 mb-1" />
                    <p className="text-[10px] font-semibold text-slate-800">Thủ công</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Chỉnh sửa tự do</p>
                  </button>
                </div>
              </div>

              {/* ── KÍCH THƯỚC ── */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kích thước</p>
                <label className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold w-4">H</span>
                  <input type="number" min={100} step={10} value={sec.height ?? 600}
                    onChange={(e) => updateSection(sec.id, { height: Number(e.target.value) })}
                    onBlur={() => pushHistory()}
                    className="flex-1 px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                  <span className="text-[10px] text-slate-400">px</span>
                </label>
              </div>

              {/* ── MÀU & HÌNH NỀN ── */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Màu & Hình nền</p>

                {/* Type tab switcher */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-3 text-[10px] font-semibold">
                  {(["color", "image"] as const).map((t, i) => (
                    <button key={t} type="button"
                      onClick={() => setSectionBgTab(t)}
                      className={`flex-1 py-1.5 flex items-center justify-center gap-1 transition ${i > 0 ? "border-l border-slate-200" : ""} ${
                        (t === "color" && bgType === "color") || (t === "image" && bgType === "image")
                          ? "bg-slate-800 text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}>
                      {t === "color" ? <Paintbrush className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      {t === "color" ? "Màu nền" : "Hình ảnh"}
                    </button>
                  ))}
                </div>

                {/* ── Màu ── */}
                {bgType === "color" && (
                  <div className="flex items-center gap-2">
                    <input type="color" value={sec.backgroundColor ?? "#ffffff"}
                      onChange={(e) => updateSection(sec.id, { backgroundColor: e.target.value })}
                      onBlur={() => pushHistory()}
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer shrink-0" />
                    <input type="text" value={sec.backgroundColor ?? "#ffffff"}
                      onChange={(e) => updateSection(sec.id, { backgroundColor: e.target.value })}
                      onBlur={() => pushHistory()}
                      className="flex-1 px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
                    <button type="button" title="Reset màu"
                      onClick={() => { updateSection(sec.id, { backgroundColor: "#ffffff" }); pushHistory(); }}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* ── Hình ảnh ── */}
                {bgType === "image" && (
                  <div className="space-y-3">
                    {/* Preview */}
                    {sec.backgroundImageUrl ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                        <img src={sec.backgroundImageUrl} alt="bg preview" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button type="button" onClick={() => setShowSectionBgPicker(true)}
                            className="px-2.5 py-1 rounded bg-white text-slate-700 text-[10px] font-semibold hover:bg-slate-50 transition">
                            Đổi ảnh
                          </button>
                          <button type="button"
                            onClick={() => { updateSection(sec.id, { backgroundImageUrl: null, backgroundOverlayColor: null, backgroundOverlayOpacity: null }); pushHistory(); }}
                            className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 bg-slate-50/50">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                        <span className="text-[10px] text-slate-400">Chưa có hình nền</span>
                      </div>
                    )}

                    {/* Upload buttons */}
                    <input
                      ref={sectionBgFileRef}
                      type="file"
                      accept={IMAGE_TYPES.join(",")}
                      className="hidden"
                      onChange={(e) => handleSectionBgFileUpload(e.target.files)}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" disabled={sectionBgUploading}
                        onClick={() => sectionBgFileRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 disabled:opacity-50 transition">
                        <Upload className="w-3 h-3" />
                        {sectionBgUploading ? "Đang tải…" : "Tải ảnh lên"}
                      </button>
                      <button type="button"
                        onClick={() => setShowSectionBgPicker(true)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 transition">
                        <Layers className="w-3 h-3" />
                        Thư viện ảnh
                      </button>
                    </div>
                    {sectionBgError && <p className="text-[10px] text-red-500">{sectionBgError}</p>}

                    {/* URL input */}
                    <input type="text" placeholder="Hoặc dán URL ảnh..."
                      value={sec.backgroundImageUrl ?? ""}
                      onChange={(e) => updateSection(sec.id, { backgroundImageUrl: e.target.value || null })}
                      onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />

                    {/* Image settings — only when image is set */}
                    {sec.backgroundImageUrl && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-3">
                        {/* Size */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1.5">Kích thước ảnh</span>
                          <div className="flex rounded border border-slate-200 overflow-hidden text-[10px] font-medium bg-white">
                            {(["cover", "contain", "auto"] as const).map((sz, i) => (
                              <button key={sz} type="button"
                                onClick={() => { updateSection(sec.id, { backgroundSize: sz }); pushHistory(); }}
                                className={`flex-1 py-1.5 transition ${i > 0 ? "border-l border-slate-200" : ""} ${(sec.backgroundSize ?? "cover") === sz ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                                {sz === "cover" ? "Phủ đầy" : sz === "contain" ? "Vừa khít" : "Tự nhiên"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Position — 3×3 grid */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1.5">Vị trí ảnh</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              ["top left","↖"],["top center","↑"],["top right","↗"],
                              ["center left","←"],["center center","·"],["center right","→"],
                              ["bottom left","↙"],["bottom center","↓"],["bottom right","↘"],
                            ].map(([pos, icon]) => (
                              <button key={pos} type="button"
                                onClick={() => { updateSection(sec.id, { backgroundPosition: pos }); pushHistory(); }}
                                className={`h-7 rounded border text-base transition ${(sec.backgroundPosition ?? "center center") === pos ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"}`}>
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Repeat */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Lặp lại ảnh</span>
                          <button type="button"
                            onClick={() => { updateSection(sec.id, { backgroundRepeat: sec.backgroundRepeat === "repeat" ? "no-repeat" : "repeat" }); pushHistory(); }}
                            className={`relative w-8 h-4 rounded-full transition ${sec.backgroundRepeat === "repeat" ? "bg-indigo-600" : "bg-slate-200"}`}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition ${sec.backgroundRepeat === "repeat" ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>

                        {/* Overlay */}
                        <div className="border-t border-slate-200 pt-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Lớp phủ (Overlay)
                            </span>
                            <button type="button"
                              onClick={() => {
                                if (sec.backgroundOverlayColor) {
                                  updateSection(sec.id, { backgroundOverlayColor: null, backgroundOverlayOpacity: null });
                                } else {
                                  updateSection(sec.id, { backgroundOverlayColor: "#000000", backgroundOverlayOpacity: 40 });
                                }
                                pushHistory();
                              }}
                              className={`relative w-8 h-4 rounded-full transition ${sec.backgroundOverlayColor ? "bg-indigo-600" : "bg-slate-200"}`}>
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition ${sec.backgroundOverlayColor ? "left-4" : "left-0.5"}`} />
                            </button>
                          </div>
                          {sec.backgroundOverlayColor && (
                            <div className="space-y-2 pl-1">
                              <div className="flex items-center gap-2">
                                <input type="color" value={sec.backgroundOverlayColor}
                                  onChange={(e) => updateSection(sec.id, { backgroundOverlayColor: e.target.value })}
                                  onBlur={() => pushHistory()}
                                  className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                                <input type="text" value={sec.backgroundOverlayColor}
                                  onChange={(e) => updateSection(sec.id, { backgroundOverlayColor: e.target.value })}
                                  onBlur={() => pushHistory()}
                                  className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white font-mono" />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-slate-400">Độ trong suốt</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{sec.backgroundOverlayOpacity ?? 40}%</span>
                                </div>
                                <input type="range" min={0} max={100}
                                  value={sec.backgroundOverlayOpacity ?? 40}
                                  onChange={(e) => updateSection(sec.id, { backgroundOverlayOpacity: Number(e.target.value) })}
                                  onMouseUp={() => pushHistory()}
                                  className="w-full accent-indigo-600" />
                                {/* Live preview */}
                                <div className="mt-1 h-4 rounded-sm overflow-hidden flex">
                                  <div className="flex-1" style={{ background: "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQoU2NkYGBg+M9AACRgYGBgJKYIABJaAAktV1YjAAAAAElFTkSuQmCC\") repeat" }} />
                                  <div className="flex-1" style={{ background: sec.backgroundOverlayColor, opacity: (sec.backgroundOverlayOpacity ?? 40) / 100 + 0.001 }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── SECTION TABS ── */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section Tabs</span>
                  <button type="button" onClick={() => { updateSection(sec.id, { sectionTabs: !sectionTabs }); pushHistory(); }}
                    className={`relative w-9 h-5 rounded-full transition ${sectionTabs ? "bg-indigo-600" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${sectionTabs ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Biến section thành bộ tabs chuyển đổi nội dung.</p>
              </div>
            </>
          )}

          {activeTab === "events" && (
            <div className="text-center py-8 text-slate-400 text-sm px-4">
              Tính năng Sự kiện hiện chỉ áp dụng cho <br /><b className="text-indigo-500">Phần tử (Element)</b>.<br /><br />
              Hãy click chọn 1 phần tử trên khung thiết kế.
            </div>
          )}
          {activeTab === "effects" && (
            <div className="text-center py-8 text-slate-400 text-sm px-4">
              Tính năng Hiệu ứng hiện chỉ áp dụng cho <br /><b className="text-indigo-500">Phần tử (Element)</b>.<br /><br />
              Hãy click chọn 1 phần tử trên khung thiết kế.
            </div>
          )}
          {activeTab === "advanced" && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CSS Class tùy chỉnh</p>
                <input type="text" placeholder="my-section custom-class"
                  value={sec.customClass ?? ""}
                  onChange={(e) => updateSection(sec.id, { customClass: e.target.value })}
                  onBlur={() => pushHistory()}
                  className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white font-mono" />
                <p className="text-[10px] text-slate-400 mt-1">Thêm CSS class cho section để style tùy chỉnh.</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thông tin section</p>
                <div className="space-y-1 text-[10px] text-slate-500">
                  <div className="flex justify-between"><span>ID:</span><span className="font-mono">{sec.id}</span></div>
                  <div className="flex justify-between"><span>Thứ tự:</span><span>{secIdx + 1} / {sections.length}</span></div>
                  <div className="flex justify-between"><span>Phần tử:</span><span>{sec.elements.length}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {SmtpModal}
      <PropertyPanelHeader title="Trang" onClose={onClose} dragHandleClassName={dragHandleClassName} />
      <PropertyPanelTabs activeTab={activeTab} onTab={setActiveTab} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === "design" && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] text-indigo-600 font-semibold mb-2">SEO & Social</p>
            <label className="block mb-2"><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề Meta</span>
              <input type="text" value={metaTitle} onChange={(e) => updatePageMeta({ metaTitle: e.target.value })} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
            <label className="block"><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mô tả Meta</span>
              <textarea value={metaDescription} onChange={(e) => updatePageMeta({ metaDescription: e.target.value })} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white min-h-[60px]" /></label>
          </div>
        )}
        {activeTab === "events" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Sự kiện hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
        {activeTab === "effects" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Hiệu ứng hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
        {activeTab === "advanced" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Nâng cao hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
      </div>
    </div>
  );
}
