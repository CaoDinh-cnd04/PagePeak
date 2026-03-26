/**
 * DomCanvas – DOM-based canvas renderer (replaces Fabric.js canvas).
 * Elements are absolutely positioned at their actual pixel coordinates
 * within each section div. Zoom is applied via CSS transform: scale(zoom)
 * on the outer container, so editor and preview always match perfectly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { EditorElement, EditorSection } from "@/types/editor";
import { getIconById } from "@/data/iconData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

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
  const doc = code || "<div style='padding:16px;color:#64748b;font-size:12px'>Chưa có mã HTML</div>";
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

function InnerElementRenderer({ el }: { el: EditorElement }) {
  const s = el.styles ?? {};

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
        return <iframe src={hc.iframeSrc.trim()} style={{ ...fill, border: "none" }} title="Embedded" />;
      }
      const code = (hc.code || el.content || "").trim();
      const doc = code ? `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0">${code}</body></html>` : `<div style='padding:16px;color:#64748b;font-size:12px'>Chưa có mã HTML</div>`;
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

    default: {
      const labelMap: Record<string, string> = {
        "product-detail": "🛒 Chi tiết sản phẩm",
        "collection-list": "📦 Danh sách sản phẩm",
        countdown: "⏱ Đếm ngược",
        map: "📍 Bản đồ",
        "social-share": "📣 Chia sẻ",
        rating: "⭐ Đánh giá",
        progress: "📊 Tiến trình",
        carousel: "🎠 Carousel",
        tabs: "📑 Tabs",
        accordion: "📂 Accordion",
        table: "📋 Bảng",
        cart: "🛒 Giỏ hàng",
        "blog-list": "📰 Blog",
        "blog-detail": "📄 Bài viết",
        popup: "💬 Popup",
        frame: "🖼 Khung",
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
  canvasWidth,
  onSelectElement,
  onDragStart,
  onResizeStart,
  onSectionClick,
}: {
  section: EditorSection;
  selectedId: number | null;
  selectedSectionId: number | null;
  canvasWidth: number;
  onSelectElement: (id: number) => void;
  onDragStart: (e: React.PointerEvent, el: EditorElement, section: EditorSection) => void;
  onResizeStart: (e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => void;
  onSectionClick: (id: number) => void;
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
            onPointerDown={(e) => {
              onSelectElement(el.id);
              onDragStart(e, el, section);
            }}
            onResizeStart={onResizeStart}
          />
        ))}
    </div>
  );
}

function ElementWrapper({
  el,
  isSelected,
  onPointerDown,
  onResizeStart,
}: {
  el: EditorElement;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const w = el.width ?? 100;
  const h = el.height ?? 40;

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: w,
    height: h,
    zIndex: (el.zIndex ?? 0) + (isSelected ? 500 : hovered ? 200 : 0),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    outline: isSelected ? "2px solid #4f46e5" : hovered && !el.isLocked ? "1.5px dashed #818cf8" : "none",
    outlineOffset: 0,
    cursor: el.isLocked ? "default" : "move",
    userSelect: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={wrapStyle}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-element-id={el.id}
    >
      <InnerElementRenderer el={el} />
      {isSelected && !el.isLocked && (
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

interface DragState {
  elementId: number;
  sectionId: number;
  startMouseX: number;
  startMouseY: number;
  startElX: number;
  startElY: number;
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
  } = useEditorStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const gridSize = useEditorStore((s) => s.gridSize) || 8;

  const canvasWidth = desktopCanvasWidth || 960;
  const effectiveZoom = deviceType === "mobile" ? zoom * (420 / canvasWidth) : zoom;

  const selectedElementId = selected.type === "element" ? selected.id : null;
  const selectedSectionId = selected.type === "section" ? selected.id : null;

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
    dragRef.current = {
      elementId: el.id,
      sectionId: section.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElX: el.x,
      startElY: el.y,
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
    // drag
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.startMouseX) / d.zoom;
      const dy = (e.clientY - d.startMouseY) / d.zoom;
      const newX = snap(d.startElX + dx);
      const newY = snap(d.startElY + dy);
      updateElement(d.elementId, { x: newX, y: newY });
      return;
    }
    // resize
    if (resizeRef.current) {
      const r = resizeRef.current;
      const dx = (e.clientX - r.startMouseX) / r.zoom;
      const dy = (e.clientY - r.startMouseY) / r.zoom;
      let x = r.startX, y = r.startY, w = r.startW, h = r.startH;

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
      updateElement(r.elementId, { x, y, width: w, height: h });
      return;
    }
  }, [snap, updateElement]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  // double click → open settings
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const el = target.closest("[data-element-id]") as HTMLElement | null;
    if (el) {
      const id = Number(el.dataset.elementId);
      if (!Number.isNaN(id)) {
        selectElement(id);
        onOpenSettings?.();
        onRequestAddImage?.(id);
      }
    }
  }, [selectElement, onOpenSettings, onRequestAddImage]);

  // total canvas height
  const totalHeight = sections.reduce((sum, s) => sum + (s.height ?? 600), 0);

  return (
    // Outer wrapper: has the VISUAL size of the scaled canvas so the parent can scroll correctly
    <div
      ref={canvasContainerRef}
      style={{
        width: canvasWidth * effectiveZoom,
        height: totalHeight * effectiveZoom,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        if ((e.target as HTMLElement) === e.currentTarget) selectPage();
      }}
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
            />
          ))}
      </div>
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
