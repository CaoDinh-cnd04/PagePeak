import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  ChevronLeft, Eye, Save, Smartphone, Monitor,
  Layers, Undo2, Redo2, Plus, Globe, X,
  CheckCircle2, XCircle, AlertTriangle,
  HelpCircle, Settings, Keyboard, LayoutGrid,
  ChevronRight, ChevronDown, Copy, Link2, ExternalLink, ClipboardCopy,
  History, BookOpen, Maximize2, Minimize2, Grid3x3, FileDown, Image as ImageIcon, FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/stores/editorStore";
import { pagesApi, editorToolsApi, domainsApi, type PublishCheck } from "@/lib/api";
import MediaPanel from "@/components/editor/MediaPanel";
import ImagePickerPanel from "@/components/editor/ImagePickerPanel";
import VideoPickerPanel from "@/components/editor/VideoPickerPanel";
import IconPickerPanel from "@/components/editor/IconPickerPanel";
import LinePickerPanel from "@/components/editor/LinePickerPanel";
import FormPickerPanel from "@/components/editor/FormPickerPanel";
import { generatePreviewHtml, downloadHtml } from "@/lib/generatePreviewHtml";
import { parseProductDetailContent } from "@/lib/productDetailContent";
import { parseTabsContent, parseCarouselContent } from "@/lib/tabsContent";
import { parseBlogListContent } from "@/lib/blogContent";
import { getLucideIcon } from "@/lib/iconMap";
import DomCanvas, { type DomCanvasHandle } from "@/components/editor/DomCanvas";
import { Rnd } from "react-rnd";
import { EditorDndProvider, DroppableCanvas } from "@/components/editor/DndCanvas";
import { SortableLayersPanel } from "@/components/editor/SortableLayers";
import { PropertyPanelLadi } from "@/components/editor/PropertyPanelLadi";
import { GlobalSettingsPanel } from "@/components/editor/GlobalSettingsPanel";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { PopupManageModal } from "@/components/editor/PopupManageModal";
import { UtilitiesHubModal } from "@/components/editor/UtilitiesHubModal";
import { PageUtilityFxPreview } from "@/components/editor/PageUtilityFxPreview";
import type { PopupTemplateEntry, MySavedPopup } from "@/lib/popupTemplateCatalog";
import { exportCanvasToPng } from "@/lib/exportPng";
import { exportCanvasToPdf } from "@/lib/exportPdf";
import { loadFontsFromSections } from "@/lib/fontLoader";
import type { EditorElementType, ToolCategoryData, ToolItemData, ElementPresetData } from "@/types/editor";
import { ZOOM_PRESETS } from "@/types/editor";
import { normalizeToolCategories } from "@/lib/normalizeElementType";

/** Fallback khi API editor-tools lỗi hoặc trả về rỗng */
const DEFAULT_TOOL_CATEGORIES: ToolCategoryData[] = [
  {
    id: 1,
    name: "Phần tử",
    icon: "layout-grid",
    order: 1,
    items: [
      { id: 101, name: "Văn bản", icon: "type", elementType: "text", order: 1, hasSubTabs: true, subTabs: "[\"Tiêu đề\",\"Đoạn văn\",\"Danh sách\"]", presets: [] },
      { id: 102, name: "Nút bấm", icon: "mouse-pointer-click", elementType: "button", order: 2, hasSubTabs: false, presets: [] },
      { id: 103, name: "Ảnh", icon: "image", elementType: "image", order: 3, hasSubTabs: false, presets: [] },
      { id: 104, name: "Gallery", icon: "layout-grid", elementType: "gallery", order: 4, hasSubTabs: false, presets: [] },
      { id: 105, name: "Hình hộp", icon: "square", elementType: "shape", order: 5, hasSubTabs: false, presets: [] },
      { id: 106, name: "Biểu tượng", icon: "smile", elementType: "icon", order: 6, hasSubTabs: false, presets: [] },
      { id: 107, name: "Đường kẻ", icon: "minus", elementType: "divider", order: 7, hasSubTabs: false, presets: [] },
      { id: 108, name: "Form", icon: "clipboard-list", elementType: "form", order: 8, hasSubTabs: false, presets: [] },
      { id: 109, name: "Video", icon: "play", elementType: "video", order: 9, hasSubTabs: false, presets: [] },
      { id: 110, name: "Mã HTML", icon: "code", elementType: "html-code", order: 10, hasSubTabs: false, presets: [] },
      { id: 111, name: "Tabs", icon: "panel-top", elementType: "tabs", order: 11, hasSubTabs: false, presets: [] },
      { id: 112, name: "Carousel", icon: "gallery-horizontal", elementType: "carousel", order: 12, hasSubTabs: false, presets: [] },
    ],
  },
  {
    id: 4,
    name: "Assets",
    icon: "images",
    order: 2,
    items: [],
    sidebarAction: "media",
  },
  {
    id: 2,
    name: "Section",
    icon: "layers",
    order: 3,
    items: [
      { id: 201, name: "Section trống", icon: "plus-square", elementType: "section", order: 1, hasSubTabs: false, presets: [], sectionTemplate: "blank" },
      { id: 202, name: "Hero (mẫu)", icon: "layout", elementType: "section", order: 2, hasSubTabs: false, presets: [], sectionTemplate: "hero" },
    ],
  },
  {
    id: 3,
    name: "Sản phẩm",
    icon: "shopping-bag",
    order: 4,
    items: [
      { id: 301, name: "Chi tiết sản phẩm", icon: "shopping-bag", elementType: "product-detail", order: 1, hasSubTabs: false, presets: [] },
      { id: 302, name: "Danh sách sản phẩm", icon: "layout-grid", elementType: "collection-list", order: 2, hasSubTabs: false, presets: [] },
    ],
  },
  {
    id: 5,
    name: "Popup",
    icon: "message-square",
    order: 5,
    sidebarAction: "popup",
    items: [
      { id: 501, name: "Popup trống", icon: "plus-square", elementType: "popup", order: 1, hasSubTabs: false, presets: [] },
      { id: 502, name: "Mẫu popup", icon: "layout", elementType: "popup", order: 2, hasSubTabs: false, presets: [] },
    ],
  },
  {
    id: 6,
    name: "Blog",
    icon: "file-text",
    order: 6,
    items: [
      { id: 601, name: "Danh sách bài viết", icon: "file-text", elementType: "blog-list", order: 1, hasSubTabs: false, presets: [] },
      { id: 602, name: "Chi tiết bài viết", icon: "file-text", elementType: "blog-detail", order: 2, hasSubTabs: false, presets: [] },
    ],
  },
  {
    id: 7,
    name: "Tiện ích",
    icon: "puzzle",
    order: 7,
    sidebarAction: "utilities",
    items: [
      { id: 701, name: "Đếm ngược", icon: "timer", elementType: "countdown", order: 1, hasSubTabs: false, presets: [] },
      { id: 708, name: "HTML tùy chỉnh", icon: "code", elementType: "html-code", order: 2, hasSubTabs: false, presets: [] },
      { id: 702, name: "Google Maps", icon: "map-pin", elementType: "map", order: 3, hasSubTabs: false, presets: [] },
      { id: 705, name: "Chia sẻ MXH", icon: "share-2", elementType: "social-share", order: 4, hasSubTabs: false, presets: [] },
      { id: 703, name: "Đánh giá sao", icon: "star", elementType: "rating", order: 5, hasSubTabs: false, presets: [] },
      { id: 704, name: "Thanh tiến độ", icon: "bar-chart-2", elementType: "progress", order: 6, hasSubTabs: false, presets: [] },
    ],
  },
  {
    id: 8,
    name: "Kết nối",
    icon: "hard-drive",
    order: 8,
    items: [],
    sidebarAction: "integrations",
  },
];

type DesignType = "responsive" | "mobile" | "adaptive";
type ToastState = { show: boolean; message: string; type: "success" | "error" | "info" };

const MA_HTML_ITEM: ToolItemData = { id: 9999, name: "Mã HTML", icon: "code", elementType: "html-code", order: 10, hasSubTabs: false, presets: [] };

