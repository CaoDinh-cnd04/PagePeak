import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
import * as fabric from "fabric";
import { useEditorStore } from "@/stores/editor/editorStore";
import { setupSnapGuides } from "./SnapGuides";
import { ElementActionToolbar } from "./ElementActionToolbar";
import { getIconById } from "@/lib/editor/data/iconData";
import type { EditorElement, EditorSection } from "@/types/editor";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { parseTabsContent, parseCarouselContent } from "@/lib/editor/tabsContent";
import { parseBlogListContent, parseBlogDetailContent, parsePopupContent } from "@/lib/editor/blogContent";
import { parseCartContent, getCartDisplayItems } from "@/lib/editor/cartContent";
import { mergeInlineContent, mergeInlineTextStyle, getInlineTextStyleForFabric, type InlineEditMeta } from "@/lib/editor/inlineEditMerge";
import { normalizeElementType } from "@/lib/editor/normalizeElementType";
import { loadGoogleFont, fetchFontList } from "@/lib/editor/fontLoader";
import type { TextFormatToolbarState } from "./ElementActionToolbar";

const SECTION_LABEL_HEIGHT = 0;
const SECTION_GAP = 4;

/** Parse CSS box-shadow string to Fabric Shadow options. Supports "offsetX offsetY blur color" format. */
function parseBoxShadow(str: string): { color: string; blur: number; offsetX: number; offsetY: number } | null {
  const s = str.trim();
  if (!s) return null;
  const match = s.match(/^(-?\d+(?:px)?)\s+(-?\d+(?:px)?)\s+(\d+(?:px)?)\s+(.+)$/);
  if (match) {
    const offsetX = parseInt(match[1], 10) || 0;
    const offsetY = parseInt(match[2], 10) || 0;
    const blur = parseInt(match[3], 10) || 0;
    const color = match[4].trim();
    return { color, blur, offsetX, offsetY };
  }
  const simpleMatch = s.match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (simpleMatch) {
    return {
      offsetX: 0,
      offsetY: parseInt(simpleMatch[1], 10) || 0,
      blur: parseInt(simpleMatch[2], 10) || 0,
      color: simpleMatch[3].trim(),
    };
  }
  return null;
}

interface FabricCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onRequestAddImage?: (elementId: number, itemIndex?: number, field?: "avatar" | "image") => void;
  onRequestChangeIcon?: (elementId: number) => void;
  onRequestAddFormField?: (elementId: number) => void;
  onRequestSaveFormData?: (elementId: number) => void;
  onOpenSettings?: () => void;
}

function getSectionYOffsets(sections: EditorSection[]): number[] {
  const offsets: number[] = [];
  let y = 0;
  for (const sec of sections) {
    offsets.push(y);
    y += (sec.height ?? 600) + SECTION_LABEL_HEIGHT + SECTION_GAP;
  }
  return offsets;
}

function getTotalCanvasHeight(sections: EditorSection[]): number {
  if (sections.length === 0) return 600;
  return sections.reduce(
    (sum, s) => sum + (s.height ?? 600) + SECTION_LABEL_HEIGHT + SECTION_GAP,
    0,
  );
}

/** Chuyển fill Fabric (hex/rgb) sang #rrggbb cho input type=color. */
function fabricFillToHex(fill: string | undefined | null): string {
  if (!fill) return "#1e293b";
  const s = String(fill).trim();
  if (s.startsWith("#")) {
    if (s.length >= 7) return s.slice(0, 7);
    return s;
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const r = Math.min(255, parseInt(m[1], 10));
    const g = Math.min(255, parseInt(m[2], 10));
    const b = Math.min(255, parseInt(m[3], 10));
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }
  return "#1e293b";
}

type ExtFabricObj = fabric.FabricObject & {
  _elementId?: number;
  _sectionId?: number;
  _isSectionBg?: boolean;
  _isLabel?: boolean;
  _isGuide?: boolean;
  /** Textbox con trong Group — gộp JSON khi sửa trực tiếp trên canvas */
  _inlineEdit?: InlineEditMeta;
};

/**
 * Fabric 7 Group mặc định dùng FitContentLayout: mỗi lần remove/add child (thay Rect → FabricImage)
 * layout chạy lại, đẩy lệch toàn bộ child và đổi kích thước group — ảnh không còn khớp ô.
 * Các khối gallery/shape/product/collection tự đặt vị trí: tắt layout tự động.
 */
class FabricCompositeGroupLayoutManager extends fabric.LayoutManager {
  performLayout() {
    /* no-op */
  }
}

const fabricCompositeGroupLayout = new FabricCompositeGroupLayoutManager();

/** Fabric 7: Group bật objectCaching dễ khi kéo chỉ bbox/cập nhật, ảnh con vẫn bitmap cũ — tắt cache trên group và mọi con. */
function disableGroupBitmapCache(g: fabric.Group) {
  g.set({ objectCaching: false });
  for (const c of g.getObjects()) {
    (c as fabric.FabricObject).set({ objectCaching: false });
  }
}

/** IText/Textbox: chỉnh sửa được và có enterEditing (không dùng strict `editable === true` vì có thể kế thừa default). */
function isEditableFabricText(obj: fabric.FabricObject | undefined | null): obj is fabric.Textbox {
  if (!obj) return false;
  if ((obj as fabric.Textbox).editable === false) return false;
  if (typeof (obj as fabric.Textbox).enterEditing !== "function") return false;
  return obj instanceof fabric.Textbox || obj instanceof fabric.IText;
}

/** Dùng subTargets (lớp trong cùng trước) rồi target — tránh dblclick trúng Group mà bỏ qua Textbox con. */
function resolveEditableTextFromPointerEvent(e: {
  target?: fabric.FabricObject | undefined;
  subTargets?: fabric.FabricObject[];
}): fabric.Textbox | null {
  const seen = new Set<fabric.FabricObject>();
  const candidates: fabric.FabricObject[] = [];
  for (const s of e.subTargets ?? []) {
    if (s && !seen.has(s)) {
      seen.add(s);
      candidates.push(s);
    }
  }
  if (e.target && !seen.has(e.target)) candidates.push(e.target);
  for (const c of candidates) {
    if (isEditableFabricText(c)) return c;
  }
  return null;
}

/** Khi chọn Textbox con trong Group, Fabric không gắn _elementId — lấy từ group cha. */
function resolveElementIdFromSelection(obj: ExtFabricObj | undefined): number | undefined {
  if (!obj) return undefined;
  if (obj._elementId != null) return obj._elementId;
  const g = obj.group as ExtFabricObj | undefined;
  return g?._elementId;
}

function loadImageToCanvas(
  url: string,
  w: number,
  h: number,
  elementId: number,
  commonProps: Record<string, unknown>,
  canvasInstance: fabric.Canvas,
  placeholder: fabric.FabricObject,
  tagObj: (o: fabric.FabricObject) => void,
  imageStyles?: { borderRadius?: number; borderWidth?: number; borderColor?: string; boxShadow?: string },
) {
  const radius = imageStyles?.borderRadius ?? 0;
  const borderW = imageStyles?.borderWidth ?? 0;
  const borderC = imageStyles?.borderColor ?? "#e2e8f0";
  const boxShadow = imageStyles?.boxShadow as string | undefined;

  // Tìm placeholder hoặc bất kỳ object nào của element (Rect placeholder)
  // Dùng elementId thay object reference — bền vững qua mọi canvas rebuild.
  const findCurrentRect = (): fabric.FabricObject | null =>
    canvasInstance.getObjects().find(
      (o) => (o as ExtFabricObj)._elementId === elementId && o instanceof fabric.Rect,
    ) ?? null;

  const applyFabricImage = (fImg: fabric.FabricImage) => {
    const cur = findCurrentRect();
    if (!cur) return; // element không còn trên canvas (bị xóa hoặc đã được replace bởi load trước)
    const nw = Math.max(1, fImg.width ?? 1);
    const nh = Math.max(1, fImg.height ?? 1);
    const imgLeft = cur.left ?? 0;
    const imgTop = cur.top ?? 0;
    fImg.set({
      ...commonProps,
      left: imgLeft,
      top: imgTop,
      originX: "left",
      originY: "top",
      angle: cur.angle ?? 0,
      scaleX: w / nw,
      scaleY: h / nh,
      objectCaching: false,
    });
    if (radius > 0) {
      // absolutePositioned: true → clip dùng toạ độ canvas tuyệt đối.
      // Phải đặt left/top = vị trí thực của ảnh trên canvas để clip khớp đúng.
      const clip = new fabric.Rect({
        left: imgLeft,
        top: imgTop,
        width: w,
        height: h,
        rx: radius,
        ry: radius,
        originX: "left",
        originY: "top",
        absolutePositioned: true,
      });
      (fImg as unknown as { clipPath: unknown }).clipPath = clip;
    }
    if (borderW > 0) fImg.set({ stroke: borderC, strokeWidth: borderW });
    if (boxShadow?.trim()) {
      const parsed = parseBoxShadow(boxShadow);
      if (parsed) fImg.set("shadow", new fabric.Shadow(parsed));
    }
    fImg.setCoords();
    tagObj(fImg);
    // Giữ lại trạng thái active (selection handles) nếu placeholder đang được chọn
    const wasActive = canvasInstance.getActiveObject() === cur;
    canvasInstance.remove(cur);
    canvasInstance.add(fImg);
    if (wasActive) canvasInstance.setActiveObject(fImg);
    canvasInstance.requestRenderAll();
  };

  const showError = () => {
    const cur = findCurrentRect();
    if (!cur) return;
    const errBg = new fabric.Rect({
      left: 0, top: 0, width: w, height: h,
      fill: "#fef2f2", stroke: "#fca5a5", strokeWidth: 2,
      rx: 4, ry: 4, originX: "left", originY: "top",
    });
    const errIcon = new fabric.Textbox("🖼️", {
      left: w / 2, top: h / 2 - 18,
      fontSize: Math.min(w, h) * 0.15,
      textAlign: "center", width: w,
      originX: "center", originY: "center",
      editable: false, selectable: false,
    });
    const errText = new fabric.Textbox("Không tải được ảnh", {
      left: w / 2, top: h / 2 + 14,
      fontSize: 9, fontFamily: "Inter, sans-serif",
      fill: "#ef4444", textAlign: "center", width: w - 16,
      originX: "center", originY: "center",
      editable: false, selectable: false,
    });
    const errGroup = new fabric.Group([errBg, errIcon, errText], {
      ...commonProps, left: cur.left, top: cur.top,
      width: w, height: h, originX: "left", originY: "top",
      subTargetCheck: false, layoutManager: fabricCompositeGroupLayout,
      objectCaching: false,
    });
    disableGroupBitmapCache(errGroup);
    tagObj(errGroup);
    canvasInstance.remove(cur);
    canvasInstance.add(errGroup);
    canvasInstance.requestRenderAll();
  };

  const primaryUrl = normalizeAssetUrl(url);
  const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(primaryUrl)}`;

  // Dùng fabric.FabricImage.fromURL — API chính thức Fabric 7, xử lý crossOrigin tốt hơn HTMLImageElement thô.
  fabric.FabricImage.fromURL(primaryUrl, { crossOrigin: "anonymous" })
    .then(applyFabricImage)
    .catch(() => {
      fabric.FabricImage.fromURL(proxyUrl, { crossOrigin: "anonymous" })
        .then(applyFabricImage)
        .catch(showError);
    });

  void placeholder; // Tham chiếu placeholder giữ nguyên để không break signature
}

/**
 * Góc trên-trái của hình chữ nhật placeholder trong không gian group.
 * `left`/`top` của Fabric phụ thuộc origin (center vs top) — không được cộng (rw-sw)/2 trực tiếp vào left khi origin là center.
 */
function rectLocalTopLeft(rect: fabric.FabricObject): { x: number; y: number; rw: number; rh: number } {
  const w = rect.width ?? 0;
  const h = rect.height ?? 0;
  const sx = rect.scaleX ?? 1;
  const sy = rect.scaleY ?? 1;
  const rw = w * sx;
  const rh = h * sy;
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  const ox = rect.originX ?? "left";
  const oy = rect.originY ?? "top";
  let x = left;
  let y = top;
  if (ox === "center") x -= rw / 2;
  else if (ox === "right") x -= rw;
  if (oy === "center") y -= rh / 2;
  else if (oy === "bottom") y -= rh;
  return { x, y, rw, rh };
}

/**
 * Fabric 7: `group.add(child)` gọi `enterGroup(child, true)` — coi child đang ở **không gian canvas**
 * rồi chiếu vào group. Placeholder Rect trong gallery được đặt bằng tọa độ **local** (giống `groupInit`).
 * Ảnh thay thế cũng dùng local → phải chèn như lúc khởi tạo: `enterGroup(..., false)`.
 */
function insertFabricImageIntoGroupLocalCoords(
  group: fabric.Group,
  img: fabric.FabricImage,
  insertIndex: number,
) {
  const withObjects = group as fabric.Group & { _objects: fabric.FabricObject[] };
  withObjects._objects.splice(insertIndex, 0, img);
  const g = group as fabric.Group & {
    enterGroup: (o: fabric.FabricObject, removeParentTransform?: boolean) => void;
  };
  g.enterGroup(img, false);
  group.set("dirty", true);
  group.setCoords();
}

function loadCompositeImages(
  group: fabric.Group,
  gen: number,
  syncGenRef: { current: number },
  canvasInstance: fabric.Canvas,
) {
  const objects = group.getObjects();
  objects.forEach((obj) => {
    const src = (obj as fabric.FabricObject & { dataSrc?: string }).dataSrc;
    if (!src?.trim()) return;
    const rect = obj as fabric.FabricObject;
    const { x: tlX, y: tlY, rw, rh } = rectLocalTopLeft(rect);
    const applyImg = (img: fabric.FabricImage) => {
      if (syncGenRef.current !== gen) return;
      const nw = Math.max(1, (img as fabric.FabricImage & { width?: number }).width ?? 1);
      const nh = Math.max(1, (img as fabric.FabricImage & { height?: number }).height ?? 1);
      const scale = Math.min(rw / nw, rh / nh);
      const sw = nw * scale;
      const sh = nh * scale;
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: tlX + (rw - sw) / 2,
        top: tlY + (rh - sh) / 2,
        originX: "left",
        originY: "top",
        selectable: false,
        evented: false,
        // Cache bitmap của Group + ảnh lồng nhau dễ lệch khung khi kéo (Fabric 7)
        objectCaching: false,
      });
      const rectIndex = group.getObjects().indexOf(rect);
      if (rectIndex < 0) return;
      group.remove(rect);
      insertFabricImageIntoGroupLocalCoords(group, img, rectIndex);
      img.setCoords();
      group.setCoords();
      disableGroupBitmapCache(group);
      canvasInstance.requestRenderAll();
    };
    fabric.FabricImage.fromURL(src, { crossOrigin: "anonymous" })
      .then(applyImg)
      .catch(() => {
        fabric.FabricImage.fromURL(`${API_URL}/api/proxy-image?url=${encodeURIComponent(src)}`, { crossOrigin: "anonymous" })
          .then(applyImg)
          .catch(() => { /* keep placeholder */ });
      });
  });
}

/** API / store đôi khi trả ImageUrl thay imageUrl */
function normalizeAssetUrl(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  const base = API_URL.replace(/\/$/, "");
  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value.replace(/^\.?\//, "")}`;
}

/** API / store đôi khi trả ImageUrl thay imageUrl */
function resolveElementImageUrl(el: EditorElement): string {
  const e = el as EditorElement & { ImageUrl?: string | null };
  return normalizeAssetUrl(e.imageUrl ?? e.ImageUrl ?? "");
}

function fabricTextboxHeight(tb: fabric.Textbox): number {
  if (typeof tb.initDimensions === "function") tb.initDimensions();
  if (typeof tb.getScaledHeight === "function") return tb.getScaledHeight();
  return (tb.height ?? 0) * (tb.scaleY ?? 1);
}

