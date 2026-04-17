import { useRef, useCallback } from "react";
import { LayoutTemplate } from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { EditorSection, EditorElementType, ToolItemData, ElementPresetData } from "@/types/editor";
import { getLucideIcon } from "@/lib/editor/iconMap";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import {
  SIDEBAR_SAMPLE_COLLECTION_LIST,
  SIDEBAR_SAMPLE_PRODUCT_DETAIL,
} from "@/lib/editor/elementSidebarSamples";
import { FRAME_VARIANT_LABELS, getDefaultContentForVariant, type FrameVariant } from "@/lib/editor/frameContent";

export type PresetPreviewVariant = "compact" | "card";

export function PresetPreview({
  preset,
  elementType,
  variant = "compact",
}: {
  preset: ElementPresetData;
  elementType: string;
  variant?: PresetPreviewVariant;
}) {
  let styles: Record<string, string | number> = {};
  try {
    styles = JSON.parse(preset.stylesJson || "{}");
  } catch {}
  const content = preset.defaultContent || preset.name;
  const card = variant === "card";

  if (elementType === "button") {
    const bg = (styles.backgroundColor as string) ?? "#4f46e5";
    const color = (styles.color as string) ?? "#ffffff";
    const radius = (styles.borderRadius as number) ?? 8;
    const borderW = (styles.borderWidth as number) ?? 0;
    const borderC = (styles.borderColor as string) ?? "#e2e8f0";
    const fontSize = Math.min((styles.fontSize as number) ?? 14, card ? 12 : 10);
    const textTransform = (styles.textTransform as string) ?? "none";
    const textDeco = (styles.textDecoration as string) ?? "none";
    let displayText = content;
    if (textTransform === "uppercase") displayText = displayText.toUpperCase();
    if (displayText.length > 12) displayText = displayText.slice(0, 10) + "…";
    return (
      <div
        className={`shrink-0 flex items-center justify-center px-2 py-1 rounded ${card ? "min-w-[100px] max-w-[200px] py-1.5" : "min-w-[56px] max-w-[80px]"}`}
        style={{
          backgroundColor: bg,
          color,
          borderRadius: radius,
          border: borderW > 0 ? `${borderW}px solid ${borderC}` : "none",
          fontSize: `${fontSize}px`,
          fontWeight: (styles.fontWeight as number) ?? 600,
          textDecoration: textDeco,
          textTransform: textTransform as React.CSSProperties["textTransform"],
          boxShadow: (styles.boxShadow as string) || undefined,
        }}
      >
        <span className="truncate">{displayText}</span>
      </div>
    );
  }

  if (["text", "headline", "paragraph"].includes(elementType)) {
    const color = (styles.color as string) ?? "#1e293b";
    const rawFs = (styles.fontSize as number) ?? (elementType === "headline" ? 28 : elementType === "paragraph" ? 15 : 14);
    const fontSize = card
      ? Math.min(rawFs, elementType === "headline" ? 22 : elementType === "paragraph" ? 14 : 13)
      : Math.min(rawFs, 11);
    let displayText = content;
    if (!card && displayText.length > 18) displayText = displayText.slice(0, 16) + "…";
    if (card && displayText.length > 120) displayText = displayText.slice(0, 118) + "…";
    const lineHeight = (styles.lineHeight as number) ?? (elementType === "paragraph" ? 1.5 : 1.25);
    const letterSpacing = (styles.letterSpacing as number) ?? 0;
    const textTransform = (styles.textTransform as string) ?? "none";
    const textDeco = (styles.textDecoration as string) ?? "none";
    return (
      <div
        className={`shrink-0 rounded border border-slate-200 bg-white ${card ? "w-full min-w-0 px-2.5 py-2 max-w-none" : "px-2 py-0.5 bg-slate-50/80 min-w-[60px] max-w-[100px]"}`}
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontWeight: (styles.fontWeight as number) ?? (elementType === "headline" ? 700 : 400),
          fontStyle: (styles.fontStyle as string) ?? "normal",
          lineHeight,
          letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
          textTransform: textTransform as React.CSSProperties["textTransform"],
          textDecoration: textDeco,
          textAlign: ((styles.textAlign as string) ?? "left") as React.CSSProperties["textAlign"],
        }}
      >
        <span className={`block ${card ? "line-clamp-4 break-words" : "truncate"}`}>{displayText}</span>
      </div>
    );
  }

  if (elementType === "list") {
    const color = (styles.color as string) ?? "#334155";
    const fs = card ? Math.min((styles.fontSize as number) ?? 14, 12) : 10;
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const show = card ? lines.slice(0, 4) : [lines[0] || "Mục 1"];
    return (
      <div
        className={`shrink-0 rounded border border-slate-200 bg-white ${card ? "w-full min-w-0 px-2.5 py-2 text-left" : "px-2 py-0.5 bg-slate-50/80 max-w-[90px]"}`}
        style={{ color, fontSize: `${fs}px`, lineHeight: (styles.lineHeight as number) ?? 1.5 }}
      >
        {show.map((line, i) => (
          <span key={i} className={`block ${card ? "truncate" : "truncate"}`}>
            • {card ? line.slice(0, 48) : line.slice(0, 12)}
            {!card && line.length > 12 ? "…" : ""}
            {card && line.length > 48 ? "…" : ""}
          </span>
        ))}
      </div>
    );
  }

  if (elementType === "shape") {
    const bg = (styles.backgroundColor as string) ?? "#e0e7ff";
    const radius = (styles.borderRadius as number) ?? 8;
    const borderW = (styles.borderWidth as number) ?? 0;
    const borderC = (styles.borderColor as string) ?? "#e2e8f0";
    const borderStyle = (styles.borderStyle as string) ?? "solid";
    const boxShadow = (styles.boxShadow as string) ?? "";
    const isCircle = radius >= 999;
    return (
      <div
        className={`shrink-0 rounded overflow-hidden ${card ? "w-24 h-16" : "w-10 h-8"}`}
        style={{
          backgroundColor: bg === "transparent" ? "rgba(248,250,252,0.8)" : bg,
          borderRadius: isCircle ? "50%" : radius,
          border: borderW > 0 ? `${borderW}px ${borderStyle} ${borderC}` : "none",
          boxShadow: boxShadow || undefined,
        }}
      />
    );
  }

  if (elementType === "icon") {
    const color = (styles.color as string) ?? "#4f46e5";
    const char = content || "★";
    return (
      <div
        className={`shrink-0 rounded bg-slate-100 flex items-center justify-center ${card ? "w-14 h-14 text-2xl" : "w-8 h-8 text-lg"}`}
        style={{ color }}
      >
        {char}
      </div>
    );
  }

  if (elementType === "frame") {
    let variant: FrameVariant = "quote";
    try {
      const j = JSON.parse((content || "{}").trim() || "{}") as { variant?: string };
      if (j.variant && j.variant in FRAME_VARIANT_LABELS) variant = j.variant as FrameVariant;
    } catch {
      /* ignore */
    }
    const title = FRAME_VARIANT_LABELS[variant];
    return (
      <div
        className={`shrink-0 flex flex-col justify-center rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 shadow-sm ${
          card ? "min-w-[140px] gap-1 py-2" : "w-[100px] min-h-[32px]"
        }`}
      >
        <span className={`font-semibold text-slate-800 leading-tight ${card ? "text-[11px]" : "text-[9px] line-clamp-2"}`}>{title}</span>
        <span className={`text-slate-500 ${card ? "text-[10px]" : "text-[7px] truncate"}`}>Mẫu · chỉnh trên canvas</span>
      </div>
    );
  }

  if (elementType === "product-detail") {
    const raw = (preset.defaultContent?.trim() || SIDEBAR_SAMPLE_PRODUCT_DETAIL) as string;
    const pd = parseProductDetailContent(raw);
    const mainImg = pd.images.filter(Boolean)[0];
    const sale = (pd.salePrice && pd.salePrice !== "0đ" ? pd.salePrice : pd.price) || "—";
    const showOrig = !!(pd.price && pd.salePrice && pd.salePrice !== pd.price && pd.salePrice !== "0đ");
    const accent = pd.accentColor || "#ee4d2d";
    /** Giao diện thẻ dọc (mobile / Shopee-style) — tránh khối ngang chữ chồng chữ */
    return (
      <div
        className={`shrink-0 flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/90 ${
          card ? "w-[min(100%,220px)] max-w-[240px]" : "w-[100px]"
        }`}
        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
      >
        <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-100 to-slate-50">
          {mainImg ? (
            <img src={mainImg} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">Ảnh</div>
          )}
          {pd.showBadge && pd.badge && (
            <span
              className="absolute left-1.5 top-1.5 rounded px-1 py-0.5 text-[8px] font-bold text-white shadow-sm"
              style={{ background: accent }}
            >
              {pd.badge}
            </span>
          )}
        </div>
        <div className={`flex flex-col gap-1 px-2 pb-2 pt-1.5 ${card ? "gap-1.5" : ""}`}>
          <p
            className={`font-semibold leading-snug text-slate-900 ${card ? "line-clamp-3 text-[11px]" : "line-clamp-2 text-[9px]"}`}
          >
            {pd.title || "Tên sản phẩm"}
          </p>
          <div className="flex items-end justify-between gap-1">
            <div className="min-w-0 flex flex-col">
              <span
                className={`font-extrabold tabular-nums leading-none ${card ? "text-[14px]" : "text-[11px]"}`}
                style={{ color: accent }}
              >
                {sale}
              </span>
              {showOrig && (
                <span className="text-[8px] text-slate-400 line-through">{pd.price}</span>
              )}
            </div>
            {card && pd.showRating && pd.rating > 0 && (
              <span className="shrink-0 text-[9px] font-bold text-amber-500">★ {pd.rating.toFixed(1)}</span>
            )}
          </div>
          {card && pd.showVariants && pd.variants.length > 0 && (
            <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-1.5">
              {pd.variants.slice(0, 2).map((v) => (
                <span
                  key={v.label}
                  className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[8px] font-medium text-slate-600"
                >
                  {v.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (elementType === "collection-list") {
    type CLItem = { image?: string; title?: string; price?: string; originalPrice?: string; badge?: string; rating?: number };
    type CLData = { columns?: number; gap?: number; cardRadius?: number; showBadge?: boolean; showRating?: boolean; showOriginalPrice?: boolean; accentColor?: string; items?: CLItem[] };
    let cl: CLData = {};
    try {
      cl = JSON.parse(preset.defaultContent?.trim() || SIDEBAR_SAMPLE_COLLECTION_LIST) as CLData;
    } catch {
      try {
        cl = JSON.parse(SIDEBAR_SAMPLE_COLLECTION_LIST) as CLData;
      } catch {
        cl = {};
      }
    }
    let fallbackItems: CLItem[] = [];
    try {
      fallbackItems = (JSON.parse(SIDEBAR_SAMPLE_COLLECTION_LIST) as CLData).items ?? [];
    } catch {
      fallbackItems = [];
    }
    const items: CLItem[] = cl.items && cl.items.length > 0 ? cl.items : fallbackItems;
    const accent = cl.accentColor || "#ee4d2d";
    const cardR = cl.cardRadius ?? 6;
    const showBadge = cl.showBadge !== false;
    const showRating = cl.showRating === true;
    const showOrigP = cl.showOriginalPrice !== false;
    const slice = items.slice(0, 3);
    /** Một hàng ảnh + một dòng giá — gọn; bản card mới hiện tên từng ô */
    if (!card) {
      return (
        <div
          className="shrink-0 flex w-full max-w-[200px] flex-col gap-1.5 rounded-xl bg-white p-1.5 ring-1 ring-slate-200/90"
          style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
        >
          <div className="flex gap-1">
            {slice.map((item, i) => {
              const img = item.image?.trim();
              return (
                <div key={i} className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-slate-100 aspect-square">
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-300">—</div>
                  )}
                  {showBadge && item.badge && (
                    <span
                      className="absolute left-0.5 top-0.5 max-w-[90%] truncate rounded px-0.5 py-px text-[6px] font-bold text-white"
                      style={{ background: accent }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-0.5 px-0.5">
            {slice.map((item, i) => (
              <div key={i} className="min-w-0 flex-1 text-center">
                <span className="block truncate text-[9px] font-extrabold tabular-nums" style={{ color: accent }}>
                  {item.price || "—"}
                </span>
                {showOrigP && item.originalPrice && item.originalPrice !== item.price && (
                  <span className="block truncate text-[7px] text-slate-400 line-through">{item.originalPrice}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-[8px] font-medium text-slate-400">Lưới {slice.length} sản phẩm mẫu</p>
        </div>
      );
    }
    return (
      <div
        className="grid shrink-0 gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200/90"
        style={{
          gridTemplateColumns: `repeat(${slice.length}, minmax(0, 1fr))`,
          boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
          minWidth: 220,
          maxWidth: 280,
        }}
      >
        {slice.map((item, i) => {
          const img = item.image?.trim();
          const hasOrig = showOrigP && item.originalPrice && item.originalPrice !== item.price;
          return (
            <div
              key={i}
              className="flex min-w-0 flex-col overflow-hidden rounded-lg bg-slate-50/80"
              style={{ borderRadius: Math.min(cardR, 10) }}
            >
              <div className="relative aspect-square w-full bg-slate-100">
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">—</div>
                )}
                {showBadge && item.badge && (
                  <span
                    className="absolute left-1 top-1 rounded px-1 py-0.5 text-[8px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 px-1.5 py-1.5">
                <span className="line-clamp-2 text-[10px] font-semibold leading-snug text-slate-800">
                  {item.title || "Sản phẩm"}
                </span>
                {showRating && (item.rating ?? 0) > 0 && (
                  <span className="text-[9px] font-bold text-amber-500">★ {item.rating?.toFixed(1)}</span>
                )}
                <div className="mt-auto flex flex-wrap items-baseline gap-1">
                  <span className="text-[11px] font-extrabold tabular-nums" style={{ color: accent }}>
                    {item.price || "—"}
                  </span>
                  {hasOrig && (
                    <span className="text-[8px] text-slate-400 line-through">{item.originalPrice}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (elementType === "gallery") {
    const layoutType = (styles.layoutType as string) ?? "grid";
    const cols = Number(styles.columns ?? 3) || 3;
    const bg = (styles.backgroundColor as string) ?? "#f8fafc";
    const radius = (styles.borderRadius as number) ?? 8;
    let urls: string[] = [];
    try {
      const parsed = JSON.parse(content || "[]");
      urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
    } catch {}
    const cellSize = card
      ? layoutType === "minimal" ? 48 : layoutType === "vertical-thumbs" ? 20 : 24
      : layoutType === "minimal" ? 32 : layoutType === "vertical-thumbs" ? 14 : 18;
    return (
      <div
        className="shrink-0 rounded overflow-hidden border border-slate-200"
        style={{
          width: card ? 72 : 56,
          height: card ? 54 : 42,
          backgroundColor: bg,
          borderRadius: radius,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {urls.length === 0 ? (
          <span className="text-slate-400 text-[10px]">🖼</span>
        ) : layoutType === "minimal" ? (
          <div
            className="rounded"
            style={{
              width: card ? 60 : 44,
              height: card ? 46 : 34,
              background: `url(${urls[0]}) center/cover`,
              backgroundColor: "#e2e8f0",
            }}
          />
        ) : (
          urls.slice(0, layoutType === "vertical-thumbs" ? 4 : cols * 2).map((url, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: cellSize,
                height: cellSize,
                background: `url(${url}) center/cover`,
                backgroundColor: "#e2e8f0",
              }}
            />
          ))
        )}
      </div>
    );
  }

  if (elementType === "divider") {
    const color = (styles.backgroundColor as string) ?? "#d1d5db";
    const thickness = Math.max(1, ((styles.height as number) ?? 2));
    return (
      <div className={`flex w-full items-center justify-center ${card ? "py-3" : "py-1"}`}>
        <div
          style={{
            width: card ? "100%" : 48,
            height: thickness,
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    );
  }

  if (elementType === "countdown") {
    return (
      <div
        className={`flex items-center justify-center gap-1 font-mono font-bold text-slate-700 ${card ? "text-sm gap-1.5" : "text-[10px]"}`}
      >
        {["00", "00", "00", "00"].map((t, i) => (
          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 tabular-nums">
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (elementType === "rating") {
    const n = Math.min(5, Math.max(1, parseInt(String(content).replace(/\D/g, ""), 10) || 5));
    return (
      <div className={`text-amber-400 ${card ? "text-lg tracking-wide" : "text-sm"}`}>
        {"★".repeat(n)}
        <span className="text-slate-300">{"★".repeat(5 - n)}</span>
      </div>
    );
  }

  if (elementType === "progress") {
    const pct = Math.min(100, Math.max(0, parseInt(String(content).replace(/\D/g, ""), 10) || 60));
    const bg = (styles.backgroundColor as string) ?? "#e2e8f0";
    const fill = (styles.color as string) ?? "#4f46e5";
    return (
      <div className={`w-full ${card ? "max-w-[200px]" : "max-w-[80px]"}`}>
        <div className="h-2 w-full rounded-full" style={{ background: bg }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: fill }} />
        </div>
        <p className="mt-0.5 text-center text-[9px] text-slate-500">{pct}%</p>
      </div>
    );
  }

  if (elementType === "form") {
    return (
      <div className={`w-full space-y-1 rounded border border-slate-200 bg-white p-2 ${card ? "text-[11px]" : "text-[9px]"}`}>
        <div className="h-2 w-3/4 rounded bg-slate-100" />
        <div className="h-6 w-full rounded border border-slate-200 bg-slate-50" />
        <div className="mx-auto h-5 w-20 rounded bg-slate-800" />
      </div>
    );
  }

  if (elementType === "menu") {
    let mc: { items?: Array<{label:string}>;activeIndex?:number;variant?:number;align?:string;activeColor?:string;activeBgColor?:string;textColor?:string;fontSize?:number;fontWeight?:number;textTransform?:string;gap?:number;backgroundColor?:string;borderRadius?:number } = {};
    try { mc = JSON.parse(content || "{}"); } catch {}
    const mItems = mc.items ?? [{label:"Trang chủ"},{label:"Giới thiệu"},{label:"Dịch vụ"},{label:"Liên hệ"}];
    const mActive = mc.activeIndex ?? 0;
    const mVar = mc.variant ?? 1;
    const mActiveColor = mc.activeColor ?? "#f97316";
    const mActiveBg = mc.activeBgColor ?? "#fff7ed";
    const mTextColor = mc.textColor ?? "#1e293b";
    const mFs = card ? Math.min(mc.fontSize ?? 13, 12) : 10;
    const mFw = mc.fontWeight ?? 600;
    const mTT = (mc.textTransform ?? "none") as React.CSSProperties["textTransform"];
    const mGap = card ? (mc.gap ?? 6) : 4;
    const mBg = mc.backgroundColor ?? "transparent";
    const mBR = mc.borderRadius ?? 0;

    const getIs = (idx: number): React.CSSProperties => {
      const isActive = idx === mActive;
      const base: React.CSSProperties = { fontSize: mFs, fontWeight: mFw as React.CSSProperties["fontWeight"], textTransform: mTT, whiteSpace: "nowrap", transition: "all 0.1s" };
      switch (mVar) {
        case 1: return { ...base, padding: card?"4px 10px":"2px 6px", borderRadius: 5, color: isActive?mActiveColor:mTextColor, backgroundColor: isActive?mActiveBg:"transparent", fontWeight: isActive?700:mFw as React.CSSProperties["fontWeight"] };
        case 3: return { ...base, padding: card?"3px 8px":"2px 5px", color: mActiveColor };
        case 4: return { ...base, padding: card?"3px 8px":"2px 5px", color: isActive?mActiveColor:mTextColor, textTransform:"uppercase", borderBottom: isActive?`2px solid ${mActiveColor}`:"2px solid transparent" };
        case 5: return { ...base, padding: card?"3px 8px":"2px 5px", color: mTextColor, fontWeight:700, textTransform:"uppercase", opacity:isActive?1:0.5 };
        case 6: return { ...base, padding: card?"3px 8px":"2px 5px", color: mActiveColor, fontWeight:700, fontSize: mFs + 1 };
        case 7: return { ...base, padding: card?"3px 6px":"2px 4px", color: isActive?mActiveColor:"#94a3b8", fontSize: Math.max(9, mFs-1) };
        case 8: return { ...base, padding: card?"3px 8px":"2px 5px", color: mActiveColor, textTransform:"uppercase", fontWeight:700 };
        case 9: return { ...base, padding: card?"3px 7px":"2px 4px", color: isActive?mActiveColor:mTextColor, fontSize: Math.max(9, mFs-1), borderBottom: isActive?`1.5px solid ${mActiveColor}`:"none" };
        default: return { ...base, padding: card?"3px 8px":"2px 5px", color: isActive?mActiveColor:mTextColor };
      }
    };
    return (
      <div className={`w-full rounded overflow-hidden`}
        style={{ backgroundColor: mBg||"#f8fafc", borderRadius: mBR, border: mBg==="transparent"?"1px dashed #e2e8f0":"none", padding: card?"6px 8px":"3px 4px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap: mGap, alignItems:"center", justifyContent: mc.align==="center"?"center":mc.align==="right"?"flex-end":"flex-start" }}>
          {mItems.slice(0, card?6:4).map((item, idx) => (
            <span key={idx} style={getIs(idx)}>{item.label||`Mục ${idx+1}`}</span>
          ))}
        </div>
      </div>
    );
  }

  if (elementType === "carousel") {
    let cc: { layoutType?: string; carouselStyle?: Record<string, unknown>; items?: Array<Record<string, unknown>> } = {};
    try { cc = JSON.parse(content || "{}"); } catch {}
    const layout = cc.layoutType ?? "product";
    const cs = (cc.carouselStyle ?? {}) as Record<string, unknown>;
    const items = cc.items ?? [];
    const bg = (styles.backgroundColor as string) ?? "#f8fafc";
    const br = (styles.borderRadius as number) ?? 12;

    if (layout === "testimonial") {
      const dark = bg === "#0f172a" || bg.startsWith("#0f") || bg.startsWith("#1e");
      const nameColor = dark ? "#a78bfa" : "#111827";
      const quoteColor = dark ? "#e2e8f0" : "#374151";
      const dotColor = dark ? "#a78bfa" : "#6366f1";
      const starColor = (cs.ratingColor as string) ?? "#f59e0b";
      const first = items[0] as { avatar?: string; name?: string; role?: string; rating?: number; quote?: string } | undefined;
      return (
        <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "10px 12px" : "6px 8px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: card ? 6 : 3 }}>
            <div style={{ width: card ? 36 : 22, height: card ? 36 : 22, borderRadius: "50%", background: `linear-gradient(135deg,#818cf8,#a78bfa)`, overflow: "hidden", flexShrink: 0, border: `2px solid ${dotColor}` }}>
              {first?.avatar && <img src={first.avatar as string} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            {card && first?.rating && (
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < (first.rating ?? 0) ? starColor : "#e2e8f0", fontSize: 9 }}>★</span>
                ))}
              </div>
            )}
            <div style={{ width: "100%", textAlign: "center" }}>
              {card && first?.quote && (
                <div style={{ fontSize: 9, color: quoteColor, lineHeight: 1.4, marginBottom: 4, opacity: 0.9, maxHeight: 36, overflow: "hidden" }}>"{(first.quote as string).slice(0, 70)}"</div>
              )}
              <div style={{ fontSize: card ? 9 : 7, fontWeight: 700, color: nameColor }}>{first?.name as string ?? "Tên khách hàng"}</div>
              {card && <div style={{ fontSize: 8, color: dark ? "#94a3b8" : "#6b7280", marginTop: 1 }}>{first?.role as string ?? ""}</div>}
            </div>
            {items.length > 1 && (
              <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
                {items.slice(0, 3).map((_, i) => (
                  <div key={i} style={{ width: i === 0 ? (card ? 14 : 10) : (card ? 5 : 4), height: card ? 4 : 3, borderRadius: 2, background: i === 0 ? dotColor : (dark ? "#334155" : "#ddd6fe") }} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (layout === "product") {
      const spv = Math.min(4, Math.max(2, (cs.slidesPerView as number) ?? 3));
      const showCap = cs.showCaption as boolean;
      const cardBg = (cs.cardBg as string) ?? "#ffffff";
      const cardBr = (cs.cardRadius as number) ?? 8;
      const showDots = cs.showDots !== false;
      const dotColor = (cs.dotActiveColor as string) ?? "#6366f1";
      const displayCount = card ? Math.min(items.length || spv, spv) : Math.min(items.length || 3, 3);
      return (
        <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "8px" : "4px 5px" }}>
          <div style={{ display: "flex", gap: card ? 5 : 3 }}>
            {Array.from({ length: displayCount }).map((_, i) => {
              const item = (items[i] ?? {}) as { image?: string; title?: string; desc?: string };
              return (
                <div key={i} style={{ flex: 1, background: cardBg, borderRadius: cardBr, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ width: "100%", aspectRatio: "1", background: item.image ? "transparent" : `hsl(${220 + i * 30},60%,90%)`, overflow: "hidden" }}>
                    {item.image && <img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  {showCap && card && (
                    <div style={{ padding: "3px 4px" }}>
                      <div style={{ fontSize: 8, fontWeight: 600, color: (cs.titleColor as string) ?? "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title ?? "Sản phẩm"}</div>
                      {item.desc && <div style={{ fontSize: 7, color: (cs.descColor as string) ?? "#64748b", marginTop: 1 }}>{item.desc as string}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {showDots && card && (
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 5 }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: dotColor }} />
              <div style={{ width: 4, height: 3, borderRadius: 2, background: "#ddd6fe" }} />
              <div style={{ width: 4, height: 3, borderRadius: 2, background: "#ddd6fe" }} />
            </div>
          )}
        </div>
      );
    }

    if (layout === "media" || layout === "hero") {
      const first = (items[0] ?? {}) as { image?: string; bgImage?: string; title?: string; subtitle?: string; btnText?: string };
      const img = first.bgImage ?? first.image;
      const isHero = layout === "hero";
      const overlayOp = isHero ? ((cs.overlayOpacity as number) ?? 0.35) : 0;
      const btnBg = (cs.btnBg as string) ?? "#6366f1";
      const btnColor = (cs.btnColor as string) ?? "#ffffff";
      const titleColor = isHero ? "#ffffff" : ((cs.titleColor as string) ?? "#111827");
      const descColor = isHero ? "rgba(255,255,255,0.8)" : ((cs.descColor as string) ?? "#64748b");
      return (
        <div className="w-full overflow-hidden relative" style={{ background: bg, borderRadius: br, aspectRatio: card ? "2.2" : "2.8", overflow: "hidden" }}>
          {img && <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          {!img && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,#1e293b,#334155)` }} />}
          {isHero && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${overlayOp})` }} />}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: card ? "8px 10px" : "4px 6px", textAlign: "center", gap: card ? 4 : 2 }}>
            {first.title && <div style={{ fontSize: card ? 10 : 8, fontWeight: 700, color: titleColor, textShadow: isHero ? "0 1px 3px rgba(0,0,0,.4)" : "none", lineHeight: 1.2 }}>{(first.title as string).slice(0, 40)}</div>}
            {card && first.subtitle && <div style={{ fontSize: 8, color: descColor, lineHeight: 1.3 }}>{(first.subtitle as string).slice(0, 50)}</div>}
            {card && isHero && first.btnText && (
              <div style={{ background: btnBg, color: btnColor, fontSize: 7, fontWeight: 700, padding: "3px 8px", borderRadius: (cs.btnRadius as number) ?? 6, marginTop: 2 }}>{first.btnText as string}</div>
            )}
          </div>
          {items.length > 1 && (
            <div style={{ position: "absolute", bottom: card ? 5 : 3, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
              <div style={{ width: card ? 10 : 7, height: card ? 3 : 2, borderRadius: 2, background: "#ffffff" }} />
              {items.slice(1, 3).map((_, i) => (
                <div key={i} style={{ width: card ? 4 : 3, height: card ? 3 : 2, borderRadius: 2, background: "rgba(255,255,255,0.5)" }} />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (layout === "cards") {
      const first = (items[0] ?? {}) as { image?: string; title?: string; desc?: string };
      const cardBg = (cs.cardBg as string) ?? "#ffffff";
      const cardBr = (cs.cardRadius as number) ?? 12;
      const titleColor = (cs.titleColor as string) ?? "#1e293b";
      const descColor = (cs.descColor as string) ?? "#64748b";
      return (
        <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "8px" : "4px" }}>
          <div style={{ background: cardBg, borderRadius: cardBr, overflow: "hidden" }}>
            {first.image && (
              <div style={{ width: "100%", height: card ? 52 : 30, overflow: "hidden" }}>
                <img src={first.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            {!first.image && <div style={{ width: "100%", height: card ? 52 : 30, background: "linear-gradient(135deg,#e0e7ff,#ddd6fe)" }} />}
            <div style={{ padding: card ? "6px 8px" : "3px 5px" }}>
              <div style={{ fontSize: card ? 9 : 7, fontWeight: 700, color: titleColor, marginBottom: 2 }}>{(first.title as string ?? "Tiêu đề").slice(0, 30)}</div>
              {card && <div style={{ fontSize: 8, color: descColor, lineHeight: 1.4 }}>{((first.desc as string) ?? "Mô tả ngắn về tính năng hoặc nội dung.").slice(0, 60)}</div>}
            </div>
          </div>
          {items.length > 1 && card && (
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 5 }}>
              <div style={{ width: 10, height: 3, borderRadius: 2, background: (cs.dotActiveColor as string) ?? "#6366f1" }} />
              <div style={{ width: 4, height: 3, borderRadius: 2, background: "#ddd6fe" }} />
              <div style={{ width: 4, height: 3, borderRadius: 2, background: "#ddd6fe" }} />
            </div>
          )}
        </div>
      );
    }

    if (layout === "logos") {
      const logoH = card ? 22 : 14;
      return (
        <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "8px 10px" : "4px 6px" }}>
          <div style={{ display: "flex", gap: card ? 8 : 5, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            {(items.length > 0 ? items : Array.from({ length: 5 })).slice(0, card ? 5 : 4).map((item, i) => {
              const logo = item as { image?: string; name?: string };
              return (
                <div key={i} style={{ height: logoH, flex: "0 0 auto", display: "flex", alignItems: "center" }}>
                  {logo.image ? (
                    <img src={logo.image} alt={logo.name ?? ""} style={{ height: logoH, width: "auto", maxWidth: card ? 44 : 30, objectFit: "contain", filter: "grayscale(100%) opacity(0.5)" }} />
                  ) : (
                    <div style={{ width: card ? 36 : 24, height: logoH, background: "#e2e8f0", borderRadius: 4 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (layout === "stats") {
      const numColor = (cs.numberColor as string) ?? "#6366f1";
      const lblColor = (cs.labelColor as string) ?? "#64748b";
      return (
        <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "8px 10px" : "4px 6px" }}>
          <div style={{ display: "flex", gap: card ? 10 : 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            {(items.length > 0 ? items : [{ number: "10K+", label: "KH" }, { number: "98%", label: "HLong" }, { number: "500+", label: "DA" }]).slice(0, card ? 4 : 3).map((item, i) => {
              const st = item as { number?: string; label?: string };
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: card ? 14 : 10, fontWeight: 800, color: numColor, lineHeight: 1 }}>{(st.number as string) ?? "—"}</div>
                  <div style={{ fontSize: card ? 7 : 6, color: lblColor, marginTop: 2 }}>{(st.label as string) ?? ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // fallback carousel preview
    return (
      <div className="w-full overflow-hidden" style={{ background: bg, borderRadius: br, padding: card ? "8px" : "4px 5px" }}>
        <div style={{ display: "flex", gap: card ? 5 : 3 }}>
          {[0, 1, 2].slice(0, card ? 3 : 2).map(i => (
            <div key={i} style={{ flex: 1, aspectRatio: "1", background: `hsl(${230 + i * 20},55%,88%)`, borderRadius: 6 }} />
          ))}
        </div>
        {card && <div style={{ textAlign: "center", fontSize: 8, color: "#64748b", marginTop: 5 }}>{preset.name}</div>}
      </div>
    );
  }

  if (elementType === "frame") {
    let fc: Record<string, unknown> = {};
    try { fc = JSON.parse(content || "{}"); } catch {}
    const variant = (fc.variant as string) ?? "quote";
    const frameBg = (fc.background as string) ?? "#ffffff";
    const fmBr = (styles.borderRadius as number) ?? 12;
    const pad = card ? 10 : 5;

    if (variant === "quote") {
      const qColor = (fc.quoteMarkColor as string) ?? "#0044ff";
      const tColor = (fc.quoteTextColor as string) ?? "#334155";
      const fColor = (fc.quoteFooterColor as string) ?? "#0044ff";
      return (
        <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, display: "flex", flexDirection: "column", alignItems: "center", gap: card ? 5 : 3, textAlign: "center", boxSizing: "border-box" }}>
          <span style={{ fontSize: card ? 18 : 12, lineHeight: 1, color: qColor, fontWeight: 800 }}>&ldquo;</span>
          <div style={{ fontSize: card ? 8 : 6, color: tColor, lineHeight: 1.4, maxWidth: "92%", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: card ? 3 : 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>
            {(fc.quoteText as string) ?? "Nội dung trích dẫn từ khách hàng..."}
          </div>
          <div style={{ fontSize: card ? 7 : 6, fontWeight: 700, color: fColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90%" }}>
            {(fc.quoteFooter as string) ?? "— Tên khách hàng"}
          </div>
        </div>
      );
    }

    if (variant === "split-feature") {
      const imgUrl = fc.splitImage as string;
      const imgPos = (fc.splitImagePosition as string) ?? "left";
      const titleColor = (fc.splitTitleColor as string) ?? "#0f172a";
      const bodyColor = (fc.splitBodyColor as string) ?? "#64748b";
      const imgBr = (fc.splitImageRadius as number) ?? 8;
      const imgSide = (
        <div style={{ width: card ? 52 : 32, height: card ? 52 : 32, borderRadius: imgBr, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg,#e2e8f0,#f1f5f9)" }}>
          {imgUrl && <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      );
      const textSide = (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: card ? 3 : 2 }}>
          <div style={{ fontSize: card ? 9 : 6, fontWeight: 700, color: titleColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>
            {(fc.splitTitle as string) ?? "Tiêu đề tính năng"}
          </div>
          {card && <div style={{ fontSize: 7, color: bodyColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>
            {(fc.splitBody as string) ?? "Mô tả tính năng nổi bật..."}
          </div>}
        </div>
      );
      return (
        <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, display: "flex", flexDirection: "row", gap: card ? 8 : 4, alignItems: "center", boxSizing: "border-box" }}>
          {imgPos === "right" ? <>{textSide}{imgSide}</> : <>{imgSide}{textSide}</>}
        </div>
      );
    }

    if (variant === "profile-cta") {
      const imgUrl = fc.profileImage as string;
      const layout = (fc.profileLayout as string) ?? "vertical";
      const round = fc.profileImageRound !== false;
      const nameColor = (fc.profileNameColor as string) ?? "#0f172a";
      const roleColor = (fc.profileRoleColor as string) ?? "#64748b";
      const btnBg = (fc.profileBtnBg as string) ?? "#0d9488";
      const btnColor = (fc.profileBtnColor as string) ?? "#ffffff";
      const btnText = (fc.profileBtnText as string) ?? "Liên hệ";
      const avatarSize = card ? (layout === "vertical" ? 40 : 36) : (layout === "vertical" ? 24 : 22);
      const avatar = (
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: round ? "50%" : 6, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg,#818cf8,#a78bfa)" }}>
          {imgUrl && <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      );
      if (layout === "vertical") {
        return (
          <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, display: "flex", flexDirection: "column", alignItems: "center", gap: card ? 4 : 2, textAlign: "center", boxSizing: "border-box" }}>
            {avatar}
            <div style={{ fontSize: card ? 8 : 6, fontWeight: 700, color: nameColor }}>{(fc.profileName as string) ?? "Tên người dùng"}</div>
            {card && <div style={{ fontSize: 7, color: roleColor }}>{(fc.profileRole as string) ?? "Chức danh"}</div>}
            {card && <div style={{ fontSize: 7, color: (fc.profileBodyColor as string) ?? "#64748b", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>{fc.profileBody as string ?? ""}</div>}
            <div style={{ padding: "3px 8px", background: btnBg, color: btnColor, borderRadius: 6, fontSize: card ? 7 : 6, fontWeight: 700 }}>{btnText}</div>
          </div>
        );
      }
      return (
        <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, display: "flex", flexDirection: "row", gap: card ? 8 : 4, alignItems: "center", boxSizing: "border-box" }}>
          {avatar}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: card ? 3 : 2 }}>
            <div style={{ fontSize: card ? 8 : 6, fontWeight: 700, color: nameColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(fc.profileName as string) ?? "Tên người dùng"}</div>
            {card && <div style={{ fontSize: 7, color: roleColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(fc.profileRole as string) ?? "Chức danh"}</div>}
            <div style={{ alignSelf: "flex-start", padding: "2px 7px", background: btnBg, color: btnColor, borderRadius: 5, fontSize: card ? 7 : 6, fontWeight: 700 }}>{btnText}</div>
          </div>
        </div>
      );
    }

    if (variant === "numbered") {
      const numColor = (fc.numValueColor as string) ?? "#4c1d95";
      const nameColor2 = (fc.numNameColor as string) ?? "#0f172a";
      const bodyColor2 = (fc.numBodyColor as string) ?? "#64748b";
      return (
        <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, display: "flex", flexDirection: "row", gap: card ? 8 : 4, alignItems: "flex-start", boxSizing: "border-box" }}>
          <span style={{ fontSize: card ? 22 : 14, fontWeight: 800, color: numColor, lineHeight: 1, flexShrink: 0 }}>{(fc.numValue as string) ?? "01"}</span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: card ? 2 : 1 }}>
            <div style={{ fontSize: card ? 8 : 6, fontWeight: 700, color: nameColor2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(fc.numName as string) ?? "Tiêu đề"}</div>
            {card && <div style={{ fontSize: 7, color: bodyColor2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>{(fc.numBody as string) ?? "Mô tả nội dung..."}</div>}
          </div>
        </div>
      );
    }

    // blank
    return (
      <div className="w-full overflow-hidden" style={{ background: frameBg, borderRadius: fmBr, padding: pad, border: "1.5px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", minHeight: card ? 52 : 30 }}>
        <div style={{ fontSize: card ? 8 : 6, color: "#94a3b8", textAlign: "center" }}>Khung trống</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded border border-dashed border-slate-200 bg-slate-50 text-slate-600 ${
        card ? "w-full min-w-0 px-2 py-2 text-[11px] font-medium text-center leading-snug line-clamp-3" : "px-2 py-1 text-[9px] max-w-[90px] truncate"
      }`}
    >
      {preset.name}
    </div>
  );
}

const SECTION_LABEL_HEIGHT = 0;
const SECTION_GAP = 4;

function getSectionYOffsets(sections: EditorSection[]): number[] {
  const offsets: number[] = [];
  let y = 0;
  for (const sec of sections) {
    offsets.push(y);
    y += (sec.height ?? 600) + SECTION_LABEL_HEIGHT + SECTION_GAP;
  }
  return offsets;
}

function findSectionAtY(sections: EditorSection[], canvasY: number): { section: EditorSection; localY: number } | null {
  const offsets = getSectionYOffsets(sections);
  for (let i = 0; i < sections.length; i++) {
    const top = offsets[i] ?? 0;
    const h = sections[i].height ?? 600;
    if (canvasY >= top && canvasY < top + h) {
      return { section: sections[i], localY: canvasY - top - SECTION_LABEL_HEIGHT };
    }
  }
  return sections.length > 0 ? { section: sections[0], localY: 50 } : null;
}

export function DraggableToolItem({
  item,
  activeItemId,
  onSelect,
  onAddElement,
  onAddSection,
  onAddSectionTemplate,
  forceAddWithPreset,
  surfaceClassName,
  suppressAutoAdd,
}: {
  item: ToolItemData;
  activeItemId?: number | null;
  onSelect?: (id: number | null) => void;
  onAddElement: (elType: EditorElementType, preset?: ElementPresetData) => void;
  onAddSection: () => void;
  onAddSectionTemplate?: (template: "blank" | "hero") => void;
  forceAddWithPreset?: ElementPresetData;
  /** Giao diện dòng (vd. nhóm mẫu Khung) */
  surfaceClassName?: string;
  /** true: chỉ chọn mục (mở panel con), không thêm phần tử — dùng cho Khung (frame) */
  suppressAutoAdd?: boolean;
}) {
  const frameDragFallback: ElementPresetData | undefined =
    item.elementType === "frame" && !forceAddWithPreset
      ? {
          id: -999,
          name: "frame-drag",
          defaultContent: JSON.stringify(getDefaultContentForVariant("quote")),
          stylesJson: JSON.stringify({ border: "none", borderRadius: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" }),
          defaultWidth: 680,
          defaultHeight: 240,
          order: 0,
        }
      : undefined;
  const preset = forceAddWithPreset ?? item.presets[0] ?? frameDragFallback;
  const presetForPreview = forceAddWithPreset ?? item.presets[0] ?? undefined;
  const isSectionTool = item.elementType === "section";
  const dragId =
    forceAddWithPreset != null ? `tool-${item.id}-preset-${forceAddWithPreset.id}` : `tool-${item.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: isSectionTool,
    data: {
      type: "tool-item",
      item,
      elementType: item.elementType as EditorElementType,
      /** Kéo từ dòng Khung (chưa vào panel mẫu): dùng mẫu quote làm mặc định */
      preset: preset ?? frameDragFallback,
    },
  });

  const isActive = activeItemId === item.id;

  const handleClick = () => {
    if (forceAddWithPreset) {
      onAddElement(item.elementType as EditorElementType, forceAddWithPreset);
      if (item.elementType === "frame") {
        onSelect?.(null);
      }
      return;
    }
    onSelect?.(item.id);
    if (suppressAutoAdd) {
      return;
    }
    if (item.presets.length === 0) {
      if (item.elementType === "section") {
        const tpl = item.sectionTemplate ?? "blank";
        if (tpl === "hero" && onAddSectionTemplate) onAddSectionTemplate("hero");
        else if (onAddSectionTemplate && tpl === "blank") onAddSectionTemplate("blank");
        else onAddSection();
      } else onAddElement(item.elementType as EditorElementType);
    }
  };

  const isFrameVariantRow = false; // Frame now uses visual PresetPreview like other elements

  const showPresetPreview =
    !!presetForPreview &&
    forceAddWithPreset &&
    [
      "button",
      "text",
      "headline",
      "paragraph",
      "list",
      "shape",
      "icon",
      "gallery",
      "carousel",
      "menu",
      "form",
      "divider",
      "countdown",
      "rating",
      "progress",
      "frame",
    ].includes(item.elementType);

  const rowTitle =
    item.elementType === "frame" && forceAddWithPreset && presetForPreview
      ? `${presetForPreview.name} — Kéo hoặc nhấn để thêm khung mẫu (có dữ liệu mẫu).`
      : item.elementType === "product-detail"
      ? `${item.name} — Thêm khối chi tiết sản phẩm (có dữ liệu mẫu trên canvas). Kéo hoặc nhấn.`
      : item.elementType === "collection-list"
        ? `${item.name} — Thêm lưới danh sách sản phẩm (có dữ liệu mẫu). Kéo hoặc nhấn.`
        : isSectionTool
          ? "Nhấn để thêm section (khối Section không kéo thả vào canvas)"
          : item.elementType === "cart" || item.elementType === "blog-list" || item.elementType === "blog-detail"
            ? "Khối dữ liệu (sản phẩm / giỏ / blog): kéo vào canvas hoặc nhấn để thêm — chỉnh ở panel phải."
            : "Giữ chuột và kéo vào trang để thả; hoặc nhấn để thêm / chọn mẫu";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition touch-none select-none ${
        isSectionTool ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-50" : isActive && !isFrameVariantRow ? "bg-slate-100 text-[#1e2d7d] font-medium" : "text-slate-600 hover:bg-slate-50"} ${surfaceClassName ?? ""}`}
      title={rowTitle}
    >
      <span className="shrink-0 p-0.5 rounded pointer-events-none" aria-hidden>
        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </span>
      <button
        type="button"
        onClick={handleClick}
        className={`flex min-w-0 flex-1 cursor-inherit gap-2.5 text-left ${showPresetPreview || isFrameVariantRow ? "items-start" : "items-center"}`}
      >
        {isFrameVariantRow ? (
          <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/90 flex items-center justify-center shadow-sm">
            <LayoutTemplate className="w-[18px] h-[18px] text-[#1e2d7d]" strokeWidth={1.75} />
          </div>
        ) : showPresetPreview && presetForPreview ? (
          <PresetPreview preset={presetForPreview} elementType={item.elementType} />
        ) : (
          getLucideIcon(item.icon, "w-4 h-4 shrink-0 text-slate-500")
        )}
        {isFrameVariantRow && presetForPreview ? (
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">{presetForPreview.name}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Dữ liệu mẫu · kéo hoặc nhấn</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-left text-[11px] leading-snug line-clamp-2 break-words" title={item.name}>
            {item.name}
          </span>
        )}
      </button>
    </div>
  );
}

export function DroppableCanvas({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`relative ${isOver ? "ring-2 ring-[#1e2d7d] ring-inset rounded" : ""}`}>
      {children}
    </div>
  );
}

export function EditorDndProvider({
  children,
  onDropFromTool,
  canvasContainerRef,
  sections,
  zoom,
  canvasWidth,
}: {
  children: React.ReactNode;
  onDropFromTool: (sectionId: number, elType: EditorElementType, x: number, y: number, preset?: ElementPresetData) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  sections: EditorSection[];
  zoom: number;
  canvasWidth: number;
}) {
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Kéo sau khi di chuyển vài px (giữ chuột + kéo); không bắt chờ 100ms như delay
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragStart = useCallback((_e: DragStartEvent) => {
    pointerRef.current = null;
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || over.id !== "canvas-drop") return;

      const data = active.data.current;
      if (!data || data.type !== "tool-item") return;

      const container = canvasContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const activeRect = active.rect.current;
      if (!activeRect) return;
      const translated = activeRect.translated;
      if (!translated) return;

      const centerX = translated.left + translated.width / 2;
      const centerY = translated.top + translated.height / 2;

      const canvasX = (centerX - rect.left) / zoom;
      const canvasY = (centerY - rect.top) / zoom;

      const found = findSectionAtY(sections, canvasY);
      if (!found) return;

      const { section, localY } = found;
      const x = Math.max(0, Math.min(canvasX, canvasWidth - 50));
      const y = Math.max(0, localY);

      onDropFromTool(section.id, data.elementType, x, y, data.preset);
    },
    [canvasContainerRef, onDropFromTool, sections, zoom]
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
