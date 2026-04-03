/**
 * DomCanvas – DOM-based canvas renderer (replaces Fabric.js canvas).
 * Elements are absolutely positioned at their actual pixel coordinates
 * within each section div. Zoom is applied via CSS transform: scale(zoom)
 * on the outer container, so editor and preview always match perfectly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/stores/editor/editorStore";
import type { EditorElement, EditorSection } from "@/types/editor";
import { getIconById } from "@/lib/editor/data/iconData";
import { ElementActionToolbar } from "./ElementActionToolbar";
import { GOOGLE_FONTS } from "@/lib/editor/fontLoader";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { mergeCarouselStyle, parseTabsContent, parseCarouselContent } from "@/lib/editor/tabsContent";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

/** Tránh `</script>` trong mã HTML người dùng làm vỡ parse khi nhúng vào iframe srcDoc. */
function sanitizeUserHtmlForEmbed(s: string): string {
  return s.replace(/<\/script/gi, "<\\/script");
}

/** Ngưỡng bắt snap (px không gian thiết kế) — giống Canva/Figma */
const SMART_GUIDE_THRESHOLD = 6;

/** Giới hạn mềm Y (px) để phần tử có thể đè lên ranh giới section mà không bị clamp cứng trong section */
const SECTION_Y_OVERFLOW_PX = 4000;

type GuideRect = { x: number; y: number; w: number; h: number };

export type SmartGuidesOverlayState = {
  vLines: { x: number; y1: number; y2: number; dashed: boolean }[];
  hLines: { y: number; x1: number; x2: number; dashed: boolean }[];
  gapLabels: { x: number; y: number; text: string }[];
  sizeLabel: { x: number; y: number; text: string } | null;
};

function snapToNearest(raw: number, candidates: number[], threshold: number): { value: number; snapped: boolean } {
  let best = raw;
  let bestDist = threshold + 1;
  for (const c of candidates) {
    const d = Math.abs(c - raw);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { value: best, snapped: bestDist <= threshold };
}

function buildXSnapCandidates(canvasW: number, w: number, others: GuideRect[]): number[] {
  const xs: number[] = [0, canvasW / 2 - w / 2, canvasW - w];
  for (const o of others) {
    xs.push(o.x, o.x + o.w - w, o.x + o.w / 2 - w / 2, o.x + o.w, o.x - w);
  }
  return xs;
}

function buildYSnapCandidates(sectionH: number, h: number, others: GuideRect[]): number[] {
  const ys: number[] = [0, sectionH / 2 - h / 2, sectionH - h];
  for (const o of others) {
    ys.push(o.y, o.y + o.h - h, o.y + o.h / 2 - h / 2, o.y + o.h, o.y - h);
  }
  return ys;
}

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const EPS = 0.75;

function buildAlignmentLines(drag: GuideRect, others: GuideRect[], canvasW: number, sectionH: number): { vLines: SmartGuidesOverlayState["vLines"]; hLines: SmartGuidesOverlayState["hLines"] } {
  const vLines: SmartGuidesOverlayState["vLines"] = [];
  const hLines: SmartGuidesOverlayState["hLines"] = [];

  const tryV = (x: number, y1: number, y2: number, dashed: boolean) => {
    vLines.push({ x, y1, y2, dashed });
  };
  const tryH = (y: number, x1: number, x2: number, dashed: boolean) => {
    hLines.push({ y, x1, x2, dashed });
  };

  for (const x of [0, canvasW / 2, canvasW]) {
    if (
      Math.abs(drag.x - x) < EPS ||
      Math.abs(drag.x + drag.w - x) < EPS ||
      Math.abs(drag.x + drag.w / 2 - x) < EPS
    ) {
      tryV(x, 0, sectionH, true);
    }
  }
  for (const y of [0, sectionH / 2, sectionH]) {
    if (
      Math.abs(drag.y - y) < EPS ||
      Math.abs(drag.y + drag.h - y) < EPS ||
      Math.abs(drag.y + drag.h / 2 - y) < EPS
    ) {
      tryH(y, 0, canvasW, true);
    }
  }

  const dvx = [drag.x, drag.x + drag.w, drag.x + drag.w / 2];
  const dhy = [drag.y, drag.y + drag.h, drag.y + drag.h / 2];

  for (const o of others) {
    const ovx = [o.x, o.x + o.w, o.x + o.w / 2];
    const ohy = [o.y, o.y + o.h, o.y + o.h / 2];
    for (const a of dvx) {
      for (const b of ovx) {
        if (Math.abs(a - b) < EPS) {
          const x = (a + b) / 2;
          tryV(x, Math.min(drag.y, o.y) - 8, Math.max(drag.y + drag.h, o.y + o.h) + 8, false);
        }
      }
    }
    for (const a of dhy) {
      for (const b of ohy) {
        if (Math.abs(a - b) < EPS) {
          const y = (a + b) / 2;
          tryH(y, Math.min(drag.x, o.x) - 8, Math.max(drag.x + drag.w, o.x + o.w) + 8, false);
        }
      }
    }
  }

  return { vLines, hLines };
}

function buildGapLabels(drag: GuideRect, others: GuideRect[]): { x: number; y: number; text: string }[] {
  const labels: { x: number; y: number; text: string }[] = [];
  type R = GuideRect & { isDrag?: boolean };
  const all: R[] = others.map((o) => ({ ...o } as R)).concat([{ ...drag, isDrag: true }]);

  const byX = [...all].sort((a, b) => a.x - b.x);
  for (let i = 0; i < byX.length - 1; i++) {
    const A = byX[i];
    const B = byX[i + 1];
    const gap = B.x - (A.x + A.w);
    if (gap < 2 || gap > 900) continue;
    const yOverlap = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
    if (yOverlap < 6) continue;
    if (!A.isDrag && !B.isDrag) continue;
    const midX = A.x + A.w + gap / 2;
    const midY = Math.max(A.y, B.y) + yOverlap / 2;
    labels.push({ x: midX, y: midY - 16, text: String(Math.round(gap)) });
  }

  const byY = [...all].sort((a, b) => a.y - b.y);
  for (let i = 0; i < byY.length - 1; i++) {
    const A = byY[i];
    const B = byY[i + 1];
    const gap = B.y - (A.y + A.h);
    if (gap < 2 || gap > 900) continue;
    const xOverlap = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
    if (xOverlap < 6) continue;
    if (!A.isDrag && !B.isDrag) continue;
    const midY = A.y + A.h + gap / 2;
    const midX = Math.max(A.x, B.x) + xOverlap / 2;
    labels.push({ x: midX + 18, y: midY, text: String(Math.round(gap)) });
  }

  return labels;
}

function dedupeV(lines: SmartGuidesOverlayState["vLines"]): SmartGuidesOverlayState["vLines"] {
  const map = new Map<string, SmartGuidesOverlayState["vLines"][0]>();
  for (const L of lines) {
    const key = `${Math.round(L.x * 10)}-${L.dashed}`;
    const prev = map.get(key);
    if (!prev || L.y2 - L.y1 > prev.y2 - prev.y1) map.set(key, L);
  }
  return [...map.values()];
}

function dedupeH(lines: SmartGuidesOverlayState["hLines"]): SmartGuidesOverlayState["hLines"] {
  const map = new Map<string, SmartGuidesOverlayState["hLines"][0]>();
  for (const L of lines) {
    const key = `${Math.round(L.y * 10)}-${L.dashed}`;
    const prev = map.get(key);
    if (!prev || L.x2 - L.x1 > prev.x2 - prev.x1) map.set(key, L);
  }
  return [...map.values()];
}

function SmartGuidesOverlay({ guides }: { guides: SmartGuidesOverlayState }) {
  const { vLines, hLines, gapLabels, sizeLabel } = guides;
  const stroke = "#e879f9";
  const strokeDashed = "#f472b6";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10050,
        overflow: "visible",
      }}
    >
      <svg width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden>
        {dedupeV(vLines).map((L, i) => (
          <line
            key={`v-${i}`}
            x1={L.x}
            y1={L.y1}
            x2={L.x}
            y2={L.y2}
            stroke={L.dashed ? strokeDashed : stroke}
            strokeWidth={L.dashed ? 1 : 1.5}
            strokeDasharray={L.dashed ? "5 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {dedupeH(hLines).map((L, i) => (
          <line
            key={`h-${i}`}
            x1={L.x1}
            y1={L.y}
            x2={L.x2}
            y2={L.y}
            stroke={L.dashed ? strokeDashed : stroke}
            strokeWidth={L.dashed ? 1 : 1.5}
            strokeDasharray={L.dashed ? "5 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {gapLabels.map((g, i) => (
        <div
          key={`g-${i}`}
          style={{
            position: "absolute",
            left: g.x,
            top: g.y,
            transform: "translate(-50%, -50%)",
            background: "#db2777",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 999,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {g.text}
        </div>
      ))}
      {sizeLabel && (
        <div
          style={{
            position: "absolute",
            left: sizeLabel.x,
            top: sizeLabel.y,
            transform: "translate(-50%, 0)",
            background: "rgba(15, 23, 42, 0.88)",
            color: "#f8fafc",
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            fontFamily: "ui-monospace, monospace",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        >
          {sizeLabel.text}
        </div>
      )}
    </div>
  );
}

export interface DomCanvasHandle {
  getContainerElement: () => HTMLDivElement | null;
}

interface DomCanvasProps {
  /** Called when canvas is mounted – passes a handle for png/pdf export */
  onCanvasReady?: (handle: DomCanvasHandle) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onRequestAddImage?: (elementId: number, itemIndex?: number, field?: "avatar" | "image") => void;
  onRequestChangeIcon?: (elementId: number) => void;
  onRequestAddFormField?: (elementId: number) => void;
  onRequestSaveFormData?: (elementId: number) => void;
  onOpenSettings?: () => void;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function resolveAsset(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function styleVal(v: string | number | undefined, unit = "px"): string | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (Number.isFinite(n) && unit) return `${n}${unit}`;
  return String(v);
}

function buildElementCss(
  el: EditorElement,
): React.CSSProperties {
  const s = el.styles ?? {};
  const base: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width ?? undefined,
    height: el.height ?? undefined,
    zIndex: el.zIndex ?? 0,
    opacity: el.opacity ?? 1,
    boxSizing: "border-box",
    pointerEvents: el.isLocked ? "none" : "auto",
    cursor: el.isLocked ? "default" : "move",
  };
  if (el.rotation) base.transform = `rotate(${el.rotation}deg)`;

  // typography
  if (s.fontSize) base.fontSize = styleVal(s.fontSize);
  if (s.fontFamily) base.fontFamily = `${s.fontFamily}, sans-serif`;
  if (s.fontWeight) base.fontWeight = s.fontWeight as React.CSSProperties["fontWeight"];
  if (s.fontStyle) base.fontStyle = s.fontStyle as React.CSSProperties["fontStyle"];
  if (s.textDecoration) base.textDecoration = s.textDecoration as string;
  if (s.textTransform) base.textTransform = s.textTransform as React.CSSProperties["textTransform"];
  if (s.textAlign) base.textAlign = s.textAlign as React.CSSProperties["textAlign"];
  if (s.lineHeight) base.lineHeight = String(s.lineHeight);
  if (s.letterSpacing) base.letterSpacing = styleVal(s.letterSpacing);
  if (s.color) base.color = s.color as string;
  if (s.padding) base.padding = styleVal(s.padding);

  // box
  if (s.borderRadius) base.borderRadius = styleVal(s.borderRadius);
  if (s.borderWidth && Number(s.borderWidth) > 0)
    base.border = `${s.borderWidth}px ${(s.borderStyle as string) ?? "solid"} ${(s.borderColor as string) ?? "#e2e8f0"}`;
  if (s.boxShadow) base.boxShadow = s.boxShadow as string;
  if (s.backgroundColor) base.backgroundColor = s.backgroundColor as string;

  return base;
}

// ─── element renderers ─────────────────────────────────────────────────────

function TextElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const content = el.content || "";
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const style: React.CSSProperties = {
    ...buildElementCss(el),
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: s.lineHeight ? String(s.lineHeight) : "1.5",
    color: (s.color as string) || "#1e293b",
  };
  if (el.type === "headline") {
    style.fontWeight = (s.fontWeight as React.CSSProperties["fontWeight"]) || 700;
    style.lineHeight = "1.2";
  }
  if (el.type === "paragraph") {
    style.lineHeight = s.lineHeight ? String(s.lineHeight) : "1.6";
    style.color = (s.color as string) || "#334155";
  }
  return isHtml ? (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled editor content
    <div style={style} dangerouslySetInnerHTML={{ __html: content }} />
  ) : (
    <div style={style}>{content || (el.type === "headline" ? "Tiêu đề" : el.type === "paragraph" ? "Đoạn văn" : "Văn bản")}</div>
  );
}

function ButtonElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const style: React.CSSProperties = {
    ...buildElementCss(el),
    backgroundColor: (s.backgroundColor as string) || "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: (s.color as string) || "#fff",
    fontWeight: (s.fontWeight as React.CSSProperties["fontWeight"]) || 600,
    fontSize: s.fontSize ? `${s.fontSize}px` : "14px",
    borderRadius: s.borderRadius ? `${s.borderRadius}px` : "8px",
    cursor: "pointer",
    userSelect: "none",
    overflow: "hidden",
    textDecoration: "none",
  };
  return <div style={style}>{el.content || "Nút bấm"}</div>;
}

function ImageElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const url = resolveAsset(el.imageUrl || "");
  const radius = s.borderRadius ? `${s.borderRadius}px` : "0";
  const style: React.CSSProperties = {
    ...buildElementCss(el),
    overflow: "hidden",
    backgroundColor: (s.backgroundColor as string) || undefined,
  };
  if (!url) {
    return (
      <div style={{ ...style, backgroundColor: (s.backgroundColor as string) || "#e2e8f0", border: "1px dashed #94a3b8" }} />
    );
  }
  return (
    <div style={style}>
      <img
        src={url}
        alt={el.content || ""}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: (s.objectFit as React.CSSProperties["objectFit"]) || "cover", borderRadius: radius, display: "block" }}
      />
    </div>
  );
}

function ShapeElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const bg = (s.backgroundColor as string) || "#e0e7ff";
  const radius = (s.borderRadius as number) || 0;
  const tl = (s.borderTopLeftRadius as number) ?? radius;
  const tr = (s.borderTopRightRadius as number) ?? radius;
  const bl = (s.borderBottomLeftRadius as number) ?? radius;
  const br2 = (s.borderBottomRightRadius as number) ?? radius;
  const radiusCss = radius >= 999 ? "50%" : `${tl}px ${tr}px ${br2}px ${bl}px`;

  let urls: string[] = [];
  try {
    const p = JSON.parse(el.content || "[]");
    if (Array.isArray(p)) urls = p.filter((u): u is string => typeof u === "string");
  } catch {}

  const overlayColor = (s.overlayColor as string) || "";
  const overlayOpacity = Number(s.overlayOpacity || 0);

  const style: React.CSSProperties = {
    ...buildElementCss(el),
    backgroundColor: bg,
    borderRadius: radiusCss,
    overflow: "hidden",
  };
  if (s.borderWidth && Number(s.borderWidth) > 0)
    style.border = `${s.borderWidth}px ${(s.borderStyle as string) || "solid"} ${(s.borderColor as string) || "#e2e8f0"}`;
  if (s.boxShadow) style.boxShadow = s.boxShadow as string;

  return (
    <div style={style}>
      {urls.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(urls.length, 3)}, 1fr)`, gap: 4, padding: 4, position: "absolute", inset: 0 }}>
          {urls.map((u, i) => (
            <div key={i} style={{ backgroundImage: `url(${resolveAsset(u)})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 4, minHeight: 0 }} />
          ))}
        </div>
      )}
      {overlayColor && overlayOpacity > 0 && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: overlayColor, opacity: overlayOpacity, pointerEvents: "none", borderRadius: radiusCss }} />
      )}
    </div>
  );
}

function DividerElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const color = (s.backgroundColor as string) || "#d1d5db";
  const thickness = ((s.height as number) || el.height || 2) as number;
  const lineStyle = (s.lineStyle as string) || "solid";
  const style: React.CSSProperties = {
    ...buildElementCss(el),
    overflow: "hidden",
  };
  if (lineStyle === "double") {
    const lh = Math.max(1, thickness / 2);
    return (
      <div style={style}>
        <div style={{ height: lh, backgroundColor: color, borderRadius: 2, marginBottom: lh }} />
        <div style={{ height: lh, backgroundColor: color, borderRadius: 2 }} />
      </div>
    );
  }
  return <div style={{ ...style, borderBottom: `${thickness}px ${lineStyle} ${color}` }} />;
}

function IconElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const iconData = el.content ? getIconById(el.content) : null;
  const iconChar = iconData?.char ?? el.content ?? "★";
  const iconColor = (s.color as string) || iconData?.color || "#4f46e5";
  const size = Math.min(Number(el.width || 48), Number(el.height || 48)) * 0.8;
  return (
    <div style={{ ...buildElementCss(el), display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, fontSize: size, lineHeight: 1 }}>
      {iconChar}
    </div>
  );
}

function VideoElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const url = el.videoUrl || "";
  const style: React.CSSProperties = { ...buildElementCss(el), overflow: "hidden" };

  if (!url) {
    return (
      <div style={{ ...style, backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>Video</span>
      </div>
    );
  }

  let src = url;
  if (src.includes("youtube.com/watch")) {
    const v = new URLSearchParams(src.split("?")[1] || "").get("v");
    if (v) src = `https://www.youtube.com/embed/${v}`;
  } else if (src.includes("youtu.be/")) {
    const id = src.split("youtu.be/")[1]?.split("?")[0];
    if (id) src = `https://www.youtube.com/embed/${id}`;
  }

  if (src.includes("youtube") || src.includes("vimeo")) {
    return <div style={style}><iframe src={src} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title="Video" /></div>;
  }

  return (
    <div style={style}>
      {/* biome-ignore lint/a11y/useMediaCaption: editor preview */}
      <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }}
        controls={s.videoControls !== 0 && s.videoControls !== "0"}
        autoPlay={!!s.videoAutoplay}
        loop={!!s.videoLoop}
        muted={!!s.videoMuted}
      />
    </div>
  );
}

function FormElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  let cfg: { title?: string; buttonText?: string; fields?: { id: string; label?: string; placeholder?: string; type?: string }[]; inputStyle?: string } = {};
  try { cfg = JSON.parse(el.content || "{}"); } catch {}
  const fs = (s.fontSize as number) || 14;
  const inputBase: React.CSSProperties = cfg.inputStyle === "filled"
    ? { background: "#f1f5f9", border: "none" }
    : cfg.inputStyle === "underlined"
      ? { background: "transparent", border: "none", borderBottom: "2px solid #1e293b", borderRadius: 0 }
      : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4 };
  const fields = cfg.fields || [{ id: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text" }, { id: "email", label: "Email", placeholder: "Email", type: "email" }];
  return (
    <div style={{ ...buildElementCss(el), border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
      {cfg.title && <div style={{ fontSize: fs + 2, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{cfg.title}</div>}
      {fields.map((f) => (
        <input key={f.id} type={f.type === "phone" ? "tel" : f.type || "text"} placeholder={f.placeholder || f.label || f.id}
          style={{ width: "100%", padding: "10px 12px", fontSize: fs, ...inputBase, boxSizing: "border-box" }}
          readOnly
        />
      ))}
      <div style={{ width: "100%", padding: 12, background: "#000", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: fs, textAlign: "center", marginTop: 4 }}>
        {cfg.buttonText || "Gửi"}
      </div>
    </div>
  );
}

function HtmlCodeElement({ el }: { el: EditorElement }) {
  let hc: { code?: string; iframeSrc?: string; subType?: string } = {};
  try { hc = JSON.parse(el.content || "{}"); } catch {}
  const style: React.CSSProperties = { ...buildElementCss(el), overflow: "hidden", border: "none" };
  if (hc.subType === "iframe" && hc.iframeSrc?.trim()) {
    return <iframe src={hc.iframeSrc.trim()} style={style} title="Embedded" />;
  }
  const code = (hc.code || "").trim();
  const docRaw = code || "<div style='padding:16px;color:#64748b;font-size:12px'>Chưa có mã HTML</div>";
  const doc = sanitizeUserHtmlForEmbed(docRaw);
  return (
    <iframe
      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0">${doc}</body></html>`}
      style={style}
      title="Custom HTML"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

function GalleryElement({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};
  const cols = Number(s.columns || 3);
  const gap = Number(s.gap || 8);
  let urls: string[] = [];
  try {
    const p = JSON.parse(el.content || "[]");
    if (Array.isArray(p)) urls = p.filter((u): u is string => typeof u === "string");
  } catch {}
  return (
    <div style={{ ...buildElementCss(el), overflow: "hidden" }}>
      {urls.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, padding: gap / 2, width: "100%", height: "100%" }}>
          {urls.map((u, i) => (
            <img key={i} src={resolveAsset(u)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: (s.borderRadius as number) || 0 }} />
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Gallery</span>
        </div>
      )}
    </div>
  );
}

function PlaceholderElement({ el }: { el: EditorElement }) {
  const labelMap: Record<string, string> = {
    "product-detail": "🛒 Chi tiết sản phẩm",
    "collection-list": "📦 Danh sách sản phẩm",
    countdown: "⏱ Đếm ngược",
    map: "📍 Bản đồ",
    "social-share": "📣 Chia sẻ mạng xã hội",
    rating: "⭐ Đánh giá",
    progress: "📊 Thanh tiến trình",
    carousel: "🎠 Carousel",
    tabs: "📑 Tabs",
    accordion: "📂 Accordion",
    table: "📋 Bảng",
    cart: "🛒 Giỏ hàng",
    "blog-list": "📰 Danh sách bài viết",
    "blog-detail": "📄 Nội dung bài viết",
    popup: "💬 Popup",
    frame: "🖼 Khung",
    antigravity: "✨ Hiệu ứng",
    list: "📝 Danh sách",
  };
  return (
    <div style={{ ...buildElementCss(el), background: "#f8fafc", border: "1.5px dashed #94a3b8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <span style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: "0 8px" }}>
        {labelMap[el.type] || el.type}
      </span>
    </div>
  );
}

function ElementRenderer({ el, onMouseDown, isSelected }: { el: EditorElement; onMouseDown: (e: React.PointerEvent) => void; isSelected: boolean }) {
  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width ?? undefined,
    height: el.height ?? undefined,
    zIndex: el.zIndex ?? 0,
    outline: isSelected ? "2px solid #4f46e5" : undefined,
    outlineOffset: isSelected ? "1px" : undefined,
    cursor: el.isLocked ? "default" : "move",
    userSelect: "none",
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (el.isLocked) return;
    e.stopPropagation();
    onMouseDown(e);
  };

  // The inner element uses its own absolute positioning from buildElementCss,
  // but we override position/left/top with the wrapper (wrapStyle handles that).
  // So we need a simplified renderer that doesn't double-apply position.
  return (
    <div
      style={wrapStyle}
      onPointerDown={handlePointerDown}
      data-element-id={el.id}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <InnerElementRenderer el={el} />
      </div>
    </div>
  );
}

function InnerElementRenderer({
  el,
  onSelectCarouselTextField,
}: {
  el: EditorElement;
  onSelectCarouselTextField?: (field: "quote" | "name" | "role" | "title" | "desc") => void;
}) {
  const s = el.styles ?? {};
  const updateElementFromStore = useEditorStore((st) => st.updateElement);
  const pushHistoryFromStore = useEditorStore((st) => st.pushHistory);

  // Shared container style (position:relative fill)
  const fill: React.CSSProperties = { position: "absolute", inset: 0, boxSizing: "border-box" };

  switch (el.type) {
    case "text":
    case "headline":
    case "paragraph": {
      const content = el.content || "";
      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      const ts: React.CSSProperties = {
        ...fill,
        overflow: "hidden",
        fontSize: s.fontSize ? `${s.fontSize}px` : el.type === "headline" ? "28px" : "14px",
        fontFamily: s.fontFamily ? `${s.fontFamily}, sans-serif` : undefined,
        fontWeight: (s.fontWeight as React.CSSProperties["fontWeight"]) || (el.type === "headline" ? 700 : 400),
        fontStyle: s.fontStyle as React.CSSProperties["fontStyle"],
        textDecoration: s.textDecoration as string,
        textTransform: s.textTransform as React.CSSProperties["textTransform"],
        textAlign: (s.textAlign as React.CSSProperties["textAlign"]) || "left",
        lineHeight: String(s.lineHeight || (el.type === "headline" ? "1.2" : "1.6")),
        letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
        color: (s.color as string) || (el.type === "paragraph" ? "#334155" : "#1e293b"),
        padding: s.padding ? `${s.padding}px` : 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        opacity: el.opacity ?? 1,
      };
      return isHtml
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled editor content
        ? <div style={ts} dangerouslySetInnerHTML={{ __html: content }} />
        : <div style={ts}>{content || (el.type === "headline" ? "Tiêu đề" : el.type === "paragraph" ? "Đoạn văn" : "Văn bản")}</div>;
    }

    case "button": {
      const bg = (s.backgroundColor as string) || "#4f46e5";
      const br = (s.borderRadius as number) ?? 8;
      const borderW = (s.borderWidth as number) ?? 0;
      const bs: React.CSSProperties = {
        ...fill,
        backgroundColor: bg,
        color: (s.color as string) || "#fff",
        fontSize: s.fontSize ? `${s.fontSize}px` : "14px",
        fontFamily: s.fontFamily ? `${s.fontFamily}, sans-serif` : undefined,
        fontWeight: (s.fontWeight as React.CSSProperties["fontWeight"]) || 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: br >= 999 ? "50%" : `${br}px`,
        border: borderW > 0 ? `${borderW}px solid ${(s.borderColor as string) || "#e2e8f0"}` : "none",
        boxShadow: (s.boxShadow as string) || undefined,
        padding: s.padding ? `${s.padding}px` : "0 16px",
        textDecoration: "none",
        overflow: "hidden",
        opacity: el.opacity ?? 1,
        letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
        textTransform: s.textTransform as React.CSSProperties["textTransform"],
      };
      return <div style={bs}>{el.content || "Nút bấm"}</div>;
    }

    case "image": {
      const url = resolveAsset(el.imageUrl || "");
      const radius = s.borderRadius ? `${s.borderRadius}px` : "0";
      const cs: React.CSSProperties = {
        ...fill,
        overflow: "hidden",
        opacity: el.opacity ?? 1,
        backgroundColor: url ? undefined : (s.backgroundColor as string) || "#e2e8f0",
        border: !url ? "1px dashed #94a3b8" : undefined,
      };
      return (
        <div style={cs}>
          {url && (
            <img src={url} alt={el.content || ""} draggable={false}
              style={{ width: "100%", height: "100%", objectFit: (s.objectFit as React.CSSProperties["objectFit"]) || "cover", borderRadius: radius, display: "block" }}
            />
          )}
        </div>
      );
    }

    case "shape": {
      const bg = (s.backgroundColor as string) || "#e0e7ff";
      const radius = (s.borderRadius as number) || 0;
      const tl = (s.borderTopLeftRadius as number) ?? radius;
      const tr = (s.borderTopRightRadius as number) ?? radius;
      const bl2 = (s.borderBottomLeftRadius as number) ?? radius;
      const br2 = (s.borderBottomRightRadius as number) ?? radius;
      const radiusCss = radius >= 999 ? "50%" : `${tl}px ${tr}px ${br2}px ${bl2}px`;
      const borderW = (s.borderWidth as number) ?? 0;
      const overlayC = (s.overlayColor as string) || "";
      const overlayO = Number(s.overlayOpacity || 0);
      let urls: string[] = [];
      try {
        const p = JSON.parse(el.content || "[]");
        if (Array.isArray(p)) urls = p.filter((u): u is string => typeof u === "string");
      } catch {}
      const ss: React.CSSProperties = {
        ...fill,
        backgroundColor: bg,
        borderRadius: radiusCss,
        overflow: "hidden",
        border: borderW > 0 ? `${borderW}px ${(s.borderStyle as string) || "solid"} ${(s.borderColor as string) || "#e2e8f0"}` : undefined,
        boxShadow: (s.boxShadow as string) || undefined,
        opacity: el.opacity ?? 1,
      };
      return (
        <div style={ss}>
          {urls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(urls.length, 3)}, 1fr)`, gap: 4, padding: 4, position: "absolute", inset: 0 }}>
              {urls.map((u, i) => (
                <div key={i} style={{ backgroundImage: `url(${resolveAsset(u)})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 4 }} />
              ))}
            </div>
          )}
          {overlayC && overlayO > 0 && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: overlayC, opacity: overlayO, pointerEvents: "none" }} />
          )}
        </div>
      );
    }

    case "divider": {
      const color = (s.backgroundColor as string) || "#d1d5db";
      const thick = Number((s.height as number) || el.height || 2);
      const lStyle = (s.lineStyle as string) || "solid";
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", opacity: el.opacity ?? 1 }}>
          {lStyle === "double" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: Math.max(2, thick / 2) }}>
              <div style={{ height: Math.max(1, thick / 2), backgroundColor: color, borderRadius: 2 }} />
              <div style={{ height: Math.max(1, thick / 2), backgroundColor: color, borderRadius: 2 }} />
            </div>
          ) : (
            <div style={{ flex: 1, borderBottom: `${thick}px ${lStyle === "dashed" ? "dashed" : lStyle === "dotted" ? "dotted" : "solid"} ${color}` }} />
          )}
        </div>
      );
    }

    case "icon": {
      const iconData = el.content ? getIconById(el.content) : null;
      const iconChar = iconData?.char ?? el.content ?? "★";
      const iconColor = (s.color as string) || iconData?.color || "#4f46e5";
      const size = Math.min(Number(el.width || 48), Number(el.height || 48)) * 0.8;
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, fontSize: size, lineHeight: 1, opacity: el.opacity ?? 1 }}>
          {iconChar}
        </div>
      );
    }

    case "video": {
      const url = el.videoUrl || "";
      if (!url) return (
        <div style={{ ...fill, backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Video</span>
        </div>
      );
      let src = url;
      if (src.includes("youtube.com/watch")) {
        const v = new URLSearchParams(src.split("?")[1] || "").get("v");
        if (v) src = `https://www.youtube.com/embed/${v}`;
      } else if (src.includes("youtu.be/")) {
        const id = src.split("youtu.be/")[1]?.split("?")[0];
        if (id) src = `https://www.youtube.com/embed/${id}`;
      }
      if (src.includes("youtube") || src.includes("vimeo")) {
        return <div style={{ ...fill, overflow: "hidden" }}><iframe src={src} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title="Video" /></div>;
      }
      return (
        <div style={{ ...fill, overflow: "hidden" }}>
          {/* biome-ignore lint/a11y/useMediaCaption: editor preview */}
          <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }}
            controls={s.videoControls !== 0 && s.videoControls !== "0"}
            autoPlay={!!s.videoAutoplay} loop={!!s.videoLoop} muted={!!s.videoMuted}
          />
        </div>
      );
    }

    case "form": {
      let cfg: { title?: string; buttonText?: string; fields?: { id: string; label?: string; placeholder?: string; type?: string }[]; inputStyle?: string } = {};
      try { cfg = JSON.parse(el.content || "{}"); } catch {}
      const fs2 = (s.fontSize as number) || 14;
      const inputS: React.CSSProperties = cfg.inputStyle === "filled"
        ? { background: "#f1f5f9", border: "none" }
        : cfg.inputStyle === "underlined"
          ? { background: "transparent", border: "none", borderBottom: "2px solid #1e293b", borderRadius: 0 }
          : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4 };
      const fields = cfg.fields || [{ id: "name", label: "Họ và tên", type: "text" }, { id: "email", label: "Email", type: "email" }];
      return (
        <div style={{ ...fill, border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", opacity: el.opacity ?? 1 }}>
          {cfg.title && <div style={{ fontSize: fs2 + 2, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{cfg.title}</div>}
          {fields.map((f) => (
            <input key={f.id} type={f.type === "phone" ? "tel" : f.type || "text"} placeholder={f.placeholder || f.label || f.id}
              style={{ width: "100%", padding: "8px 12px", fontSize: fs2, ...inputS, boxSizing: "border-box" }} readOnly />
          ))}
          <div style={{ padding: "10px 0", background: "#000", color: "#fff", borderRadius: 6, fontWeight: 600, fontSize: fs2, textAlign: "center" }}>
            {cfg.buttonText || "Gửi"}
          </div>
        </div>
      );
    }

    case "html":
    case "html-code": {
      let hc: { code?: string; iframeSrc?: string; subType?: string } = {};
      try { hc = JSON.parse(el.content || "{}"); } catch {}
      if (hc.subType === "iframe" && hc.iframeSrc?.trim()) {
        return <iframe src={hc.iframeSrc.trim()} style={{ ...fill, border: "none" }} title="Embedded" sandbox="allow-scripts allow-same-origin" />;
      }
      const code = (hc.code || "").trim();
      if (!code) {
        // Empty placeholder – prompt user to double-click
        return (
          <div style={{ ...fill, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc", border: "1.5px dashed #94a3b8", borderRadius: 8, overflow: "hidden" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>Double-click để nhập mã HTML</span>
          </div>
        );
      }
      const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0">${code}</body></html>`;
      return <iframe srcDoc={doc} style={{ ...fill, border: "none" }} title="Custom HTML" sandbox="allow-scripts allow-same-origin" />;
    }

    case "list": {
      const items = (el.content || "").split("\n").filter(Boolean);
      return (
        <ul style={{ ...fill, margin: 0, paddingLeft: 24, lineHeight: 1.8, color: (s.color as string) || "#1e293b", fontSize: s.fontSize ? `${s.fontSize}px` : "14px", overflow: "hidden" }}>
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }

    case "gallery": {
      const cols = Number(s.columns || 3);
      const gap = Number(s.gap || 8);
      let urls2: string[] = [];
      try {
        const p = JSON.parse(el.content || "[]");
        if (Array.isArray(p)) urls2 = p.filter((u): u is string => typeof u === "string");
      } catch {}
      return (
        <div style={{ ...fill, overflow: "hidden" }}>
          {urls2.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, padding: gap / 2, width: "100%", height: "100%" }}>
              {urls2.map((u, i) => (
                <img key={i} src={resolveAsset(u)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: (s.borderRadius as number) || 0 }} />
              ))}
            </div>
          ) : (
            <div style={{ ...fill, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Gallery</span>
            </div>
          )}
        </div>
      );
    }

    case "product-detail": {
      const pd = parseProductDetailContent(el.content ?? undefined);
      const bg = (s.backgroundColor as string) || "#ffffff";
      const radius = (s.borderRadius as number) || 12;
      const img = pd.images[0] ? resolveAsset(pd.images[0]) : "";
      return (
        <div style={{ ...fill, background: bg, borderRadius: radius, padding: 12, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden", opacity: el.opacity ?? 1 }}>
          {img ? (
            <div style={{ width: "100%", aspectRatio: "1/1", maxHeight: "52%", borderRadius: 8, overflow: "hidden", background: "#e2e8f0", marginBottom: 10, flexShrink: 0 }}>
              <img src={img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ width: "100%", aspectRatio: "1/1", maxHeight: "52%", borderRadius: 8, background: "#e2e8f0", marginBottom: 10, flexShrink: 0 }} />
          )}
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4, lineHeight: 1.35, wordBreak: "break-word", flexShrink: 0 }}>{pd.title || "Tên sản phẩm"}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>{pd.salePrice || pd.price || "0đ"}</div>
          {pd.badge && <span style={{ display: "inline-block", background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, marginTop: 4, flexShrink: 0 }}>{pd.badge}</span>}
          {pd.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", flexShrink: 0 }}>{pd.description}</p>}
        </div>
      );
    }

    case "collection-list": {
      let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
      try { cl = JSON.parse(el.content || "{}"); } catch {}
      const items = cl.items ?? [];
      const cols = Math.max(1, cl.columns ?? 3);
      const bg = (s.backgroundColor as string) || "#f8fafc";
      const radius = (s.borderRadius as number) || 12;
      return (
        <div style={{ ...fill, background: bg, borderRadius: radius, padding: 12, boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, alignContent: "start", overflow: "hidden", opacity: el.opacity ?? 1 }}>
          {items.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#94a3b8", fontSize: 12, alignSelf: "center" }}>Danh sách sản phẩm</div>
          ) : items.map((item, i) => {
            const img = item.image?.trim() ? resolveAsset(item.image) : "";
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", alignItems: "stretch", boxSizing: "border-box" }}>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", background: "#e2e8f0", marginBottom: 8 }}>
                  {img && <img src={img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", lineHeight: 1.35, marginBottom: 4, wordBreak: "break-word", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.title || "Sản phẩm"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{item.price || "0đ"}</div>
              </div>
            );
          })}
        </div>
      );
    }

    case "carousel": {
      const cd = parseCarouselContent(el.content ?? undefined);
      const { layoutType: lt, items: carouselItems } = cd;
      const st = mergeCarouselStyle(cd.carouselStyle);
      const bg = (s.backgroundColor as string) || "#f8fafc";
      const layoutType = lt === "media" ? "media" : "testimonial";
      const item = carouselItems[0];
      const commitCarouselText = (field: "quote" | "name" | "role" | "title" | "desc", value: string) => {
        if (!item) return;
        const next = [...carouselItems];
        next[0] = { ...next[0], [field]: value };
        updateElementFromStore(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: next, carouselStyle: cd.carouselStyle }) });
        pushHistoryFromStore();
      };
      return (
        <div style={{ ...fill, background: bg, borderRadius: 12, padding: 16, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: el.opacity ?? 1 }}>
          {!item ? (
            <span style={{ color: "#94a3b8", fontSize: 12 }}>Carousel</span>
          ) : layoutType === "testimonial" ? (
            <>
              {item.avatar?.trim() && <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", marginBottom: 8 }}><img src={resolveAsset(item.avatar)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
              <div contentEditable suppressContentEditableWarning onFocus={() => onSelectCarouselTextField?.("quote")} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => commitCarouselText("quote", (e.currentTarget.textContent || "").replace(/^\"|\"$/g, ""))} style={{ fontStyle: "italic", fontSize: st.quoteFontSize, color: st.quoteColor, textAlign: st.quoteAlign, marginBottom: 8, lineHeight: 1.5, outline: "none", cursor: "text", fontFamily: st.fontFamily ? `${st.fontFamily}, sans-serif` : undefined }}>"{(item.quote || "Trích dẫn...").slice(0, 120)}"</div>
              <div contentEditable suppressContentEditableWarning onFocus={() => onSelectCarouselTextField?.("name")} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => commitCarouselText("name", e.currentTarget.textContent || "")} style={{ fontSize: st.nameFontSize, fontWeight: 700, color: st.nameColor, textAlign: st.nameAlign, outline: "none", cursor: "text", fontFamily: st.fontFamily ? `${st.fontFamily}, sans-serif` : undefined }}>{item.name || "Tên"}</div>
              {item.role && <div contentEditable suppressContentEditableWarning onFocus={() => onSelectCarouselTextField?.("role")} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => commitCarouselText("role", e.currentTarget.textContent || "")} style={{ fontSize: st.roleFontSize, color: st.roleColor, textAlign: st.roleAlign, outline: "none", cursor: "text", fontFamily: st.fontFamily ? `${st.fontFamily}, sans-serif` : undefined }}>{item.role}</div>}
            </>
          ) : (
            <>
              {item.image?.trim() && <div style={{ width: "100%", flex: 1, minHeight: 0, borderRadius: 8, overflow: "hidden", background: "#e2e8f0", marginBottom: 8 }}><img src={resolveAsset(item.image)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
              {(item.title || item.name) && <div contentEditable suppressContentEditableWarning onFocus={() => onSelectCarouselTextField?.("title")} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => commitCarouselText("title", e.currentTarget.textContent || "")} style={{ fontSize: st.titleFontSize, fontWeight: 600, color: st.titleColor, textAlign: st.titleAlign, outline: "none", cursor: "text", fontFamily: st.fontFamily ? `${st.fontFamily}, sans-serif` : undefined }}>{item.title || item.name}</div>}
              {item.desc?.trim() && <div contentEditable suppressContentEditableWarning onFocus={() => onSelectCarouselTextField?.("desc")} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => commitCarouselText("desc", e.currentTarget.textContent || "")} style={{ fontSize: st.descFontSize, color: st.descColor, textAlign: st.descAlign, marginTop: 4, lineHeight: 1.45, outline: "none", cursor: "text", fontFamily: st.fontFamily ? `${st.fontFamily}, sans-serif` : undefined }}>{item.desc}</div>}
            </>
          )}
          {carouselItems.length > 1 && (
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 8 }}>
              {carouselItems.slice(0, 5).map((_, di) => (
                <div key={di} style={{ width: di === 0 ? 16 : 6, height: 6, borderRadius: 3, background: di === 0 ? "#6366f1" : "#d1d5db" }} />
              ))}
            </div>
          )}
        </div>
      );
    }

    case "tabs": {
      const [activeTab, setActiveTab] = useState(0);
      const { items: tabItems } = parseTabsContent(el.content ?? undefined);
      const bg = (s.backgroundColor as string) || "#ffffff";
      const slice = tabItems.slice(0, 5);
      if (slice.length === 0) return (
        <div style={{ ...fill, background: bg, borderRadius: 8, overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 8, background: "#f1f5f9", fontSize: 11, color: "#94a3b8" }}>Tab 1 | Tab 2 | Tab 3</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#94a3b8", fontSize: 12 }}>Nội dung tab</span></div>
        </div>
      );
      const tab = slice[activeTab] || slice[0];
      return (
        <div style={{ ...fill, background: bg, borderRadius: 8, overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", opacity: el.opacity ?? 1 }}>
          <div style={{ display: "flex", background: "#f1f5f9", flexShrink: 0 }}>
            {slice.map((t, ti) => (
              <button key={ti} type="button"
                onPointerDown={(e) => { e.stopPropagation(); setActiveTab(ti); }}
                style={{ padding: "8px 12px", fontSize: 11, fontWeight: ti === activeTab ? 700 : 400, background: ti === activeTab ? "#6366f1" : "transparent", color: ti === activeTab ? "#fff" : "#64748b", border: "none", cursor: "pointer", flex: 1 }}
              >{t.label || `Tab ${ti + 1}`}</button>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {tab.image?.trim() && <div style={{ flexShrink: 0, maxHeight: "55%", overflow: "hidden", background: "#e2e8f0", borderRadius: 6, margin: 8 }}><img src={resolveAsset(tab.image)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>}
            {tab.title && <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", padding: "0 8px 4px" }}>{tab.title}</div>}
            {tab.desc && <div style={{ fontSize: 11, color: "#64748b", padding: "0 8px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tab.desc}</div>}
            {!tab.image && !tab.title && !tab.desc && <span style={{ color: "#94a3b8", fontSize: 12, padding: 8 }}>Chưa có nội dung</span>}
          </div>
        </div>
      );
    }

    case "accordion": {
      const [openIdx, setOpenIdx] = useState<number | null>(null);
      const lines = (el.content ?? "Q|A").split("\n").filter((l) => l.trim());
      const items = lines.length ? lines : ["Câu hỏi 1|Trả lời 1", "Câu hỏi 2|Trả lời 2"];
      const borderColor = (s.borderColor as string) || "#e2e8f0";
      const headerBg = (s.headerBgColor as string) || "#ffffff";
      const headerColor = (s.headerTextColor as string) || "#0f172a";
      return (
        <div style={{ ...fill, overflow: "auto", boxSizing: "border-box", opacity: el.opacity ?? 1 }}>
          {items.map((line, i) => {
            const [q, a] = line.split("|");
            const open = i === openIdx;
            return (
              <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: 4, padding: "8px 12px", marginBottom: 4, fontSize: 13, background: headerBg, color: headerColor }}>
                <div style={{ fontWeight: 500, display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                  onPointerDown={(e) => { e.stopPropagation(); setOpenIdx(open ? null : i); }}>
                  <span>{q ?? ""}</span><span>{open ? "▲" : "▼"}</span>
                </div>
                {open && a && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>{a}</div>}
              </div>
            );
          })}
        </div>
      );
    }

    case "table": {
      const rows = (el.content ?? "A,B\n1,2").split("\n").filter((r) => r.trim());
      const borderColor = (s.borderColor as string) || "#e2e8f0";
      const headerBg = (s.headerBgColor as string) || "#f8fafc";
      const headerColor = (s.headerTextColor as string) || "#0f172a";
      const rowBg = (s.rowBgColor as string) || "#ffffff";
      const cellColor = (s.cellTextColor as string) || "#0f172a";
      return (
        <div style={{ ...fill, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, border: `1px solid ${borderColor}` }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.split(",").map((cell, ci) => {
                    const Tag = ri === 0 ? "th" : "td";
                    return <Tag key={ci} style={{ border: `1px solid ${borderColor}`, padding: "6px 8px", textAlign: "left", background: ri === 0 ? headerBg : rowBg, color: ri === 0 ? headerColor : cellColor, fontWeight: ri === 0 ? 600 : 400 }}>{cell}</Tag>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "countdown": {
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "monospace", fontSize: "clamp(14px, 2.5vw, 22px)", fontWeight: 700, opacity: el.opacity ?? 1 }}>
          <span style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: 6 }}>00</span>
          <span>:</span>
          <span style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: 6 }}>00</span>
          <span>:</span>
          <span style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: 6 }}>00</span>
        </div>
      );
    }

    case "map": {
      const raw = (el.content || "").trim();
      const parts = raw.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n));
      const lat = parts[0] ?? 10.762622;
      const lng = parts[1] ?? 106.660172;
      const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
      return <iframe src={src} style={{ ...fill, border: "none" }} title="Map" />;
    }

    case "rating": {
      const count = Number(s.count || 5);
      const filled = Number(s.value || 4);
      const color = (s.color as string) || "#f59e0b";
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: Math.min(Number(el.width || 40), Number(el.height || 40)) * 0.35, opacity: el.opacity ?? 1 }}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} style={{ color: i < filled ? color : "#d1d5db" }}>★</span>
          ))}
        </div>
      );
    }

    case "progress": {
      const val = Number(s.value || 70);
      const barColor = (s.color as string) || "#6366f1";
      const trackColor = (s.trackColor as string) || "#e2e8f0";
      return (
        <div style={{ ...fill, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 4px", opacity: el.opacity ?? 1 }}>
          <div style={{ width: "100%", height: Math.max(8, Number(el.height || 24) * 0.4), background: trackColor, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.max(0, val))}%`, height: "100%", background: barColor, borderRadius: 999 }} />
          </div>
        </div>
      );
    }

    case "frame": {
      const borderColor = (s.borderColor as string) || "#cbd5e1";
      const radius = (s.borderRadius as number) || 8;
      return (
        <div style={{ ...fill, border: `2px dashed ${borderColor}`, borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Frame</span>
        </div>
      );
    }

    case "social-share": {
      const networks = ["facebook", "twitter", "zalo"];
      const colors: Record<string, string> = { facebook: "#1877f2", twitter: "#1da1f2", zalo: "#0068ff" };
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", opacity: el.opacity ?? 1 }}>
          {networks.map((n) => (
            <div key={n} style={{ padding: "6px 14px", background: colors[n], color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{n}</div>
          ))}
        </div>
      );
    }

    default: {
      const labelMap: Record<string, string> = {
        cart: "🛒 Giỏ hàng",
        "blog-list": "📰 Blog",
        "blog-detail": "📄 Bài viết",
        popup: "💬 Popup",
        antigravity: "✨ Hiệu ứng",
      };
      return (
        <div style={{ ...fill, background: "#f8fafc", border: "1.5px dashed #94a3b8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <span style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: "0 8px" }}>
            {labelMap[el.type] || el.type}
          </span>
        </div>
      );
    }
  }
}

// ─── resize handles ────────────────────────────────────────────────────────

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: ResizeDirection[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

function handleStyle(dir: ResizeDirection): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", width: 8, height: 8, background: "#4f46e5", border: "1.5px solid #fff", borderRadius: 2, zIndex: 1000 };
  const mid50 = "calc(50% - 4px)";
  switch (dir) {
    case "n":  return { ...base, top: -4, left: mid50, cursor: "n-resize" };
    case "s":  return { ...base, bottom: -4, left: mid50, cursor: "s-resize" };
    case "e":  return { ...base, right: -4, top: mid50, cursor: "e-resize" };
    case "w":  return { ...base, left: -4, top: mid50, cursor: "w-resize" };
    case "ne": return { ...base, top: -4, right: -4, cursor: "ne-resize" };
    case "nw": return { ...base, top: -4, left: -4, cursor: "nw-resize" };
    case "se": return { ...base, bottom: -4, right: -4, cursor: "se-resize" };
    case "sw": return { ...base, bottom: -4, left: -4, cursor: "sw-resize" };
  }
}

// ─── section ────────────────────────────────────────────────────────────────

function DomSection({
  section,
  selectedId,
  selectedSectionId,
  editingId,
  canvasWidth,
  onSelectElement,
  onDragStart,
  onResizeStart,
  onSectionClick,
  onStartEdit,
  onCommitEdit,
  onOpenHtmlEditor,
  onSelectCarouselTextField,
  sectionGuides = null,
}: {
  section: EditorSection;
  selectedId: number | null;
  selectedSectionId: number | null;
  editingId: number | null;
  canvasWidth: number;
  onSelectElement: (id: number) => void;
  onDragStart: (e: React.PointerEvent, el: EditorElement, section: EditorSection) => void;
  onResizeStart: (e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => void;
  onSectionClick: (id: number) => void;
  onStartEdit: (id: number) => void;
  onCommitEdit: (id: number, text: string) => void;
  onOpenHtmlEditor: (id: number) => void;
  onSelectCarouselTextField: (elementId: number, field: "quote" | "name" | "role" | "title" | "desc") => void;
  sectionGuides?: SmartGuidesOverlayState | null;
}) {
  const [hovered, setHovered] = useState(false);
  const sectionH = section.height ?? 600;
  const bg = section.backgroundColor || "#ffffff";
  const bgImg = section.backgroundImageUrl ? resolveAsset(section.backgroundImageUrl) : undefined;
  const isSelectedSection = section.id === selectedSectionId;

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    width: canvasWidth,
    height: sectionH,
    backgroundColor: bg,
    backgroundImage: bgImg ? `url(${bgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "visible",
    flexShrink: 0,
    outline: isSelectedSection ? "2px solid #4f46e5" : hovered ? "1.5px dashed #a5b4fc" : "none",
    outlineOffset: -1,
  };

  return (
    <div
      style={sectionStyle}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement) === e.currentTarget) onSectionClick(section.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Section label shown on hover */}
      {(hovered || isSelectedSection) && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          background: isSelectedSection ? "#4f46e5" : "#6366f1",
          color: "#fff",
          fontSize: 10,
          fontFamily: "sans-serif",
          padding: "2px 8px",
          borderBottomRightRadius: 4,
          zIndex: 9999,
          pointerEvents: "none",
          letterSpacing: "0.02em",
          fontWeight: 600,
        }}>
          {section.name || "Section"}
        </div>
      )}
      {(section.elements ?? [])
        .filter((el) => !el.isHidden)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((el) => (
          <ElementWrapper
            key={el.id}
            el={el}
            isSelected={el.id === selectedId}
            isEditing={el.id === editingId}
            onPointerDown={(e) => {
              onSelectElement(el.id);
              onDragStart(e, el, section);
            }}
            onResizeStart={onResizeStart}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onOpenHtmlEditor={onOpenHtmlEditor}
            onSelectCarouselTextField={onSelectCarouselTextField}
          />
        ))}
      {sectionGuides && <SmartGuidesOverlay guides={sectionGuides} />}
    </div>
  );
}