function buildFabricObject(
  el: EditorElement,
  sectionYOffset: number,
  canvasWidth: number,
  canvasInstance: fabric.Canvas,
  syncGeneration: number,
  syncGenRef: { current: number },
): fabric.FabricObject | null {
  const baseLeft = el.x;
  const baseTop = el.y + sectionYOffset + SECTION_LABEL_HEIGHT;
  const w = el.width ?? 200;
  const h = el.height ?? 40;

  const commonProps = {
    left: baseLeft,
    top: baseTop,
    angle: el.rotation ?? 0,
    opacity: el.opacity ?? 1,
    selectable: !el.isLocked,
    evented: !el.isLocked,
    visible: !el.isHidden,
    lockMovementX: el.isLocked,
    lockMovementY: el.isLocked,
    lockScalingX: el.isLocked,
    lockScalingY: el.isLocked,
    lockRotation: el.isLocked,
    hasControls: !el.isLocked,
    cornerColor: "#6366f1",
    cornerStrokeColor: "#4f46e5",
    cornerStyle: "circle" as const,
    cornerSize: 10,
    touchCornerSize: 24,
    transparentCorners: false,
    borderColor: "#6366f1",
    borderScaleFactor: 1.5,
    padding: 2,
  };

  const tagObj = (obj: fabric.FabricObject) => {
    (obj as ExtFabricObj)._elementId = el.id;
    (obj as ExtFabricObj)._sectionId = el.sectionId;
    // Fabric 7: với lockScaling, góc/cạnh vẫn bắt pointer → kéo thành scale (góc đối diện đứng yên).
    // Tắt hết controls: chỉ kéo body để di chuyển; scale/xoay chỉnh qua panel / store.
    if (obj.lockScalingX === true && obj.lockScalingY === true) {
      obj.set({ hasControls: false });
    }
  };

  const fontFamily = (el.styles?.fontFamily as string) ?? "Inter, sans-serif";
  const fontSize = (el.styles?.fontSize as number) ?? 14;
  const fontWeight = (el.styles?.fontWeight as number) ?? 400;
  const textColor = (el.styles?.color as string) ?? "#1e293b";

  let obj: fabric.FabricObject | null = null;

  const elType = normalizeElementType(el.type);
  switch (elType) {
    case "text":
    case "headline":
    case "paragraph": {
      const defSize = elType === "headline" ? 32 : elType === "paragraph" ? 14 : fontSize;
      const defWeight = elType === "headline" ? 700 : fontWeight;
      const letterSpacing = (el.styles?.letterSpacing as number) ?? 0;
      const lineHeight = (el.styles?.lineHeight as number) ?? 1.5;
      const textTransform = (el.styles?.textTransform as string) ?? "none";
      const textDeco = (el.styles?.textDecoration as string) ?? "none";
      let displayContent = el.content ?? "Text";
      if (textTransform === "uppercase") displayContent = displayContent.toUpperCase();
      else if (textTransform === "lowercase") displayContent = displayContent.toLowerCase();
      else if (textTransform === "capitalize") displayContent = displayContent.replace(/\b\w/g, (c) => c.toUpperCase());
      obj = new fabric.Textbox(displayContent, {
        ...commonProps,
        width: w,
        fontSize: fontSize || defSize,
        fontWeight: (fontWeight || defWeight) as number,
        fontFamily,
        fill: textColor,
        fontStyle: ((el.styles?.fontStyle as string) ?? "normal") as "normal" | "italic" | "oblique" | "",
        textAlign: ((el.styles?.textAlign as string) ?? "left") as "left" | "center" | "right" | "justify",
        charSpacing: letterSpacing,
        lineHeight,
        underline: textDeco === "underline",
        linethrough: textDeco === "line-through",
        editable: true,
        splitByGrapheme: false,
      });
      break;
    }

    case "button": {
      const bg = (el.styles?.backgroundColor as string) ?? "#4f46e5";
      const radius = (el.styles?.borderRadius as number) ?? 8;
      const letterSpacing = (el.styles?.letterSpacing as number) ?? 0;
      const textTransform = (el.styles?.textTransform as string) ?? "none";
      const borderWidth = (el.styles?.borderWidth as number) ?? 0;
      const borderColor = (el.styles?.borderColor as string) ?? "#e2e8f0";
      const boxShadow = el.styles?.boxShadow as string | undefined;
      let btnContent = el.content ?? "Button";
      if (textTransform === "uppercase") btnContent = btnContent.toUpperCase();
      const rect = new fabric.Rect({
        width: w,
        height: h,
        fill: bg,
        rx: radius,
        ry: radius,
        originX: "center",
        originY: "center",
        stroke: borderWidth > 0 ? borderColor : undefined,
        strokeWidth: borderWidth,
      });
      if (boxShadow && boxShadow.trim()) {
        const parsed = parseBoxShadow(boxShadow);
        if (parsed) rect.set("shadow", new fabric.Shadow(parsed));
      }
      const text = new fabric.Textbox(btnContent, {
        fontSize: fontSize || 14,
        fontWeight: (fontWeight || 600) as number,
        fontFamily,
        fill: (el.styles?.color as string) ?? "#ffffff",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        charSpacing: letterSpacing,
        editable: true,
        lockMovementX: true,
        lockMovementY: true,
      });
      obj = new fabric.Group([rect, text], {
        ...commonProps,
        width: w,
        height: h,
        subTargetCheck: true,
        
      });
      break;
    }

    case "image": {
      const imgRadius = (el.styles?.borderRadius as number) ?? 6;
      const imgBorderW = (el.styles?.borderWidth as number) ?? 0;
      const imgBorderC = (el.styles?.borderColor as string) ?? "#e2e8f0";
      if (resolveElementImageUrl(el)) {
        const imgSrc = resolveElementImageUrl(el);
        // Placeholder đơn giản — sẽ bị replace bằng FabricImage thực khi tải xong
        const placeholder = new fabric.Rect({
          ...commonProps,
          width: w,
          height: h,
          fill: "#f1f5f9",
          stroke: imgBorderW > 0 ? imgBorderC : "#c7d2fe",
          strokeWidth: imgBorderW > 0 ? imgBorderW : 2,
          rx: imgRadius,
          ry: imgRadius,
        });
        tagObj(placeholder);

        loadImageToCanvas(imgSrc, w, h, el.id, commonProps, canvasInstance, placeholder, tagObj, {
          borderRadius: imgRadius,
          borderWidth: imgBorderW,
          borderColor: imgBorderC,
          boxShadow: el.styles?.boxShadow as string | undefined,
        });

        obj = placeholder;
      } else {
        // Chưa có URL — khung trống, không icon, không chữ
        obj = new fabric.Rect({
          ...commonProps,
          width: w,
          height: h,
          fill: "#f8fafc",
          stroke: "#c7d2fe",
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: imgRadius,
          ry: imgRadius,
        });
        tagObj(obj);
      }
      break;
    }

    case "video": {
      if (el.videoUrl && el.videoUrl.trim()) {
        const bg = new fabric.Rect({
          width: w,
          height: h,
          fill: "#0f172a",
          rx: 6,
          ry: 6,
          originX: "center",
          originY: "center",
        });
        const playIcon = new fabric.Textbox("▶", {
          fontSize: Math.min(w, h) * 0.25,
          fill: "#ffffff",
          textAlign: "center",
          width: w,
          originX: "center",
          originY: "center",
          top: -8,
          editable: false,
          selectable: false,
        });
        const urlLabel = new fabric.Textbox(el.videoUrl.length > 40 ? el.videoUrl.substring(0, 40) + "..." : el.videoUrl, {
          fontSize: 9,
          fontFamily: "Inter, sans-serif",
          fill: "#64748b",
          textAlign: "center",
          width: w - 20,
          originX: "center",
          originY: "center",
          top: Math.min(w, h) * 0.15 + 4,
          editable: false,
          selectable: false,
        });
        obj = new fabric.Group([bg, playIcon, urlLabel], {
          ...commonProps,
          width: w,
          height: h,
          
        });
      } else {
        const border = new fabric.Rect({
          width: w,
          height: h,
          fill: "#1e293b",
          stroke: "#475569",
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: 6,
          ry: 6,
          originX: "center",
          originY: "center",
        });
        const playIcon = new fabric.Textbox("▶", {
          fontSize: Math.min(w, h) * 0.25,
          fill: "#64748b",
          textAlign: "center",
          width: w,
          originX: "center",
          originY: "center",
          top: -10,
          editable: false,
          selectable: false,
        });
        const label = new fabric.Textbox("Nhập URL video ở panel phải →", {
          fontSize: 10,
          fontFamily: "Inter, sans-serif",
          fill: "#64748b",
          textAlign: "center",
          width: w - 16,
          originX: "center",
          originY: "center",
          top: Math.min(w, h) * 0.15 + 4,
          editable: false,
          selectable: false,
        });
        obj = new fabric.Group([border, playIcon, label], {
          ...commonProps,
          width: w,
          height: h,
          
        });
      }
      break;
    }

    case "shape": {
      const bg = (el.styles?.backgroundColor as string) ?? "#e0e7ff";
      const radius = (el.styles?.borderRadius as number) ?? 0;
      const borderW = (el.styles?.borderWidth as number) ?? 0;
      const borderC = (el.styles?.borderColor as string) ?? "#e2e8f0";
      const borderStyle = (el.styles?.borderStyle as string) ?? "solid";
      const boxShadow = el.styles?.boxShadow as string | undefined;
      const overlayColor = (el.styles?.overlayColor as string) ?? "";
      const overlayOpacity = Number(el.styles?.overlayOpacity ?? 0) || 0;
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(el.content || "[]");
        urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
      } catch {}
      const tl = (el.styles?.borderTopLeftRadius as number) ?? radius;
      const tr = (el.styles?.borderTopRightRadius as number) ?? radius;
      const bl = (el.styles?.borderBottomLeftRadius as number) ?? radius;
      const br = (el.styles?.borderBottomRightRadius as number) ?? radius;
      const useRadius = radius > 0 || tl > 0 || tr > 0 || bl > 0 || br > 0 ? Math.max(radius, tl, tr, bl, br) : 0;
      const strokeDash = borderStyle === "dashed" ? [8, 4] : borderStyle === "dotted" ? [2, 4] : undefined;

      const bgRect = new fabric.Rect({
        width: w,
        height: h,
        fill: bg === "transparent" ? "rgba(248,250,252,0.5)" : bg,
        rx: useRadius > 999 ? w / 2 : useRadius,
        ry: useRadius > 999 ? h / 2 : useRadius,
        originX: "center",
        originY: "center",
      });
      if (boxShadow && boxShadow.trim()) {
        const parsed = parseBoxShadow(boxShadow);
        if (parsed) bgRect.set("shadow", new fabric.Shadow(parsed));
      }
      const parts: fabric.FabricObject[] = [bgRect];

      if (urls.length > 0) {
        const gap = 4;
        const cols = Math.min(urls.length, 3);
        const cellW = (w - gap * (cols + 1)) / cols;
        const cellH = cellW;
        const maxRows = Math.ceil(urls.length / cols);
        urls
          .slice(0, cols * Math.min(maxRows, Math.ceil(h / (cellH + gap))))
          .forEach((url, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = -w / 2 + gap + cellW / 2 + col * (cellW + gap);
          const cy = -h / 2 + gap + cellH / 2 + row * (cellH + gap);
          const cellBg = new fabric.Rect({
            width: cellW,
            height: cellH,
            fill: "#e2e8f0",
            rx: 4,
            ry: 4,
            left: cx,
            top: cy,
            originX: "center",
            originY: "center",
          });
          (cellBg as fabric.Rect & { dataSrc?: string }).dataSrc = url;
          parts.push(cellBg);
        });
      } else {
        // Không hiện icon — khung rỗng để người dùng thêm ảnh nền tự do
      }

      if (overlayColor && overlayOpacity > 0) {
        const overlay = new fabric.Rect({
          width: w,
          height: h,
          fill: overlayColor,
          opacity: overlayOpacity,
          rx: useRadius > 999 ? w / 2 : useRadius,
          ry: useRadius > 999 ? h / 2 : useRadius,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });
        parts.push(overlay);
      }

      const rect = new fabric.Rect({
        width: w,
        height: h,
        fill: "transparent",
        rx: useRadius > 999 ? w / 2 : useRadius,
        ry: useRadius > 999 ? h / 2 : useRadius,
        originX: "center",
        originY: "center",
        stroke: borderW > 0 ? borderC : undefined,
        strokeWidth: borderW,
        strokeDashArray: strokeDash,
        selectable: false,
        evented: false,
      });
      parts.push(rect);

      obj = new fabric.Group(parts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: baseTop + h / 2,
        originX: "center",
        originY: "center",
        width: w,
        height: h,
        subTargetCheck: false,
        
        layoutManager: fabricCompositeGroupLayout,
      });
      // Children đã dùng originX: center — KHÔNG cần loop +w/2
      if (urls.length > 0) {
        loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      }
      tagObj(obj);
      break;
    }

    case "divider": {
      const color = (el.styles?.backgroundColor as string) ?? "#d1d5db";
      const lineStyle = (el.styles?.lineStyle as string) ?? "solid";
      const thickness = (el.styles?.height as number) ?? (h || 2);
      let dashArr: number[] | undefined;
      const dashStr = el.styles?.strokeDashArray;
      if (typeof dashStr === "string") {
        try {
          const parsed = JSON.parse(dashStr);
          dashArr = Array.isArray(parsed) ? parsed : undefined;
        } catch {}
      }
      if (!dashArr && lineStyle === "dashed") dashArr = [8, 4];
      if (!dashArr && lineStyle === "dotted") dashArr = [2, 4];
      if (lineStyle === "double") {
        const gap = Math.max(2, thickness);
        const line1 = new fabric.Line([0, 0, w, 0], { stroke: color, strokeWidth: Math.max(1, thickness / 2) });
        const line2 = new fabric.Line([0, gap, w, gap], { stroke: color, strokeWidth: Math.max(1, thickness / 2) });
        obj = new fabric.Group([line1, line2], { ...commonProps, subTargetCheck: false });
      } else {
        obj = new fabric.Line([0, 0, w, 0], {
          ...commonProps,
          stroke: color,
          strokeWidth: thickness,
          strokeDashArray: dashArr,
        });
      }
      break;
    }

    case "icon": {
      const iconColor = (el.styles?.color as string) ?? "#4f46e5";
      const content = el.content ?? "";

      if (content.includes(":")) {
        // Iconify format: dùng Textbox placeholder (★) vì FabricCanvas là legacy renderer
        // DomCanvas là renderer chính và đã hiển thị SVG đúng
        obj = new fabric.Textbox("◈", {
          ...commonProps,
          width: w,
          fontSize: Math.min(w, h) * 0.65,
          fontFamily: "Inter, sans-serif",
          fill: iconColor,
          textAlign: "center",
          editable: false,
        });
      } else {
        const iconData = content ? getIconById(content) : null;
        const iconChar = iconData?.char ?? (content === "star" ? "★" : content || "★");
        obj = new fabric.Textbox(iconChar, {
          ...commonProps,
          width: w,
          fontSize: Math.min(w, h) * 0.65,
          fontFamily: "Inter, sans-serif",
          fill: iconColor,
          textAlign: "center",
          editable: false,
        });
      }
      break;
    }

    case "form": {
      let formConfig: { formType?: string; title?: string; buttonText?: string; fields?: { id: string; label: string; type?: string }[]; inputStyle?: string } = {};
      try {
        const raw = el.content || "{}";
        const parsed = JSON.parse(raw);
        formConfig = typeof parsed === "object" ? parsed : {};
      } catch {
        const legacy = (el.content || "name,email").split(",").map((f) => f.trim()).filter(Boolean);
        formConfig = { formType: "contact", title: "Liên hệ", buttonText: "Gửi", fields: legacy.map((id) => ({ id, label: id, type: "text" })), inputStyle: "outlined" };
      }
      const formType = formConfig.formType ?? "contact";
      const title = formConfig.title ?? "Liên hệ";
      const buttonText = formConfig.buttonText ?? "Gửi";
      const fields = Array.isArray(formConfig.fields) ? formConfig.fields : [{ id: "name", label: "Họ và tên" }, { id: "email", label: "Email" }];
      const inputStyle = formConfig.inputStyle ?? "outlined";
      const inputFill = inputStyle === "filled" ? "#f1f5f9" : "#ffffff";
      const inputStroke = inputStyle === "underlined" ? 0 : 1;
      const parts: fabric.Object[] = [];
      const pad = 12;
      const inputW = w - pad * 2;
      const inputH = 32;
      const gap = 8;
      let y = -h / 2 + pad;

      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#ffffff",
        stroke: "#e2e8f0",
        strokeWidth: 1,
        rx: 8,
        ry: 8,
        originX: "center",
        originY: "center",
      });
      parts.push(bg);

      if (formType === "login") {
        const inputBox = new fabric.Rect({ width: inputW - 100, height: inputH, fill: inputFill, stroke: inputStyle === "underlined" ? "#000" : "#e2e8f0", strokeWidth: inputStyle === "underlined" ? 2 : inputStroke, rx: 4, ry: 4, originX: "left", originY: "center", left: -w / 2 + pad, top: 0 });
        const btn = new fabric.Rect({ width: 90, height: inputH, fill: "#000000", rx: 4, ry: 4, originX: "right", originY: "center", left: w / 2 - pad - 90, top: 0 });
        const btnTxt = new fabric.Textbox(buttonText, { fontSize: 12, fontWeight: 600, fill: "#ffffff", fontFamily: "Inter, sans-serif", textAlign: "center", width: 80, originX: "center", originY: "center", left: w / 2 - pad - 45, top: 0, editable: false, selectable: false });
        obj = new fabric.Group([bg, inputBox, btn, btnTxt], { ...commonProps, width: w, height: h,  });
        break;
      }
      {
        if (title) {
          const titleBar = new fabric.Rect({ width: w - 2, height: 36, fill: "#4f46e5", rx: 7, ry: 7, originX: "center", originY: "center", top: y + 18 });
          const titleTxt = new fabric.Textbox(title, { fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif", fill: "#ffffff", textAlign: "center", width: w - 30, originX: "center", originY: "center", top: y + 18, editable: false, selectable: false });
          parts.push(titleBar, titleTxt);
          y += 44;
        }
        if (formType === "otp") {
          const instTxt = new fabric.Textbox("Nhập mã OTP được gửi đến số điện thoại của bạn để xác nhận", { fontSize: 10, fill: "#64748b", fontFamily: "Inter, sans-serif", width: inputW, originX: "center", originY: "center", top: y + 10, editable: false, selectable: false });
          parts.push(instTxt);
          y += 28;
        }
        for (let i = 0; i < Math.min(fields.length, 4); i++) {
          const f = fields[i];
          const isTextarea = (f as { type?: string }).type === "textarea";
          const boxH = isTextarea ? 48 : inputH;
          const inputBox = new fabric.Rect({
            width: inputW,
            height: boxH,
            fill: inputFill,
            stroke: inputStyle === "underlined" ? "#000" : "#e2e8f0",
            strokeWidth: inputStyle === "underlined" ? 2 : inputStroke,
            rx: inputStyle === "underlined" ? 0 : 4,
            ry: inputStyle === "underlined" ? 0 : 4,
            originX: "center",
            originY: "center",
            top: y + boxH / 2,
          });
          parts.push(inputBox);
          y += boxH + gap;
        }
        const submitBtn = new fabric.Rect({ width: inputW, height: 36, fill: "#000000", rx: 6, ry: 6, originX: "center", originY: "center", top: y + 18 });
        const submitTxt = new fabric.Textbox(buttonText, { fontSize: 12, fontWeight: 600, fill: "#ffffff", fontFamily: "Inter, sans-serif", textAlign: "center", width: inputW - 20, originX: "center", originY: "center", top: y + 18, editable: false, selectable: false });
        parts.push(submitBtn, submitTxt);
        obj = new fabric.Group(parts, { ...commonProps, width: w, height: h,  });
      }
      break;
    }

    case "countdown": {
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#0f172a",
        rx: 8,
        ry: 8,
        originX: "center",
        originY: "center",
      });
      const countText = new fabric.Textbox("00 : 12 : 45 : 30", {
        fontSize: Math.min(w / 10, h * 0.5),
        fontWeight: 700,
        fill: "#ffffff",
        fontFamily: "monospace",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        top: -4,
        editable: false,
        selectable: false,
      });
      const labels = new fabric.Textbox("Ngày     Giờ     Phút     Giây", {
        fontSize: 8,
        fill: "#64748b",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        top: Math.min(w / 10, h * 0.5) * 0.5 + 6,
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, countText, labels], {
        ...commonProps,
        width: w,
        height: h,
        
      });
      break;
    }

    case "map": {
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#e8f0fe",
        stroke: "#c7d2fe",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
        originX: "center",
        originY: "center",
      });
      const pin = new fabric.Textbox("📍", {
        fontSize: Math.min(w, h) * 0.2,
        textAlign: "center",
        width: w,
        originX: "center",
        originY: "center",
        top: -8,
        editable: false,
        selectable: false,
      });
      const label = new fabric.Textbox("Google Maps", {
        fontSize: 11,
        fontWeight: 600,
        fill: "#4f46e5",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        width: w - 16,
        originX: "center",
        originY: "center",
        top: Math.min(w, h) * 0.12 + 4,
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, pin, label], {
        ...commonProps,
        width: w,
        height: h,
        
      });
      break;
    }

    case "rating": {
      const stars = "★★★★★";
      obj = new fabric.Textbox(stars, {
        ...commonProps,
        width: w,
        fontSize: h * 0.7,
        fill: (el.styles?.color as string) ?? "#f59e0b",
        textAlign: "center",
        editable: false,
      });
      break;
    }

    case "progress": {
      const percent = Math.min(100, Math.max(0, parseInt(el.content || "75") || 75));
      const trackColor = (el.styles?.backgroundColor as string) ?? "#e2e8f0";
      const track = new fabric.Rect({
        width: w,
        height: h,
        fill: trackColor,
        rx: h / 2,
        ry: h / 2,
        originX: "center",
        originY: "center",
      });
      const bar = new fabric.Rect({
        width: w * (percent / 100),
        height: h,
        fill: "#4f46e5",
        rx: h / 2,
        ry: h / 2,
        originX: "center",
        originY: "center",
        left: -(w - w * (percent / 100)) / 2,
      });
      const label = new fabric.Textbox(`${percent}%`, {
        fontSize: Math.min(h * 0.6, 14),
        fontWeight: 600,
        fill: "#ffffff",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        width: w,
        originX: "center",
        originY: "center",
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([track, bar, label], {
        ...commonProps,
        width: w,
        height: h,
        
      });
      break;
    }

    case "social-share": {
      const icons = "📱 📘 🐦 📸";
      obj = new fabric.Textbox(icons, {
        ...commonProps,
        width: w,
        fontSize: h * 0.5,
        textAlign: "center",
        editable: false,
      });
      break;
    }

    case "html": {
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#1e293b",
        rx: 6,
        ry: 6,
        originX: "center",
        originY: "center",
      });
      const codeText = new fabric.Textbox(el.content || "<div></div>", {
        fontSize: 11,
        fontFamily: "monospace",
        fill: "#86efac",
        width: w - 24,
        originX: "center",
        originY: "center",
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, codeText], {
        ...commonProps,
        width: w,
        height: h,
        
      });
      break;
    }

    case "html-code": {
      let hc: { subType?: string; code?: string; iframeSrc?: string } = {};
      try { hc = JSON.parse(el.content || "{}"); } catch {}
      const subType = hc.subType ?? "html-js";
      const label = subType === "iframe" ? "IFRAME" : "HTML/JAVASCRIPT";
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#f8fafc",
        rx: 8,
        ry: 8,
        stroke: "#cbd5e1",
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        originX: "center",
        originY: "center",
      });
      const iconText = new fabric.Textbox("</>", {
        fontSize: Math.min(w, h) * 0.2,
        fontFamily: "monospace",
        fill: "#64748b",
        textAlign: "center",
        width: w,
        originX: "center",
        originY: "center",
        top: -12,
        editable: false,
        selectable: false,
      });
      const labelText = new fabric.Textbox(label, {
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        fill: "#94a3b8",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        top: Math.min(w, h) * 0.1 + 6,
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, iconText, labelText], {
        ...commonProps,
        width: w,
        height: h,
        
      });
      break;
    }

    case "list": {
      const lines = (el.content || "Item 1\nItem 2\nItem 3").split("\n");
      const listStyle = (el.styles?.listStyle as string) ?? "disc";
      const listContent = lines.map((l, i) =>
        listStyle === "decimal" ? `${i + 1}. ${l}` : listStyle === "check" ? `✓ ${l}` : `• ${l}`
      ).join("\n");
      const lineHeight = (el.styles?.lineHeight as number) ?? 1.8;
      const letterSpacing = (el.styles?.letterSpacing as number) ?? 0;
      obj = new fabric.Textbox(listContent, {
        ...commonProps,
        width: w,
        fontSize: fontSize || 14,
        fontWeight: fontWeight as number,
        fontFamily,
        fill: textColor,
        lineHeight,
        charSpacing: letterSpacing,
        fontStyle: ((el.styles?.fontStyle as string) ?? "normal") as "normal" | "italic" | "oblique" | "",
        textAlign: ((el.styles?.textAlign as string) ?? "left") as "left" | "center" | "right" | "justify",
        editable: true,
      });
      break;
    }

    case "gallery": {
      const layoutType = (el.styles?.layoutType as string) ?? "grid";
      const cols = Number(el.styles?.columns ?? 3) || 3;
      const gap = Number(el.styles?.gap ?? 8) || 8;
      const bg = (el.styles?.backgroundColor as string) ?? "#f8fafc";
      const radius = (el.styles?.borderRadius as number) ?? 8;
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(el.content || "[]");
        urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
      } catch {}

      /** Kích thước khung gallery — phải tính trước; lưới dùng galleryH < h nên ô phải theo gh, không theo h (tránh lệch khối). */
      const galleryW = w;
      let galleryH = h;
      if (urls.length === 0) {
        const cellW0 = (w - gap * (cols + 1)) / cols;
        const cellH0 = cellW0;
        const emptyRows = 2;
        galleryH = Math.min(h, emptyRows * cellH0 + (emptyRows + 1) * gap);
      } else if (layoutType === "grid" && urls.length > 0) {
        const cellW0 = (w - gap * (cols + 1)) / cols;
        const cellH0 = cellW0;
        const maxRows0 = Math.max(1, Math.ceil(urls.length / cols));
        galleryH = Math.min(h, maxRows0 * cellH0 + (maxRows0 + 1) * gap);
      } else if (layoutType === "product-main-thumbs" && urls.length >= 1) {
        const mainH0 = h * 0.7;
        const thumbH0 = h * 0.25;
        galleryH = Math.min(h, mainH0 + thumbH0 + gap * 2);
      }

      /** Tất cả con trong group dùng tọa độ góc trên-trái (0,0) trong khung galleryW×galleryH — khớp bbox, khung chọn và preview HTML. */
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: galleryW,
        height: galleryH,
        fill: bg,
        rx: radius,
        ry: radius,
        originX: "left",
        originY: "top",
      });
      const parts: fabric.FabricObject[] = [bgRect];
      const imgRadius = Math.min(radius, 6);
      const g = gap;
      if (urls.length === 0) {
        const cellW = (galleryW - g * (cols + 1)) / cols;
        const cellH = cellW;
        const emptyRows = 2;
        for (let row = 0; row < emptyRows; row++) {
          for (let col = 0; col < cols; col++) {
            const left = g + col * (cellW + g);
            const top = g + row * (cellH + g);
            const frame = new fabric.Rect({
              left,
              top,
              width: cellW,
              height: cellH,
              fill: "rgba(248,250,252,0.85)",
              stroke: "#cbd5e1",
              strokeWidth: 2,
              strokeDashArray: [8, 6],
              rx: imgRadius,
              ry: imgRadius,
              originX: "left",
              originY: "top",
              selectable: false,
              evented: false,
            });
            parts.push(frame);
          }
        }
      } else if (layoutType === "minimal" && urls[0]) {
        const placeholder = new fabric.Rect({
          left: g,
          top: g,
          width: galleryW - g * 2,
          height: galleryH - g * 2,
          fill: "#e2e8f0",
          rx: imgRadius,
          ry: imgRadius,
          originX: "left",
          originY: "top",
        });
        (placeholder as fabric.Rect & { dataSrc?: string }).dataSrc = urls[0];
        parts.push(placeholder);
      } else if (layoutType === "product-main-thumbs" && urls.length >= 1) {
        const innerW = galleryW - 2 * g;
        const innerH = galleryH - 2 * g;
        const mainH = innerH * 0.68;
        const thumbRowH = Math.max(24, innerH - mainH - g);
        const thumbW = (innerW - 2 * g) / 3;
        const mainPlaceholder = new fabric.Rect({
          left: g,
          top: g,
          width: innerW,
          height: mainH,
          fill: "#e2e8f0",
          rx: imgRadius,
          ry: imgRadius,
          originX: "left",
          originY: "top",
        });
        (mainPlaceholder as fabric.Rect & { dataSrc?: string }).dataSrc = urls[0];
        parts.push(mainPlaceholder);
        const thumbTop = g + mainH + g;
        [0, 1, 2].forEach((i) => {
          const thumb = new fabric.Rect({
            left: g + i * (thumbW + g),
            top: thumbTop,
            width: thumbW,
            height: thumbRowH,
            fill: "#cbd5e1",
            rx: 4,
            ry: 4,
            originX: "left",
            originY: "top",
          });
          const tu = urls[i + 1];
          if (tu?.trim()) (thumb as fabric.Rect & { dataSrc?: string }).dataSrc = tu;
          parts.push(thumb);
        });
      } else if (layoutType === "vertical-thumbs" && urls.length >= 1) {
        const thumbColW = Math.min(galleryW * 0.22, galleryW - 4 * g);
        const mainW = galleryW - thumbColW - 3 * g;
        const innerH = galleryH - 2 * g;
        const thumbH = (innerH - 2 * g) / 3;
        const mainPlaceholder = new fabric.Rect({
          left: g + thumbColW + g,
          top: g,
          width: mainW,
          height: innerH,
          fill: "#e2e8f0",
          rx: imgRadius,
          ry: imgRadius,
          originX: "left",
          originY: "top",
        });
        (mainPlaceholder as fabric.Rect & { dataSrc?: string }).dataSrc = urls[0];
        parts.push(mainPlaceholder);
        [0, 1, 2].forEach((i) => {
          const thumb = new fabric.Rect({
            left: g,
            top: g + i * (thumbH + g),
            width: thumbColW,
            height: thumbH,
            fill: "#cbd5e1",
            rx: 4,
            ry: 4,
            originX: "left",
            originY: "top",
          });
          const tu = urls[i + 1];
          if (tu?.trim()) (thumb as fabric.Rect & { dataSrc?: string }).dataSrc = tu;
          parts.push(thumb);
        });
      } else {
        const cellW = (galleryW - g * (cols + 1)) / cols;
        const cellH = cellW;
        const maxRows = Math.max(1, Math.ceil(urls.length / cols));
        urls.slice(0, cols * maxRows).forEach((url, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const left = g + col * (cellW + g);
          const top = g + row * (cellH + g);
          const cellBg = new fabric.Rect({
            left,
            top,
            width: cellW,
            height: cellH,
            fill: "#e2e8f0",
            rx: imgRadius,
            ry: imgRadius,
            originX: "left",
            originY: "top",
          });
          (cellBg as fabric.Rect & { dataSrc?: string }).dataSrc = url;
          parts.push(cellBg);
        });
      }

      obj = new fabric.Group(parts, {
        ...commonProps,
        left: baseLeft + galleryW / 2,
        top: baseTop + galleryH / 2,
        originX: "center",
        originY: "center",
        width: galleryW,
        height: galleryH,
        subTargetCheck: false,
        
        layoutManager: fabricCompositeGroupLayout,
        objectCaching: false,
      });
      // Children đã ở top-left-relative coords — convert sang center-relative để Fabric render đúng
      for (const part of (obj as fabric.Group).getObjects()) {
        part.set({
          left: (part.left ?? 0) - galleryW / 2,
          top: (part.top ?? 0) - galleryH / 2,
        });
      }
      disableGroupBitmapCache(obj as fabric.Group);
      if (urls.length > 0) {
        loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      }
      tagObj(obj);
      break;
    }

    case "product-detail": {
      const pd = parseProductDetailContent(el.content ?? undefined);
      const tSt = getInlineTextStyleForFabric(el, { kind: "product-detail", field: "title" }, { fontSize: 14, fontFamily: "Inter, sans-serif", color: "#1e293b", fontWeight: 600, textAlign: "left" });
      const pSt = getInlineTextStyleForFabric(el, { kind: "product-detail", field: "price" }, { fontSize: 15, fontFamily: "Inter, sans-serif", color: "#dc2626", fontWeight: 700, textAlign: "left" });
      const dSt = getInlineTextStyleForFabric(el, { kind: "product-detail", field: "description" }, { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" });
      const mainImg = pd.images[0];
      const bgColor = (el.styles?.backgroundColor as string) ?? "#ffffff";
      const bRadius = (el.styles?.borderRadius as number) ?? 12;
      const pdPad = 12;
      const pdImgW = w - pdPad * 2;
      /** Vuông trong khung, không quá ~52% chiều cao — tránh ảnh bị dải ngang khi h nhỏ nhưng w lớn */
      const pdImgH = Math.min(Math.round(pdImgW), Math.round(h * 0.52));
      const titleTop = pdPad + pdImgH + 10;
      const titleText = pd.title.trim() || "Tên sản phẩm";
      const priceStr = (pd.salePrice.trim() || pd.price.trim() || "0đ") || "0đ";
      const descText = pd.description.trim();
      const descDisplay = descText || "Mô tả sản phẩm";

      const measTitle = new fabric.Textbox(titleText, {
        fontSize: tSt.fontSize,
        fontWeight: tSt.fontWeight as number,
        fontFamily: tSt.fontFamily,
        fill: tSt.fill,
        width: pdImgW, editable: false, selectable: false,
      });
      const priceTop = titleTop + fabricTextboxHeight(measTitle) + 8;
      const measPrice = new fabric.Textbox(priceStr, {
        fontSize: pSt.fontSize,
        fontWeight: pSt.fontWeight as number,
        fontFamily: pSt.fontFamily,
        fill: pSt.fill,
        width: pdImgW, editable: false, selectable: false,
      });
      const descTop = priceTop + fabricTextboxHeight(measPrice) + 8;

      const measDesc = new fabric.Textbox(descDisplay, {
        fontSize: dSt.fontSize,
        fontFamily: dSt.fontFamily,
        fill: dSt.fill,
        width: pdImgW, lineHeight: 1.45, editable: false, selectable: false,
      });
      const layoutH = Math.max(h, Math.ceil(descTop + fabricTextboxHeight(measDesc) + pdPad));

      const half = layoutH / 2;
      const pdBg = new fabric.Rect({
        width: w, height: layoutH, fill: bgColor, rx: bRadius, ry: bRadius,
        left: -w / 2, top: -half, originX: "left", originY: "top",
      });
      const pdImgRect = new fabric.Rect({
        width: pdImgW, height: pdImgH, fill: "#e2e8f0", rx: 8, ry: 8,
        left: -w / 2 + pdPad, top: -half + pdPad, originX: "left", originY: "top",
      });
      if (mainImg?.trim()) (pdImgRect as fabric.Rect & { dataSrc?: string }).dataSrc = mainImg;

      const pdTitle = new fabric.Textbox(titleText, {
        fontSize: tSt.fontSize,
        fontWeight: tSt.fontWeight as number,
        fontFamily: tSt.fontFamily,
        fill: tSt.fill,
        textAlign: tSt.textAlign as "left" | "center" | "right" | "justify",
        width: pdImgW, left: -w / 2 + pdPad, top: -half + titleTop,
        originX: "left", originY: "top", editable: true, selectable: true,
        lockMovementX: true, lockMovementY: true,
      });
      (pdTitle as ExtFabricObj)._inlineEdit = { kind: "product-detail", field: "title" };
      const pdPrice = new fabric.Textbox(priceStr, {
        fontSize: pSt.fontSize,
        fontWeight: pSt.fontWeight as number,
        fontFamily: pSt.fontFamily,
        fill: pSt.fill,
        textAlign: pSt.textAlign as "left" | "center" | "right" | "justify",
        width: pdImgW,
        left: -w / 2 + pdPad, top: -half + priceTop,
        originX: "left", originY: "top", editable: true, selectable: true,
        lockMovementX: true, lockMovementY: true,
      });
      (pdPrice as ExtFabricObj)._inlineEdit = { kind: "product-detail", field: "price" };
      const pdDesc = new fabric.Textbox(descDisplay, {
        fontSize: dSt.fontSize,
        fontFamily: dSt.fontFamily,
        fill: dSt.fill,
        textAlign: dSt.textAlign as "left" | "center" | "right" | "justify",
        width: pdImgW, lineHeight: 1.45,
        left: -w / 2 + pdPad, top: -half + descTop,
        originX: "left", originY: "top", editable: true, selectable: true,
        lockMovementX: true, lockMovementY: true,
      });
      (pdDesc as ExtFabricObj)._inlineEdit = { kind: "product-detail", field: "description" };
      const pdParts: fabric.FabricObject[] = [pdBg, pdImgRect, pdTitle, pdPrice, pdDesc];

      obj = new fabric.Group(pdParts, {
        ...commonProps, left: baseLeft + w / 2, top: baseTop + layoutH / 2,
        originX: "center", originY: "center", width: w, height: layoutH,
        subTargetCheck: true,  layoutManager: fabricCompositeGroupLayout,
      });
      if (mainImg?.trim()) loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      tagObj(obj);
      break;
    }

    case "collection-list": {
      let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
      try { cl = JSON.parse(el.content || "{}"); } catch {}
      const items = cl.items ?? [];
      const cols = Math.max(1, cl.columns ?? 3);
      const bg = (el.styles?.backgroundColor as string) ?? "#f8fafc";
      const radius = (el.styles?.borderRadius as number) ?? 12;
      const gap = 10;
      const pad2 = 12;
      const cellW = (w - pad2 * 2 - gap * (cols - 1)) / cols;
      const padTop = 4;
      const gapBelowImg = 8;
      const gapTitlePrice = 4;
      const padBottom = 4;
      const displayed = items.slice(0, cols * 3);
      const rowCount = Math.max(1, Math.ceil(displayed.length / cols));

      type ClMetric = {
        item: { image?: string; title?: string; price?: string };
        i: number;
        row: number;
        col: number;
        imgSize: number;
        cardBgH: number;
        measTitle: fabric.Textbox;
        clTitleSt: {
          fontSize: number;
          fontFamily: string;
          fill: string;
          fontWeight: number;
          textAlign: string;
        };
        clPriceSt: {
          fontSize: number;
          fontFamily: string;
          fill: string;
          fontWeight: number;
          textAlign: string;
        };
      };
      const metrics: ClMetric[] = [];
      for (let i = 0; i < displayed.length; i++) {
        const item = displayed[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const clTitleSt = getInlineTextStyleForFabric(el, { kind: "collection-list", field: "title", itemIndex: i }, { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#334155", fontWeight: 600, textAlign: "left" });
        const clPriceSt = getInlineTextStyleForFabric(el, { kind: "collection-list", field: "price", itemIndex: i }, { fontSize: 12, fontFamily: "Inter, sans-serif", color: "#dc2626", fontWeight: 700, textAlign: "left" });
        const measTitle = new fabric.Textbox(item.title || "Sản phẩm", {
          fontSize: clTitleSt.fontSize,
          fontWeight: clTitleSt.fontWeight as number,
          fontFamily: clTitleSt.fontFamily,
          fill: clTitleSt.fill,
          textAlign: clTitleSt.textAlign as "left" | "center" | "right" | "justify",
          width: cellW - 10,
          lineHeight: 1.35,
          editable: false,
          selectable: false,
        });
        const measPrice = new fabric.Textbox(item.price || "0đ", {
          fontSize: clPriceSt.fontSize,
          fontWeight: clPriceSt.fontWeight as number,
          fontFamily: clPriceSt.fontFamily,
          fill: clPriceSt.fill,
          textAlign: clPriceSt.textAlign as "left" | "center" | "right" | "justify",
          width: cellW - 10,
          editable: false,
          selectable: false,
        });
        const textBlockH = fabricTextboxHeight(measTitle) + gapTitlePrice + fabricTextboxHeight(measPrice);
        /** Ảnh vuông theo chiều ngang ô (giống preview), không kéo theo chiều cao khung cũ — tránh nền xám cao hơn nội dung. */
        const imgSize = Math.max(20, cellW - 8);
        const cardBgH = padTop + imgSize + gapBelowImg + textBlockH + padBottom;
        metrics.push({
          item,
          i,
          row,
          col,
          imgSize,
          cardBgH,
          measTitle,
          clTitleSt,
          clPriceSt,
        });
      }

      const rowHeights: number[] = [];
      for (let r = 0; r < rowCount; r++) {
        const inRow = metrics.filter((m) => m.row === r);
        rowHeights[r] = inRow.length ? Math.max(...inRow.map((m) => m.cardBgH)) : 0;
      }
      const layoutH =
        displayed.length === 0
          ? h
          : Math.max(80, pad2 * 2 + rowHeights.reduce((a, b) => a + b, 0) + gap * Math.max(0, rowCount - 1));

      const rowTop: number[] = [];
      let accY = -layoutH / 2 + pad2;
      for (let r = 0; r < rowCount; r++) {
        rowTop[r] = accY;
        accY += rowHeights[r] + (r < rowCount - 1 ? gap : 0);
      }

      const bgRect = new fabric.Rect({
        width: w, height: layoutH, fill: bg, rx: radius, ry: radius,
        left: -w / 2, top: -layoutH / 2, originX: "left", originY: "top",
      });
      const parts: fabric.FabricObject[] = [bgRect];

      metrics.forEach((m) => {
        const { item, i, col, row, imgSize, measTitle, clTitleSt, clPriceSt } = m;
        const cardLeft = -w / 2 + pad2 + col * (cellW + gap);
        const cardTop = rowTop[row];
        const cardBg = new fabric.Rect({
          width: cellW, height: m.cardBgH, fill: "#ffffff", rx: 8, ry: 8,
          left: cardLeft, top: cardTop, originX: "left", originY: "top",
        });
        parts.push(cardBg);
        if (item.image?.trim()) {
          const imgRect = new fabric.Rect({
            width: imgSize, height: imgSize, fill: "#e2e8f0", rx: 6, ry: 6,
            left: cardLeft + 4, top: cardTop + padTop, originX: "left", originY: "top",
          });
          (imgRect as fabric.Rect & { dataSrc?: string }).dataSrc = item.image;
          parts.push(imgRect);
        }
        const titleTop = cardTop + padTop + imgSize + gapBelowImg;
        const titleTxt = new fabric.Textbox(item.title || "Sản phẩm", {
          fontSize: clTitleSt.fontSize,
          fontWeight: clTitleSt.fontWeight as number,
          fontFamily: clTitleSt.fontFamily,
          fill: clTitleSt.fill,
          textAlign: clTitleSt.textAlign as "left" | "center" | "right" | "justify",
          width: cellW - 10,
          lineHeight: 1.35,
          left: cardLeft + 5, top: titleTop,
          originX: "left", originY: "top", editable: true, selectable: true,
          lockMovementX: true, lockMovementY: true,
        });
        (titleTxt as ExtFabricObj)._inlineEdit = { kind: "collection-list", field: "title", itemIndex: i };
        parts.push(titleTxt);
        const priceTop = titleTop + fabricTextboxHeight(measTitle) + gapTitlePrice;
        const priceTxt = new fabric.Textbox(item.price || "0đ", {
          fontSize: clPriceSt.fontSize,
          fontWeight: clPriceSt.fontWeight as number,
          fontFamily: clPriceSt.fontFamily,
          fill: clPriceSt.fill,
          textAlign: clPriceSt.textAlign as "left" | "center" | "right" | "justify",
          width: cellW - 10,
          left: cardLeft + 5, top: priceTop,
          originX: "left", originY: "top", editable: true, selectable: true,
          lockMovementX: true, lockMovementY: true,
        });
        (priceTxt as ExtFabricObj)._inlineEdit = { kind: "collection-list", field: "price", itemIndex: i };
        parts.push(priceTxt);
      });

      if (items.length === 0) {
        const gridStroke = "#cbd5e1";
        const cellW0 = Math.max(24, (w - pad2 * 2 - gap) / 2);
        const cellH0 = Math.max(40, (h - pad2 * 2 - gap) / 2);
        const gLeft = -w / 2 + pad2;
        const gTop = -layoutH / 2 + pad2;
        const wire: fabric.FabricObject[] = [
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft, top: gTop, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft + cellW0 + gap, top: gTop, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft, top: gTop + cellH0 + gap, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft + cellW0 + gap, top: gTop + cellH0 + gap, originX: "left", originY: "top",
          }),
        ];
        parts.push(...wire);
        const labelTxt = new fabric.Textbox("Lưới sản phẩm — chọn mục Mẫu dữ liệu hoặc thêm ô ở panel phải", {
          fontSize: 10, fontFamily: "Inter, sans-serif", fill: "#64748b",
          textAlign: "center", width: w - 24,
          left: -w / 2 + 12, top: gTop + cellH0 * 2 + gap * 2 + 6, originX: "left", originY: "top",
          editable: false, selectable: false,
        });
        parts.push(labelTxt);
      }

      const groupH = items.length === 0 ? h : layoutH;
      const groupTop = baseTop + (items.length === 0 ? h / 2 : layoutH / 2);

      obj = new fabric.Group(parts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: groupTop,
        originX: "center",
        originY: "center",
        width: w,
        height: groupH,
        subTargetCheck: true,
        
        layoutManager: fabricCompositeGroupLayout,
      });
      if (items.some((it) => it.image?.trim())) {
        loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      }
      tagObj(obj);
      break;
    }

    case "carousel": {
      const { layoutType: crLt, items: crItems } = parseCarouselContent(el.content ?? undefined);
      const crType = crLt === "testimonial" || crLt === "media" ? crLt : "media";
      const crBgColor = (el.styles?.backgroundColor as string) ?? "#f8fafc";
      const crP = 16;
      const crBg = new fabric.Rect({ width: w, height: h, fill: crBgColor, rx: 12, ry: 12, left: -w / 2, top: -h / 2, originX: "left", originY: "top" });
      const crParts: fabric.FabricObject[] = [crBg];
      if (crItems.length === 0) {
        crParts.push(new fabric.Textbox("Carousel • Thêm nội dung ở panel phải", { fontSize: 12, fontFamily: "Inter, sans-serif", fill: "#94a3b8", textAlign: "center", width: w - 24, left: -w / 2 + 12, top: -12, originX: "left", originY: "top", editable: false, selectable: false }));
      } else if (crType === "testimonial") {
        const item = crItems[0];
        const avSize = Math.min(72, h * 0.22);
        const totalContentH = avSize + 12 + 40 + 20 + 16;
        const contentStartY = -totalContentH / 2;
        // Avatar shape (using rect with rx/ry for circular clip logic compatible with loadCompositeImages)
        const avRect = new fabric.Rect({ width: avSize, height: avSize, fill: "#e2e8f0", rx: avSize / 2, ry: avSize / 2, left: -avSize / 2, top: contentStartY, originX: "left", originY: "top" });
        if (item.avatar?.trim()) (avRect as fabric.Rect & { dataSrc?: string }).dataSrc = item.avatar;
        crParts.push(avRect);
        const crQuoteSt = getInlineTextStyleForFabric(el, { kind: "carousel", field: "quote", itemIndex: 0 }, { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#374151", fontWeight: 400, textAlign: "center" });
        const crNameSt = getInlineTextStyleForFabric(el, { kind: "carousel", field: "name", itemIndex: 0 }, { fontSize: 13, fontFamily: "Inter, sans-serif", color: "#111827", fontWeight: 700, textAlign: "center" });
        const crRoleSt = getInlineTextStyleForFabric(el, { kind: "carousel", field: "role", itemIndex: 0 }, { fontSize: 10, fontFamily: "Inter, sans-serif", color: "#6b7280", fontWeight: 400, textAlign: "center" });
        const crQuote = new fabric.Textbox(item.quote || "Trích dẫn...", {
          fontSize: crQuoteSt.fontSize,
          fontFamily: crQuoteSt.fontFamily,
          fontStyle: "italic",
          fill: crQuoteSt.fill,
          fontWeight: crQuoteSt.fontWeight as number,
          textAlign: crQuoteSt.textAlign as "left" | "center" | "right" | "justify",
          width: w - crP * 2, left: -w / 2 + crP, top: contentStartY + avSize + 12,
          originX: "left", originY: "top", editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
        });
        (crQuote as ExtFabricObj)._inlineEdit = { kind: "carousel", field: "quote", itemIndex: 0 };
        crParts.push(crQuote);
        const crName = new fabric.Textbox(item.name || "Tên", {
          fontSize: crNameSt.fontSize,
          fontWeight: crNameSt.fontWeight as number,
          fontFamily: crNameSt.fontFamily,
          fill: crNameSt.fill,
          textAlign: crNameSt.textAlign as "left" | "center" | "right" | "justify",
          width: w - crP * 2, left: -w / 2 + crP, top: contentStartY + avSize + 56,
          originX: "left", originY: "top", editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
        });
        (crName as ExtFabricObj)._inlineEdit = { kind: "carousel", field: "name", itemIndex: 0 };
        crParts.push(crName);
        const crRole = new fabric.Textbox(item.role || "Vai trò", {
          fontSize: crRoleSt.fontSize,
          fontFamily: crRoleSt.fontFamily,
          fill: crRoleSt.fill,
          textAlign: crRoleSt.textAlign as "left" | "center" | "right" | "justify",
          width: w - crP * 2, left: -w / 2 + crP, top: contentStartY + avSize + 74,
          originX: "left", originY: "top", editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
        });
        (crRole as ExtFabricObj)._inlineEdit = { kind: "carousel", field: "role", itemIndex: 0 };
        crParts.push(crRole);
        if (crItems.length > 1) {
          const dotsCount = Math.min(crItems.length, 5);
          const totalDotsW = dotsCount * 6 + 16 - 6 + (dotsCount - 1) * 4;
          let dotX = -totalDotsW / 2;
          crItems.slice(0, 5).forEach((_, di) => {
            const dw = di === 0 ? 16 : 6;
            crParts.push(new fabric.Rect({ width: dw, height: 6, fill: di === 0 ? "#6366f1" : "#d1d5db", rx: 3, ry: 3, left: dotX, top: h / 2 - 22, originX: "left", originY: "top" }));
            dotX += dw + 4;
          });
        }
      } else {
        const item = crItems[0];
        const crImgH = Math.round(h * 0.65);
        const crImgW = w - crP * 2;
        const crImgRect = new fabric.Rect({ width: crImgW, height: crImgH, fill: "#e2e8f0", rx: 8, ry: 8, left: -crImgW / 2, top: -h / 2 + crP, originX: "left", originY: "top" });
        if (item.image?.trim()) (crImgRect as fabric.Rect & { dataSrc?: string }).dataSrc = item.image;
        crParts.push(crImgRect);
        const crMediaTitleSt = getInlineTextStyleForFabric(el, { kind: "carousel", field: "title", itemIndex: 0 }, { fontSize: 13, fontFamily: "Inter, sans-serif", color: "#111827", fontWeight: 600, textAlign: "center" });
        const crMediaTitle = new fabric.Textbox(item.title || item.name || "Tiêu đề", {
          fontSize: crMediaTitleSt.fontSize,
          fontWeight: crMediaTitleSt.fontWeight as number,
          fontFamily: crMediaTitleSt.fontFamily,
          fill: crMediaTitleSt.fill,
          textAlign: crMediaTitleSt.textAlign as "left" | "center" | "right" | "justify",
          width: crImgW, left: -crImgW / 2, top: -h / 2 + crP + crImgH + 8,
          originX: "left", originY: "top", editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
        });
        (crMediaTitle as ExtFabricObj)._inlineEdit = { kind: "carousel", field: "title", itemIndex: 0 };
        crParts.push(crMediaTitle);
        crParts.push(new fabric.Textbox("‹", { fontSize: 28, fill: "#6366f1", fontWeight: 700, left: -w / 2 + 8, top: -20, width: 20, originX: "left", originY: "top", editable: false, selectable: false }));
        crParts.push(new fabric.Textbox("›", { fontSize: 28, fill: "#6366f1", fontWeight: 700, left: w / 2 - 24, top: -20, width: 20, originX: "left", originY: "top", editable: false, selectable: false }));
      }
      obj = new fabric.Group(crParts, {
        ...commonProps, left: baseLeft + w / 2, top: baseTop + h / 2,
        originX: "center", originY: "center", width: w, height: h,
        subTargetCheck: true,  layoutManager: fabricCompositeGroupLayout,
      });
      if (crItems.some((it) => (it.image || it.avatar)?.trim()))
        loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      tagObj(obj);
      break;
    }

    case "tabs": {
      const { items: tbItems } = parseTabsContent(el.content ?? undefined);
      const tbBgColor = (el.styles?.backgroundColor as string) ?? "#ffffff";
      const tbBarH = 38;
      const tbGap = 8;
      const tbBgRect = new fabric.Rect({ width: w, height: h, fill: tbBgColor, rx: 8, ry: 8, left: -w / 2, top: -h / 2, originX: "left", originY: "top" });
      const tbBarBg = new fabric.Rect({ width: w, height: tbBarH, fill: "#f1f5f9", left: -w / 2, top: -h / 2, originX: "left", originY: "top" });
      const tbParts: fabric.FabricObject[] = [tbBgRect, tbBarBg];
      if (tbItems.length === 0) {
        tbParts.push(new fabric.Textbox("Chọn phần tử → Panel phải mục «Tabs» → Thêm tab", { fontSize: 11, fontFamily: "Inter, sans-serif", fill: "#94a3b8", textAlign: "center", width: w - 24, left: -w / 2 + 12, top: -h / 2 + tbBarH + 16, originX: "left", originY: "top", editable: false, selectable: false }));
      } else {
        const tbW = Math.floor(w / Math.min(tbItems.length, 5));
        tbItems.slice(0, 5).forEach((tab, ti) => {
          const isActive = ti === 0;
          const tL = -w / 2 + ti * tbW;
          tbParts.push(new fabric.Rect({ width: tbW, height: tbBarH, fill: isActive ? "#6366f1" : "transparent", left: tL, top: -h / 2, originX: "left", originY: "top" }));
          const tabLblSt = getInlineTextStyleForFabric(
            el,
            { kind: "tabs", field: "label", tabIndex: ti },
            {
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              color: isActive ? "#ffffff" : "#64748b",
              fontWeight: isActive ? 700 : 400,
              textAlign: "center",
            },
          );
          const tabLbl = new fabric.Textbox(tab.label || `Tab ${ti + 1}`, {
            fontSize: tabLblSt.fontSize,
            fontWeight: tabLblSt.fontWeight as number,
            fill: tabLblSt.fill,
            fontFamily: tabLblSt.fontFamily,
            textAlign: tabLblSt.textAlign as "left" | "center" | "right" | "justify",
            width: tbW, left: tL, top: -h / 2 + (tbBarH - 16) / 2, originX: "left", originY: "top",
            editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
          });
          (tabLbl as ExtFabricObj)._inlineEdit = { kind: "tabs", field: "label", tabIndex: ti };
          tbParts.push(tabLbl);
        });
        const firstTab = tbItems[0];
        const ctTop = -h / 2 + tbBarH + tbGap;
        const ctW = w - tbGap * 2;
        const ctH = h - tbBarH - tbGap * 2;
        if (firstTab.image?.trim()) {
          const imgH = Math.round(ctH * 0.55);
          const tbImgRect = new fabric.Rect({ width: ctW, height: imgH, fill: "#e2e8f0", rx: 6, ry: 6, left: -w / 2 + tbGap, top: ctTop, originX: "left", originY: "top" });
          (tbImgRect as fabric.Rect & { dataSrc?: string }).dataSrc = firstTab.image;
          tbParts.push(tbImgRect);
          const tbTitleStImg = getInlineTextStyleForFabric(el, { kind: "tabs", field: "title", tabIndex: 0 }, { fontSize: 13, fontFamily: "Inter, sans-serif", color: "#1e293b", fontWeight: 600, textAlign: "left" });
          const tbDescStImg = getInlineTextStyleForFabric(el, { kind: "tabs", field: "desc", tabIndex: 0 }, { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" });
          const tbTitle = new fabric.Textbox(firstTab.title || "Tiêu đề", {
            fontSize: tbTitleStImg.fontSize,
            fontWeight: tbTitleStImg.fontWeight as number,
            fill: tbTitleStImg.fill,
            fontFamily: tbTitleStImg.fontFamily,
            textAlign: tbTitleStImg.textAlign as "left" | "center" | "right" | "justify",
            width: ctW,
            left: -w / 2 + tbGap, top: ctTop + imgH + 6, originX: "left", originY: "top",
            editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
          });
          (tbTitle as ExtFabricObj)._inlineEdit = { kind: "tabs", field: "title", tabIndex: 0 };
          tbParts.push(tbTitle);
          const tbDesc = new fabric.Textbox(firstTab.desc || "Mô tả", {
            fontSize: tbDescStImg.fontSize,
            fill: tbDescStImg.fill,
            fontFamily: tbDescStImg.fontFamily,
            fontWeight: tbDescStImg.fontWeight as number,
            textAlign: tbDescStImg.textAlign as "left" | "center" | "right" | "justify",
            width: ctW,
            left: -w / 2 + tbGap, top: ctTop + imgH + 24, originX: "left", originY: "top",
            editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
          });
          (tbDesc as ExtFabricObj)._inlineEdit = { kind: "tabs", field: "desc", tabIndex: 0 };
          tbParts.push(tbDesc);
        } else {
          const tbTitleStPlain = getInlineTextStyleForFabric(el, { kind: "tabs", field: "title", tabIndex: 0 }, { fontSize: 14, fontFamily: "Inter, sans-serif", color: "#1e293b", fontWeight: 600, textAlign: "left" });
          const tbDescStPlain = getInlineTextStyleForFabric(el, { kind: "tabs", field: "desc", tabIndex: 0 }, { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" });
          const tbTitle = new fabric.Textbox(firstTab.title || "Tiêu đề", {
            fontSize: tbTitleStPlain.fontSize,
            fontWeight: tbTitleStPlain.fontWeight as number,
            fill: tbTitleStPlain.fill,
            fontFamily: tbTitleStPlain.fontFamily,
            textAlign: tbTitleStPlain.textAlign as "left" | "center" | "right" | "justify",
            width: ctW,
            left: -w / 2 + tbGap, top: ctTop + tbGap, originX: "left", originY: "top",
            editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
          });
          (tbTitle as ExtFabricObj)._inlineEdit = { kind: "tabs", field: "title", tabIndex: 0 };
          tbParts.push(tbTitle);
          const tbDesc = new fabric.Textbox(firstTab.desc || "Mô tả", {
            fontSize: tbDescStPlain.fontSize,
            fill: tbDescStPlain.fill,
            fontFamily: tbDescStPlain.fontFamily,
            fontWeight: tbDescStPlain.fontWeight as number,
            textAlign: tbDescStPlain.textAlign as "left" | "center" | "right" | "justify",
            width: ctW,
            left: -w / 2 + tbGap, top: ctTop + 28, originX: "left", originY: "top",
            editable: true, selectable: true, lockMovementX: true, lockMovementY: true,
          });
          (tbDesc as ExtFabricObj)._inlineEdit = { kind: "tabs", field: "desc", tabIndex: 0 };
          tbParts.push(tbDesc);
        }
      }
      obj = new fabric.Group(tbParts, {
        ...commonProps, left: baseLeft + w / 2, top: baseTop + h / 2,
        originX: "center", originY: "center", width: w, height: h,
        subTargetCheck: true,  layoutManager: fabricCompositeGroupLayout,
      });
      if (tbItems.some((it) => it.image?.trim()))
        loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      tagObj(obj);
      break;
    }

    case "cart": {
      const cd = parseCartContent(el.content ?? undefined);
      const lines = getCartDisplayItems(cd);
      const bg = (el.styles?.backgroundColor as string) ?? "#ffffff";
      const radius = (el.styles?.borderRadius as number) ?? 12;
      const pad = 12;
      const rowH = 44;
      const headerH = 28;
      const btnH = 40;
      const emptyMsg = cd.emptyMessage?.trim() || "Giỏ hàng trống";
      const btnText = cd.checkoutButtonText?.trim() || "Thanh toán";
      const showThumb = cd.showThumbnail !== false;
      const showQty = cd.showQty !== false;
      const layoutH = h;
      const cartBg = new fabric.Rect({
        width: w,
        height: layoutH,
        fill: bg,
        rx: radius,
        ry: radius,
        stroke: "#e2e8f0",
        strokeWidth: 1,
        left: -w / 2,
        top: -layoutH / 2,
        originX: "left",
        originY: "top",
      });
      const cartParts: fabric.FabricObject[] = [cartBg];
      const titleLbl = new fabric.Textbox("GIỎ HÀNG", {
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
        fill: "#64748b",
        width: w - pad * 2,
        left: -w / 2 + pad,
        top: -layoutH / 2 + 10,
        originX: "left",
        originY: "top",
        editable: false,
        selectable: false,
      });
      cartParts.push(titleLbl);
      if (lines.length === 0) {
        cartParts.push(
          new fabric.Textbox(emptyMsg, {
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            fill: "#94a3b8",
            textAlign: "center",
            width: w - pad * 2,
            left: -w / 2 + pad,
            top: -layoutH / 2 + layoutH / 2 - 30,
            originX: "left",
            originY: "top",
            editable: false,
            selectable: false,
          }),
        );
      } else {
        let y = -layoutH / 2 + headerH + 8;
        lines.slice(0, 5).forEach((it) => {
          const thumbW = showThumb ? 36 : 0;
          const gap = 8;
          if (showThumb) {
            const ir = new fabric.Rect({
              width: thumbW,
              height: thumbW,
              fill: "#f1f5f9",
              rx: 6,
              ry: 6,
              left: -w / 2 + pad,
              top: y,
              originX: "left",
              originY: "top",
            });
            if (it.image?.trim()) (ir as fabric.Rect & { dataSrc?: string }).dataSrc = it.image;
            cartParts.push(ir);
          }
          const tLeft = -w / 2 + pad + (showThumb ? thumbW + gap : 0);
          const tTit = new fabric.Textbox(it.title || "Sản phẩm", {
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            fill: "#0f172a",
            width: w - pad * 2 - thumbW - gap - 72,
            left: tLeft,
            top: y + 4,
            originX: "left",
            originY: "top",
            editable: false,
            selectable: false,
          });
          cartParts.push(tTit);
          const priceLine = `${showQty && (it.qty ?? 1) > 0 ? `×${it.qty ?? 1} ` : ""}${it.price || ""}`;
          cartParts.push(
            new fabric.Textbox(priceLine, {
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              fill: "#dc2626",
              textAlign: "right",
              width: 68,
              left: w / 2 - pad - 68,
              top: y + 8,
              originX: "left",
              originY: "top",
              editable: false,
              selectable: false,
            }),
          );
          y += rowH;
        });
      }
      const btnTop = layoutH / 2 - pad - btnH;
      cartParts.push(
        new fabric.Rect({
          width: w - pad * 2,
          height: btnH - 4,
          fill: "#1e293b",
          rx: 8,
          ry: 8,
          left: -w / 2 + pad,
          top: btnTop,
          originX: "left",
          originY: "top",
        }),
      );
      cartParts.push(
        new fabric.Textbox(btnText, {
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          fill: "#ffffff",
          textAlign: "center",
          width: w - pad * 2,
          left: -w / 2 + pad,
          top: btnTop + 10,
          originX: "left",
          originY: "top",
          editable: false,
          selectable: false,
        }),
      );
      obj = new fabric.Group(cartParts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: baseTop + layoutH / 2,
        originX: "center",
        originY: "center",
        width: w,
        height: layoutH,
        subTargetCheck: false,
        layoutManager: fabricCompositeGroupLayout,
      });
      if (lines.some((l) => l.image?.trim())) loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      tagObj(obj);
      break;
    }

    case "blog-list": {
      const bl = parseBlogListContent(el.content ?? undefined);
      const posts = (bl.posts ?? []).slice(0, 6);
      const cols = Math.max(1, Math.min(3, bl.columns ?? 2));
      const bg = (el.styles?.backgroundColor as string) ?? "#f8fafc";
      const radius = (el.styles?.borderRadius as number) ?? 12;
      const gap = 10;
      const pad2 = 12;
      const cellW = (w - pad2 * 2 - gap * (cols - 1)) / cols;
      const fs = (el.styles?.fontSize as number) ?? 14;
      const rowCount = Math.max(1, Math.ceil(Math.max(posts.length, 1) / cols));
      const imgH = Math.min(90, cellW * 0.55);
      const cardInnerW = cellW - 16;
      type BlMetric = {
        i: number;
        row: number;
        col: number;
        cardH: number;
        post: (typeof posts)[0];
        measTitle: fabric.Textbox;
        measExcerpt: fabric.Textbox;
        measDate: fabric.Textbox;
      };
      const metrics: BlMetric[] = [];
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const titSt = getInlineTextStyleForFabric(
          el,
          { kind: "blog-list", field: "title", itemIndex: i },
          { fontSize: Math.min(fs + 1, 16), fontFamily: "Inter, sans-serif", color: "#0f172a", fontWeight: 700, textAlign: "left" },
        );
        const exSt = getInlineTextStyleForFabric(
          el,
          { kind: "blog-list", field: "excerpt", itemIndex: i },
          { fontSize: Math.max(fs - 2, 10), fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" },
        );
        const dtSt = getInlineTextStyleForFabric(
          el,
          { kind: "blog-list", field: "date", itemIndex: i },
          { fontSize: 9, fontFamily: "Inter, sans-serif", color: "#94a3b8", fontWeight: 400, textAlign: "left" },
        );
        const mt = new fabric.Textbox(post.title || "Tiêu đề", {
          fontSize: titSt.fontSize,
          fontWeight: titSt.fontWeight as number,
          fontFamily: titSt.fontFamily,
          fill: titSt.fill,
          textAlign: titSt.textAlign as "left" | "center" | "right" | "justify",
          width: cardInnerW,
          lineHeight: 1.3,
          editable: false,
          selectable: false,
        });
        const me = new fabric.Textbox(post.excerpt || "", {
          fontSize: exSt.fontSize,
          fontWeight: exSt.fontWeight as number,
          fontFamily: exSt.fontFamily,
          fill: exSt.fill,
          textAlign: exSt.textAlign as "left" | "center" | "right" | "justify",
          width: cardInnerW,
          lineHeight: 1.4,
          editable: false,
          selectable: false,
        });
        const md = new fabric.Textbox(post.date || "", {
          fontSize: dtSt.fontSize,
          fontWeight: dtSt.fontWeight as number,
          fontFamily: dtSt.fontFamily,
          fill: dtSt.fill,
          textAlign: dtSt.textAlign as "left" | "center" | "right" | "justify",
          width: cardInnerW,
          editable: false,
          selectable: false,
        });
        const hasImg = !!post.image?.trim();
        const textH = fabricTextboxHeight(mt) + 6 + fabricTextboxHeight(me) + 4 + fabricTextboxHeight(md);
        const cardH = 8 + (hasImg ? imgH + 8 : 0) + textH + 8;
        metrics.push({ i, row, col, cardH, post, measTitle: mt, measExcerpt: me, measDate: md });
      }
      const rowHeights: number[] = [];
      for (let r = 0; r < rowCount; r++) {
        const inRow = metrics.filter((m) => m.row === r);
        rowHeights[r] = inRow.length ? Math.max(...inRow.map((m) => m.cardH)) : 120;
      }
      const layoutH =
        posts.length === 0
          ? h
          : Math.max(100, pad2 * 2 + rowHeights.reduce((a, b) => a + b, 0) + gap * Math.max(0, rowCount - 1));
      const rowTop: number[] = [];
      let accY = -layoutH / 2 + pad2;
      for (let r = 0; r < rowCount; r++) {
        rowTop[r] = accY;
        accY += rowHeights[r] + (r < rowCount - 1 ? gap : 0);
      }
      const bgRect = new fabric.Rect({
        width: w,
        height: layoutH,
        fill: bg,
        rx: radius,
        ry: radius,
        left: -w / 2,
        top: -layoutH / 2,
        originX: "left",
        originY: "top",
      });
      const blParts: fabric.FabricObject[] = [bgRect];
      if (posts.length === 0) {
        const gridStroke = "#cbd5e1";
        const cellW0 = Math.max(24, (w - pad2 * 2 - gap) / 2);
        const cellH0 = Math.max(36, (h - pad2 * 2 - gap) / 2);
        const gLeft = -w / 2 + pad2;
        const gTop = -layoutH / 2 + pad2;
        const wire: fabric.FabricObject[] = [
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft, top: gTop, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft + cellW0 + gap, top: gTop, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft, top: gTop + cellH0 + gap, originX: "left", originY: "top",
          }),
          new fabric.Rect({
            width: cellW0, height: cellH0, fill: "transparent", stroke: gridStroke, strokeWidth: 1, strokeDashArray: [4, 3],
            rx: 6, ry: 6, left: gLeft + cellW0 + gap, top: gTop + cellH0 + gap, originX: "left", originY: "top",
          }),
        ];
        blParts.push(...wire);
        blParts.push(
          new fabric.Textbox("Danh sách bài — chọn Mẫu dữ liệu hoặc Thêm bài ở panel phải", {
            fontSize: 10,
            fontFamily: "Inter, sans-serif",
            fill: "#64748b",
            textAlign: "center",
            width: w - 24,
            left: -w / 2 + 12,
            top: gTop + cellH0 * 2 + gap * 2 + 6,
            originX: "left",
            originY: "top",
            editable: false,
            selectable: false,
          }),
        );
      } else {
        metrics.forEach((m) => {
          const { post, col, row, i } = m;
          const cardLeft = -w / 2 + pad2 + col * (cellW + gap);
          const cardTop = rowTop[row];
          const cardBg = new fabric.Rect({
            width: cellW,
            height: m.cardH,
            fill: "#ffffff",
            rx: 8,
            ry: 8,
            stroke: "#e2e8f0",
            strokeWidth: 1,
            left: cardLeft,
            top: cardTop,
            originX: "left",
            originY: "top",
          });
          blParts.push(cardBg);
          let y = cardTop + 8;
          if (post.image?.trim()) {
            const ir = new fabric.Rect({
              width: cellW - 16,
              height: imgH,
              fill: "#e2e8f0",
              rx: 6,
              ry: 6,
              left: cardLeft + 8,
              top: y,
              originX: "left",
              originY: "top",
            });
            (ir as fabric.Rect & { dataSrc?: string }).dataSrc = post.image;
            blParts.push(ir);
            y += imgH + 8;
          }
          const titSt = getInlineTextStyleForFabric(
            el,
            { kind: "blog-list", field: "title", itemIndex: i },
            { fontSize: Math.min(fs + 1, 16), fontFamily: "Inter, sans-serif", color: "#0f172a", fontWeight: 700, textAlign: "left" },
          );
          const exSt = getInlineTextStyleForFabric(
            el,
            { kind: "blog-list", field: "excerpt", itemIndex: i },
            { fontSize: Math.max(fs - 2, 10), fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" },
          );
          const dtSt = getInlineTextStyleForFabric(
            el,
            { kind: "blog-list", field: "date", itemIndex: i },
            { fontSize: 9, fontFamily: "Inter, sans-serif", color: "#94a3b8", fontWeight: 400, textAlign: "left" },
          );
          const tTit = new fabric.Textbox(post.title || "Tiêu đề", {
            fontSize: titSt.fontSize,
            fontWeight: titSt.fontWeight as number,
            fontFamily: titSt.fontFamily,
            fill: titSt.fill,
            textAlign: titSt.textAlign as "left" | "center" | "right" | "justify",
            width: cardInnerW,
            lineHeight: 1.3,
            left: cardLeft + 8,
            top: y,
            originX: "left",
            originY: "top",
            editable: true,
            selectable: true,
            lockMovementX: true,
            lockMovementY: true,
          });
          (tTit as ExtFabricObj)._inlineEdit = { kind: "blog-list", field: "title", itemIndex: i };
          blParts.push(tTit);
          y += fabricTextboxHeight(m.measTitle) + 6;
          const tEx = new fabric.Textbox(post.excerpt || "", {
            fontSize: exSt.fontSize,
            fontWeight: exSt.fontWeight as number,
            fontFamily: exSt.fontFamily,
            fill: exSt.fill,
            textAlign: exSt.textAlign as "left" | "center" | "right" | "justify",
            width: cardInnerW,
            lineHeight: 1.4,
            left: cardLeft + 8,
            top: y,
            originX: "left",
            originY: "top",
            editable: true,
            selectable: true,
            lockMovementX: true,
            lockMovementY: true,
          });
          (tEx as ExtFabricObj)._inlineEdit = { kind: "blog-list", field: "excerpt", itemIndex: i };
          blParts.push(tEx);
          y += fabricTextboxHeight(m.measExcerpt) + 4;
          const tDt = new fabric.Textbox(post.date || "", {
            fontSize: dtSt.fontSize,
            fontWeight: dtSt.fontWeight as number,
            fontFamily: dtSt.fontFamily,
            fill: dtSt.fill,
            textAlign: dtSt.textAlign as "left" | "center" | "right" | "justify",
            width: cardInnerW,
            left: cardLeft + 8,
            top: y,
            originX: "left",
            originY: "top",
            editable: true,
            selectable: true,
            lockMovementX: true,
            lockMovementY: true,
          });
          (tDt as ExtFabricObj)._inlineEdit = { kind: "blog-list", field: "date", itemIndex: i };
          blParts.push(tDt);
        });
      }
      obj = new fabric.Group(blParts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: baseTop + layoutH / 2,
        originX: "center",
        originY: "center",
        width: w,
        height: layoutH,
        subTargetCheck: true,
        layoutManager: fabricCompositeGroupLayout,
      });
      if (posts.some((p) => p.image?.trim())) loadCompositeImages(obj as fabric.Group, syncGeneration, syncGenRef, canvasInstance);
      tagObj(obj);
      break;
    }

    case "blog-detail": {
      const bd = parseBlogDetailContent(el.content ?? undefined);
      const bg = (el.styles?.backgroundColor as string) ?? "#ffffff";
      const radius = (el.styles?.borderRadius as number) ?? 12;
      const fs = (el.styles?.fontSize as number) ?? 15;
      const innerW = w - 32;
      const titleText = bd.title?.trim() || "Tiêu đề bài viết";
      const authorText = bd.author?.trim() || "Tác giả";
      const dateText = bd.date?.trim() || "";
      const bodyText = bd.body || "Nội dung bài viết…";

      const titleSt = getInlineTextStyleForFabric(
        el,
        { kind: "blog-detail", field: "title" },
        { fontSize: Math.min(fs + 8, 26), fontFamily: "Inter, sans-serif", color: "#0f172a", fontWeight: 800, textAlign: "left" },
      );
      const authorSt = getInlineTextStyleForFabric(
        el,
        { kind: "blog-detail", field: "author" },
        { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#64748b", fontWeight: 400, textAlign: "left" },
      );
      const dateSt = getInlineTextStyleForFabric(
        el,
        { kind: "blog-detail", field: "date" },
        { fontSize: 11, fontFamily: "Inter, sans-serif", color: "#94a3b8", fontWeight: 400, textAlign: "left" },
      );
      const bodySt = getInlineTextStyleForFabric(
        el,
        { kind: "blog-detail", field: "body" },
        { fontSize: fs, fontFamily: "Inter, sans-serif", color: "#334155", fontWeight: 400, textAlign: "left" },
      );

      const mTit = new fabric.Textbox(titleText, {
        fontSize: titleSt.fontSize,
        fontWeight: titleSt.fontWeight as number,
        fontFamily: titleSt.fontFamily,
        fill: titleSt.fill,
        textAlign: titleSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        lineHeight: 1.25,
        editable: false,
        selectable: false,
      });
      const mAuth = new fabric.Textbox(authorText, {
        fontSize: authorSt.fontSize,
        fontWeight: authorSt.fontWeight as number,
        fontFamily: authorSt.fontFamily,
        fill: authorSt.fill,
        textAlign: authorSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        editable: false,
        selectable: false,
      });
      const mDate = new fabric.Textbox(dateText, {
        fontSize: dateSt.fontSize,
        fontWeight: dateSt.fontWeight as number,
        fontFamily: dateSt.fontFamily,
        fill: dateSt.fill,
        textAlign: dateSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        editable: false,
        selectable: false,
      });
      const mBody = new fabric.Textbox(bodyText, {
        fontSize: bodySt.fontSize,
        fontWeight: bodySt.fontWeight as number,
        fontFamily: bodySt.fontFamily,
        fill: bodySt.fill,
        textAlign: bodySt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        lineHeight: 1.55,
        editable: false,
        selectable: false,
      });
      const padTop = 16;
      const gTitle = 8;
      const gMeta = 4;
      const gBody = 10;
      const padBot = 16;
      const contentH =
        padTop +
        fabricTextboxHeight(mTit) +
        gTitle +
        fabricTextboxHeight(mAuth) +
        gMeta +
        fabricTextboxHeight(mDate) +
        gBody +
        fabricTextboxHeight(mBody) +
        padBot;
      const layoutH = Math.min(h, Math.max(200, contentH));

      const bdBg = new fabric.Rect({
        width: w,
        height: layoutH,
        fill: bg,
        rx: radius,
        ry: radius,
        left: -w / 2,
        top: -layoutH / 2,
        originX: "left",
        originY: "top",
      });
      const bdParts: fabric.FabricObject[] = [bdBg];
      let ty = -layoutH / 2 + padTop;
      const leftX = -w / 2 + 16;

      const tTitle = new fabric.Textbox(titleText, {
        fontSize: titleSt.fontSize,
        fontWeight: titleSt.fontWeight as number,
        fontFamily: titleSt.fontFamily,
        fill: titleSt.fill,
        textAlign: titleSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        lineHeight: 1.25,
        left: leftX,
        top: ty,
        originX: "left",
        originY: "top",
        editable: true,
        selectable: true,
        lockMovementX: true,
        lockMovementY: true,
      });
      (tTitle as ExtFabricObj)._inlineEdit = { kind: "blog-detail", field: "title" };
      bdParts.push(tTitle);
      ty += fabricTextboxHeight(mTit) + gTitle;

      const tAuthor = new fabric.Textbox(authorText, {
        fontSize: authorSt.fontSize,
        fontWeight: authorSt.fontWeight as number,
        fontFamily: authorSt.fontFamily,
        fill: authorSt.fill,
        textAlign: authorSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        left: leftX,
        top: ty,
        originX: "left",
        originY: "top",
        editable: true,
        selectable: true,
        lockMovementX: true,
        lockMovementY: true,
      });
      (tAuthor as ExtFabricObj)._inlineEdit = { kind: "blog-detail", field: "author" };
      bdParts.push(tAuthor);
      ty += fabricTextboxHeight(mAuth) + gMeta;

      const tDate = new fabric.Textbox(dateText, {
        fontSize: dateSt.fontSize,
        fontWeight: dateSt.fontWeight as number,
        fontFamily: dateSt.fontFamily,
        fill: dateSt.fill,
        textAlign: dateSt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        left: leftX,
        top: ty,
        originX: "left",
        originY: "top",
        editable: true,
        selectable: true,
        lockMovementX: true,
        lockMovementY: true,
      });
      (tDate as ExtFabricObj)._inlineEdit = { kind: "blog-detail", field: "date" };
      bdParts.push(tDate);
      ty += fabricTextboxHeight(mDate) + gBody;

      const tBody = new fabric.Textbox(bodyText, {
        fontSize: bodySt.fontSize,
        fontWeight: bodySt.fontWeight as number,
        fontFamily: bodySt.fontFamily,
        fill: bodySt.fill,
        textAlign: bodySt.textAlign as "left" | "center" | "right" | "justify",
        width: innerW,
        lineHeight: 1.55,
        left: leftX,
        top: ty,
        originX: "left",
        originY: "top",
        editable: true,
        selectable: true,
        lockMovementX: true,
        lockMovementY: true,
        splitByGrapheme: false,
      });
      (tBody as ExtFabricObj)._inlineEdit = { kind: "blog-detail", field: "body" };
      bdParts.push(tBody);

      obj = new fabric.Group(bdParts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: baseTop + layoutH / 2,
        originX: "center",
        originY: "center",
        width: w,
        height: layoutH,
        subTargetCheck: true,
        layoutManager: fabricCompositeGroupLayout,
      });
      tagObj(obj);
      break;
    }

    case "popup": {
      const pop = parsePopupContent(el.content ?? undefined);
      const titleText = pop.title?.trim() || "Popup";
      const bodyText = (pop.body || "Nội dung popup…").slice(0, 800);
      const bg = (el.styles?.backgroundColor as string) ?? "#ffffff";
      const radius = (el.styles?.borderRadius as number) ?? 12;
      const layoutH = h;
      const headH = 40;
      const popupFlat = Number(el.styles?.popupFlat) === 1;
      const headerBg = (el.styles?.headerBackgroundColor as string) ?? "#1e293b";
      const headerTitleColor = (el.styles?.headerTextColor as string) ?? "#ffffff";
      const bodyFill = (el.styles?.bodyTextColor as string) ?? (el.styles?.color as string) ?? "#334155";

      const popBg = new fabric.Rect({
        width: w,
        height: layoutH,
        fill: bg,
        rx: radius,
        ry: radius,
        shadow: new fabric.Shadow({ color: "rgba(15,23,42,0.15)", blur: 24, offsetX: 0, offsetY: 8 }),
        left: -w / 2,
        top: -layoutH / 2,
        originX: "left",
        originY: "top",
      });

      let popParts: fabric.FabricObject[];

      if (popupFlat) {
        const titleColorFlat = (el.styles?.headerTextColor as string) ?? (el.styles?.color as string) ?? "#0f172a";
        const headTxt = new fabric.Textbox(titleText, {
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          fill: titleColorFlat,
          width: w - 24,
          left: -w / 2 + 12,
          top: -layoutH / 2 + 14,
          originX: "left",
          originY: "top",
          editable: false,
          selectable: false,
        });
        const bodyBox = new fabric.Textbox(bodyText, {
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          fill: bodyFill,
          width: w - 28,
          lineHeight: 1.45,
          left: -w / 2 + 14,
          top: -layoutH / 2 + 44,
          originX: "left",
          originY: "top",
          editable: false,
          selectable: false,
        });
        popParts = [popBg, headTxt, bodyBox];
      } else {
        const headBar = new fabric.Rect({
          width: w,
          height: headH,
          fill: headerBg,
          rx: 0,
          ry: 0,
          left: -w / 2,
          top: -layoutH / 2,
          originX: "left",
          originY: "top",
        });
        if (radius > 0) {
          headBar.set({ rx: radius, ry: radius });
        }
        const headTxt = new fabric.Textbox(titleText, {
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          fill: headerTitleColor,
          width: w - 24,
          left: -w / 2 + 12,
          top: -layoutH / 2 + (headH - 16) / 2,
          originX: "left",
          originY: "top",
          editable: false,
          selectable: false,
        });
        const bodyBox = new fabric.Textbox(bodyText, {
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          fill: bodyFill,
          width: w - 28,
          lineHeight: 1.45,
          left: -w / 2 + 14,
          top: -layoutH / 2 + headH + 12,
          originX: "left",
          originY: "top",
          editable: false,
          selectable: false,
        });
        popParts = [popBg, headBar, headTxt, bodyBox];
      }

      obj = new fabric.Group(popParts, {
        ...commonProps,
        left: baseLeft + w / 2,
        top: baseTop + layoutH / 2,
        originX: "center",
        originY: "center",
        width: w,
        height: layoutH,
        subTargetCheck: false,
        layoutManager: fabricCompositeGroupLayout,
      });
      tagObj(obj);
      break;
    }

    default: {
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#f8fafc",
        rx: 6,
        ry: 6,
        stroke: "#cbd5e1",
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        originX: "center",
        originY: "center",
      });
      const typeLabel = elType.replace(/-/g, " ").toUpperCase();
      const icon = getTypeEmoji(elType);
      const iconText = new fabric.Textbox(icon, {
        fontSize: Math.min(w, h) * 0.15,
        textAlign: "center",
        width: w,
        originX: "center",
        originY: "center",
        top: -10,
        editable: false,
        selectable: false,
      });
      const label = new fabric.Textbox(typeLabel, {
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        fill: "#94a3b8",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        top: Math.min(w, h) * 0.1 + 6,
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, iconText, label], {
        ...commonProps,
        width: w,
        height: h,
        subTargetCheck: false,
        
      });
    }
  }

  if (obj) tagObj(obj);
  return obj;
}

function getTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    gallery: "🖼",
    "product-detail": "🛍",
    "collection-list": "📦",
    frame: "🔲",
    accordion: "📋",
    table: "📊",
    cart: "🛒",
    "blog-list": "📰",
    "blog-detail": "📝",
    "html-code": "📄",
    popup: "💬",
    "section-preset": "📐",
    "popup-preset": "💬",
  };
  return map[type] ?? "📌";
}