function ensureMaHtmlInPhanTu(cats: ToolCategoryData[]): ToolCategoryData[] {
  const hasHtml = (items: ToolItemData[]) => items.some((i) => i.elementType === "html-code");
  return cats.map((cat) => {
    if (cat.name !== "Phần tử") return cat;
    if (hasHtml(cat.items ?? [])) return cat;
    const items = [...(cat.items ?? []), MA_HTML_ITEM].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { ...cat, items };
  });
}

/** Phase 1: luôn có nhóm Assets (Media) nếu API chưa trả */
function ensureAssetsCategory(cats: ToolCategoryData[]): ToolCategoryData[] {
  if (cats.some((c) => c.sidebarAction === "media" || c.name === "Assets")) {
    return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const assets: ToolCategoryData = {
    id: 904,
    name: "Assets",
    icon: "images",
    order: 2,
    items: [],
    sidebarAction: "media",
  };
  return [...cats, assets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Phase 2: nhóm Kết nối (cloud) nếu API chưa có */
function ensureIntegrationsCategory(cats: ToolCategoryData[]): ToolCategoryData[] {
  if (cats.some((c) => c.sidebarAction === "integrations" || c.name === "Kết nối")) {
    return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const conn: ToolCategoryData = {
    id: 905,
    name: "Kết nối",
    icon: "hard-drive",
    order: 8,
    items: [],
    sidebarAction: "integrations",
  };
  return [...cats, conn].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Gán sidebar blog LadiPage-style khi API có nhóm "Blog" nhưng chưa có sidebarAction */
function ensureBlogCategory(cats: ToolCategoryData[]): ToolCategoryData[] {
  return cats.map((c) => {
    if (c.sidebarAction === "blog") return c;
    if (c.name?.trim().toLowerCase() === "blog") {
      return { ...c, sidebarAction: "blog" as const };
    }
    return c;
  });
}

/** Panel Popup (Popup trống + Mẫu popup) khi API chưa gửi sidebarAction */
function ensurePopupCategory(cats: ToolCategoryData[]): ToolCategoryData[] {
  return cats.map((c) => {
    if (c.sidebarAction === "popup") return c;
    if (c.name?.trim().toLowerCase() === "popup") {
      return { ...c, sidebarAction: "popup" as const };
    }
    return c;
  });
}

/** Panel Tiện ích (kéo thả + Thư viện) khi API chưa gửi sidebarAction */
function ensureUtilitiesCategory(cats: ToolCategoryData[]): ToolCategoryData[] {
  return cats.map((c) => {
    if (c.sidebarAction === "utilities") return c;
    const n = c.name?.trim().toLowerCase() ?? "";
    if (n === "tiện ích" || n === "tien ich") {
      return { ...c, sidebarAction: "utilities" as const };
    }
    return c;
  });
}

/** Phase 3: Blog / Popup / chia sẻ MXH / iframe Maps — parser `blogContent`, xuất HTML `generatePreviewHtml`, vẽ canvas `FabricCanvas`, chỉnh panel `PropertyPanelLadi`. */

/* ─── Toast ─── */
function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast.show, onClose]);
  if (!toast.show) return null;
  const colors = { success: "bg-emerald-600 text-white", error: "bg-red-600 text-white", info: "bg-[#1e2d7d] text-white" };
  return (
    <div className="fixed top-14 right-4 z-[200]">
      <div className={`${colors[toast.type]} px-4 py-2.5 rounded shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm`}>
        {toast.type === "success" && <span>&#10003;</span>}
        {toast.type === "error" && <span>&#10007;</span>}
        <span>{toast.message}</span>
        <button type="button" onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ─── Tip Box ─── */
function TipBox({ offsetRight = 16 }: { offsetRight?: number }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 z-50 bg-white rounded-lg shadow-lg border border-[#e0e0e0] p-3 max-w-[220px]" style={{ right: offsetRight }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">Mẹo hay cho bạn</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Nhấn Ctrl+S để lưu nhanh. Double-click vào text để chỉnh sửa trực tiếp.</p>
          </div>
        </div>
        <button type="button" onClick={() => setVisible(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ─── Main Editor ─── */
function EditorInner() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get("type") ?? "responsive") as DesignType;
  const pageId = Number(params.id);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [showMedia, setShowMedia] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showElementPanel, setShowElementPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishChecks, setPublishChecks] = useState<PublishCheck[] | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishFormTab, setPublishFormTab] = useState<"xuất-bản" | "tên-miền">("xuất-bản");
  const [publishPageUrl, setPublishPageUrl] = useState("");
  const [publishDomainId, setPublishDomainId] = useState<string>("");
  const [publishCustomPath, setPublishCustomPath] = useState("");
  const [publishFormError, setPublishFormError] = useState("");
  const [publishDomains, setPublishDomains] = useState<{ id: number; domainName: string }[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewDeviceType, setPreviewDeviceType] = useState<"web" | "mobile">("web");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" });
  const [toolCategories, setToolCategories] = useState<ToolCategoryData[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const [showPopupManageModal, setShowPopupManageModal] = useState(false);
  const [showUtilitiesHubModal, setShowUtilitiesHubModal] = useState(false);

  const canvasRef = useRef<DomCanvasHandle | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const historyPopoverRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasScrollContainerRef = useRef<HTMLDivElement>(null);
  const showToast = useCallback((message: string, type: ToastState["type"] = "info") => setToast({ show: true, message, type }), []);

  const {
    sections, deviceType, setDeviceType, loadFromContent, addSection, addElement, updateSection,
    selectSection, selectElement, selectPage, selected, toContentPayload, markSaved,
    canvasWidth, desktopCanvasWidth,
    undo, redo, pushHistory, dirty, zoom, setZoom, copyElement, pasteElement, cutElement,
    snapToGrid, setSnapToGrid, updateElement,
    history, historyIndex,
  } = useEditorStore();

  const effectiveZoom = deviceType === "mobile" ? zoom * (420 / desktopCanvasWidth) : zoom;

  const [addImageContext, setAddImageContext] = useState<{ elementId: number; itemIndex?: number; field?: "avatar" | "image" } | null>(null);
  const [changeIconForElementId, setChangeIconForElementId] = useState<number | null>(null);
  const [pageSettingsImageCallback, setPageSettingsImageCallback] = useState<((url: string) => void) | null>(null);

  const activeCat = useMemo(() => toolCategories.find((c) => c.id === activeCatId) ?? null, [toolCategories, activeCatId]);
  const activeItem = useMemo(() => activeCat?.items.find((i) => i.id === activeItemId) ?? null, [activeCat, activeItemId]);

  useEffect(() => { setDeviceType(type === "mobile" ? "mobile" : "web"); }, [setDeviceType, type]);
  useEffect(() => {
    editorToolsApi.list()
      .then((cats) => {
        const list = Array.isArray(cats) && cats.length > 0 ? cats : DEFAULT_TOOL_CATEGORIES;
        const normalized = normalizeToolCategories(list);
        const withHtml = ensureUtilitiesCategory(
          ensurePopupCategory(
            ensureBlogCategory(ensureMaHtmlInPhanTu(ensureIntegrationsCategory(ensureAssetsCategory(normalized)))),
          ),
        );
        setToolCategories(withHtml);
        setActiveCatId(withHtml[0]?.id ?? null);
      })
      .catch(() => {
        setToolCategories(
          ensureUtilitiesCategory(
            ensurePopupCategory(
              ensureBlogCategory(
                ensureIntegrationsCategory(ensureAssetsCategory(ensureMaHtmlInPhanTu(normalizeToolCategories([...DEFAULT_TOOL_CATEGORIES])))),
              ),
            ),
          ),
        );
        setActiveCatId(DEFAULT_TOOL_CATEGORIES[0]?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (activeCatId) setActiveItemId(null);
  }, [activeCatId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const content = await pagesApi.getContent(pageId);
        const rawSections = content.sections ?? (content as { Sections?: typeof content.sections }).Sections;
        if (!rawSections || rawSections.length === 0) {
          content.sections = [{ id: Date.now(), pageId: content.pageId, order: 1, name: "Section 1", backgroundColor: "#ffffff", backgroundImageUrl: null, height: 800, visible: true, isLocked: false, customClass: null, elements: [] }];
        } else {
          // Normalize API format (isVisible, stylesJson) to editor format (visible, styles)
          content.sections = rawSections.map((s) => {
            const sec = s as { elements?: unknown[]; Elements?: unknown[]; isVisible?: boolean; visible?: boolean } & Record<string, unknown>;
            const rawEls = sec.elements ?? (sec as { Elements?: unknown[] }).Elements ?? [];
            const normalized = {
              ...sec,
              visible: sec.isVisible ?? sec.visible ?? true,
              height: (sec as { height?: number; Height?: number }).height ?? (sec as { Height?: number }).Height ?? 600,
              elements: rawEls.map((e) => {
                const el = e as { stylesJson?: string; styles?: Record<string, string | number>; content?: string; Content?: string; imageUrl?: string; ImageUrl?: string; videoUrl?: string; VideoUrl?: string; x?: number; X?: number; y?: number; Y?: number; width?: number; Width?: number; height?: number; Height?: number } & Record<string, unknown>;
                let styles: Record<string, string | number> = {};
                if (typeof el.stylesJson === "string") {
                  try { styles = JSON.parse(el.stylesJson) || {}; } catch { /* ignore */ }
                } else if (el.styles && typeof el.styles === "object") {
                  styles = el.styles;
                }
                return {
                  ...el,
                  styles,
                  content: el.content ?? el.Content ?? "",
                  imageUrl: el.imageUrl ?? el.ImageUrl ?? null,
                  videoUrl: el.videoUrl ?? el.VideoUrl ?? null,
                  x: Number(el.x ?? el.X ?? 0),
                  y: Number(el.y ?? el.Y ?? 0),
                  width: el.width ?? el.Width,
                  height: el.height ?? el.Height,
                };
              }),
            };
            return normalized as import("@/types/editor").EditorSection;
          });
        }
        if (!cancelled) { await loadFontsFromSections(content.sections); loadFromContent(content); }
      } catch (err) { console.error(err); setError("Không tải được nội dung trang."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pageId, loadFromContent]);

  const handleAddElement = useCallback((elType: EditorElementType, preset?: ElementPresetData, x?: number, y?: number) => {
    let sid = selected.type === "section" ? selected.id : selected.type === "element" ? (() => { for (const s of sections) { if (s.elements.some((e) => e.id === selected.id)) return s.id; } return sections[0]?.id; })() : sections[0]?.id;
    if (!sid && sections.length === 0) {
      addSection();
      const st = useEditorStore.getState();
      sid = st.selected.type === "section" ? st.selected.id : st.sections[0]?.id;
    }
    if (!sid) return;
    const base = { type: elType, x: x ?? 50, y: y ?? 50 };
    if (preset) {
      let styles: Record<string, string | number> = {};
      try { styles = JSON.parse(preset.stylesJson); } catch {}
      const w = preset.defaultWidth ?? undefined;
      const h = preset.defaultHeight ?? undefined;
      addElement(sid, { ...base, content: preset.defaultContent ?? undefined, width: w, height: h, styles });
    } else addElement(sid, base);
    pushHistory();
  }, [selected, sections, addElement, pushHistory, addSection]);

  const handleAddPopupFromEntry = useCallback(
    (entry: PopupTemplateEntry | MySavedPopup) => {
      let sid =
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
      if (!sid && sections.length === 0) {
        addSection();
        const st = useEditorStore.getState();
        sid = st.selected.type === "section" ? st.selected.id : st.sections[0]?.id;
      }
      if (!sid) return;
      addElement(sid, {
        type: "popup",
        content: entry.content,
        width: entry.width,
        height: entry.height,
        styles: entry.styles,
      });
      pushHistory();
      showToast("Đã thêm popup", "success");
    },
    [selected, sections, addElement, pushHistory, addSection, showToast],
  );

  const openPopupLibrary = useCallback(() => setShowPopupManageModal(true), []);
  const openUtilitiesLibrary = useCallback(() => setShowUtilitiesHubModal(true), []);

  const handleDropFromTool = useCallback((sectionId: number, elType: EditorElementType, x: number, y: number, preset?: ElementPresetData) => {
    const base = { type: elType, x, y };
    if (preset) {
      let styles: Record<string, string | number> = {};
      try { styles = JSON.parse(preset.stylesJson); } catch {}
      const w = preset.defaultWidth ?? undefined;
      const h = preset.defaultHeight ?? undefined;
      addElement(sectionId, { ...base, content: preset.defaultContent ?? undefined, width: w, height: h, styles });
    } else addElement(sectionId, base);
    pushHistory();
    selectSection(sectionId);
  }, [addElement, pushHistory, selectSection]);

  const handleAddSection = useCallback(() => { addSection(); pushHistory(); }, [addSection, pushHistory]);

  const handleAddSectionTemplate = useCallback(
    (template: "blank" | "hero") => {
      if (template === "blank") {
        addSection();
        pushHistory();
        return;
      }
      addSection();
      const st = useEditorStore.getState();
      const sid = st.sections[st.sections.length - 1]?.id;
      if (!sid) return;
      updateSection(sid, {
        height: 720,
        backgroundColor: "#0f172a",
        name: "Hero",
      });
      addElement(sid, {
        type: "headline",
        x: 72,
        y: 140,
        width: 520,
        height: 72,
        content: "Headline chính của bạn",
        styles: { fontSize: 36, fontWeight: 700, color: "#ffffff", textAlign: "left" },
      });
      addElement(sid, {
        type: "paragraph",
        x: 72,
        y: 236,
        width: 480,
        height: 80,
        content: "Mô tả ngắn phía dưới dòng tiêu đề. Chỉnh trực tiếp trên canvas hoặc panel bên phải.",
        styles: { fontSize: 16, color: "#cbd5e1", textAlign: "left" },
      });
      addElement(sid, {
        type: "button",
        x: 72,
        y: 360,
        width: 200,
        height: 52,
        content: "Bắt đầu",
        styles: {
          backgroundColor: "#6366f1",
          color: "#ffffff",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          borderWidth: 0,
        },
      });
      pushHistory();
      showToast("Đã thêm section Hero mẫu", "success");
    },
    [addSection, addElement, updateSection, pushHistory, showToast],
  );

  const handleInsertImage = useCallback((url: string, name: string, width?: number, height?: number) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    const maxW = 420;
    const maxH = 280;
    let w = 280;
    let h = 200;
    if (width && height && width > 0 && height > 0) {
      const r = width / height;
      if (r > maxW / maxH) {
        w = maxW;
        h = Math.round(maxW / r);
      } else {
        h = maxH;
        w = Math.round(maxH * r);
      }
    }
    addElement(sid, { type: "image", imageUrl: url, content: name, width: w, height: h });
    pushHistory(); showToast("Đã chèn ảnh vào trang", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleInsertVideo = useCallback((url: string, name: string) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    addElement(sid, { type: "video", videoUrl: url, content: name, width: 480, height: 270 });
    pushHistory(); showToast("Đã chèn video vào trang", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleInsertIcon = useCallback((iconId: string, color?: string) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    addElement(sid, { type: "icon", content: iconId, width: 48, height: 48, styles: color ? { color } : {} });
    pushHistory(); showToast("Đã chèn biểu tượng", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleInsertForm = useCallback((preset: { formType: string; title: string; buttonText: string; fields: unknown[]; inputStyle?: string }) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    const content = JSON.stringify({ formType: preset.formType, title: preset.title, buttonText: preset.buttonText, fields: preset.fields, inputStyle: preset.inputStyle ?? "outlined" });
    const size = preset.formType === "login" ? { width: 360, height: 56 } : preset.formType === "otp" ? { width: 400, height: 180 } : { width: 400, height: 320 };
    addElement(sid, { type: "form", content, ...size, styles: { fontSize: 14 } });
    pushHistory(); showToast("Đã chèn form", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleInsertLine = useCallback((preset: { style: string; color: string; thickness: number; dashArray?: number[] }) => {
    const sid = selected.type === "section" ? selected.id : selected.type === "element" ? sections.find((s) => s.elements.some((e) => e.id === selected.id))?.id ?? sections[0]?.id : sections[0]?.id;
    if (!sid) return;
    const height = preset.style === "double" ? preset.thickness * 3 : preset.thickness;
    const styles: Record<string, string | number> = {
      backgroundColor: preset.color,
      height: preset.thickness,
      lineStyle: preset.style,
    };
    if (preset.dashArray && preset.dashArray.length > 0) {
      styles.strokeDashArray = JSON.stringify(preset.dashArray);
    }
    addElement(sid, { type: "divider", width: 400, height, styles });
    pushHistory(); showToast("Đã chèn đường kẻ", "success");
  }, [selected, sections, addElement, pushHistory, showToast]);

  const handleAddFormField = useCallback((elementId: number) => {
    const el = sections.flatMap((s) => s.elements).find((e) => e.id === elementId);
    if (!el || el.type !== "form") return;
    let cfg: { formType?: string; title?: string; buttonText?: string; fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string }[]; inputStyle?: string } = {};
    try { cfg = JSON.parse(el.content || "{}"); } catch {}
    const fields = Array.isArray(cfg.fields) ? cfg.fields : [];
    const id = `field_${Date.now()}`;
    updateElement(elementId, { content: JSON.stringify({ ...cfg, fields: [...fields, { id, name: id, label: "Trường mới", placeholder: "Nhập...", type: "text" }] }) });
    pushHistory();
    showToast("Đã thêm trường", "success");
  }, [sections, updateElement, pushHistory, showToast]);

  const handleSaveFormData = useCallback((_elementId: number) => {
    showToast("Lưu cấu hình data form (webhook, email) - đang phát triển", "info");
  }, [showToast]);

  const handleChangeIcon = useCallback((iconId: string, color?: string) => {
    if (!changeIconForElementId) return;
    const targetEl = sections.flatMap((s) => s.elements).find((e) => e.id === changeIconForElementId);
    const currentStyles = targetEl?.styles ?? {};
    updateElement(changeIconForElementId, {
      content: iconId,
      styles: { ...currentStyles, color: color ?? currentStyles.color ?? "#4f46e5" },
    });
    pushHistory();
    setChangeIconForElementId(null);
    showToast("Đã đổi biểu tượng", "success");
  }, [changeIconForElementId, sections, updateElement, pushHistory, showToast]);

  const handleAddImageToElement = useCallback((url: string) => {
    if (!addImageContext) return;
    const { elementId, itemIndex, field } = addImageContext;
    const targetEl = (() => {
      for (const s of sections) {
        const e = s.elements.find((x) => x.id === elementId);
        if (e) return e;
      }
      return null;
    })();
    if (!targetEl) return;
    if (targetEl.type === "image") {
      updateElement(elementId, { imageUrl: url });
    } else if (targetEl.type === "gallery" || targetEl.type === "shape") {
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(targetEl.content || "[]");
        urls = Array.isArray(parsed) ? [...parsed, url] : [url];
      } catch {
        urls = [url];
      }
      updateElement(elementId, { content: JSON.stringify(urls) });
    } else if (targetEl.type === "product-detail") {
      const pd = parseProductDetailContent(targetEl.content ?? undefined);
      const imgs = pd.images;
      if (itemIndex != null && itemIndex >= 0 && itemIndex < imgs.length) {
        const next = [...imgs];
        next[itemIndex] = url;
        updateElement(elementId, { content: JSON.stringify({ ...pd, images: next }) });
      } else {
        updateElement(elementId, { content: JSON.stringify({ ...pd, images: [...imgs, url] }) });
      }
    } else if (targetEl.type === "tabs") {
      const td = parseTabsContent(targetEl.content ?? undefined);
      const items = [...td.items];
      if (itemIndex != null && itemIndex >= 0 && itemIndex < items.length) {
        const next = [...items];
        next[itemIndex] = { ...next[itemIndex], image: url };
        updateElement(elementId, { content: JSON.stringify({ ...td, items: next }) });
      } else {
        updateElement(elementId, {
          content: JSON.stringify({
            ...td,
            items: [...items, { label: `Tab ${items.length + 1}`, title: "", desc: "", image: url }],
          }),
        });
      }
    } else if (targetEl.type === "carousel") {
      const cd = parseCarouselContent(targetEl.content ?? undefined);
      const crItems = [...cd.items];
      if (itemIndex != null && itemIndex >= 0 && itemIndex < crItems.length) {
        const next = [...crItems];
        next[itemIndex] = { ...next[itemIndex], image: url };
        updateElement(elementId, { content: JSON.stringify({ layoutType: cd.layoutType, items: next }) });
      } else {
        updateElement(elementId, {
          content: JSON.stringify({
            layoutType: cd.layoutType || "media",
            items: [...crItems, { image: url, title: `Slide ${crItems.length + 1}`, desc: "" }],
          }),
        });
      }
    } else if (targetEl.type === "collection-list") {
      let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
      try { cl = JSON.parse(targetEl.content || "{}"); } catch {}
      const items = cl.items ?? [];
      if (itemIndex != null && itemIndex >= 0 && itemIndex < items.length) {
        const next = [...items];
        next[itemIndex] = { ...next[itemIndex], image: url };
        updateElement(elementId, { content: JSON.stringify({ ...cl, items: next }) });
      } else {
        updateElement(elementId, { content: JSON.stringify({ ...cl, items: [...items, { image: url, title: `Sản phẩm ${items.length + 1}`, price: "0đ" }] }) });
      }
    } else if (targetEl.type === "blog-list") {
      const bl = parseBlogListContent(targetEl.content ?? undefined);
      const posts = [...(bl.posts ?? [])];
      if (itemIndex != null && itemIndex >= 0 && itemIndex < posts.length) {
        posts[itemIndex] = { ...posts[itemIndex], image: url };
        updateElement(elementId, { content: JSON.stringify({ columns: bl.columns ?? 2, posts }) });
      } else {
        updateElement(elementId, {
          content: JSON.stringify({
            columns: bl.columns ?? 2,
            posts: [...posts, { title: `Bài ${posts.length + 1}`, excerpt: "", date: "", image: url }],
          }),
        });
      }
    }
    pushHistory();
    setAddImageContext(null);
    showToast("Đã thêm ảnh", "success");
  }, [addImageContext, sections, updateElement, pushHistory, showToast]);

  const handleSave = useCallback(async () => {
    const p = toContentPayload(); if (!p) return;
    setSaving(true); setError("");
    try { await pagesApi.updateContent(pageId, p); markSaved(); showToast("Đã lưu thành công!", "success"); }
    catch (err) { const msg = err instanceof Error ? err.message : "Lưu thất bại."; setError(msg); showToast(msg, "error"); }
    finally { setSaving(false); }
  }, [pageId, toContentPayload, markSaved, showToast]);

  const handleDuplicatePage = useCallback(async () => {
    try {
      const dup = await pagesApi.duplicate(pageId);
      showToast("Đã sao chép trang! Đang chuyển...", "success");
      window.location.href = `/dashboard/editor/${dup.id}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sao chép thất bại.";
      showToast(msg, "error");
    }
  }, [pageId, showToast]);

  const scrollToElement = useCallback(() => {
    if (selected.type !== "element") return;
    const scrollEl = canvasScrollContainerRef.current;
    const canvasEl = canvasContainerRef.current;
    if (!scrollEl || !canvasEl) return;
    const s = useEditorStore.getState().sections;
    let sectionY = 0;
    let el: { x: number; y: number; width?: number; height?: number } | null = null;
    for (const sec of s) {
      const found = sec.elements?.find((e) => e.id === selected.id);
      if (found) {
        el = { x: found.x, y: found.y, width: found.width ?? undefined, height: found.height ?? undefined };
        break;
      }
      sectionY += (sec.height ?? 600) + 4;
    }
    if (!el) return;
    const deviceScale = deviceType === "mobile" ? 420 / desktopCanvasWidth : 1;
    const z = zoom * deviceScale;
    const elCenterX = el.x + (el.width ?? 0) / 2;
    const elCenterY = sectionY + el.y + (el.height ?? 0) / 2;
    const canvasRect = canvasEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const targetScrollLeft = scrollEl.scrollLeft + (canvasRect.left - scrollRect.left) + elCenterX * z - scrollEl.clientWidth / 2;
    const targetScrollTop = scrollEl.scrollTop + (canvasRect.top - scrollRect.top) + elCenterY * z - scrollEl.clientHeight / 2;
    scrollEl.scrollTo({
      left: Math.max(0, targetScrollLeft),
      top: Math.max(0, targetScrollTop),
      behavior: "smooth",
    });
  }, [selected, deviceType, desktopCanvasWidth, zoom]);

  const handlePreview = useCallback(async () => {
    const s = useEditorStore.getState();
    let rawSections = (s.sections ?? []) as import("@/types/editor").EditorSection[];
    // Fallback: nếu store rỗng, thử tải từ API (trường hợp store chưa sync hoặc đã lưu trước đó)
    if (!Array.isArray(rawSections) || rawSections.length === 0) {
      try {
        const content = await pagesApi.getContent(pageId);
        const apiSections = content.sections ?? (content as { Sections?: unknown[] }).Sections ?? [];
        rawSections = Array.isArray(apiSections) ? apiSections.map((sec: unknown) => {
          const s = sec as { elements?: unknown[]; Elements?: unknown[]; isVisible?: boolean; visible?: boolean; height?: number; Height?: number } & Record<string, unknown>;
          const rawEls = s.elements ?? s.Elements ?? [];
          return {
            ...s,
            visible: s.isVisible ?? s.visible ?? true,
            height: s.height ?? s.Height ?? 600,
            elements: rawEls.map((e: unknown) => {
              const el = e as { stylesJson?: string; styles?: Record<string, unknown>; content?: string; Content?: string; imageUrl?: string; ImageUrl?: string; videoUrl?: string; VideoUrl?: string; x?: number; X?: number; y?: number; Y?: number; width?: number; Width?: number; height?: number; Height?: number } & Record<string, unknown>;
              let styles: Record<string, string | number> = {};
              if (typeof el.stylesJson === "string") {
                try { styles = JSON.parse(el.stylesJson) || {}; } catch { /* ignore */ }
              } else if (el.styles && typeof el.styles === "object") {
                styles = el.styles as Record<string, string | number>;
              }
              return {
                ...el,
                styles,
                content: el.content ?? el.Content ?? "",
                imageUrl: el.imageUrl ?? el.ImageUrl ?? null,
                videoUrl: el.videoUrl ?? el.VideoUrl ?? null,
                x: Number(el.x ?? el.X ?? 0),
                y: Number(el.y ?? el.Y ?? 0),
                width: el.width ?? el.Width,
                height: el.height ?? el.Height,
              };
            }),
          };
        }) as import("@/types/editor").EditorSection[] : [];
      } catch {
        rawSections = [];
      }
    }
    const arr = Array.isArray(rawSections) ? rawSections : [];
    // Bảo đảm mỗi section có elements và visible (tương thích API elements/Elements, visible/isVisible)
    const sectionsToUse = JSON.parse(JSON.stringify(arr)).map((sec: import("@/types/editor").EditorSection & { isVisible?: boolean; Elements?: unknown[]; Height?: number }) => {
      const els = sec.elements ?? sec.Elements ?? [];
      const visible = sec.visible !== false && (sec as { isVisible?: boolean }).isVisible !== false;
      const hSec = sec.height ?? sec.Height ?? 600;
      const list = Array.isArray(els) ? els : [];
      const normalizedEls = list.map((e: unknown) => {
        const el = e as Record<string, unknown> & { x?: number; X?: number; y?: number; Y?: number; width?: number; Width?: number; height?: number; Height?: number };
        return {
          ...el,
          x: Number(el.x ?? el.X ?? 0),
          y: Number(el.y ?? el.Y ?? 0),
          width: el.width ?? el.Width,
          height: el.height ?? el.Height,
        };
      });
      return { ...sec, elements: normalizedEls, visible, height: hSec };
    });
    const html = generatePreviewHtml(sectionsToUse, {
      metaTitle: s.metaTitle || s.name || "Preview",
      metaDescription: s.metaDescription || "",
      deviceWidth: s.canvasWidth,
      desktopCanvasWidth: s.desktopCanvasWidth ?? 960,
      // Xem trước: khối mã HTML phủ full viewport (giống landing full màn hình); tải HTML riêng vẫn mặc định trong downloadHtml
      htmlCodeFullScreen: true,
      // forPreview: buộc page-container = designBase px, scale JS về vừa viewport → tỉ lệ khớp editor
      forPreview: true,
      pageSettings: s.pageSettings,
      metaKeywords: s.pageSettings?.metaKeywords,
      metaImageUrl: s.pageSettings?.metaImageUrl,
      faviconUrl: s.pageSettings?.faviconUrl,
      codeBeforeHead: s.pageSettings?.codeBeforeHead,
      codeBeforeBody: s.pageSettings?.codeBeforeBody,
      useLazyload: s.pageSettings?.useLazyload,
      apiBaseUrl: import.meta.env.VITE_API_URL,
      pageId: s.pageId ?? undefined,
      workspaceId: s.workspaceId ?? undefined,
    });
    setPreviewHtml(html);
    setPreviewDeviceType(s.deviceType);
    setShowPreviewModal(true);
    showToast("Đang mở xem trước...", "info");
  }, [showToast, pageId]);

  const openPublishModal = useCallback(() => {
    const s = useEditorStore.getState();
    const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/p/` : "";
    setPublishPageUrl(s.slug ? `${baseUrl}${s.slug}` : "");
    setPublishDomainId("");
    setPublishCustomPath("");
    setPublishFormError("");
    setPublishChecks(null);
    setPublishFormTab("xuất-bản");
    setShowPublishModal(true);
    if (s.workspaceId) {
      domainsApi.list(s.workspaceId).then((list) => setPublishDomains(list)).catch(() => setPublishDomains([]));
    } else setPublishDomains([]);
  }, []);

  const handlePublishConfirm = useCallback(async () => {
    setPublishFormError("");
    let isValid = false;
    if (publishFormTab === "xuất-bản") {
      isValid = publishPageUrl.trim().length > 0;
    } else {
      if (publishDomains.length === 0) {
        setPublishFormError("Chưa có domain. Vui lòng dùng tab Xuất bản hoặc thêm domain trong Cài đặt.");
        return;
      }
      isValid = publishDomainId !== "" && publishDomains.some((d) => String(d.id) === publishDomainId);
    }
    if (!isValid) {
      setPublishFormError("Đã xảy ra lỗi, vui lòng xuất bản lại!");
      return;
    }
    const p = toContentPayload();
    if (!p) return;
    setPublishing(true);
    setError("");
    try {
      await pagesApi.updateContent(pageId, p);
      markSaved();
      const result = await pagesApi.publish(pageId);
      if (!result.ok) {
        setPublishChecks(result.checks ?? []);
        return;
      }
      useEditorStore.setState((s) => { s.status = "published"; });
      setShowPublishModal(false);
      showToast("Xuất bản thành công!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xuất bản thất bại.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setPublishing(false);
    }
  }, [pageId, toContentPayload, markSaved, showToast, publishFormTab, publishPageUrl, publishDomainId, publishDomains]);

  const handlePublish = useCallback(async () => {
    openPublishModal();
  }, [openPublishModal]);

  const handleExportPng = useCallback(() => {
    const el = canvasRef.current?.getContainerElement();
    if (el) { exportCanvasToPng(el as unknown as import("fabric").Canvas); showToast("Đang xuất PNG...", "info"); }
  }, [showToast]);
  const handleExportPdf = useCallback(() => {
    const el = canvasRef.current?.getContainerElement();
    if (el) { exportCanvasToPdf(el as unknown as import("fabric").Canvas); showToast("Đang xuất PDF...", "info"); }
  }, [showToast]);
  const handleExportHtml = useCallback(() => {
    const s = useEditorStore.getState();
    downloadHtml(s.sections, {
      metaTitle: s.metaTitle || s.name || "Page",
      metaDescription: s.metaDescription || "",
      deviceWidth: s.canvasWidth,
      desktopCanvasWidth: s.desktopCanvasWidth ?? 960,
      filename: `${s.slug || "page"}.html`,
      pageSettings: s.pageSettings,
      metaKeywords: s.pageSettings?.metaKeywords,
      metaImageUrl: s.pageSettings?.metaImageUrl,
      faviconUrl: s.pageSettings?.faviconUrl,
      codeBeforeHead: s.pageSettings?.codeBeforeHead,
      codeBeforeBody: s.pageSettings?.codeBeforeBody,
      useLazyload: s.pageSettings?.useLazyload,
      apiBaseUrl: import.meta.env.VITE_API_URL,
      pageId: s.pageId ?? undefined,
      workspaceId: s.workspaceId ?? undefined,
    });
    showToast("Đang tải HTML...", "info");
  }, [showToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT" || active.isContentEditable);
      const isCanvasTextEditing = false;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); copyElement(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); pasteElement(); pushHistory(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "x") { e.preventDefault(); cutElement(); }
      if (!isInput && (e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); const st = useEditorStore.getState(); if (st.selected.type === "element") { st.duplicateElement(st.selected.id); st.pushHistory(); } }
      if (!isInput && !isCanvasTextEditing && (e.key === "Delete" || e.key === "Backspace")) { const st = useEditorStore.getState(); if (st.selected.type === "element") { st.removeElement(st.selected.id); st.pushHistory(); } }
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
    if (!showPreviewModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPreviewModal(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPreviewModal]);

  useEffect(() => {
    const onFs = () => setIsDocFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!showShortcutsModal && !showHelpModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowShortcutsModal(false);
        setShowHelpModal(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showShortcutsModal, showHelpModal]);

  useEffect(() => {
    if (!showExportMenu && !showHistoryPopover) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (showExportMenu && exportMenuRef.current && !exportMenuRef.current.contains(t)) {
        setShowExportMenu(false);
      }
      if (showHistoryPopover && historyPopoverRef.current && !historyPopoverRef.current.contains(t)) {
        setShowHistoryPopover(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showExportMenu, showHistoryPopover]);

  const toggleEditorFullscreen = useCallback(async () => {
    try {
      const root = document.documentElement;
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast("Trình duyệt không hỗ trợ toàn màn hình.", "error");
    }
  }, [showToast]);

  // Show element panel when user selects element or section
  useEffect(() => {
    if (selected.type === "element" || selected.type === "section") {
      setShowElementPanel(true);
    }
  }, [selected.type, "id" in selected ? selected.id : 0]);

  return (
    <EditorDndProvider
      onDropFromTool={handleDropFromTool}
      canvasContainerRef={canvasContainerRef}
      sections={sections}
      zoom={effectiveZoom}
      canvasWidth={desktopCanvasWidth}
    >
    <div className="h-screen bg-[#f5f5f5] overflow-hidden flex flex-col" style={{ fontFamily: "Open Sans, system-ui, sans-serif" }}>
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />

      <PopupManageModal
        open={showPopupManageModal}
        onClose={() => setShowPopupManageModal(false)}
        onPickBlank={() => handleAddElement("popup")}
        onPickEntry={handleAddPopupFromEntry}
      />

      <UtilitiesHubModal
        open={showUtilitiesHubModal}
        onClose={() => setShowUtilitiesHubModal(false)}
        onAddElement={handleAddElement}
        onToast={(message, type) => showToast(message, type ?? "info")}
      />

      {/* ═══ TOP NAV BAR (LadiPage style) ═══ */}
      <div className="h-12 bg-white border-b border-[#e0e0e0] px-4 flex items-center justify-between shrink-0 z-50">
        {/* Left - Logo + actions */}
        <div className="flex items-center gap-2">
          <Link to="/dashboard/pages" className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100" title="Quay lại">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div className="w-px h-5 bg-[#e0e0e0]" />
          <button type="button" onClick={handleAddSection} className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600" title="Thêm">
            <Plus className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => { setShowLayers(!showLayers); setShowMedia(false); setActiveCatId(null); }} className={`w-8 h-8 rounded flex items-center justify-center ${showLayers ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`} title="Layers">
            <Layers className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => { const c = toolCategories.find((x) => x.name === "Section"); if (c) setActiveCatId(c.id); setShowLayers(false); setShowMedia(false); }} className={`w-8 h-8 rounded flex items-center justify-center ${activeCatId && toolCategories.find((c) => c.id === activeCatId)?.name === "Section" ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`} title="Section">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDuplicatePage}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
            title="Sao chép trang"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Center - Device Toggle */}
        <div className="flex items-center bg-slate-100 rounded p-0.5">
          <button type="button" className={`px-3 py-1.5 rounded text-[12px] font-medium transition ${deviceType === "web" ? "bg-white text-[#1e2d7d] shadow-sm" : "text-slate-500"}`} onClick={() => setDeviceType("web")}>
            <Monitor className="w-4 h-4 inline mr-1" />Desktop
          </button>
          <button type="button" className={`px-3 py-1.5 rounded text-[12px] font-medium transition ${deviceType === "mobile" ? "bg-white text-[#1e2d7d] shadow-sm" : "text-slate-500"}`} onClick={() => setDeviceType("mobile")}>
            <Smartphone className="w-4 h-4 inline mr-1" />Mobile
          </button>
        </div>

        {/* Right - Utilities */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600" title="Hoàn tác (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
          <button type="button" onClick={redo} className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600" title="Làm lại (Ctrl+Y)"><Redo2 className="w-4 h-4" /></button>

          <div className="relative" ref={historyPopoverRef}>
            <button
              type="button"
              onClick={() => setShowHistoryPopover((v) => !v)}
              className={`w-8 h-8 rounded flex items-center justify-center ${showHistoryPopover ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`}
              title="Lịch sử chỉnh sửa"
            >
              <History className="w-4 h-4" />
            </button>
            {showHistoryPopover && (
              <div className="absolute right-0 top-full mt-1 z-[60] w-72 rounded-lg border border-[#e0e0e0] bg-white py-3 px-3 shadow-xl text-left">
                <p className="text-xs font-semibold text-slate-800">Lịch sử</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bước hiện tại:{" "}
                  <span className="font-mono text-slate-700">
                    {history.length > 0 ? historyIndex + 1 : 0} / {history.length}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Dùng <kbd className="px-1 py-0.5 rounded bg-slate-100 text-[10px]">Ctrl+Z</kbd> /{" "}
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 text-[10px]">Ctrl+Y</kbd> hoặc nút Hoàn tác / Làm lại để điều hướng giữa các bản lưu tạm.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
            title="Trợ giúp nhanh"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`w-8 h-8 rounded flex items-center justify-center ${snapToGrid ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`}
            title={snapToGrid ? "Bật dính lưới (đang bật) - Nhấn để tắt, kéo thả tự do" : "Tắt dính lưới - Nhấn để bật dính lưới khi căn chỉnh"}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3v6h6M21 3v6h-6M3 21v-6h6M21 21v-6h-6" />
            </svg>
          </button>
          <button type="button" onClick={() => { setShowGlobalSettings(!showGlobalSettings); }} className={`w-8 h-8 rounded flex items-center justify-center ${showGlobalSettings ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`} title="Thiết lập trang"><Settings className="w-4 h-4" /></button>
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
            title="Phím tắt"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleEditorFullscreen}
            className={`w-8 h-8 rounded flex items-center justify-center ${isDocFullscreen ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`}
            title={isDocFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isDocFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className={`w-8 h-8 rounded flex items-center justify-center ${showExportMenu ? "bg-slate-100 text-[#1e2d7d]" : "hover:bg-slate-100 text-slate-600"}`}
              title="Thao tác nhanh — xuất file & zoom"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-[60] w-56 rounded-lg border border-[#e0e0e0] bg-white py-1 shadow-xl text-left">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Xuất</p>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => { handleExportPng(); setShowExportMenu(false); }}
                >
                  <ImageIcon className="w-4 h-4" /> Xuất PNG
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => { handleExportPdf(); setShowExportMenu(false); }}
                >
                  <FileDown className="w-4 h-4" /> Xuất PDF
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                  onClick={() => { handleExportHtml(); setShowExportMenu(false); }}
                >
                  <FileCode2 className="w-4 h-4" /> Tải HTML
                </button>
                <div className="my-1 border-t border-[#e0e0e0]" />
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Thu phóng</p>
                <div className="px-2 pb-2 flex flex-wrap gap-1">
                  {ZOOM_PRESETS.map((z) => (
                    <button
                      key={z.value}
                      type="button"
                      onClick={() => { setZoom(z.value); setShowExportMenu(false); }}
                      className={`px-2 py-1 text-[11px] rounded border ${Math.abs(zoom - z.value) < 0.01 ? "border-[#1e2d7d] bg-[#1e2d7d]/10 text-[#1e2d7d] font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <p className="px-3 pb-2 text-[10px] text-slate-400">Hoặc Ctrl + cuộn chuột</p>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[#e0e0e0] mx-1" />

          <button type="button" onClick={handleSave} className="px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800">
            Lưu{dirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block align-middle" />}
          </button>
          <button type="button" onClick={handlePreview} className="px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800">
            Xem trước
          </button>
          <Button className="bg-[#1e2d7d] hover:bg-[#162558] text-white text-[12px] h-8 px-4" loading={publishing} onClick={handlePublish} disabled={saving}>
            <Eye className="w-4 h-4 mr-1" />Xem và xuất bản
          </Button>
        </div>
      </div>

      {/* ═══ MAIN AREA: Sidebar + Canvas ═══ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left - LadiPage-style Sidebar */}
        <EditorSidebar
          categories={toolCategories}
          activeCatId={activeCatId}
          onSelectCategory={setActiveCatId}
          activeItemId={activeItemId}
          onSelectItem={setActiveItemId}
          onAddElement={handleAddElement}
          onAddSection={handleAddSection}
          onAddSectionTemplate={handleAddSectionTemplate}
          onInsertImage={handleInsertImage}
          onInsertIcon={handleInsertIcon}
          onInsertLine={handleInsertLine}
          onInsertForm={handleInsertForm}
          onInsertVideo={handleInsertVideo}
          onOpenMedia={() => { setActiveCatId(null); setActiveItemId(null); setShowMedia(true); }}
          onClose={() => { setActiveCatId(null); setActiveItemId(null); }}
          sections={sections}
          onSelectElement={selectElement}
          onOpenPopupLibrary={openPopupLibrary}
          onOpenUtilitiesLibrary={openUtilitiesLibrary}
        />

        {/* Canvas area */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Workspace background */}
        <div
          ref={canvasScrollContainerRef}
          className="absolute inset-0 overflow-auto"
          style={{ background: "#e8e8e8" }}
          onClick={(e) => { if (e.target === e.currentTarget) selectPage(); }}
        >
          {/* Center column – canvas + add-section button */}
          <div className="flex flex-col items-center min-h-full py-8 px-4">
            {loading ? (
              <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-2 border-[#1e2d7d] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {deviceType === "mobile" && (
                  <div className="mb-2 px-3 py-2 rounded-t-3xl bg-slate-800 flex justify-center" style={{ width: 420 * effectiveZoom + 8 }}>
                    <div className="w-24 h-1.5 rounded-full bg-slate-600" />
                  </div>
                )}
                <DroppableCanvas id="canvas-drop">
                  {/* White canvas paper */}
                  <div
                    className="relative"
                    style={{
                      boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                      display: "inline-block",
                      lineHeight: 0,
                    }}
                  >
                    <DomCanvas
                      containerRef={canvasContainerRef}
                      onCanvasReady={(h) => { canvasRef.current = h; }}
                      onRequestAddImage={(id, itemIndex, field) => { selectElement(id); setAddImageContext({ elementId: id, itemIndex, field }); }}
                      onRequestChangeIcon={(id) => { selectElement(id); setChangeIconForElementId(id); }}
                      onRequestAddFormField={handleAddFormField}
                      onRequestSaveFormData={handleSaveFormData}
                      onOpenSettings={() => setShowElementPanel(true)}
                    />
                    <PageUtilityFxPreview />
                  </div>
                </DroppableCanvas>
                <button type="button" onClick={handleAddSection}
                  className="flex items-center gap-2 px-6 py-3 mt-4 border-2 border-dashed border-[#bbb] hover:border-[#1e2d7d] text-slate-400 hover:text-[#1e2d7d] rounded-lg transition text-sm font-medium bg-white/70"
                  style={{ width: Math.min(canvasWidth * effectiveZoom, 400) }}
                >
                  <Plus className="w-4 h-4 shrink-0" /> Thêm Section mới
                </button>
              </>
            )}
          </div>
        </div>

        {/* Media Panel - floating */}
        {showMedia && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-[320px] max-h-[80vh] bg-white rounded-lg shadow-xl border border-[#e0e0e0] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e0e0e0]">
              <p className="text-xs font-semibold text-slate-700">Media</p>
              <button type="button" onClick={() => setShowMedia(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-40px)]">
              <MediaPanel onInsertImage={handleInsertImage} onInsertVideo={handleInsertVideo} />
            </div>
          </div>
        )}

        {/* Layers Panel - floating */}
        {showLayers && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-[260px] max-h-[80vh] bg-white rounded-lg shadow-xl border border-[#e0e0e0] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e0e0e0]">
              <p className="text-xs font-semibold text-slate-700">Layers</p>
              <button type="button" onClick={() => setShowLayers(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-40px)]">
              <SortableLayersPanel />
            </div>
          </div>
        )}

        {/* Right - Element Properties Panel (when element/section selected) - draggable with react-rnd */}
        {showElementPanel && (selected.type === "element" || selected.type === "section") && (
          <Rnd
            default={{ x: window.innerWidth - 320, y: 64, width: 300, height: window.innerHeight - 80 }}
            minWidth={260}
            minHeight={200}
            bounds="window"
            enableResizing={true}
            dragHandleClassName="property-panel-drag-handle"
            className="!fixed z-40 rounded-lg shadow-xl border border-[#e0e0e0] overflow-hidden bg-white"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          >
            <PropertyPanelLadi
              onClose={() => setShowElementPanel(false)}
              dragHandleClassName="property-panel-drag-handle"
              onRequestAddImage={(id, itemIndex, field) => { selectElement(id); setAddImageContext({ elementId: id, itemIndex, field }); }}
              onRequestChangeIcon={(id) => { selectElement(id); setChangeIconForElementId(id); }}
              onOpenMedia={() => setShowMedia(true)}
              onScrollToElement={scrollToElement}
              onToast={showToast}
            />
          </Rnd>
        )}

        {/* Right - Global Settings Panel */}
        {showGlobalSettings && (
          <GlobalSettingsPanel
            onClose={() => setShowGlobalSettings(false)}
            onRequestImagePicker={(cb) => setPageSettingsImageCallback(() => cb)}
          />
        )}

        {/* Image Picker Modal for Page Settings (meta image, favicon) */}
        {pageSettingsImageCallback && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden mx-4 flex flex-col">
              <div className="px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
                <p className="text-sm font-semibold text-slate-800">Chọn ảnh</p>
                <button type="button" onClick={() => setPageSettingsImageCallback(null)} className="p-2 rounded hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0 p-2">
                <MediaPanel
                  onInsertImage={(url) => {
                    pageSettingsImageCallback(url);
                    setPageSettingsImageCallback(null);
                  }}
                  onInsertVideo={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tip Box - shift left when right panels are open */}
        <TipBox offsetRight={showGlobalSettings ? 340 : showElementPanel && (selected.type === "element" || selected.type === "section") ? 320 : 16} />
        </div>
      </div>

      {/* Change Icon Modal - when Thay biểu tượng clicked on icon */}
      {changeIconForElementId && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden mx-4 flex flex-col">
            <div className="px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-slate-800">Thay biểu tượng</p>
              <button type="button" onClick={() => setChangeIconForElementId(null)} className="p-2 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0 p-2">
              <IconPickerPanel
                onSelect={(iconId, icon) => handleChangeIcon(iconId, icon.color)}
                onClose={() => setChangeIconForElementId(null)}
                onBack={() => setChangeIconForElementId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Image Modal - when Thêm ảnh / Thay ảnh clicked on gallery/image/collection */}
      {addImageContext && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden mx-4 flex flex-col">
            <div className="px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-slate-800">{(addImageContext.itemIndex != null) ? "Chọn ảnh để thay thế" : "Chọn ảnh để thêm"}</p>
              <button type="button" onClick={() => setAddImageContext(null)} className="p-2 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <ImagePickerPanel
                onUse={(url) => handleAddImageToElement(url)}
                onClose={() => setAddImageContext(null)}
                onBack={() => setAddImageContext(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden mx-4">
            <div className="px-6 py-4 border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Xuất bản Landing Page</h3>
              <button type="button" onClick={() => setShowPublishModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {publishChecks && publishChecks.length > 0 ? (
              <>
                <div className="px-6 py-4 border-b border-[#e0e0e0] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                  <div><h4 className="text-sm font-bold text-slate-900">Chưa đủ điều kiện xuất bản</h4><p className="text-xs text-slate-500">Vui lòng hoàn thành các mục bên dưới</p></div>
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
                <div className="px-6 py-4 border-t border-[#e0e0e0] flex justify-end">
                  <button type="button" onClick={() => { setPublishChecks(null); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Quay lại</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex border-b border-[#e0e0e0] px-6">
                  <button type="button" onClick={() => setPublishFormTab("xuất-bản")} className={`px-4 py-3 text-sm font-medium border-b-2 transition ${publishFormTab === "xuất-bản" ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500"}`}>Xuất bản</button>
                  <button type="button" onClick={() => setPublishFormTab("tên-miền")} className={`px-4 py-3 text-sm font-medium border-b-2 transition ${publishFormTab === "tên-miền" ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500"}`}>Tên miền riêng</button>
                </div>
                <div className="px-6 py-4">
                  {publishFormError && (
                    <div className="mb-4 flex items-center justify-center gap-2 py-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
                      <p className="text-sm font-bold text-slate-900">{publishFormError}</p>
                    </div>
                  )}
                  {publishFormTab === "xuất-bản" ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Trang của bạn</label>
                      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <input type="text" value={publishPageUrl} onChange={(e) => setPublishPageUrl(e.target.value)} placeholder="https://..." className="flex-1 px-3 py-2.5 text-sm outline-none" />
                        <div className="flex items-center gap-1 px-2 border-l border-slate-200">
                          <button type="button" title="Copy link" className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Link2 className="w-4 h-4" /></button>
                          <button type="button" title="Mở" className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><ExternalLink className="w-4 h-4" /></button>
                          <button type="button" title="Sao chép" className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><ClipboardCopy className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">Xuất bản Landing Page với tên miền riêng <button type="button" className="text-slate-400 hover:text-slate-600">?</button></p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tên miền</label>
                          <select value={publishDomainId} onChange={(e) => setPublishDomainId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                            <option value="">-- Chọn domain --</option>
                            {publishDomains.map((d) => (
                              <option key={d.id} value={d.id}>{d.domainName}</option>
                            ))}
                            {publishDomains.length === 0 && <option value="" disabled>Chưa có domain</option>}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn (nếu có)</label>
                          <input type="text" value={publishCustomPath} onChange={(e) => setPublishCustomPath(e.target.value)} placeholder="Nhập đường dẫn (nếu có)" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-[#e0e0e0] flex justify-center">
                  <Button onClick={handlePublishConfirm} loading={publishing} className="bg-[#1e2d7d] hover:bg-[#162558] text-white px-8">
                    Xuất bản lại
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal - dùng iframe srcdoc thay blob URL để tránh trang trắng */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0e0e0] bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Xem trước trang</h3>
              {previewDeviceType === "mobile" && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#1e2d7d] text-white">Mobile</span>
              )}
              <span className="text-[11px] text-slate-500 hidden sm:inline">Nhấn ESC để đóng</span>
            </div>
            <button type="button" onClick={() => setShowPreviewModal(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e2d7d] hover:bg-[#162558] text-white text-sm font-medium" title="Quay lại editor (hoặc nhấn ESC)">
              <ChevronLeft className="w-4 h-4" />
              Quay lại editor
            </button>
          </div>
          <div
            className={`flex-1 min-h-0 flex flex-col ${previewDeviceType === "mobile" ? "items-center justify-start overflow-y-auto bg-slate-200 py-4" : "overflow-hidden"}`}
          >
            <iframe
              title="Preview"
              srcDoc={previewHtml}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              className={`border-0 bg-white ${previewDeviceType === "mobile" ? "w-[420px] max-w-full shrink-0 shadow-2xl rounded-lg" : "w-full flex-1 min-h-0"}`}
              style={
                previewDeviceType === "mobile"
                  ? { minHeight: "min(100%, 100dvh - 120px)" }
                  : { height: "100%", minHeight: 0 }
              }
            />
          </div>
        </div>
      )}

      {/* Phím tắt */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowShortcutsModal(false)}>
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#e0e0e0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[#1e2d7d]" />
                <h3 className="text-base font-bold text-slate-900">Phím tắt</h3>
              </div>
              <button type="button" onClick={() => setShowShortcutsModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100" aria-label="Đóng">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-2 text-sm">
              {[
                ["Lưu trang", "Ctrl + S"],
                ["Hoàn tác", "Ctrl + Z"],
                ["Làm lại", "Ctrl + Y hoặc Ctrl + Shift + Z"],
                ["Sao chép phần tử", "Ctrl + C"],
                ["Dán", "Ctrl + V"],
                ["Cắt", "Ctrl + X"],
                ["Nhân đôi phần tử đang chọn", "Ctrl + D"],
                ["Xóa phần tử", "Delete / Backspace"],
                ["Thu phóng canvas", "Ctrl + + / Ctrl + -"],
                ["Thu phóng (chuột)", "Ctrl + cuộn"],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{label}</span>
                  <kbd className="shrink-0 px-2 py-1 rounded bg-slate-100 text-[11px] font-mono text-slate-800">{keys}</kbd>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#e0e0e0] bg-slate-50">
              <p className="text-[11px] text-slate-500">Nhấn ESC để đóng. Trên Mac dùng ⌘ thay cho Ctrl.</p>
            </div>
          </div>
        </div>
      )}

      {/* Trợ giúp nhanh */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHelpModal(false)}>
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#e0e0e0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#1e2d7d]" />
                <h3 className="text-base font-bold text-slate-900">Trợ giúp nhanh</h3>
              </div>
              <button type="button" onClick={() => setShowHelpModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100" aria-label="Đóng">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-slate-600">
              <p>• Kéo thả phần tử từ cột trái vào canvas hoặc chọn Section để thêm khối.</p>
              <p>• Double-click vào chữ để sửa trực tiếp trên canvas.</p>
              <p>• Nút <strong className="text-slate-800">Layers</strong> mở bảng lớp; <strong className="text-slate-800">Thiết lập trang</strong> (bánh răng) cho SEO và mã nhúng.</p>
              <p>• Menu <strong className="text-slate-800">lưới 3×3</strong> trên header: xuất PNG, PDF, HTML và chỉnh mức zoom nhanh.</p>
              <Link to="/dashboard/pages" className="inline-flex items-center gap-1 text-[#1e2d7d] font-medium text-sm hover:underline">
                ← Về danh sách trang
              </Link>
            </div>
            <div className="px-5 py-3 border-t border-[#e0e0e0] flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#1e2d7d] text-white hover:bg-[#162558]"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </EditorDndProvider>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#1e2d7d] border-t-transparent rounded-full animate-spin" /></div>}>
      <EditorInner />
    </Suspense>
  );
}