const TEXT_TYPES = new Set(["text", "headline", "paragraph", "button", "list"]);

function ElementWrapper({
  el,
  isSelected,
  isEditing,
  onPointerDown,
  onResizeStart,
  onStartEdit,
  onCommitEdit,
  onOpenHtmlEditor,
  onSelectCarouselTextField,
}: {
  el: EditorElement;
  isSelected: boolean;
  isEditing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => void;
  onStartEdit: (id: number) => void;
  onCommitEdit: (id: number, text: string) => void;
  onOpenHtmlEditor?: (id: number) => void;
  onSelectCarouselTextField?: (elementId: number, field: "quote" | "name" | "role" | "title" | "desc") => void;
}) {
  const [hovered, setHovered] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const w = el.width ?? 100;
  const h = el.height ?? 40;

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: w,
    height: h,
    zIndex: (el.zIndex ?? 0) + (isSelected ? 500 : hovered ? 200 : 0),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    outline: isEditing ? "2px solid #f59e0b" : isSelected ? "2px solid #4f46e5" : hovered && !el.isLocked ? "1.5px dashed #818cf8" : "none",
    outlineOffset: 0,
    cursor: el.isLocked ? "default" : isEditing ? "text" : "move",
    userSelect: isEditing ? "text" : "none",
    boxSizing: "border-box",
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (el.isLocked) return;
    if (TEXT_TYPES.has(el.type)) {
      onStartEdit(el.id);
    } else if (el.type === "html-code" || el.type === "html") {
      onOpenHtmlEditor?.(el.id);
    }
  };

  return (
    <div
      style={wrapStyle}
      onPointerDown={(e) => {
        if (isEditing) { e.stopPropagation(); return; }
        e.stopPropagation();
        onPointerDown(e);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
      data-element-id={el.id}
    >
      {isEditing && TEXT_TYPES.has(el.type) ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onCommitEdit(el.id, e.currentTarget.innerHTML || e.currentTarget.textContent || "")}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          style={{
            position: "absolute", inset: 0,
            outline: "none",
            cursor: "text",
            userSelect: "text",
            padding: el.styles?.padding ? `${el.styles.padding}px` : 2,
            fontSize: el.styles?.fontSize ? `${el.styles.fontSize}px` : el.type === "headline" ? "28px" : "14px",
            fontFamily: el.styles?.fontFamily ? `${el.styles.fontFamily}, sans-serif` : undefined,
            fontWeight: (el.styles?.fontWeight as React.CSSProperties["fontWeight"]) || (el.type === "headline" ? 700 : 400),
            color: (el.styles?.color as string) || "#1e293b",
            textAlign: (el.styles?.textAlign as React.CSSProperties["textAlign"]) || "left",
            lineHeight: String(el.styles?.lineHeight || (el.type === "headline" ? "1.2" : "1.5")),
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflow: "auto",
            boxSizing: "border-box",
            backgroundColor: el.type === "button" ? ((el.styles?.backgroundColor as string) || "#4f46e5") : "transparent",
            borderRadius: el.styles?.borderRadius ? `${el.styles.borderRadius}px` : undefined,
            display: el.type === "button" ? "flex" : undefined,
            alignItems: el.type === "button" ? "center" : undefined,
            justifyContent: el.type === "button" ? "center" : undefined,
          } as React.CSSProperties}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: user-edited content
          dangerouslySetInnerHTML={{ __html: el.content || "" }}
        />
      ) : (
        <InnerElementRenderer
          el={el}
          onSelectCarouselTextField={(field) => onSelectCarouselTextField?.(el.id, field)}
        />
      )}
      {isSelected && !el.isLocked && !isEditing && (
        <>
          {HANDLES.map((dir) => (
            <div
              key={dir}
              style={handleStyle(dir)}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, el, dir);
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ─── main canvas ────────────────────────────────────────────────────────────

// ─── HTML code editor modal ──────────────────────────────────────────────────

function HtmlCodeEditorModal({
  elementId,
  initialContent,
  onSave,
  onClose,
}: {
  elementId: number;
  initialContent: string;
  onSave: (id: number, content: string) => void;
  onClose: () => void;
}) {
  let initHc: { subType?: string; code?: string; iframeSrc?: string } = {};
  try { initHc = JSON.parse(initialContent || "{}"); } catch {}

  const [subType, setSubType] = useState(initHc.subType ?? "html-js");
  const [code, setCode] = useState(initHc.code ?? "");
  const [iframeSrc, setIframeSrc] = useState(initHc.iframeSrc ?? "");
  const [preview, setPreview] = useState(false);

  const handleSave = () => {
    const newContent = JSON.stringify({ subType, code, iframeSrc });
    onSave(elementId, newContent);
    onClose();
  };

  const previewDoc = code
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;font-family:sans-serif}</style></head><body>${sanitizeUserHtmlForEmbed(code)}</body></html>`
    : "";

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col"
        style={{ width: "min(90vw, 860px)", height: "min(90vh, 640px)" }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 text-sm">Chỉnh sửa mã HTML / CSS / JS</h3>
            <div className="flex items-center gap-1 bg-slate-100 rounded p-0.5">
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="text-[11px] border-none bg-transparent px-2 py-0.5 text-slate-700 font-medium"
              >
                <option value="html-js">HTML / JS</option>
                <option value="iframe">IFRAME URL</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subType === "html-js" && code && (
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className={`px-3 py-1.5 rounded text-[12px] font-medium border ${preview ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {preview ? "◀ Mã nguồn" : "Xem trước ▶"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#1e2d7d] hover:bg-[#162558] text-white text-[12px] font-semibold"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-3 gap-2">
          {subType === "iframe" ? (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-500">URL nhúng (embed URL)</label>
              <input
                type="url"
                value={iframeSrc}
                onChange={(e) => setIframeSrc(e.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
                className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {iframeSrc && (
                <iframe
                  src={iframeSrc}
                  className="w-full flex-1 border border-slate-200 rounded-lg"
                  style={{ minHeight: 300 }}
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>
          ) : preview && previewDoc ? (
            <iframe
              srcDoc={previewDoc}
              className="w-full flex-1 border border-slate-200 rounded-lg bg-white"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <>
              <label className="text-[11px] font-semibold text-slate-500">
                Nhập HTML, CSS, JavaScript tùy chỉnh
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 w-full px-3 py-2 text-[12px] font-mono rounded-lg border border-slate-200 bg-[#1e1e2e] text-[#a6e3a1] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={"<div style=\"color:red\">Xin chào!</div>\n<script>console.log('Hello')</script>"}
                spellCheck={false}
                autoFocus
              />
              <p className="text-[10px] text-slate-400">Hỗ trợ HTML, inline CSS, và JavaScript. Khi xuất HTML sẽ nhúng nguyên đoạn code này vào trang.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function visibleSectionsOrdered(sections: EditorSection[]) {
  return sections.filter((s) => s.visible !== false);
}

/** Y offset từ đầu canvas của section (chỉ tính section đang hiển thị) */
function sectionTopOffset(sections: EditorSection[], sectionId: number): number {
  let y = 0;
  for (const s of visibleSectionsOrdered(sections)) {
    if (s.id === sectionId) return y;
    y += s.height ?? 600;
  }
  return 0;
}

/**
 * Tọa độ Y tuyệt đối (top element) trên canvas → section + y cục bộ.
 * Chọn section theo **tâm dọc** của element để có thể đặt đè lên ranh giới (y âm / tràn dưới).
 * Không clamp localY vào [0, sectionH − h].
 */
function sectionAndLocalFromAbsoluteTop(
  sections: EditorSection[],
  absTopY: number,
  elH: number,
): { section: EditorSection; localY: number } {
  const vis = visibleSectionsOrdered(sections);
  if (vis.length === 0) {
    const s = sections[0];
    return { section: s, localY: absTopY };
  }
  const centerAbsY = absTopY + elH / 2;
  let yOff = 0;
  for (const s of vis) {
    const sh = s.height ?? 600;
    if (centerAbsY < yOff + sh) {
      return { section: s, localY: absTopY - yOff };
    }
    yOff += sh;
  }
  const last = vis[vis.length - 1];
  const lastSh = last.height ?? 600;
  const lastStart = yOff - lastSh;
  return { section: last, localY: absTopY - lastStart };
}

interface DragState {
  elementId: number;
  startMouseX: number;
  startMouseY: number;
  startElX: number;
  /** Y tuyệt đối trên toàn canvas (cộng dồn chiều cao các section phía trên) */
  startAbsY: number;
  startW: number;
  startH: number;
  zoom: number;
}

interface ResizeState {
  elementId: number;
  dir: ResizeDirection;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  zoom: number;
}

export default function DomCanvas({
  onCanvasReady,
  containerRef,
  onRequestAddImage,
  onRequestChangeIcon,
  onRequestAddFormField,
  onRequestSaveFormData,
  onOpenSettings,
}: DomCanvasProps) {
  const {
    sections,
    selected,
    zoom,
    deviceType,
    desktopCanvasWidth,
    selectElement,
    selectSection,
    selectPage,
    updateElement,
    moveElementToSection,
    duplicateElement,
    removeElement,
    pushHistory,
  } = useEditorStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const gridSize = useEditorStore((s) => s.gridSize) || 8;
  const showGuides = useEditorStore((s) => s.showGuides);
  const [smartGuides, setSmartGuides] = useState<{ sectionId: number; data: SmartGuidesOverlayState } | null>(null);
  const [editingElementId, setEditingElementId] = useState<number | null>(null);
  const [htmlEditorElementId, setHtmlEditorElementId] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeCarouselText, setActiveCarouselText] = useState<{ elementId: number; field: "quote" | "name" | "role" | "title" | "desc" } | null>(null);

  const canvasWidth = desktopCanvasWidth || 960;
  const effectiveZoom = deviceType === "mobile" ? zoom * (420 / canvasWidth) : zoom;

  const selectedElementId = selected.type === "element" ? selected.id : null;
  const selectedSectionId = selected.type === "section" ? selected.id : null;

  // Find selected element and its absolute Y offset for toolbar positioning
  const selEl = useMemo(() => {
    if (!selectedElementId) return null;
    let sectionY = 0;
    for (const s of sections) {
      if (s.visible === false) continue;
      const el = s.elements.find((e) => e.id === selectedElementId);
      if (el) return { el, section: s, sectionY };
      sectionY += s.height ?? 600;
    }
    return null;
  }, [selectedElementId, sections]);

  const toolbarPos = useMemo(() => {
    if (!selEl) return null;
    const { el, sectionY } = selEl;
    const w = el.width ?? 100;
    const h = el.height ?? 40;
    const yTop = sectionY + el.y;
    const isTop = yTop * effectiveZoom > 50;
    return {
      left: (el.x + w / 2) * effectiveZoom,
      top: isTop ? yTop * effectiveZoom - 10 : (yTop + h) * effectiveZoom + 10,
      placement: isTop ? "top" : "bottom",
    };
  }, [selEl, effectiveZoom]);

  // Text format state derived from selected text element
  const textFormat = useMemo(() => {
    if (!selEl) return null;
    const { el } = selEl;
    if (el.type === "carousel") {
      const cd = parseCarouselContent(el.content ?? undefined);
      const st = mergeCarouselStyle(cd.carouselStyle);
      const field = activeCarouselText?.elementId === el.id ? activeCarouselText.field : (cd.layoutType === "media" ? "title" : "quote");
      const map = {
        quote: { fs: st.quoteFontSize, c: st.quoteColor, a: st.quoteAlign, fsKey: "quoteFontSize", cKey: "quoteColor", aKey: "quoteAlign" },
        name: { fs: st.nameFontSize, c: st.nameColor, a: st.nameAlign, fsKey: "nameFontSize", cKey: "nameColor", aKey: "nameAlign" },
        role: { fs: st.roleFontSize, c: st.roleColor, a: st.roleAlign, fsKey: "roleFontSize", cKey: "roleColor", aKey: "roleAlign" },
        title: { fs: st.titleFontSize, c: st.titleColor, a: st.titleAlign, fsKey: "titleFontSize", cKey: "titleColor", aKey: "titleAlign" },
        desc: { fs: st.descFontSize, c: st.descColor, a: st.descAlign, fsKey: "descFontSize", cKey: "descColor", aKey: "descAlign" },
      }[field];
      return {
        fontSize: Number(map.fs || 14),
        fontFamily: st.fontFamily || "Inter",
        color: map.c || "#1e293b",
        fontWeight: 600,
        textAlign: (map.a || "center") as "left" | "center" | "right" | "justify",
        onFontSizeChange: (n: number) => updateElement(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: cd.items, carouselStyle: { ...cd.carouselStyle, [map.fsKey]: n } }) }),
        onFontFamilyChange: (font: string) =>
          updateElement(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: cd.items, carouselStyle: { ...cd.carouselStyle, fontFamily: font } }) }),
        onColorChange: (hex: string) => updateElement(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: cd.items, carouselStyle: { ...cd.carouselStyle, [map.cKey]: hex } }) }),
        onBoldToggle: () => {},
        onAlignChange: (align: "left" | "center" | "right") => updateElement(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: cd.items, carouselStyle: { ...cd.carouselStyle, [map.aKey]: align } }) }),
      };
    }
    if (!TEXT_TYPES.has(el.type)) return null;
    const s = el.styles ?? {};
    const fw = Number(s.fontWeight || 400);
    const rawFam = (s.fontFamily as string) || "Inter";
    const fontFamily = rawFam.split(",")[0].replace(/["']/g, "").trim();
    return {
      fontSize: Number(s.fontSize || 14),
      fontFamily,
      color: (s.color as string) || "#1e293b",
      fontWeight: fw,
      textAlign: ((s.textAlign as string) || "left") as "left" | "center" | "right" | "justify",
      onFontSizeChange: (n: number) => updateElement(el.id, { styles: { ...s, fontSize: n } }),
      onFontFamilyChange: (font: string) => updateElement(el.id, { styles: { ...s, fontFamily: font } }),
      onColorChange: (hex: string) => updateElement(el.id, { styles: { ...s, color: hex } }),
      onBoldToggle: () => updateElement(el.id, { styles: { ...s, fontWeight: fw >= 600 ? 400 : 700 } }),
      onAlignChange: (align: "left" | "center" | "right") => updateElement(el.id, { styles: { ...s, textAlign: align } }),
    };
  }, [selEl, updateElement, activeCarouselText]);

  // expose handle for export
  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady({ getContainerElement: () => canvasContainerRef.current });
    }
  }, [onCanvasReady]);

  // forward containerRef
  useEffect(() => {
    if (containerRef && canvasContainerRef.current) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = canvasContainerRef.current;
    }
  }, [containerRef]);

  const snap = useCallback((v: number) => {
    if (!snapToGrid) return Math.round(v);
    return Math.round(v / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // ── drag ──
  const handleDragStart = useCallback((e: React.PointerEvent, el: EditorElement, section: EditorSection) => {
    if (el.isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const st = useEditorStore.getState().sections;
    const off = sectionTopOffset(st, section.id);
    dragRef.current = {
      elementId: el.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElX: el.x,
      startAbsY: off + el.y,
      startW: el.width ?? 100,
      startH: el.height ?? 40,
      zoom: effectiveZoom,
    };
  }, [effectiveZoom]);

  // ── resize ──
  const handleResizeStart = useCallback((e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      elementId: el.id,
      dir,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
      startW: el.width ?? 100,
      startH: el.height ?? 40,
      zoom: effectiveZoom,
    };
  }, [effectiveZoom]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const store = useEditorStore.getState();
    const stSections = store.sections;

    // drag (tọa độ Y tuyệt đối trên toàn canvas → có thể chuyển sang section khác)
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.startMouseX) / d.zoom;
      const dy = (e.clientY - d.startMouseY) / d.zoom;
      const w = d.startW;
      const h = d.startH;
      let rawX = d.startElX + dx;
      const rawAbsY = d.startAbsY + dy;

      const { section: targetSec, localY: rawLocalY } = sectionAndLocalFromAbsoluteTop(stSections, rawAbsY, h);
      const sectionH = Math.max(1, targetSec.height ?? 600);
      const othersRects: GuideRect[] = (targetSec.elements ?? [])
        .filter((el) => !el.isHidden && el.id !== d.elementId)
        .map((el) => ({ x: el.x, y: el.y, w: el.width ?? 100, h: el.height ?? 40 }));

      const xCand = buildXSnapCandidates(canvasWidth, w, othersRects);
      const yCand = buildYSnapCandidates(sectionH, h, othersRects);
      const sx = snapToNearest(rawX, xCand, SMART_GUIDE_THRESHOLD);
      const sy = snapToNearest(rawLocalY, yCand, SMART_GUIDE_THRESHOLD);
      let nx = sx.value;
      let ny = sy.value;
      if (!sx.snapped && snapToGrid) nx = snap(rawX);
      if (!sy.snapped && snapToGrid) ny = snap(rawLocalY);
      nx = clampNum(nx, 0, Math.max(0, canvasWidth - w));
      ny = clampNum(ny, -SECTION_Y_OVERFLOW_PX, sectionH + SECTION_Y_OVERFLOW_PX - h);

      const curSec = stSections.find((s) => s.elements.some((e) => e.id === d.elementId));
      if (!curSec) return;
      if (curSec.id === targetSec.id) {
        updateElement(d.elementId, { x: nx, y: ny });
      } else {
        moveElementToSection(d.elementId, targetSec.id, nx, ny);
      }

      if (showGuides) {
        const dragRect: GuideRect = { x: nx, y: ny, w, h };
        const { vLines, hLines } = buildAlignmentLines(dragRect, othersRects, canvasWidth, sectionH);
        const gapLabels = buildGapLabels(dragRect, othersRects);
        setSmartGuides({
          sectionId: targetSec.id,
          data: {
            vLines,
            hLines,
            gapLabels,
            sizeLabel: { x: nx + w / 2, y: ny + h + 8, text: `${Math.round(w)} × ${Math.round(h)}` },
          },
        });
      } else {
        setSmartGuides(null);
      }
      return;
    }
    // resize
    if (resizeRef.current) {
      const r = resizeRef.current;
      const dx = (e.clientX - r.startMouseX) / r.zoom;
      const dy = (e.clientY - r.startMouseY) / r.zoom;
      let x = r.startX;
      let y = r.startY;
      let w = r.startW;
      let h = r.startH;

      if (r.dir.includes("e")) w = Math.max(20, snap(r.startW + dx));
      if (r.dir.includes("s")) h = Math.max(10, snap(r.startH + dy));
      if (r.dir.includes("w")) {
        const dw = snap(dx);
        x = r.startX + dw;
        w = Math.max(20, r.startW - dw);
      }
      if (r.dir.includes("n")) {
        const dh = snap(dy);
        y = r.startY + dh;
        h = Math.max(10, r.startH - dh);
      }

      const sec = stSections.find((s) => s.elements.some((el) => el.id === r.elementId));
      const sectionH = Math.max(1, sec?.height ?? 600);
      const othersRects: GuideRect[] = (sec?.elements ?? [])
        .filter((el) => !el.isHidden && el.id !== r.elementId)
        .map((el) => ({ x: el.x, y: el.y, w: el.width ?? 100, h: el.height ?? 40 }));

      const vEdgeTargets = [0, canvasWidth, ...othersRects.flatMap((o) => [o.x, o.x + o.w])];
      const hEdgeTargets = [0, sectionH, ...othersRects.flatMap((o) => [o.y, o.y + o.h])];

      if (showGuides) {
        if (r.dir.includes("e")) {
          const sr = snapToNearest(x + w, vEdgeTargets, SMART_GUIDE_THRESHOLD);
          if (sr.snapped) w = Math.max(20, sr.value - x);
        }
        if (r.dir.includes("w")) {
          const sl = snapToNearest(x, vEdgeTargets, SMART_GUIDE_THRESHOLD);
          if (sl.snapped) {
            const nw = Math.max(20, w + (x - sl.value));
            x = sl.value;
            w = nw;
          }
        }
        if (r.dir.includes("s")) {
          const sb = snapToNearest(y + h, hEdgeTargets, SMART_GUIDE_THRESHOLD);
          if (sb.snapped) h = Math.max(10, sb.value - y);
        }
        if (r.dir.includes("n")) {
          const st = snapToNearest(y, hEdgeTargets, SMART_GUIDE_THRESHOLD);
          if (st.snapped) {
            const nh = Math.max(10, h + (y - st.value));
            y = st.value;
            h = nh;
          }
        }
      }

      x = clampNum(x, 0, canvasWidth - 20);
      const maxBottom = sectionH + SECTION_Y_OVERFLOW_PX;
      y = clampNum(y, -SECTION_Y_OVERFLOW_PX, maxBottom - 10);
      w = clampNum(w, 20, canvasWidth - x);
      h = clampNum(h, 10, maxBottom - y);

      updateElement(r.elementId, { x, y, width: w, height: h });

      if (showGuides && sec) {
        const dragRect: GuideRect = { x, y, w, h };
        const { vLines, hLines } = buildAlignmentLines(dragRect, othersRects, canvasWidth, sectionH);
        const gapLabels = buildGapLabels(dragRect, othersRects);
        setSmartGuides({
          sectionId: sec.id,
          data: {
            vLines,
            hLines,
            gapLabels,
            sizeLabel: { x: x + w / 2, y: y + h + 8, text: `${Math.round(w)} × ${Math.round(h)}` },
          },
        });
      } else {
        setSmartGuides(null);
      }
      return;
    }
  }, [snap, updateElement, moveElementToSection, canvasWidth, snapToGrid, showGuides]);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current !== null || resizeRef.current !== null) {
      pushHistory();
    }
    dragRef.current = null;
    resizeRef.current = null;
    setSmartGuides(null);
  }, [pushHistory]);

  const handleStartEdit = useCallback((id: number) => {
    setEditingElementId(id);
  }, []);

  const handleCommitEdit = useCallback((id: number, html: string) => {
    updateElement(id, { content: html });
    pushHistory();
    setEditingElementId(null);
  }, [updateElement, pushHistory]);

  // Close editing when clicking outside
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (editingElementId !== null) {
      // blur handled by contenteditable onBlur — just clear
      setEditingElementId(null);
    }
    if ((e.target as HTMLElement) === e.currentTarget) selectPage();
  }, [editingElementId, selectPage]);

  const totalHeight = sections.filter(s => s.visible !== false).reduce((sum, s) => sum + (s.height ?? 600), 0);

  return (
    // Outer wrapper: has the VISUAL size of the scaled canvas so the parent can scroll correctly
    <div
      ref={canvasContainerRef}
      style={{
        width: canvasWidth * effectiveZoom,
        height: Math.max(totalHeight * effectiveZoom, 100),
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleCanvasClick}
    >
      {/* Inner: full design-space canvas scaled via CSS transform */}
      <div
        style={{
          width: canvasWidth,
          transformOrigin: "top left",
          transform: `scale(${effectiveZoom})`,
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {sections
          .filter((s) => s.visible !== false)
          .map((section) => (
            <DomSection
              key={section.id}
              section={section}
              selectedId={selectedElementId}
              selectedSectionId={selectedSectionId}
              editingId={editingElementId}
              canvasWidth={canvasWidth}
              onSelectElement={(id) => {
                selectElement(id);
                onOpenSettings?.();
              }}
              onDragStart={handleDragStart}
              onResizeStart={handleResizeStart}
              onSectionClick={(id) => {
                selectSection(id);
              }}
              onStartEdit={handleStartEdit}
              onCommitEdit={handleCommitEdit}
              onOpenHtmlEditor={(id) => setHtmlEditorElementId(id)}
              onSelectCarouselTextField={(elementId, field) => setActiveCarouselText({ elementId, field })}
              sectionGuides={smartGuides?.sectionId === section.id ? smartGuides.data : null}
            />
          ))}
      </div>

      {/* Toolbar – positioned in outer (screen-coordinate) space, not in scaled inner */}
      {toolbarPos && selEl && (
        <div
          style={{
            position: "absolute",
            left: toolbarPos.left,
            top: toolbarPos.top,
            transform: `translate(-50%, ${toolbarPos.placement === "top" ? "-100%" : "0"})`,
            zIndex: 2000,
            whiteSpace: "nowrap",
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ElementActionToolbar
            elementType={selEl.el.type}
            isLocked={selEl.el.isLocked}
            isHidden={selEl.el.isHidden}
            textFormat={selEl.el.type === "carousel" ? textFormat : editingElementId === selEl.el.id ? textFormat : null}
            fontOptions={GOOGLE_FONTS.slice(0, 48)}
            onDuplicate={() => { duplicateElement(selEl.el.id); pushHistory(); }}
            onDelete={() => { removeElement(selEl.el.id); pushHistory(); }}
            onAddImage={() => onRequestAddImage?.(selEl.el.id)}
            onRequestChangeIcon={selEl.el.type === "icon" ? () => onRequestChangeIcon?.(selEl.el.id) : undefined}
            onAddFormField={selEl.el.type === "form" ? () => onRequestAddFormField?.(selEl.el.id) : undefined}
            onSaveFormData={selEl.el.type === "form" ? () => onRequestSaveFormData?.(selEl.el.id) : undefined}
            onRotateVertical={selEl.el.type === "divider" ? () => {
              const r = ((selEl.el.rotation ?? 0) + 90) % 360;
              updateElement(selEl.el.id, { rotation: r });
              pushHistory();
            } : undefined}
            onBringToFront={() => {
              const maxZ = Math.max(0, ...selEl.section.elements.map(e => e.zIndex ?? 0));
              updateElement(selEl.el.id, { zIndex: maxZ + 1 });
              pushHistory();
            }}
            onSendToBack={() => {
              const minZ = Math.min(0, ...selEl.section.elements.map(e => e.zIndex ?? 0));
              updateElement(selEl.el.id, { zIndex: minZ - 1 });
              pushHistory();
            }}
            onToggleLock={() => { updateElement(selEl.el.id, { isLocked: !selEl.el.isLocked }); pushHistory(); }}
            onToggleHide={() => { updateElement(selEl.el.id, { isHidden: !selEl.el.isHidden }); pushHistory(); }}
            onOpenSettings={() => onOpenSettings?.()}
            onEditHtmlCode={selEl.el.type === "html-code" ? () => setHtmlEditorElementId(selEl.el.id) : undefined}
            showMoreMenu={showMoreMenu}
            onToggleMore={() => setShowMoreMenu((v) => !v)}
          />
        </div>
      )}

      {/* HTML Code Editor Modal */}
      {htmlEditorElementId !== null && (() => {
        const htmlEl = sections.flatMap(s => s.elements).find(e => e.id === htmlEditorElementId);
        if (!htmlEl) return null;
        return (
          <HtmlCodeEditorModal
            elementId={htmlEditorElementId}
            initialContent={htmlEl.content || ""}
            onSave={(id, content) => {
              updateElement(id, { content });
              pushHistory();
            }}
            onClose={() => setHtmlEditorElementId(null)}
          />
        );
      })()}
    </div>
  );
}

// suppress unused-import warnings for alternate renderers defined but not used at module level
void TextElement;
void ButtonElement;
void ImageElement;
void ShapeElement;
void DividerElement;
void IconElement;
void VideoElement;
void FormElement;
void HtmlCodeElement;
void GalleryElement;
void PlaceholderElement;
void ElementRenderer;