/** Thoát chỉnh sửa text trên canvas để useEffect đồng bộ không bị return sớm (isEditing → bỏ qua rebuild). */
function exitFabricTextEditing(canvas: fabric.Canvas | null) {
  if (!canvas) return;
  const o = canvas.getActiveObject();
  if (!o) return;
  if (o instanceof fabric.Textbox && o.isEditing) {
    o.exitEditing();
    return;
  }
  if (o instanceof fabric.Group) {
    for (const sub of o.getObjects()) {
      if (sub instanceof fabric.Textbox && sub.isEditing) {
        sub.exitEditing();
        return;
      }
    }
  }
}

export default function FabricCanvas({ onCanvasReady, containerRef, onRequestAddImage, onRequestChangeIcon, onRequestAddFormField, onRequestSaveFormData, onOpenSettings }: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const syncingRef = useRef(false);
  const prevSectionsRef = useRef<string>("");
  const syncGenRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const setWrapperRef = (el: HTMLDivElement | null) => {
    (wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (containerRef && "current" in containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  const [ready, setReady] = useState(false);
  const [htmlCodeModalId, setHtmlCodeModalId] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  /** Bắt buộc re-render khi chỉ selection trên Fabric đổi (click vào chữ con trong Group mà id phần tử không đổi). */
  const [selectionTick, setSelectionTick] = useState(0);
  const [fontOptions, setFontOptions] = useState<string[]>([]);

  useEffect(() => {
    void fetchFontList().then((f) => setFontOptions(f.slice(0, 48)));
  }, []);

  const {
    sections,
    selected,
    zoom,
    desktopCanvasWidth,
    deviceType,
    selectElement,
    selectSection,
    selectPage,
    updateElement,
    pushHistory,
    duplicateElement,
    removeElement,
    moveElementLayer,
  } = useEditorStore();

  const applyTextStyle = useCallback(
    (partial: Partial<{ fontSize: number; fontFamily: string; fill: string; fontWeight: number; textAlign: string }>) => {
      const canvas = fabricRef.current;
      if (!canvas || syncingRef.current) return;
      const o = canvas.getActiveObject() as ExtFabricObj & fabric.Textbox;
      if (!o || !(o instanceof fabric.Textbox)) return;
      const elementId = o._elementId ?? (o.group as ExtFabricObj)?._elementId;
      if (!elementId) return;
      const el = useEditorStore.getState().sections.flatMap((s) => s.elements ?? []).find((e) => e.id === elementId);
      if (!el) return;

      let next = { ...partial };
      if (partial.fontFamily) {
        const family = partial.fontFamily.split(",")[0].replace(/["']/g, "").trim();
        void loadGoogleFont(family);
        next = { ...next, fontFamily: `${family}, sans-serif` };
      }

      if (o._inlineEdit) {
        const merged = mergeInlineTextStyle(el, o._inlineEdit, next);
        if (!merged) return;
        o.set(next);
        o.setCoords();
        canvas.requestRenderAll();
        updateElement(elementId, { content: merged });
        pushHistory();
        setSelectionTick((x) => x + 1);
        return;
      }

      if (!["text", "headline", "paragraph", "list", "button"].includes(el.type)) return;

      o.set(next);
      o.setCoords();
      canvas.requestRenderAll();

      const styles: Record<string, string | number> = { ...(el.styles ?? {}) };
      if (next.fontSize != null) styles.fontSize = next.fontSize;
      if (next.fontFamily != null) styles.fontFamily = next.fontFamily;
      if (next.fill != null) styles.color = next.fill;
      if (next.fontWeight != null) styles.fontWeight = next.fontWeight;
      if (next.textAlign != null) styles.textAlign = next.textAlign;

      updateElement(elementId, { styles });
      pushHistory();
      setSelectionTick((x) => x + 1);
    },
    [updateElement, pushHistory],
  );

  useEffect(() => {
    if (!canvasElRef.current) return;

    const totalH = getTotalCanvasHeight(useEditorStore.getState().sections);
    const designW = useEditorStore.getState().desktopCanvasWidth;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: designW,
      height: Math.max(totalH, 600),
      backgroundColor: "transparent",
      selection: true,
      // Fabric 7 Group.drawObject: nếu preserveObjectStacking=true và child.group !== group,
      // ảnh con vẽ nhánh invertTransform (tọa độ canvas) — kéo group chỉ bbox nhảy, ảnh “dính” chỗ cũ.
      preserveObjectStacking: false,
      stopContextMenu: true,
    });

    fabricRef.current = canvas;

    setupSnapGuides(
      canvas,
      () => useEditorStore.getState().snapToGrid,
      () => useEditorStore.getState().gridSize,
    );

    canvas.on("selection:created", (e) => {
      if (syncingRef.current) return;
      const obj = e.selected?.[0] as ExtFabricObj | undefined;
      const elementId = resolveElementIdFromSelection(obj);
      if (elementId != null) selectElement(elementId);
      else if (obj?._isSectionBg && obj._sectionId) selectSection(obj._sectionId);
    });

    canvas.on("selection:updated", (e) => {
      if (syncingRef.current) return;
      const obj = e.selected?.[0] as ExtFabricObj | undefined;
      const elementId = resolveElementIdFromSelection(obj);
      if (elementId != null) selectElement(elementId);
      else if (obj?._isSectionBg && obj._sectionId) selectSection(obj._sectionId);
    });

    canvas.on("selection:cleared", () => {
      if (syncingRef.current) return;
      selectPage();
    });

    const clickStartRef = { x: 0, y: 0 };
    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;
      clickStartRef.x = e.clientX;
      clickStartRef.y = e.clientY;
    });
    /** Một cú click (không kéo) vào chữ → vào sửa ngay, không cần double-click hay mở panel. */
    canvas.on("mouse:up", (opt) => {
      if (syncingRef.current) return;
      if (opt.e && typeof (opt.e as MouseEvent).button === "number" && (opt.e as MouseEvent).button !== 0) return;
      const e = opt.e as MouseEvent;
      const dx = e.clientX - clickStartRef.x;
      const dy = e.clientY - clickStartRef.y;
      if (dx * dx + dy * dy > 64) return;
      const textObj = resolveEditableTextFromPointerEvent(opt);
      if (!textObj) return;
      if ((textObj as fabric.IText).isEditing) return;
      canvas.setActiveObject(textObj);
      canvas.requestRenderAll();
      textObj.enterEditing(opt.e);
    });

    // Fabric 7: kéo Group đôi khi bbox cập nhật nhưng bitmap cache cũ — giữ objectCaching: false + vẽ lại mỗi frame kéo.
    canvas.on("object:moving", (e) => {
      if (syncingRef.current) return;
      const t = e.target as fabric.FabricObject | undefined;
      if (!t) return;
      t.setCoords();
      if (t instanceof fabric.Group) {
        t.set({ objectCaching: false });
      }
      canvas.requestRenderAll();
    });

    // Double-click vào text để nhập trực tiếp trên canvas (không cần vào panel)
    canvas.on("mouse:dblclick", (e) => {
      if (syncingRef.current) return;
      const textObj = resolveEditableTextFromPointerEvent(e);
      if (!textObj) return;
      canvas.setActiveObject(textObj);
      canvas.requestRenderAll();
      textObj.enterEditing(e.e);
      if (typeof textObj.selectAll === "function") textObj.selectAll();
      const ta = textObj.hiddenTextarea;
      if (ta) {
        requestAnimationFrame(() => {
          ta.focus();
          canvas.requestRenderAll();
        });
      }
    });

    // Nếu focus bị panel/React cướp sau khi vào chế độ sửa, gỡ lại focus cho textarea ẩn của Fabric.
    canvas.on("text:editing:entered", (evt) => {
      const t = evt.target as fabric.Textbox | undefined;
      const ta = t?.hiddenTextarea;
      if (!ta) return;
      requestAnimationFrame(() => {
        ta.focus();
      });
    });

    canvas.on("object:modified", (e) => {
      if (syncingRef.current) return;
      const obj = e.target as ExtFabricObj | undefined;
      if (!obj?._elementId) return;

      // Fabric trả obj.left/obj.top trong không gian design (trước viewport zoom).
      // canvas.getZoom() đã được gán = effectiveZoom. Với Fabric 7, _getPointer chia cho zoom
      // nhưng một số build của Fabric trả tọa độ theo viewport → cần chia thêm.
      // Dùng canvas.restorePointerVpt để chắc chắn lấy đúng design coordinate.
      const z = canvas.getZoom() || 1;
      // transformPoint(invertedVpt, point) = design coord; nhưng obj.left LUÔN là design coord trong Fabric 7.
      // Khi zoom != 1, obj.left đã là design coord (bằng CSS_x / zoom). Không cần chia thêm.
      const designLeft = obj.left ?? 0;
      const designTop = obj.top ?? 0;
      void z; // zoom đã được xử lý bởi Fabric nội bộ

      const storeSections = useEditorStore.getState().sections;
      const yOffsets = getSectionYOffsets(storeSections);
      // Tìm section chứa phần tử này bằng element ID (không dùng _sectionId vì có thể undefined khi load từ API PascalCase)
      let sectionIdx = 0;
      for (let i = 0; i < storeSections.length; i++) {
        if (storeSections[i].elements.some((e) => e.id === obj._elementId)) {
          sectionIdx = i;
          break;
        }
      }
      const sectionY = yOffsets[sectionIdx] ?? 0;

      const isLockedScaling = obj.lockScalingX === true && obj.lockScalingY === true;
      const isCenterOrigin = obj.originX === "center" && obj.originY === "center";
      const el = storeSections.flatMap((s) => s.elements ?? []).find((x) => x.id === obj._elementId);
      const isComposite =
        el &&
        (el.type === "gallery" ||
          el.type === "product-detail" ||
          el.type === "collection-list" ||
          el.type === "blog-list" ||
          el.type === "blog-detail" ||
          el.type === "carousel" ||
          el.type === "tabs" ||
          el.type === "shape");

      // FabricImage: width/height nội bộ là kích thước ảnh gốc + scale fit — không gọi obj.set(width/height)
      // (dễ làm mất bitmap trước khi React rebuild canvas). Nếu tính ra 0px thì giữ kích thước store.
      if (el && normalizeElementType(el.type) === "image") {
        let rawW = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1));
        let rawH = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1));
        const ew = Math.max(1, el.width ?? 200);
        const eh = Math.max(1, el.height ?? 200);
        if (rawW <= 0) rawW = ew;
        if (rawH <= 0) rawH = eh;
        const objW = rawW;
        const objH = rawH;
        const left = Math.round(designLeft - (isCenterOrigin ? objW / 2 : 0));
        const top = Math.round(designTop - sectionY - SECTION_LABEL_HEIGHT - (isCenterOrigin ? objH / 2 : 0));
        updateElement(obj._elementId, { x: left, y: top, width: rawW, height: rawH, rotation: Math.round(obj.angle ?? 0) });
        pushHistory();
        canvas.requestRenderAll();
        return;
      }

      const objW = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1));
      const objH = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1));
      const left = Math.round(designLeft - (isCenterOrigin ? objW / 2 : 0));
      const top = Math.round(designTop - sectionY - SECTION_LABEL_HEIGHT - (isCenterOrigin ? objH / 2 : 0));

      let w: number;
      let h: number;
      if (isLockedScaling) {
        // Phần tử composite: khi kéo thả chỉ di chuyển, không đổi kích thước. Giữ nguyên width/height từ store
        // vì Fabric Group có thể báo sai kích thước sau khi load ảnh (bounding box tính từ children).
        if (isComposite) {
          w = el?.width ?? objW;
          h = el?.height ?? objH;
          obj.set({ scaleX: 1, scaleY: 1 });
          obj.setCoords();
          updateElement(obj._elementId, { x: left, y: top, width: w, height: h, rotation: Math.round(obj.angle ?? 0) });
          pushHistory();
          canvas.requestRenderAll();
          return;
        } else {
          w = el?.width ?? objW;
          h = el?.height ?? objH;
        }
        obj.set({ scaleX: 1, scaleY: 1, width: w, height: h });
      } else {
        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;
        w = Math.round((obj.width ?? 0) * scaleX);
        h = Math.round((obj.height ?? 0) * scaleY);
        obj.set({ scaleX: 1, scaleY: 1, width: w, height: h });
      }

      updateElement(obj._elementId, { x: left, y: top, width: w, height: h, rotation: Math.round(obj.angle ?? 0) });
      pushHistory();
    });

    canvas.on("text:changed", (e) => {
      if (syncingRef.current) return;
      const obj = e.target as ExtFabricObj & fabric.Textbox & { group?: ExtFabricObj };
      const elementId = obj._elementId ?? obj.group?._elementId;
      if (!elementId) return;
      const el = useEditorStore.getState().sections.flatMap((s) => s.elements ?? []).find((x) => x.id === elementId);
      if (!el) return;
      const merged = mergeInlineContent(el, obj._inlineEdit, obj.text ?? "");
      if (merged !== null) updateElement(elementId, { content: merged });
      else updateElement(elementId, { content: obj.text ?? "" });
    });

    setReady(true);
    onCanvasReady?.(canvas);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;
    const bump = () => setSelectionTick((x) => x + 1);
    canvas.on("selection:created", bump);
    canvas.on("selection:updated", bump);
    canvas.on("selection:cleared", bump);
    canvas.on("text:editing:entered", bump);
    canvas.on("text:editing:exited", bump);
    return () => {
      canvas.off("selection:created", bump);
      canvas.off("selection:updated", bump);
      canvas.off("selection:cleared", bump);
      canvas.off("text:editing:entered", bump);
      canvas.off("text:editing:exited", bump);
    };
  }, [ready]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    const totalH = getTotalCanvasHeight(sections);
    const h = Math.max(totalH, 600);
    const deviceScale = deviceType === "mobile" ? 420 / desktopCanvasWidth : 1;
    const effectiveZoom = zoom * deviceScale;

    canvas.setZoom(effectiveZoom);
    canvas.setDimensions(
      { width: desktopCanvasWidth * effectiveZoom, height: h * effectiveZoom },
    );
    canvas.renderAll();
  }, [zoom, desktopCanvasWidth, deviceType, sections, ready]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    const key = JSON.stringify(sections);
    if (key === prevSectionsRef.current) return;

    const activeText = canvas.getActiveObject() as fabric.IText | undefined;
    if (activeText && activeText.isEditing) {
      // Không rebuild canvas khi đang gõ — mỗi lần updateElement từ text:changed sẽ xóa canvas và mất textarea ẩn.
      return;
    }

    prevSectionsRef.current = key;

    syncingRef.current = true;
    syncGenRef.current += 1;
    const currentGen = syncGenRef.current;

    const guides = canvas.getObjects().filter((o) => (o as ExtFabricObj)._isGuide);
    canvas.clear();
    canvas.backgroundColor = "transparent";
    guides.forEach((g) => canvas.add(g));

    const yOffsets = getSectionYOffsets(sections);

    sections.forEach((section, sIdx) => {
      const yOff = yOffsets[sIdx];
      const sectionH = section.height ?? 600;

      const sectionBg = new fabric.Rect({
        left: 0,
        top: yOff,
        width: desktopCanvasWidth,
        height: sectionH,
        fill: section.backgroundColor ?? "#ffffff",
        selectable: false,
        evented: true,
        hoverCursor: "default",
        strokeWidth: 0,
      }) as ExtFabricObj;
      sectionBg._isSectionBg = true;
      sectionBg._sectionId = section.id;
      canvas.add(sectionBg);

      if (section.backgroundImageUrl) {
        const bgGen = currentGen;
        fabric.FabricImage.fromURL(section.backgroundImageUrl, { crossOrigin: "anonymous" })
          .then((img) => {
            if (syncGenRef.current !== bgGen) return;
            img.set({
              left: 0,
              top: yOff,
              scaleX: desktopCanvasWidth / (img.width ?? desktopCanvasWidth),
              scaleY: sectionH / (img.height ?? sectionH),
              selectable: false,
              evented: false,
            });
            (img as ExtFabricObj)._isSectionBg = true;
            canvas.add(img);
            canvas.sendObjectToBack(img);
            canvas.sendObjectToBack(sectionBg);
            canvas.renderAll();
          })
          .catch(() => {});
      }

      const bottomY = yOff + sectionH;
      const divider = new fabric.Line([0, bottomY, desktopCanvasWidth, bottomY], {
        stroke: "#cbd5e1",
        strokeWidth: 1,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
      }) as ExtFabricObj;
      divider._isLabel = true;
      canvas.add(divider);

      drawGridLines(canvas, desktopCanvasWidth, sectionH, yOff);

      for (const el of section.elements) {
        if (el.isHidden) continue;
        const st = el.styles ?? {};
        if (deviceType === "web" && String(st.hideOnDesktop) === "true") continue;
        if (deviceType === "mobile" && String(st.hideOnMobile) === "true") continue;
        const fabricObj = buildFabricObject(el, yOff, desktopCanvasWidth, canvas, currentGen, syncGenRef);
        if (fabricObj) {
          canvas.add(fabricObj);
          const compositeTypes = ["gallery", "product-detail", "collection-list", "blog-list", "blog-detail", "cart", "shape", "image"];
          const isComposite = compositeTypes.includes(el.type);
          const imageCompositeTypes: string[] = [];
          if (fabricObj instanceof fabric.Group && imageCompositeTypes.includes(el.type)) {
            loadCompositeImages(fabricObj, currentGen, syncGenRef, canvas);
          }
          if (fabricObj instanceof fabric.Group && isComposite) {
            disableGroupBitmapCache(fabricObj);
            // Không đồng bộ width/height từ bbox Fabric cho gallery/image/shape — bbox hay lệch so với store → preview và khung chọn sai.
            const skipDimPatch = el.type === "gallery" || el.type === "image" || el.type === "shape";
            if (!skipDimPatch) {
              const gw = fabricObj.width ?? 0;
              const gh = fabricObj.height ?? 0;
              if (gw > 0 && gh > 0 && (Math.abs((el.width ?? 0) - gw) > 4 || Math.abs((el.height ?? 0) - gh) > 4)) {
                const id = el.id;
                const patch = { width: gw, height: gh };
                queueMicrotask(() => useEditorStore.getState().updateElement(id, patch));
              }
            }
          }
          if (fabricObj.lockScalingX === true && fabricObj.lockScalingY === true && !isComposite) {
            const rw = el.width ?? 200;
            const rh = el.height ?? 40;
            fabricObj.set({ width: rw, height: rh, scaleX: 1, scaleY: 1 });
            fabricObj.setCoords();
          }
        }
      }
    });

    if (selected.type === "element") {
      const selId = selected.id;
      const findTarget = (o: fabric.FabricObject): fabric.FabricObject | null => {
        const ext = o as ExtFabricObj;
        if (ext._elementId === selId) return o;
        if (o instanceof fabric.Group) {
          for (const child of o.getObjects()) {
            const found = findTarget(child);
            if (found) return found;
          }
        }
        return null;
      };
      const allObjs = canvas.getObjects();
      for (const o of allObjs) {
        const target = findTarget(o);
        if (target) { canvas.setActiveObject(target); break; }
      }
    }

    canvas.renderAll();
    syncingRef.current = false;
  }, [sections, desktopCanvasWidth, deviceType, selected, ready, selectionTick]);

  const totalH = getTotalCanvasHeight(sections);
  const deviceScale = deviceType === "mobile" ? 420 / desktopCanvasWidth : 1;
  const effectiveZoom = zoom * deviceScale;
  const cssW = desktopCanvasWidth * effectiveZoom;
  const cssH = Math.max(totalH, 600) * effectiveZoom;

  const selEl = selected.type === "element"
    ? (() => {
        for (const s of sections) {
          const el = s.elements.find((e) => e.id === selected.id);
          if (el) return { el, section: s };
        }
        return null;
      })()
    : null;

  const showToolbar = !!selEl;
  const toolbarPos = showToolbar && selEl
    ? (() => {
        const yOffsets = getSectionYOffsets(sections);
        const sIdx = sections.findIndex((s) => s.id === selEl.section.id);
        const sectionY = yOffsets[sIdx] ?? 0;
        const el = selEl.el;
        const w = el.width ?? 200;
        const h = el.height ?? 200;
        const yTop = sectionY + SECTION_LABEL_HEIGHT + el.y;
        const isTop = yTop > 60; // place above if there's room
        return {
          left: el.x + w / 2,
          top: isTop ? yTop - 12 : yTop + h + 12,
          placement: isTop ? "top" : "bottom",
        };
      })()
    : null;

  const textFormatToolbar: TextFormatToolbarState | null = useMemo(() => {
    void selectionTick;
    const canvas = fabricRef.current;
    if (!canvas || !selEl) return null;
    const el = selEl.el;
    const o = canvas.getActiveObject() as ExtFabricObj & fabric.Textbox;
    if (!o || !(o instanceof fabric.Textbox)) return null;
    const eid = o._elementId ?? (o.group as ExtFabricObj)?._elementId;
    if (eid !== el.id) return null;

    const rawFam = (o.fontFamily as string) || "Inter, sans-serif";
    const fontFamily = rawFam.split(",")[0].replace(/["']/g, "").trim();
    const fontSize = Math.round((o.fontSize as number) || 14);
    const fw =
      typeof o.fontWeight === "string" ? parseInt(o.fontWeight, 10) || 400 : (o.fontWeight as number) || 400;
    const ta = ((o.textAlign as string) || "left") as "left" | "center" | "right" | "justify";

    const pack = {
      fontSize,
      fontFamily,
      color: fabricFillToHex(o.fill as string),
      fontWeight: fw,
      textAlign: ta,
      onFontSizeChange: (n: number) => applyTextStyle({ fontSize: n }),
      onFontFamilyChange: (font: string) => applyTextStyle({ fontFamily: `${font}, sans-serif` }),
      onColorChange: (hex: string) => applyTextStyle({ fill: hex }),
      onBoldToggle: () => applyTextStyle({ fontWeight: fw >= 600 ? 400 : 700 }),
      onAlignChange: (align: "left" | "center" | "right") => applyTextStyle({ textAlign: align }),
    };

    if (o._inlineEdit) return pack;

    if (!["text", "headline", "paragraph", "list", "button"].includes(el.type)) return null;

    return pack;
  }, [selectionTick, selEl, applyTextStyle]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const close = () => setShowMoreMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMoreMenu]);

  return (
    <div
      ref={setWrapperRef}
      className="relative bg-white"
      style={{
        width: cssW,
        height: cssH,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <canvas ref={canvasElRef} />
      {showToolbar && toolbarPos && selEl && (
        <div
          className="absolute z-10"
          style={{
            left: toolbarPos.left * effectiveZoom,
            top: toolbarPos.top * effectiveZoom,
            transform: `translate(-50%, ${toolbarPos.placement === "top" ? "-100%" : "0"})`,
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ElementActionToolbar
            elementType={selEl.el.type}
            isLocked={selEl.el.isLocked}
            isHidden={selEl.el.isHidden}
            textFormat={textFormatToolbar}
            fontOptions={fontOptions}
            onDuplicate={() => {
              duplicateElement(selEl.el.id);
              pushHistory();
            }}
            onDelete={() => {
              removeElement(selEl.el.id);
              pushHistory();
            }}
            onAddImage={() => onRequestAddImage?.(selEl.el.id)}
            onRequestChangeIcon={selEl.el.type === "icon" ? () => onRequestChangeIcon?.(selEl.el.id) : undefined}
            onAddFormField={selEl.el.type === "form" ? () => onRequestAddFormField?.(selEl.el.id) : undefined}
            onSaveFormData={selEl.el.type === "form" ? () => onRequestSaveFormData?.(selEl.el.id) : undefined}
            onRotateVertical={selEl.el.type === "divider" ? () => {
              const r = ((selEl.el.rotation ?? 0) + 90) % 360;
              updateElement(selEl.el.id, { rotation: r });
              pushHistory();
            } : undefined}
            onColorChange={selEl.el.type === "divider" ? (color) => {
              const styles = { ...selEl.el.styles, backgroundColor: color };
              updateElement(selEl.el.id, { styles });
              pushHistory();
            } : undefined}
            lineThickness={selEl.el.type === "divider" ? ((selEl.el.styles?.height as number) ?? (selEl.el.height ?? 2)) : undefined}
            lineColor={selEl.el.type === "divider" ? ((selEl.el.styles?.backgroundColor as string) ?? "#d1d5db") : undefined}
            onBringToFront={() => {
              exitFabricTextEditing(fabricRef.current);
              moveElementLayer(selEl.el.id, "forward");
              pushHistory();
              setSelectionTick((x) => x + 1);
            }}
            onSendToBack={() => {
              exitFabricTextEditing(fabricRef.current);
              moveElementLayer(selEl.el.id, "backward");
              pushHistory();
              setSelectionTick((x) => x + 1);
            }}
            onToggleLock={() => {
              updateElement(selEl.el.id, { isLocked: !selEl.el.isLocked });
              pushHistory();
            }}
            onToggleHide={() => {
              updateElement(selEl.el.id, { isHidden: !selEl.el.isHidden });
              pushHistory();
            }}
            onOpenSettings={onOpenSettings}
            onEditHtmlCode={selEl.el.type === "html-code" ? () => setHtmlCodeModalId(selEl.el.id) : undefined}
            showMoreMenu={showMoreMenu}
            onToggleMore={() => setShowMoreMenu((v) => !v)}
          />
        </div>
      )}
      {htmlCodeModalId != null && (() => {
        const el = sections.flatMap((s) => s.elements).find((e) => e.id === htmlCodeModalId);
        if (!el || el.type !== "html-code") return null;
        let hc: { code?: string } = {};
        try { hc = JSON.parse(el.content || "{}"); } catch {}
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={() => setHtmlCodeModalId(null)}>
            <div className="bg-white rounded-xl shadow-xl w-[90vw] max-w-[700px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Chỉnh sửa mã HTML/CSS/JS</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.querySelector("[data-html-code-textarea]") as HTMLTextAreaElement;
                      if (textarea) {
                        let hc2: { subType?: string; code?: string; iframeSrc?: string } = {};
                        try { hc2 = JSON.parse(el.content || "{}"); } catch {}
                        updateElement(htmlCodeModalId, { content: JSON.stringify({ ...hc2, code: textarea.value }) });
                        pushHistory();
                      }
                      setHtmlCodeModalId(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1e2d7d] text-white text-sm font-medium hover:bg-[#162558]"
                  >
                    Lưu
                  </button>
                  <button type="button" onClick={() => setHtmlCodeModalId(null)} className="p-2 rounded hover:bg-slate-100 text-slate-500">
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <textarea
                  data-html-code-textarea
                  defaultValue={hc.code ?? ""}
                  className="w-full h-[60vh] px-3 py-2 text-[12px] font-mono rounded border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nhập HTML, CSS, JavaScript..."
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function drawGridLines(
  canvas: fabric.Canvas,
  cw: number,
  sectionH: number,
  topOffset: number,
) {
  const step = 60;
  const centerX = cw / 2;

  const centerLine = new fabric.Line([centerX, topOffset, centerX, topOffset + sectionH], {
    stroke: "rgba(199,210,222,0.5)",
    strokeWidth: 1,
    strokeDashArray: [4, 4],
    selectable: false,
    evented: false,
  }) as ExtFabricObj;
  centerLine._isLabel = true;
  canvas.add(centerLine);

  for (let x = step; x < cw; x += step) {
    if (Math.abs(x - centerX) < 5) continue;
    const line = new fabric.Line([x, topOffset, x, topOffset + sectionH], {
      stroke: "rgba(199,210,222,0.18)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }) as ExtFabricObj;
    line._isLabel = true;
    canvas.add(line);
  }

  for (let y = step; y < sectionH; y += step) {
    const line = new fabric.Line([0, topOffset + y, cw, topOffset + y], {
      stroke: "rgba(199,210,222,0.18)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }) as ExtFabricObj;
    line._isLabel = true;
    canvas.add(line);
  }
}
