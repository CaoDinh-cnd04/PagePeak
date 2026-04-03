import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, GripVertical, Maximize2, Pencil, Zap, Wand2, Settings,
  Copy, Trash2, Lock, Unlock, EyeOff, ArrowUp, ArrowDown,
  ChevronsUp, ChevronsDown, MoveUp, MoveDown,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Paintbrush,
  AlignHorizontalSpaceAround, AlignHorizontalSpaceBetween,
  Type, Upload, Plus, Crosshair, Code2,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor/editorStore";
import { type EditorElement } from "@/types/editor";
import FontPicker from "./FontPicker";
import { mediaApi } from "@/lib/shared/api";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { mergeCarouselStyle, parseCarouselContent, parseTabsContent, type TabsItem } from "@/lib/editor/tabsContent";
import { parseBlogListContent, parseBlogDetailContent, parsePopupContent, parseSocialShareContent } from "@/lib/editor/blogContent";
import { parseCartContent, type CartLineItem } from "@/lib/editor/cartContent";
import { productsApi, formsApi, type ProductItem } from "@/lib/shared/api";
import { parseFieldsJson, type FormFieldDefinition } from "@/lib/dashboard/forms/formConfigSchema";
import {
  COLLECTION_LIST_PRESETS,
  PRODUCT_DETAIL_PRESETS,
  CART_PRESETS,
  BLOG_LIST_PRESETS,
  BLOG_DETAIL_PRESETS,
} from "@/lib/editor/editorDataPresets";
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

function ImageSettings({
  elementId,
  imageUrl,
  onUpdate,
  onPushHistory,
  styles,
}: {
  elementId: number;
  imageUrl: string;
  onUpdate: (id: number, partial: { imageUrl?: string; styles?: Record<string, string | number> }) => void;
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

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thiết lập ảnh</p>
      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Link ảnh</span>
          <ImageUrlInput value={imageUrl} onApply={(url) => { onUpdate(elementId, { imageUrl: url }); onPushHistory(); }} />
        </label>
        <div>
          <span className="text-[10px] text-slate-400 font-bold block mb-1">Thư viện ảnh</span>
          <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={handleUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold transition disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Đang tải lên..." : "+ Chọn tệp"}
          </button>
          {uploadError && <p className="text-[10px] text-red-500 mt-0.5">{uploadError}</p>}
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">Viền & bo góc</span>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="text-[10px] text-slate-400 block mb-0.5">Độ dày viền</span>
            <input type="number" min={0} value={(styles?.borderWidth as number) ?? 0} onChange={(e) => onUpdate(elementId, { styles: { ...styles, borderWidth: Number(e.target.value) } })} onBlur={onPushHistory}
              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
          <label><span className="text-[10px] text-slate-400 block mb-0.5">Màu viền</span>
            <input type="color" value={(styles?.borderColor as string) ?? "#e2e8f0"} onChange={(e) => onUpdate(elementId, { styles: { ...styles, borderColor: e.target.value } })} onBlur={onPushHistory}
              className="w-full h-7 rounded border border-slate-200 cursor-pointer" /></label>
          <label className="col-span-2"><span className="text-[10px] text-slate-400 block mb-0.5">Bo góc (px)</span>
            <input type="number" min={0} value={(styles?.borderRadius as number) ?? 0} onChange={(e) => onUpdate(elementId, { styles: { ...styles, borderRadius: Number(e.target.value) } })} onBlur={onPushHistory}
              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
        </div>
      </div>
      <div>
        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đổ bóng (box-shadow)</span>
        <input type="text" placeholder="0 4px 6px rgba(0,0,0,0.1)" value={(styles?.boxShadow as string) ?? ""} onChange={(e) => onUpdate(elementId, { styles: { ...styles, boxShadow: e.target.value } })} onBlur={onPushHistory}
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
}: {
  elementId: number;
  videoUrl: string;
  onUpdate: (id: number, partial: { videoUrl?: string; styles?: Record<string, string | number> }) => void;
  onPushHistory: () => void;
  styles: Record<string, string | number>;
  onOpenMedia?: () => void;
}) {
  const toBool = (v: string | number | undefined) => v !== 0 && v !== "0" && v !== undefined && v !== "";
  const controls = toBool(styles?.videoControls as string | number) ?? true;
  const autoplay = toBool(styles?.videoAutoplay as string | number) ?? false;
  const loop = toBool(styles?.videoLoop as string | number) ?? false;
  const muted = toBool(styles?.videoMuted as string | number) ?? false;
  const poster = (styles?.videoPoster as string) ?? "";

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thiết lập video</p>
      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đường dẫn video</span>
          <VideoUrlInput value={videoUrl} onApply={(url) => { onUpdate(elementId, { videoUrl: url }); onPushHistory(); }} />
        </label>
        {onOpenMedia && (
          <div>
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Từ thư viện / tải lên</span>
            <button
              type="button"
              onClick={onOpenMedia}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
            >
              <Upload className="w-4 h-4" />
              Xem thêm (Quản lý Media)
            </button>
          </div>
        )}
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Ảnh bìa (poster)</span>
          <input type="text" placeholder="URL ảnh bìa (tùy chọn)" value={poster} onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoPoster: e.target.value } }); onPushHistory(); }}
            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
        </label>
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">Hiện control</span>
          <input type="checkbox" checked={controls} onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoControls: e.target.checked ? 1 : 0 } }); onPushHistory(); }} className="rounded" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">Tự động chạy</span>
          <input type="checkbox" checked={autoplay} onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoAutoplay: e.target.checked ? 1 : 0 } }); onPushHistory(); }} className="rounded" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">Lặp lại</span>
          <input type="checkbox" checked={loop} onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoLoop: e.target.checked ? 1 : 0 } }); onPushHistory(); }} className="rounded" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">Tắt tiếng (autoplay)</span>
          <input type="checkbox" checked={muted} onChange={(e) => { onUpdate(elementId, { styles: { ...styles, videoMuted: e.target.checked ? 1 : 0 } }); onPushHistory(); }} className="rounded" />
        </label>
      </div>
    </div>
  );
}

