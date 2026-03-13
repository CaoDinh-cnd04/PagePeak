"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useEditorStore } from "@/stores/editorStore";
import { setupSnapGuides } from "./SnapGuides";
import type { EditorElement, EditorSection } from "@/types/editor";

const SECTION_LABEL_HEIGHT = 0;
const SECTION_GAP = 4;

interface FabricCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void;
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

type ExtFabricObj = fabric.FabricObject & {
  _elementId?: number;
  _sectionId?: number;
  _isSectionBg?: boolean;
  _isLabel?: boolean;
  _isGuide?: boolean;
};

function loadImageToCanvas(
  url: string,
  w: number,
  h: number,
  commonProps: Record<string, unknown>,
  gen: number,
  syncGenRef: { current: number },
  canvasInstance: fabric.Canvas,
  placeholder: fabric.FabricObject,
  tagObj: (o: fabric.FabricObject) => void,
) {
  const htmlImg = new Image();
  htmlImg.crossOrigin = "anonymous";
  htmlImg.onload = () => {
    if (syncGenRef.current !== gen) return;
    const fImg = new fabric.FabricImage(htmlImg, {
      ...commonProps,
      scaleX: w / (htmlImg.naturalWidth || w),
      scaleY: h / (htmlImg.naturalHeight || h),
    });
    tagObj(fImg);
    canvasInstance.remove(placeholder);
    canvasInstance.add(fImg);
    canvasInstance.renderAll();
  };
  htmlImg.onerror = () => {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const proxyImg = new Image();
    proxyImg.crossOrigin = "anonymous";
    proxyImg.onload = () => {
      if (syncGenRef.current !== gen) return;
      const fImg = new fabric.FabricImage(proxyImg, {
        ...commonProps,
        scaleX: w / (proxyImg.naturalWidth || w),
        scaleY: h / (proxyImg.naturalHeight || h),
      });
      tagObj(fImg);
      canvasInstance.remove(placeholder);
      canvasInstance.add(fImg);
      canvasInstance.renderAll();
    };
    proxyImg.onerror = () => {
      if (syncGenRef.current !== gen) return;
      const errBg = new fabric.Rect({
        width: w,
        height: h,
        fill: "#fef2f2",
        stroke: "#fca5a5",
        strokeWidth: 2,
        rx: 4,
        ry: 4,
        originX: "center",
        originY: "center",
      });
      const errIcon = new fabric.Textbox("❌", {
        fontSize: Math.min(w, h) * 0.15,
        textAlign: "center",
        width: w,
        originX: "center",
        originY: "center",
        top: -12,
        editable: false,
        selectable: false,
      });
      const errText = new fabric.Textbox("Không tải được ảnh\nKiểm tra URL trực tiếp (.jpg, .png)", {
        fontSize: 9,
        fontFamily: "Inter, sans-serif",
        fill: "#ef4444",
        textAlign: "center",
        width: w - 16,
        originX: "center",
        originY: "center",
        top: 10,
        editable: false,
        selectable: false,
      });
      const errGroup = new fabric.Group([errBg, errIcon, errText], {
        ...commonProps,
        width: w,
        height: h,
      });
      tagObj(errGroup);
      canvasInstance.remove(placeholder);
      canvasInstance.add(errGroup);
      canvasInstance.renderAll();
    };
    proxyImg.src = proxyUrl;
  };
  htmlImg.src = url;
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
    cornerSize: 7,
    transparentCorners: false,
    borderColor: "#6366f1",
    borderScaleFactor: 1.5,
    padding: 2,
  };

  const tagObj = (obj: fabric.FabricObject) => {
    (obj as ExtFabricObj)._elementId = el.id;
    (obj as ExtFabricObj)._sectionId = el.sectionId;
  };

  const fontFamily = (el.styles?.fontFamily as string) ?? "Inter, sans-serif";
  const fontSize = (el.styles?.fontSize as number) ?? 14;
  const fontWeight = (el.styles?.fontWeight as number) ?? 400;
  const textColor = (el.styles?.color as string) ?? "#1e293b";

  let obj: fabric.FabricObject | null = null;

  switch (el.type) {
    case "text":
    case "headline":
    case "paragraph": {
      const defSize = el.type === "headline" ? 32 : el.type === "paragraph" ? 14 : fontSize;
      const defWeight = el.type === "headline" ? 700 : fontWeight;
      obj = new fabric.Textbox(el.content ?? "Text", {
        ...commonProps,
        width: w,
        fontSize: fontSize || defSize,
        fontWeight: (fontWeight || defWeight) as number,
        fontFamily,
        fill: textColor,
        fontStyle: ((el.styles?.fontStyle as string) ?? "normal") as "normal" | "italic" | "oblique" | "",
        textAlign: ((el.styles?.textAlign as string) ?? "left") as "left" | "center" | "right" | "justify",
        editable: true,
        splitByGrapheme: false,
      });
      break;
    }

    case "button": {
      const bg = (el.styles?.backgroundColor as string) ?? "#4f46e5";
      const radius = (el.styles?.borderRadius as number) ?? 8;
      const rect = new fabric.Rect({
        width: w,
        height: h,
        fill: bg,
        rx: radius,
        ry: radius,
        originX: "center",
        originY: "center",
      });
      const text = new fabric.Textbox(el.content ?? "Button", {
        fontSize: fontSize || 14,
        fontWeight: (fontWeight || 600) as number,
        fontFamily,
        fill: (el.styles?.color as string) ?? "#ffffff",
        textAlign: "center",
        width: w - 20,
        originX: "center",
        originY: "center",
        editable: false,
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
      if (el.imageUrl && el.imageUrl.trim()) {
        const loadingBg = new fabric.Rect({
          width: w,
          height: h,
          fill: "#f1f5f9",
          stroke: "#c7d2fe",
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          originX: "center",
          originY: "center",
        });
        const loadingText = new fabric.Textbox("⏳ Đang tải ảnh...", {
          fontSize: 10,
          fontFamily: "Inter, sans-serif",
          fill: "#94a3b8",
          textAlign: "center",
          width: w - 16,
          originX: "center",
          originY: "center",
          editable: false,
          selectable: false,
        });
        const placeholder = new fabric.Group([loadingBg, loadingText], {
          ...commonProps,
          width: w,
          height: h,
        });
        tagObj(placeholder);

        const gen = syncGeneration;
        loadImageToCanvas(el.imageUrl, w, h, commonProps, gen, syncGenRef, canvasInstance, placeholder, tagObj);

        obj = placeholder;
      } else {
        const border = new fabric.Rect({
          width: w,
          height: h,
          fill: "#f8fafc",
          stroke: "#c7d2fe",
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          rx: 6,
          ry: 6,
          originX: "center",
          originY: "center",
        });
        const iconSize = Math.min(w, h) * 0.3;
        const iconText = new fabric.Textbox("🖼", {
          fontSize: iconSize,
          textAlign: "center",
          width: w,
          originX: "center",
          originY: "center",
          top: -10,
          editable: false,
          selectable: false,
        });
        const label = new fabric.Textbox("Nhập URL ảnh ở panel phải →", {
          fontSize: 10,
          fontFamily: "Inter, sans-serif",
          fill: "#94a3b8",
          textAlign: "center",
          width: w - 16,
          originX: "center",
          originY: "center",
          top: iconSize * 0.5 + 4,
          editable: false,
          selectable: false,
        });
        obj = new fabric.Group([border, iconText, label], {
          ...commonProps,
          width: w,
          height: h,
        });
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
      const borderStr = el.styles?.border as string | undefined;
      let stroke: string | undefined;
      let strokeW = 0;
      if (borderStr && typeof borderStr === "string") {
        const parts = borderStr.split(" ");
        strokeW = parseInt(parts[0]) || 0;
        stroke = parts[2] || undefined;
      }
      obj = new fabric.Rect({
        ...commonProps,
        width: w,
        height: h,
        fill: bg,
        rx: radius,
        ry: radius,
        stroke,
        strokeWidth: strokeW,
      });
      break;
    }

    case "divider": {
      const color = (el.styles?.backgroundColor as string) ?? "#d1d5db";
      obj = new fabric.Line([0, 0, w, 0], {
        ...commonProps,
        stroke: color,
        strokeWidth: h || 2,
      });
      break;
    }

    case "icon": {
      const iconChar = el.content === "star" ? "★" : el.content || "★";
      obj = new fabric.Textbox(iconChar, {
        ...commonProps,
        width: w,
        fontSize: Math.min(w, h) * 0.7,
        fontFamily: "serif",
        fill: (el.styles?.color as string) ?? "#4f46e5",
        textAlign: "center",
        editable: false,
      });
      break;
    }

    case "form": {
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
      const titleBar = new fabric.Rect({
        width: w - 2,
        height: 36,
        fill: "#4f46e5",
        rx: 7,
        ry: 7,
        originX: "center",
        originY: "center",
        top: -h / 2 + 18,
      });
      const titleText = new fabric.Textbox("Form đăng ký", {
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        fill: "#ffffff",
        textAlign: "center",
        width: w - 30,
        originX: "center",
        originY: "center",
        top: -h / 2 + 18,
        editable: false,
        selectable: false,
      });
      const inputBox1 = new fabric.Rect({
        width: w - 40,
        height: 32,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
        strokeWidth: 1,
        rx: 4,
        ry: 4,
        originX: "center",
        originY: "center",
        top: -h / 2 + 65,
      });
      const inputLabel1 = new fabric.Textbox("Họ và tên", {
        fontSize: 10,
        fill: "#94a3b8",
        fontFamily: "Inter, sans-serif",
        width: w - 50,
        originX: "center",
        originY: "center",
        top: -h / 2 + 65,
        editable: false,
        selectable: false,
      });
      const inputBox2 = new fabric.Rect({
        width: w - 40,
        height: 32,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
        strokeWidth: 1,
        rx: 4,
        ry: 4,
        originX: "center",
        originY: "center",
        top: -h / 2 + 105,
      });
      const inputLabel2 = new fabric.Textbox("Email", {
        fontSize: 10,
        fill: "#94a3b8",
        fontFamily: "Inter, sans-serif",
        width: w - 50,
        originX: "center",
        originY: "center",
        top: -h / 2 + 105,
        editable: false,
        selectable: false,
      });
      const submitBtn = new fabric.Rect({
        width: w - 40,
        height: 36,
        fill: "#4f46e5",
        rx: 6,
        ry: 6,
        originX: "center",
        originY: "center",
        top: -h / 2 + 150,
      });
      const submitLabel = new fabric.Textbox("Gửi đăng ký", {
        fontSize: 12,
        fontWeight: 600,
        fill: "#ffffff",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        width: w - 50,
        originX: "center",
        originY: "center",
        top: -h / 2 + 150,
        editable: false,
        selectable: false,
      });
      obj = new fabric.Group([bg, titleBar, titleText, inputBox1, inputLabel1, inputBox2, inputLabel2, submitBtn, submitLabel], {
        ...commonProps,
        width: w,
        height: h,
      });
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

    case "list": {
      const lines = (el.content || "Item 1\nItem 2\nItem 3").split("\n");
      const listContent = lines.map((l) => `• ${l}`).join("\n");
      obj = new fabric.Textbox(listContent, {
        ...commonProps,
        width: w,
        fontSize: fontSize || 14,
        fontWeight: fontWeight as number,
        fontFamily,
        fill: textColor,
        lineHeight: 1.8,
        editable: true,
      });
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
      const typeLabel = el.type.replace(/-/g, " ").toUpperCase();
      const icon = getTypeEmoji(el.type);
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
    carousel: "🎠",
    tabs: "📑",
    frame: "🔲",
    accordion: "📋",
    table: "📊",
    "collection-list": "📃",
    product: "🛍",
    "product-list": "🛒",
    "product-detail": "📦",
    cart: "🛒",
    "blog-list": "📰",
    "blog-detail": "📝",
    popup: "💬",
    "section-preset": "📐",
    "popup-preset": "💬",
  };
  return map[type] ?? "📌";
}

export default function FabricCanvas({ onCanvasReady }: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const syncingRef = useRef(false);
  const prevSectionsRef = useRef<string>("");
  const syncGenRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const {
    sections,
    selected,
    zoom,
    canvasWidth,
    selectElement,
    selectSection,
    selectPage,
    updateElement,
    pushHistory,
  } = useEditorStore();

  useEffect(() => {
    if (!canvasElRef.current) return;

    const totalH = getTotalCanvasHeight(useEditorStore.getState().sections);
    const cw = useEditorStore.getState().canvasWidth;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: cw,
      height: Math.max(totalH, 600),
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
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
      if (obj?._elementId) selectElement(obj._elementId);
      else if (obj?._isSectionBg && obj._sectionId) selectSection(obj._sectionId);
    });

    canvas.on("selection:updated", (e) => {
      if (syncingRef.current) return;
      const obj = e.selected?.[0] as ExtFabricObj | undefined;
      if (obj?._elementId) selectElement(obj._elementId);
      else if (obj?._isSectionBg && obj._sectionId) selectSection(obj._sectionId);
    });

    canvas.on("selection:cleared", () => {
      if (syncingRef.current) return;
      selectPage();
    });

    canvas.on("object:modified", (e) => {
      if (syncingRef.current) return;
      const obj = e.target as ExtFabricObj | undefined;
      if (!obj?._elementId) return;

      const storeSections = useEditorStore.getState().sections;
      const yOffsets = getSectionYOffsets(storeSections);
      let sectionIdx = 0;
      for (let i = 0; i < storeSections.length; i++) {
        if (obj._sectionId === storeSections[i].id) { sectionIdx = i; break; }
      }
      const sectionY = yOffsets[sectionIdx] ?? 0;

      const left = Math.round(obj.left ?? 0);
      const top = Math.round((obj.top ?? 0) - sectionY - SECTION_LABEL_HEIGHT);
      const scaleX = obj.scaleX ?? 1;
      const scaleY = obj.scaleY ?? 1;
      const w = Math.round((obj.width ?? 0) * scaleX);
      const h = Math.round((obj.height ?? 0) * scaleY);

      obj.set({ scaleX: 1, scaleY: 1, width: w, height: h });

      updateElement(obj._elementId, { x: left, y: top, width: w, height: h, rotation: Math.round(obj.angle ?? 0) });
      pushHistory();
    });

    canvas.on("text:changed", (e) => {
      if (syncingRef.current) return;
      const obj = e.target as ExtFabricObj & fabric.Textbox;
      if (!obj?._elementId) return;
      updateElement(obj._elementId, { content: obj.text ?? "" });
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

    const totalH = getTotalCanvasHeight(sections);
    const h = Math.max(totalH, 600);

    canvas.setZoom(zoom);
    canvas.setDimensions(
      { width: canvasWidth * zoom, height: h * zoom },
    );
    canvas.renderAll();
  }, [zoom, canvasWidth, sections, ready]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    const key = JSON.stringify(sections);
    if (key === prevSectionsRef.current) return;
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
        width: canvasWidth,
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
              scaleX: canvasWidth / (img.width ?? canvasWidth),
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
      const divider = new fabric.Line([0, bottomY, canvasWidth, bottomY], {
        stroke: "#cbd5e1",
        strokeWidth: 1,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
      }) as ExtFabricObj;
      divider._isLabel = true;
      canvas.add(divider);

      drawGridLines(canvas, canvasWidth, sectionH, yOff);

      for (const el of section.elements) {
        if (el.isHidden) continue;
        const fabricObj = buildFabricObject(el, yOff, canvasWidth, canvas, currentGen, syncGenRef);
        if (fabricObj) canvas.add(fabricObj);
      }
    });

    if (selected.type === "element") {
      const selId = selected.id;
      const allObjs = canvas.getObjects() as ExtFabricObj[];
      const target = allObjs.find((o) => o._elementId === selId);
      if (target) canvas.setActiveObject(target);
    }

    canvas.renderAll();
    syncingRef.current = false;
  }, [sections, canvasWidth, selected, ready]);

  const totalH = getTotalCanvasHeight(sections);
  const cssW = canvasWidth * zoom;
  const cssH = Math.max(totalH, 600) * zoom;

  return (
    <div
      ref={wrapperRef}
      className="relative bg-white"
      style={{
        width: cssW,
        height: cssH,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <canvas ref={canvasElRef} />
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