function EventsTab({ el, onUpdate, onPushHistory }: { el: EditorElement, onUpdate: (id: number, partial: any) => void, onPushHistory: () => void }) {
  const sections = useEditorStore((s) => s.sections);
  const popupTargets = useMemo(
    () =>
      sections.flatMap((sec) =>
        (sec.elements ?? [])
          .filter((e) => e.type === "popup" && e.id !== el.id)
          .map((e) => {
            const p = parsePopupContent(e.content ?? undefined);
            return { id: e.id, label: p.title?.trim() || `Popup #${e.id}` };
          }),
      ),
    [sections, el.id],
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
            <span className="text-[10px] text-slate-400 font-bold block mb-1">Chọn Popup (theo ID phần tử)</span>
            <select value={actionTarget}
              onChange={(e) => { onUpdate(el.id, { styles: { ...el.styles, actionTarget: e.target.value } }); onPushHistory(); }}
              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
              <option value="">-- Chọn --</option>
              <option value="close">Đóng mọi popup đang mở</option>
              {popupTargets.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.label}</option>
              ))}
            </select>
          </label>
          {popupTargets.length === 0 && el.type !== "popup" && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">Chưa có phần tử Popup trên trang. Thêm từ nhóm Popup trái.</p>
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
    metaTitle, metaDescription, updatePageMeta, pushHistory,
    moveElementLayer,
    workspaceId,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<PropPanelTab>("design");
  const el = getSelectedElement();
  const sec = getSelectedSection();
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
    if (selected.type === "element" && el) return el.type.toUpperCase();
    if (selected.type === "section" && sec) return (sec.name ?? `Section ${sec.order}`).toUpperCase();
    return "Trang";
  };

  if (selected.type === "element" && el) {
    const isTextType = ["text", "headline", "paragraph", "button"].includes(el.type);
    return (
      <div className="flex flex-col h-full bg-white">
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
              {["text", "headline", "paragraph", "button", "html", "list"].includes(el.type) && el.type !== "html-code" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nội dung</p>
                  {el.type === "html" || el.type === "list" ? (
                    <textarea value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white min-h-[60px] font-mono" />
                  ) : (
                    <input type="text" value={el.content ?? ""} onChange={(e) => updateElement(el.id, { content: e.target.value })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                  )}
                </div>
              )}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Liên kết</p>
                <input type="text" placeholder="https://..." value={el.href ?? ""} onChange={(e) => updateElement(el.id, { href: e.target.value })} onBlur={() => pushHistory()}
                  className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
              </div>
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
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thiết lập Form</p>
                  {(() => {
                    let cfg: {
                      formType?: string;
                      title?: string;
                      buttonText?: string;
                      formConfigId?: number;
                      redirectUrl?: string;
                      fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string }[];
                      inputStyle?: string;
                      formOtp?: boolean;
                      autoComplete?: boolean;
                    } = {};
                    try { cfg = JSON.parse(el.content || "{}"); } catch {}
                    const fields = Array.isArray(cfg.fields) ? cfg.fields : [];
                    const updateForm = (next: typeof cfg) => {
                      updateElement(el.id, { content: JSON.stringify({ ...cfg, ...next }) });
                      pushHistory();
                    };
                    const addField = () => {
                      const id = `field_${Date.now()}`;
                      updateForm({ fields: [...fields, { id, name: id, label: "Trường mới", placeholder: "Nhập...", type: "text" }] });
                    };
                    const removeField = (idx: number) => {
                      updateForm({ fields: fields.filter((_, i) => i !== idx) });
                    };
                    const updateField = (idx: number, key: string, val: string) => {
                      const next = [...fields];
                      (next[idx] as Record<string, string>)[key] = val;
                      updateForm({ fields: next });
                    };
                    const syncFromWorkspace = () => {
                      const id = cfg.formConfigId;
                      if (id == null) {
                        onToast?.("Chọn cấu hình form workspace trước.", "info");
                        return;
                      }
                      const wf = workspaceForms.find((x) => x.id === id);
                      if (!wf) {
                        onToast?.("Không tìm thấy cấu hình. Hãy làm mới trang hoặc tạo tại Cấu hình Form.", "error");
                        return;
                      }
                      const defs = parseFieldsJson(wf.fieldsJson);
                      const mapped = defs.map((d: FormFieldDefinition) => ({
                        id: d.id,
                        name: d.name,
                        label: d.label,
                        placeholder: d.placeholder ?? "",
                        type: d.type,
                      }));
                      updateForm({ fields: mapped, formConfigId: id });
                      onToast?.("Đã đồng bộ trường từ cấu hình workspace.", "success");
                    };
                    return (
                      <div className="space-y-2">
                        {workspaceId != null && (
                          <div className="px-2 py-2 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-2 mb-1">
                            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Cấu hình workspace</p>
                            <label>
                              <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Gắn bộ trường đã lưu</span>
                              <select
                                value={cfg.formConfigId != null ? String(cfg.formConfigId) : ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateForm({ formConfigId: v ? Number(v) : undefined });
                                }}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900"
                              >
                                <option value="">— Chỉnh trực tiếp dưới đây —</option>
                                {workspaceForms.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={syncFromWorkspace}
                                className="text-[10px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                Đồng bộ trường
                              </button>
                              <a
                                href="/dashboard/forms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline"
                              >
                                Mở Cấu hình Form
                              </a>
                            </div>
                          </div>
                        )}
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Loại form</span>
                          <select value={cfg.formType ?? "contact"} onChange={(e) => updateForm({ formType: e.target.value })}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                            <option value="contact">Liên hệ</option>
                            <option value="registration">Đăng ký</option>
                            <option value="login">Đăng nhập</option>
                            <option value="otp">OTP</option>
                            <option value="checkout">Checkout</option>
                          </select></label>
                        {cfg.formType !== "login" && (
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề</span>
                            <input type="text" value={cfg.title ?? ""} onChange={(e) => updateForm({ title: e.target.value })} onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Tiêu đề form" /></label>
                        )}
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nút gửi</span>
                          <input type="text" value={cfg.buttonText ?? "Gửi"} onChange={(e) => updateForm({ buttonText: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        {cfg.formType !== "login" && (
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chuyển hướng sau khi gửi (tùy chọn)</span>
                            <input
                              type="url"
                              value={cfg.redirectUrl ?? ""}
                              onChange={(e) => updateForm({ redirectUrl: e.target.value || undefined })}
                              onBlur={() => pushHistory()}
                              className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                              placeholder="https://... (cảm ơn / thank-you)"
                            />
                          </label>
                        )}
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kiểu ô nhập</span>
                          <select value={cfg.inputStyle ?? "outlined"} onChange={(e) => updateForm({ inputStyle: e.target.value })}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                            <option value="outlined">Viền</option>
                            <option value="filled">Nền</option>
                            <option value="underlined">Gạch chân</option>
                          </select></label>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-bold">Trường ({fields.length})</span>
                            <button type="button" onClick={addField} className="text-[10px] text-indigo-600 hover:underline">+ Thêm</button>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {fields.map((f, idx) => (
                              <div key={f.id} className="flex items-center gap-1 p-1.5 rounded border border-slate-200 bg-slate-50/50">
                                <input type="text" value={f.label ?? ""} onChange={(e) => updateField(idx, "label", e.target.value)} onBlur={() => pushHistory()}
                                  className="flex-1 min-w-0 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" placeholder="Nhãn" />
                                <button type="button" onClick={() => removeField(idx)} className="p-1 rounded hover:bg-red-100 text-red-500 text-[10px]">×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
                            <input type="checkbox" checked={cfg.formOtp ?? false} onChange={(e) => updateForm({ formOtp: e.target.checked })} className="rounded" />
                            Form OTP
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
                            <input type="checkbox" checked={cfg.autoComplete !== false} onChange={(e) => updateForm({ autoComplete: e.target.checked })} className="rounded" />
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
              {el.type === "gallery" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gallery</p>
                  {(() => {
                    let urls: string[] = [];
                    try {
                      const p = JSON.parse(el.content || "[]");
                      urls = Array.isArray(p) ? p : [];
                    } catch {}
                    return (
                      <div className="space-y-2">
                        {urls.length > 0 && (
                          <p className="text-[11px] text-slate-500">{urls.length} ảnh</p>
                        )}
                        {onRequestAddImage && (
                          <button
                            type="button"
                            onClick={() => onRequestAddImage(el.id)}
                            className="w-full min-h-[88px] flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/80 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 text-[11px] font-medium transition-colors"
                          >
                            <Upload className="w-5 h-5 text-slate-400" />
                            <span className="font-semibold">Thêm ảnh</span>
                            <span className="text-[10px] text-slate-400 font-normal text-center leading-snug">Trên canvas: chỉ ô khung nét đứt (chưa có ảnh mẫu)</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "product-detail" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Sản phẩm chi tiết</p>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mẫu dữ liệu</p>
                    <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-0.5">
                      {PRODUCT_DETAIL_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateElement(el.id, {
                              content: JSON.stringify(preset.content),
                              styles: { ...el.styles, ...(preset.styles ?? {}) },
                            });
                            pushHistory();
                          }}
                          className="text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                        >
                          <span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span>
                          <span className="block text-[9px] text-slate-500 leading-snug">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const pd = parseProductDetailContent(el.content ?? undefined);
                    const imgs = pd.images;
                    const updatePd = (next: Partial<ReturnType<typeof parseProductDetailContent>>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...pd, ...next }) });
                      pushHistory();
                    };
                    const setImages = (urls: string[]) => updatePd({ images: urls });
                    const addImage = (url: string) => setImages([...imgs, url]);
                    const removeImage = (idx: number) => setImages(imgs.filter((_, i) => i !== idx));
                    return (
                      <div className="space-y-2">
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tên sản phẩm</span>
                          <input type="text" value={pd.title ?? ""} onChange={(e) => updatePd({ title: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Giá gốc</span>
                          <input type="text" value={pd.price ?? ""} onChange={(e) => updatePd({ price: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="1.290.000đ" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Giá khuyến mãi</span>
                          <input type="text" value={pd.salePrice ?? ""} onChange={(e) => updatePd({ salePrice: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="990.000đ" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Badge</span>
                          <input type="text" value={pd.badge ?? ""} onChange={(e) => updatePd({ badge: e.target.value })} onBlur={() => pushHistory()}
                            className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" placeholder="Giảm 20%" /></label>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Mô tả</span>
                          <textarea value={pd.description ?? ""} onChange={(e) => updatePd({ description: e.target.value })} onBlur={() => pushHistory()}
                            rows={4} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[72px]" /></label>
                        {onRequestAddImage && (
                          <button type="button" onClick={() => onRequestAddImage(el.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold">
                            <Plus className="w-4 h-4" /> Thêm ảnh
                          </button>
                        )}
                        {imgs.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {imgs.map((url, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 bg-slate-50/50">
                                <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-200" style={{ backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "cover" }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-500 truncate">Ảnh {idx + 1}</p>
                                </div>
                                <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Xóa"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <input type="color" value={(el.styles?.backgroundColor as string) ?? "#ffffff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer" /></label>
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc</span>
                            <input type="number" min={0} value={(el.styles?.borderRadius as number) ?? 12} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "collection-list" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Danh sách sản phẩm</p>
                    <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-slate-50/80 p-2.5">
                      <p className="text-[10px] text-slate-700 leading-snug">
                        Đây là khối <span className="font-semibold text-indigo-900">dữ liệu lưới</span> (ảnh, tên, giá) lưu trong trang — hiển thị giống catalog,{" "}
                        <span className="font-medium">không phải nút</span> trên bản xuất bản. Sidebar: kéo thả hoặc nhấn để thêm khối; chỉnh từng ô tại đây.
                      </p>
                    </div>
                  </div>
                  {(() => {
                    let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
                    try { cl = JSON.parse(el.content || "{}"); } catch {}
                    const items = cl.items ?? [];
                    const updateCl = (next: Partial<typeof cl>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...cl, ...next }) });
                      pushHistory();
                    };
                    const updateItem = (idx: number, next: Partial<{ image: string; title: string; price: string }>) => {
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
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mẫu dữ liệu</p>
                          <p className="text-[9px] text-slate-400 mb-1.5">Chọn để thay toàn bộ lưới + màu nền (có thể sửa lại sau).</p>
                          <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pr-0.5">
                            {COLLECTION_LIST_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  updateElement(el.id, {
                                    content: JSON.stringify(preset.content),
                                    styles: { ...el.styles, ...(preset.styles ?? {}) },
                                  });
                                  pushHistory();
                                }}
                                className="text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                              >
                                <span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span>
                                <span className="block text-[9px] text-slate-500 leading-snug">{preset.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bố cục</p>
                          <div className="grid grid-cols-1 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Số cột</span>
                              <input
                                type="number"
                                min={1}
                                max={6}
                                value={cl.columns ?? 3}
                                onChange={(e) => updateCl({ columns: Number(e.target.value) })}
                                onBlur={() => pushHistory()}
                                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label>
                                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền lưới</span>
                                <input
                                  type="color"
                                  value={(el.styles?.backgroundColor as string) ?? "#f8fafc"}
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
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dữ liệu từng ô</p>
                          <button
                            type="button"
                            onClick={() => updateCl({ items: [...items, { image: "", title: `Sản phẩm ${items.length + 1}`, price: "0đ" }] })}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-700 text-[11px] font-medium transition-colors"
                          >
                            <Plus className="w-4 h-4 text-indigo-600" /> Thêm sản phẩm vào lưới
                          </button>
                          <div className="space-y-2 max-h-52 overflow-y-auto mt-2">
                            {items.length === 0 && (
                              <p className="text-[10px] text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">Chưa có ô nào — nhấn nút trên để thêm dòng dữ liệu.</p>
                            )}
                            {items.map((item, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-sm space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Ô {idx + 1}</p>
                                <div className="flex items-start gap-1.5">
                                  <div
                                    className="w-11 h-11 rounded-md overflow-hidden shrink-0 bg-slate-100 border border-slate-200 cursor-pointer flex items-center justify-center text-[9px] text-slate-400"
                                    style={{ backgroundImage: item.image ? `url(${item.image})` : undefined, backgroundSize: "cover" }}
                                    onClick={() => onRequestAddImage?.(el.id, idx)}
                                    title={onRequestAddImage ? "Chọn ảnh từ Media" : "Thêm URL ảnh ở ô bên dưới nếu không dùng Media"}
                                    role="presentation"
                                  >
                                    {!item.image && "Ảnh"}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <input
                                      type="text"
                                      value={item.title ?? ""}
                                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                                      onBlur={() => pushHistory()}
                                      className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                                      placeholder="Tên hiển thị"
                                    />
                                    <input
                                      type="text"
                                      value={item.price ?? ""}
                                      onChange={(e) => updateItem(idx, { price: e.target.value })}
                                      onBlur={() => pushHistory()}
                                      className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white"
                                      placeholder="Giá (vd: 299.000đ)"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    {onRequestAddImage && (
                                      <button
                                        type="button"
                                        onClick={() => onRequestAddImage(el.id, idx)}
                                        className="p-1 rounded hover:bg-indigo-100 text-indigo-600"
                                        title="Thư viện ảnh"
                                      >
                                        <Upload className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Xóa ô">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex gap-0.5 justify-end">
                                  <button type="button" disabled={idx === 0} onClick={() => moveItem(idx, -1)} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40">
                                    Lên
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx >= items.length - 1}
                                    onClick={() => moveItem(idx, 1)}
                                    className="px-1.5 py-0.5 text-[9px] rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                                  >
                                    Xuống
                                  </button>
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
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mẫu dữ liệu</p>
                    <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-0.5">
                      {BLOG_LIST_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateElement(el.id, {
                              content: JSON.stringify({
                                columns: preset.content.columns ?? 2,
                                posts: preset.content.posts ?? [],
                              }),
                              styles: { ...el.styles, ...(preset.styles ?? {}) },
                            });
                            pushHistory();
                          }}
                          className="text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                        >
                          <span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span>
                          <span className="block text-[9px] text-slate-500 leading-snug">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mẫu dữ liệu</p>
                    <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-0.5">
                      {BLOG_DETAIL_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateElement(el.id, {
                              content: JSON.stringify(preset.content),
                              styles: { ...el.styles, ...(preset.styles ?? {}) },
                            });
                            pushHistory();
                          }}
                          className="text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                        >
                          <span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span>
                          <span className="block text-[9px] text-slate-500 leading-snug">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Popup</p>
                  {(() => {
                    const pop = parsePopupContent(el.content ?? undefined);
                    const updatePop = (next: Partial<typeof pop>) => {
                      updateElement(el.id, { content: JSON.stringify({ ...pop, ...next }) });
                      pushHistory();
                    };
                    const popupFlat = Number(el.styles?.popupFlat) === 1;
                    return (
                      <div className="space-y-2">
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tiêu đề</span>
                          <input type="text" value={pop.title ?? ""} onChange={(e) => updatePop({ title: e.target.value })} onBlur={() => pushHistory()} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                        </label>
                        <label>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nội dung</span>
                          <textarea value={pop.body ?? ""} onChange={(e) => updatePop({ body: e.target.value })} onBlur={() => pushHistory()} rows={6} className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white resize-y min-h-[72px]" />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={popupFlat}
                            onChange={(e) => {
                              updateElement(el.id, { styles: { ...el.styles, popupFlat: e.target.checked ? 1 : 0 } });
                              pushHistory();
                            }}
                            className="rounded border-slate-300 text-[#1e2d7d]"
                          />
                          <span className="text-[11px] text-slate-700">Một khối (không tách thanh tiêu đề)</span>
                        </label>
                        {!popupFlat && (
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Nền thanh tiêu đề</span>
                              <input
                                type="color"
                                value={(el.styles?.headerBackgroundColor as string) ?? "#1e293b"}
                                onChange={(e) => updateElement(el.id, { styles: { ...el.styles, headerBackgroundColor: e.target.value } })}
                                onBlur={() => pushHistory()}
                                className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                              />
                            </label>
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chữ tiêu đề</span>
                              <input
                                type="color"
                                value={(el.styles?.headerTextColor as string) ?? "#ffffff"}
                                onChange={(e) => updateElement(el.id, { styles: { ...el.styles, headerTextColor: e.target.value } })}
                                onBlur={() => pushHistory()}
                                className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                              />
                            </label>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền khối</span>
                            <input
                              type="color"
                              value={(el.styles?.backgroundColor as string) ?? "#ffffff"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chữ nội dung</span>
                            <input
                              type="color"
                              value={(el.styles?.bodyTextColor as string) ?? (el.styles?.color as string) ?? "#334155"}
                              onChange={(e) => updateElement(el.id, { styles: { ...el.styles, bodyTextColor: e.target.value } })}
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
                          {popupFlat && (
                            <label>
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Chữ tiêu đề</span>
                              <input
                                type="color"
                                value={(el.styles?.headerTextColor as string) ?? (el.styles?.color as string) ?? "#0f172a"}
                                onChange={(e) => updateElement(el.id, { styles: { ...el.styles, headerTextColor: e.target.value } })}
                                onBlur={() => pushHistory()}
                                className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                              />
                            </label>
                          )}
                        </div>
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
                          className="w-full py-2 rounded-lg bg-[#1e2d7d] hover:bg-[#162558] text-white text-[11px] font-semibold transition"
                        >
                          Lưu làm mẫu của tôi
                        </button>
                        <p className="text-[9px] text-slate-400 leading-snug">Mẫu lưu trong trình duyệt (localStorage). Mở Quản lý Popup → tab Popup của tôi để chèn lại.</p>
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
              {el.type === "cart" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Giỏ hàng</p>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mẫu dữ liệu</p>
                    <p className="text-[9px] text-slate-400">Chọn để nạp nhanh dòng sản phẩm + nền (vẫn chỉnh tay sau).</p>
                    <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-0.5">
                      {CART_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateElement(el.id, {
                              content: preset.contentJson,
                              styles: { ...el.styles, ...(preset.styles ?? {}) },
                            });
                            pushHistory();
                          }}
                          className="text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                        >
                          <span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span>
                          <span className="block text-[9px] text-slate-500 leading-snug">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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
              {el.type === "carousel" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  {(() => {
                    const cd = parseCarouselContent(el.content ?? undefined);
                    const st = mergeCarouselStyle(cd.carouselStyle);
                    const items = [...cd.items];
                    const isMedia = cd.layoutType === "media";
                    const updateCarousel = (nextItems: typeof items, nextStyle = cd.carouselStyle) => {
                      updateElement(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: nextItems, carouselStyle: nextStyle }) });
                    };
                    const updateItem = (idx: number, patch: Record<string, string>) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], ...patch };
                      updateCarousel(next);
                    };
                    return (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carousel</p>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Font chữ</span>
                            <FontPicker value={st.fontFamily ?? "Inter"} onChange={(f) => { updateCarousel(items, { ...cd.carouselStyle, fontFamily: f }); pushHistory(); }} />
                          </label>
                          <label>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Tự chuyển (ms)</span>
                            <input type="number" min={0} step={500} value={st.autoplayMs}
                              onChange={(e) => updateCarousel(items, { ...cd.carouselStyle, autoplayMs: Number(e.target.value) })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                          </label>
                          <label>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Cỡ chữ chính</span>
                            <input type="number" min={8} max={32} value={isMedia ? st.titleFontSize : st.quoteFontSize}
                              onChange={(e) => updateCarousel(items, isMedia ? { ...cd.carouselStyle, titleFontSize: Number(e.target.value) } : { ...cd.carouselStyle, quoteFontSize: Number(e.target.value) })}
                              onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" />
                          </label>
                          <label>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Màu chữ chính</span>
                            <input type="color" value={isMedia ? st.titleColor : st.quoteColor}
                              onChange={(e) => updateCarousel(items, isMedia ? { ...cd.carouselStyle, titleColor: e.target.value } : { ...cd.carouselStyle, quoteColor: e.target.value })}
                              onBlur={() => pushHistory()}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </label>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {items.map((it, idx) => (
                            <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50/50 space-y-1">
                              {isMedia ? (
                                <>
                                  <input type="text" value={it.title ?? ""} onChange={(e) => updateItem(idx, { title: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-semibold" placeholder="Tiêu đề slide" />
                                  <textarea value={it.desc ?? ""} onChange={(e) => updateItem(idx, { desc: e.target.value })} onBlur={() => pushHistory()} rows={2} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" placeholder="Mô tả" />
                                </>
                              ) : (
                                <>
                                  <textarea value={it.quote ?? ""} onChange={(e) => updateItem(idx, { quote: e.target.value })} onBlur={() => pushHistory()} rows={2} className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white" placeholder="Quote" />
                                  <input type="text" value={it.name ?? ""} onChange={(e) => updateItem(idx, { name: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white font-semibold" placeholder="Tên" />
                                  <input type="text" value={it.role ?? ""} onChange={(e) => updateItem(idx, { role: e.target.value })} onBlur={() => pushHistory()} className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 bg-white" placeholder="Vai trò" />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {el.type === "shape" && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hình hộp</p>
                  {(() => {
                    let urls: string[] = [];
                    try {
                      const p = JSON.parse(el.content || "[]");
                      urls = Array.isArray(p) ? p : [];
                    } catch {}
                    const removeImage = (idx: number) => {
                      const next = urls.filter((_, i) => i !== idx);
                      updateElement(el.id, { content: JSON.stringify(next) });
                      pushHistory();
                    };
                    const moveImage = (idx: number, dir: number) => {
                      const next = [...urls];
                      const j = idx + dir;
                      if (j < 0 || j >= next.length) return;
                      [next[idx], next[j]] = [next[j], next[idx]];
                      updateElement(el.id, { content: JSON.stringify(next) });
                      pushHistory();
                    };
                    return (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">{urls.length} ảnh</p>
                        {onRequestAddImage && (
                          <button
                            type="button"
                            onClick={() => onRequestAddImage(el.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 text-[11px] font-semibold"
                          >
                            <Upload className="w-4 h-4" />
                            Thêm ảnh
                          </button>
                        )}
                        {urls.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {urls.map((url, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 bg-slate-50/50">
                                <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-200" style={{ backgroundImage: `url(${url})`, backgroundSize: "cover" }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-500 truncate">{idx + 1}</p>
                                </div>
                                <div className="flex gap-0.5">
                                  <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40" title="Lên"><ArrowUp className="w-3 h-3" /></button>
                                  <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === urls.length - 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40" title="Xuống"><ArrowDown className="w-3 h-3" /></button>
                                  <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Xóa"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu nền</span>
                            <div className="flex gap-1">
                              <input type="color" value={(el.styles?.backgroundColor as string) ?? "#e0e7ff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                                className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                              <input type="text" value={(el.styles?.backgroundColor as string) ?? "#e0e7ff"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, backgroundColor: e.target.value } })} onBlur={() => pushHistory()}
                                className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                            </div></label>
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bo góc</span>
                            <input type="number" min={0} value={(el.styles?.borderRadius as number) ?? 8} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderRadius: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Viền (px)</span>
                            <input type="number" min={0} value={(el.styles?.borderWidth as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderWidth: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kiểu viền</span>
                            <select value={(el.styles?.borderStyle as string) ?? "solid"} onChange={(e) => { updateElement(el.id, { styles: { ...el.styles, borderStyle: e.target.value } }); pushHistory(); }}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white">
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                            </select></label>
                        </div>
                        <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Màu viền</span>
                          <div className="flex gap-1">
                            <input type="color" value={(el.styles?.borderColor as string) ?? "#e2e8f0"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderColor: e.target.value } })} onBlur={() => pushHistory()}
                              className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                            <input type="text" value={(el.styles?.borderColor as string) ?? "#e2e8f0"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, borderColor: e.target.value } })} onBlur={() => pushHistory()}
                              className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                          </div></label>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Overlay màu</span>
                            <div className="flex gap-1">
                              <input type="color" value={(el.styles?.overlayColor as string) ?? "#000000"} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, overlayColor: e.target.value } })} onBlur={() => pushHistory()}
                                className="w-8 h-7 rounded border border-slate-200 cursor-pointer shrink-0" />
                              <input type="text" value={(el.styles?.overlayColor as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, overlayColor: e.target.value } })} onBlur={() => pushHistory()}
                                placeholder="Không" className="flex-1 px-1.5 py-1 text-[10px] rounded border border-slate-200 bg-white font-mono" />
                            </div></label>
                          <label><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Overlay opacity</span>
                            <input type="number" min={0} max={1} step={0.1} value={(el.styles?.overlayOpacity as number) ?? 0} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, overlayOpacity: Number(e.target.value) } })} onBlur={() => pushHistory()}
                              className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-200 bg-white" /></label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
                    {el.type === "button" && (
                      <label className="block mt-2"><span className="text-[10px] text-slate-400 font-bold block mb-0.5">Đổ bóng (box-shadow)</span>
                        <input type="text" placeholder="0 4px 6px rgba(0,0,0,0.1)" value={(el.styles?.boxShadow as string) ?? ""} onChange={(e) => updateElement(el.id, { styles: { ...el.styles, boxShadow: e.target.value } })} onBlur={() => pushHistory()}
                          className="w-full px-2 py-1.5 text-[10px] rounded border border-slate-200 bg-white font-mono" /></label>
                    )}
                  </div>
                </div>
              )}
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
    return (
      <div className="flex flex-col h-full bg-white">
        <PropertyPanelHeader title={getPanelTitle()} onClose={onClose} onRename={() => {}} dragHandleClassName={dragHandleClassName} />
        <PropertyPanelTabs activeTab={activeTab} onTab={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {activeTab === "design" && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chế độ layout</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { updateSection(sec.id, { layoutMode: "auto" }); pushHistory(); }}
                    className={`p-3 rounded-lg border-2 text-left transition ${layoutMode === "auto" ? "border-slate-200 bg-slate-50" : "border-transparent bg-slate-50/50 hover:bg-slate-50"}`}>
                    <AlignHorizontalSpaceAround className="w-5 h-5 text-slate-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-800">Tự động</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tự động căn chỉnh phần tử</p>
                  </button>
                  <button type="button" onClick={() => { updateSection(sec.id, { layoutMode: "manual" }); pushHistory(); }}
                    className={`p-3 rounded-lg border-2 text-left transition ${layoutMode === "manual" ? "border-indigo-500 bg-indigo-50/30" : "border-transparent bg-slate-50/50 hover:bg-slate-50"}`}>
                    <AlignHorizontalSpaceBetween className="w-5 h-5 text-slate-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-800">Thủ công</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Chỉnh sửa phần tử tự do</p>
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section Tabs</span>
                  <button type="button" onClick={() => { updateSection(sec.id, { sectionTabs: !sectionTabs }); pushHistory(); }}
                    className={`relative w-9 h-5 rounded-full transition ${sectionTabs ? "bg-indigo-600" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${sectionTabs ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kích thước</p>
                <label className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold w-4">H</span>
                  <input type="number" value={sec.height ?? 600} onChange={(e) => updateSection(sec.id, { height: Number(e.target.value) })} onBlur={() => pushHistory()}
                    className="flex-1 px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                </label>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Màu & Hình nền</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Chọn kiểu</span>
                    <select className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white">
                      <option>Màu cơ bản</option>
                      <option>Hình ảnh</option>
                      <option>Gradient</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Màu nền</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={sec.backgroundColor ?? "#ffffff"} onChange={(e) => updateSection(sec.id, { backgroundColor: e.target.value })} onBlur={() => pushHistory()}
                        className="w-10 h-8 rounded border border-slate-200 cursor-pointer shrink-0" />
                      <span className="text-[11px] text-slate-600">Chọn màu</span>
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Ảnh nền URL</span>
                    <input type="text" placeholder="https://..." value={sec.backgroundImageUrl ?? ""} onChange={(e) => updateSection(sec.id, { backgroundImageUrl: e.target.value })} onBlur={() => pushHistory()}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-200 bg-white" />
                  </label>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Thao tác</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveSectionUp(sec.id)} className="p-1.5 rounded hover:bg-slate-100" title="Lên"><ArrowUp className="w-3.5 h-3.5 text-slate-500" /></button>
                  <button type="button" onClick={() => moveSectionDown(sec.id)} className="p-1.5 rounded hover:bg-slate-100" title="Xuống"><ArrowDown className="w-3.5 h-3.5 text-slate-500" /></button>
                  <button type="button" onClick={() => duplicateSection(sec.id)} className="p-1.5 rounded hover:bg-slate-100" title="Nhân bản"><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
                  <button type="button" onClick={() => { removeSection(sec.id); pushHistory(); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </>
          )}
          {activeTab === "events" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Sự kiện hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
          {activeTab === "effects" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Hiệu ứng hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
          {activeTab === "advanced" && <div className="text-center py-8 text-slate-400 text-sm px-4">Tính năng Nâng cao hiện chỉ áp dụng cho <br/><b className="text-indigo-500">Phần tử (Element)</b>.<br/><br/>Hãy click chọn 1 phần tử trên khung thiết kế để cài đặt.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
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
