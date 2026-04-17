/**
 * DomCanvas – DOM-based canvas renderer (replaces Fabric.js canvas).
 * Elements are absolutely positioned at their actual pixel coordinates
 * within each section div. Zoom is applied via CSS transform: scale(zoom)
 * on the outer container, so editor and preview always match perfectly.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/stores/editor/editorStore";
import type { EditorElement, EditorSection } from "@/types/editor";
import { getIconById } from "@/lib/editor/data/iconData";
import { ElementActionToolbar, MultiSelectionToolbar } from "./ElementActionToolbar";
import { fetchFontList } from "@/lib/editor/fontLoader";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { mergeCarouselStyle, parseTabsContent, parseCarouselContent } from "@/lib/editor/tabsContent";
import { parsePopupContent } from "@/lib/editor/blogContent";
import { parseFrameContent, getFrameCanvasScale } from "@/lib/editor/frameContent";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

/** Tìm section + offset Y tuyệt đối của phần tử trên canvas */
function findElementMeta(
  sections: EditorSection[],
  elementId: number,
): { section: EditorSection; el: EditorElement; sectionY: number } | null {
  let y = 0;
  for (const s of sections) {
    if (s.visible === false) continue;
    const el = s.elements.find((e) => e.id === elementId);
    if (el) return { section: s, el, sectionY: y };
    y += s.height ?? 600;
  }
  return null;
}

// ─── GalleryPreview — interactive gallery với slideshow + thumbnail ─────────
function GalleryPreview({ el }: { el: EditorElement }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const s = el.styles ?? {};

  let urls: string[] = [];
  try {
    const p = JSON.parse(el.content || "[]");
    if (Array.isArray(p)) urls = p.filter((u): u is string => typeof u === "string");
  } catch {}

  const showThumbs       = Number(s.showThumbnails ?? 1) !== 0;
  const thumbPos         = (s.thumbnailPosition as string) || "bottom";
  const thumbW           = Number(s.thumbWidth ?? 80);
  const thumbH           = Number(s.thumbHeight ?? 60);
  const thumbGap         = Number(s.thumbGap ?? 6);
  const galleryGap       = Number(s.galleryGap ?? 8);
  const showArrows       = Number(s.showArrows ?? 1) !== 0;
  const showDots         = Number(s.showDots ?? 0) !== 0;
  const autoPlay         = Number(s.autoPlay ?? 1) !== 0;
  const autoPlaySpeed    = Number(s.autoPlaySpeed ?? 5) * 1000;
  const borderRadius     = Number(s.borderRadius ?? 8);
  const thumbRadius      = Number(s.thumbnailBorderRadius ?? 4);
  const objFit           = (s.mainObjectFit as string) || "cover";
  const transition       = (s.transition as string) || "fade";
  const total            = urls.length;

  const goTo = useCallback((n: number) => setActiveIdx((n + total) % total), [total]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || total <= 1) return;
    timerRef.current = setInterval(() => setActiveIdx((i) => (i + 1) % total), autoPlaySpeed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlay, autoPlaySpeed, total]);

  const fill: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };

  if (urls.length === 0) {
    return (
      <div style={{ ...fill, background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius, opacity: el.opacity ?? 1 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Gallery — chưa có ảnh</span>
      </div>
    );
  }

  const isHoriz = thumbPos === "top" || thumbPos === "bottom";
  const flexDir: React.CSSProperties["flexDirection"] = thumbPos === "top" ? "column-reverse" : thumbPos === "left" ? "row-reverse" : thumbPos === "right" ? "row" : "column";

  // Arrows
  const ArrowBtn = ({ dir }: { dir: "prev" | "next" }) => (
    <button
      type="button"
      onPointerDown={(e) => { e.stopPropagation(); goTo(activeIdx + (dir === "prev" ? -1 : 1)); }}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [dir === "prev" ? "left" : "right"]: 8,
        zIndex: 2, width: 32, height: 32, borderRadius: "50%",
        background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, lineHeight: 1,
      }}
    >{dir === "prev" ? "‹" : "›"}</button>
  );

  // Main image area
  const mainArea = (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, position: "relative", borderRadius, overflow: "hidden", flexShrink: 1 }}>
      {transition === "fade"
        ? urls.map((u, i) => (
            <img key={i} src={resolveAsset(u)} alt="" draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objFit as React.CSSProperties["objectFit"], display: "block", opacity: i === activeIdx ? 1 : 0, transition: "opacity 0.45s ease" }} />
          ))
        : (
            <img src={resolveAsset(urls[activeIdx])} alt="" draggable={false}
              style={{ width: "100%", height: "100%", objectFit: objFit as React.CSSProperties["objectFit"], display: "block" }} />
          )
      }
      {showArrows && total > 1 && <><ArrowBtn dir="prev" /><ArrowBtn dir="next" /></>}
      {showDots && total > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 2 }}>
          {urls.map((_, i) => (
            <button key={i} type="button" onPointerDown={(e) => { e.stopPropagation(); goTo(i); }}
              style={{ width: i === activeIdx ? 20 : 8, height: 8, borderRadius: 4, background: i === activeIdx ? "#fff" : "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", transition: "all 0.25s ease", padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  );

  // Thumbnail strip
  const thumbStrip = showThumbs && total > 1 && (
    <div style={{ display: "flex", flexDirection: isHoriz ? "row" : "column", gap: thumbGap, overflow: "auto", flexShrink: 0, padding: 2 }}>
      {urls.map((u, i) => (
        <div key={i} onPointerDown={(e) => { e.stopPropagation(); goTo(i); }}
          style={{
            width: thumbW, height: thumbH, borderRadius: thumbRadius, overflow: "hidden", flexShrink: 0, cursor: "pointer",
            border: i === activeIdx ? "2px solid #4f46e5" : "2px solid transparent",
            transition: "border-color 0.2s", boxSizing: "border-box", opacity: i === activeIdx ? 1 : 0.65,
          }}>
          <img src={resolveAsset(u)} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ ...fill, display: "flex", flexDirection: flexDir, gap: galleryGap, padding: 4, boxSizing: "border-box", borderRadius, overflow: "hidden", opacity: el.opacity ?? 1 }}>
      {mainArea}
      {thumbStrip}
    </div>
  );
}

// ─── Helpers for ProductDetailPreview ───────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  "đen": "#1a1a1a", "den": "#1a1a1a",
  "trắng": "#f5f5f5", "trang": "#f5f5f5", "trắng kem": "#faf6ee", "trang kem": "#faf6ee",
  "đỏ": "#dc2626", "do": "#dc2626",
  "xanh": "#3b82f6", "xanh lá": "#22c55e", "xanh la": "#22c55e", "xanh dương": "#2563eb", "xanh navy": "#1e3a5f",
  "navy": "#1e3a5f", "hồng": "#f472b6", "hong": "#f472b6", "hồng đậu": "#b5505b", "hong dau": "#b5505b",
  "vàng": "#f59e0b", "vang": "#f59e0b", "cam": "#f97316", "tím": "#8b5cf6", "tim": "#8b5cf6",
  "xám": "#9ca3af", "xam": "#9ca3af", "nâu": "#92400e", "nau": "#92400e",
  "bạc": "#cbd5e1", "bac": "#cbd5e1", "vàng đồng": "#d4a017", "vang dong": "#d4a017",
};
function resolveColor(name: string): string | null {
  return COLOR_MAP[name.toLowerCase().trim()] ?? null;
}

// ─── ProductDetailPreview — modern e-commerce card ───────────────────────────
function ProductDetailPreview({ el }: { el: EditorElement }) {
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const pd = parseProductDetailContent(el.content ?? undefined);
  const s = el.styles ?? {};
  const fill: React.CSSProperties = { position: "absolute", inset: 0 };

  const isHorizontal = pd.layout === "horizontal";
  const bg = (s.backgroundColor as string) || "#ffffff";
  const radius = pd.cardRadius ?? (s.borderRadius as number) ?? 8;
  const imgRadius = pd.imageRadius ?? 4;
  const accent = pd.accentColor || "#ee4d2d";
  const bxShadow = (s.boxShadow as string) || "0 1px 8px rgba(0,0,0,0.08)";

  const buyBtnBg = (s.buyButtonBg as string) || pd.buyButtonBgColor || accent;
  const buyBtnColor = (s.buyButtonColor as string) || "#ffffff";
  const buyBtnRadius2 = (s.buyButtonRadius as number) ?? 2;
  const cartBtnBg = (s.cartButtonBg as string) || pd.cartButtonBgColor || "#fff3f0";
  const cartBtnColor2 = (s.cartButtonColor as string) || accent;
  const cartBtnBorder = (s.cartButtonBorderColor as string) || accent;
  const cartBtnRadius2 = (s.cartButtonRadius as number) ?? 2;
  const btnFontSize = (s.buttonFontSize as number) || 11;
  const btnPaddingV = (s.buttonPaddingV as number) ?? 8;

  const images = pd.images.filter(Boolean);
  const hasImages = images.length > 0;

  const stockInfo = {
    instock: { color: "#16a34a", label: pd.stockText || "Còn hàng" },
    limited: { color: "#d97706", label: pd.stockText || "Sắp hết hàng" },
    outofstock: { color: "#dc2626", label: pd.stockText || "Hết hàng" },
  }[pd.stockStatus] ?? { color: "#16a34a", label: "Còn hàng" };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < Math.round(rating) ? "#f59e0b" : "#d1d5db", fontSize: 10 }}>★</span>
    ));

  const salePriceDisplay = (pd.salePrice && pd.salePrice !== "0đ") ? pd.salePrice : pd.price || "—";
  const showOrigPrice = pd.salePrice && pd.price && pd.salePrice !== pd.price && pd.salePrice !== "0đ";

  // ── Thumbnail strip (shared, rendered OUTSIDE imageCol in vertical layout) ──
  const thumbStrip = images.length > 1 ? (
    <div style={{
      display: "flex",
      flexDirection: isHorizontal ? "column" : "row",
      gap: 4,
      width: isHorizontal ? 52 : "100%",
      height: isHorizontal ? "100%" : 52,
      flexShrink: 0,
      overflow: "hidden",
      padding: isHorizontal ? 0 : "2px 0",
    }}>
      {images.map((url, i) => (
        <div key={i} onClick={() => setActiveImg(i)}
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: imgRadius,
            overflow: "hidden",
            border: `2px solid ${i === activeImg ? accent : "#e0e0e0"}`,
            cursor: "pointer",
            background: "#f8f8f8",
            transition: "border .15s",
            boxShadow: i === activeImg ? `0 0 0 1px ${accent}` : "none",
          }}>
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ))}
    </div>
  ) : null;

  // ── Image column (main image only, no thumbnails for vertical layout) ──
  const imageCol = (
    <div style={{
      display: "flex",
      flexDirection: isHorizontal ? "row" : "column",
      width: isHorizontal ? "44%" : "100%",
      height: isHorizontal ? "100%" : "40%",
      flexShrink: 0,
      gap: isHorizontal ? 4 : 0,
      padding: isHorizontal ? "8px 0 8px 8px" : 0,
      boxSizing: "border-box",
      position: "relative",
    }}>
      {/* Main image */}
      <div style={{ position: "relative", flex: 1, background: "#f8f8f8", borderRadius: imgRadius, overflow: "hidden", minHeight: 0 }}>
        {hasImages ? (
          images.map((url, i) => (
            <img key={i} src={url} alt="" draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === activeImg ? 1 : 0, transition: "opacity .22s" }} />
          ))
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 11 }}>Ảnh SP</div>
        )}

        {/* Badge */}
        {pd.showBadge && pd.badge && (
          <span style={{ position: "absolute", top: 6, left: 6, background: accent, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 2, zIndex: 2 }}>
            {pd.badge}
          </span>
        )}

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
              style={{ position: "absolute", left: 3, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", fontSize: 15, lineHeight: "22px", textAlign: "center", color: "#333", zIndex: 2, padding: 0 }}>‹</button>
            <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
              style={{ position: "absolute", right: 3, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", fontSize: 15, lineHeight: "22px", textAlign: "center", color: "#333", zIndex: 2, padding: 0 }}>›</button>
          </>
        )}
      </div>

      {/* In horizontal layout: thumbs inside imageCol (vertical strip on right) */}
      {isHorizontal && thumbStrip}
    </div>
  );

  // ── Info column ──
  const infoCol = (
    <div style={{
      flex: 1,
      padding: isHorizontal ? "10px 10px 10px 8px" : "8px 12px 10px",
      display: "flex",
      flexDirection: "column",
      gap: isHorizontal ? 5 : 5,
      overflow: "hidden",
      minHeight: 0,
      minWidth: 0,
      boxSizing: "border-box",
    }}>
      {/* Category label */}
      {pd.category && !isHorizontal && (
        <div style={{ fontSize: 9, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {pd.category}
        </div>
      )}

      {/* Title */}
      <div style={{ fontSize: isHorizontal ? 13 : 14, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.35, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: isHorizontal ? 3 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {pd.title}
      </div>

      {/* Rating + sold */}
      {pd.showRating && pd.rating > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 1 }}>{renderStars(pd.rating)}</div>
          <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11 }}>{pd.rating.toFixed(1)}</span>
          {pd.reviewCount > 0 && <span style={{ fontSize: 10, color: "#999" }}>({pd.reviewCount.toLocaleString()})</span>}
          {pd.totalSold > 0 && <span style={{ fontSize: 10, color: "#999", borderLeft: "1px solid #e0e0e0", paddingLeft: 5 }}>{pd.totalSold.toLocaleString()} đã bán</span>}
        </div>
      )}

      {/* Price row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", background: "#fafafa", padding: "5px 8px", borderRadius: 4, margin: "0 -2px" }}>
        <span style={{ fontSize: isHorizontal ? 17 : 16, fontWeight: 800, color: accent, lineHeight: 1 }}>{salePriceDisplay}</span>
        {showOrigPrice && (
          <span style={{ fontSize: 10, color: "#aaa", textDecoration: "line-through" }}>{pd.price}</span>
        )}
      </div>

      {/* Variants */}
      {pd.showVariants && pd.variants.map((v, vi) => (
        <div key={vi} style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#333", marginBottom: 4 }}>
            {v.label}:{" "}
            <span style={{ fontWeight: 400, color: "#555" }}>{v.options[0]}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {v.options.slice(0, 8).map((opt, oi) => {
              const cssColor = v.type === "color" ? resolveColor(opt) : null;
              if (cssColor) {
                return (
                  <div key={oi} title={opt}
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: cssColor,
                      border: `2px solid ${oi === 0 ? accent : "#ddd"}`,
                      cursor: "pointer",
                      flexShrink: 0,
                      boxShadow: oi === 0 ? `0 0 0 1px ${accent}` : "none",
                    }} />
                );
              }
              return (
                <span key={oi} style={{
                  fontSize: 10, padding: "3px 8px",
                  borderRadius: 2,
                  border: `1px solid ${oi === 0 ? accent : "#ddd"}`,
                  background: oi === 0 ? "#fff" : "#fafafa",
                  color: oi === 0 ? accent : "#555",
                  fontWeight: oi === 0 ? 700 : 400,
                  cursor: "pointer",
                }}>{opt}</span>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quantity + stock */}
      {pd.showQuantity && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#555" }}>Số lượng:</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              style={{ width: 24, height: 24, border: "none", background: "#f5f5f5", cursor: "pointer", fontSize: 14, lineHeight: "24px", color: "#444", flexShrink: 0 }}>−</button>
            <span style={{ width: 30, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#222", lineHeight: "24px" }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}
              style={{ width: 24, height: 24, border: "none", background: "#f5f5f5", cursor: "pointer", fontSize: 14, lineHeight: "24px", color: "#444", flexShrink: 0 }}>+</button>
          </div>
          {pd.stockText && <span style={{ fontSize: 9, color: stockInfo.color, fontWeight: 600 }}>{stockInfo.label}</span>}
        </div>
      )}

      {/* Description */}
      {pd.showDescription && pd.description && (
        <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {pd.description}
        </div>
      )}

      {/* Features */}
      {pd.showFeatures && pd.features.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          {pd.features.slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 5, fontSize: 10, color: "#555", lineHeight: 1.5 }}>
              <span style={{ color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {pd.showActions && (
        <div style={{ marginTop: isHorizontal ? "auto" : 6, display: "flex", gap: 6, flexShrink: 0, paddingTop: 4, borderTop: "1px solid #f0f0f0" }}>
          {pd.addCartText && (
            <div style={{
              flex: 1, padding: `${btnPaddingV}px 6px`,
              border: `1.5px solid ${cartBtnBorder}`,
              borderRadius: cartBtnRadius2,
              background: cartBtnBg,
              color: cartBtnColor2,
              fontWeight: 700, fontSize: btnFontSize,
              textAlign: "center", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
              whiteSpace: "nowrap", overflow: "hidden",
              boxSizing: "border-box",
              flexShrink: 1, minWidth: 0,
            }}>
              🛒 {pd.addCartText}
            </div>
          )}
          <div style={{
            flex: pd.addCartText ? 1.2 : 2,
            padding: `${btnPaddingV}px 6px`,
            background: buyBtnBg,
            borderRadius: buyBtnRadius2,
            color: buyBtnColor,
            fontWeight: 700, fontSize: btnFontSize,
            textAlign: "center", cursor: "pointer",
            whiteSpace: "nowrap", overflow: "hidden",
            boxSizing: "border-box",
            flexShrink: 1, minWidth: 0,
          }}>
            {pd.buyButtonText}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      ...fill,
      background: bg,
      borderRadius: radius,
      boxShadow: bxShadow,
      display: "flex",
      flexDirection: isHorizontal ? "row" : "column",
      overflow: "hidden",
      opacity: el.opacity ?? 1,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      {imageCol}
      {/* In vertical layout: thumbs appear BELOW image, ABOVE info (matching HTML preview) */}
      {!isHorizontal && thumbStrip}
      {infoCol}
    </div>
  );
}

// --- CarouselPreview - interactive carousel cho DomCanvas ---
function CarouselPreview({
  el,
  onSelectCarouselTextField,
}: {
  el: EditorElement;
  onSelectCarouselTextField?: (field: "quote" | "name" | "role" | "title" | "desc") => void;
}) {
  const s = el.styles ?? {};
  const updateElementFromStore = useEditorStore((st) => st.updateElement);
  const pushHistoryFromStore = useEditorStore((st) => st.pushHistory);
  const cd = parseCarouselContent(el.content ?? undefined);
  const { items: carouselItems } = cd;
  const lt = cd.layoutType;
  const st2 = mergeCarouselStyle(cd.carouselStyle);
  const bg = (s.backgroundColor as string) || "#f8fafc";
  const br = s.borderRadius != null ? Number(s.borderRadius) : 12;
  const autoplayMs = Math.max(1000, st2.autoplayMs ?? 5000);
  const n = carouselItems.length;

  const [cur, setCur] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchXRef = useRef(0);

  useEffect(() => { setCur(0); }, [el.content]);

  const go = useCallback((idx: number) => { setCur(((idx % n) + n) % n); }, [n]);

  const resetAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (n > 1) timerRef.current = setInterval(() => setCur((c) => (c + 1) % n), autoplayMs);
  }, [n, autoplayMs]);

  useEffect(() => {
    resetAutoplay();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetAutoplay]);

  const handleGo = (idx: number) => { go(idx); resetAutoplay(); };

  const commitCarouselText = (field: string, value: string) => {
    const next = [...carouselItems];
    if (next[cur]) { next[cur] = { ...next[cur], [field]: value }; }
    updateElementFromStore(el.id, { content: JSON.stringify({ layoutType: cd.layoutType, items: next, carouselStyle: cd.carouselStyle }) });
    pushHistoryFromStore();
  };

  const fill: React.CSSProperties = { position: "absolute", inset: 0, boxSizing: "border-box" };
  const ff = st2.fontFamily ? `${st2.fontFamily}, sans-serif` : undefined;

  if (n === 0 || !carouselItems[cur]) {
    return (
      <div style={{ ...fill, background: bg, borderRadius: br, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>Carousel - them slide o panel phai</span>
      </div>
    );
  }

  const item = carouselItems[cur];
  const stripQ = (str: string) => str.replace(/^["\u201c\u2018']+|["\u201d\u2019']+$/g, "").trim();

  const editDiv = (field: string, value: string, style: React.CSSProperties) => (
    <div
      contentEditable suppressContentEditableWarning
      onFocus={() => onSelectCarouselTextField?.(field as "quote" | "name" | "role" | "title" | "desc")}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => commitCarouselText(field, e.currentTarget.textContent || "")}
      style={{ outline: "none", cursor: "text", fontFamily: ff, ...style }}
    >
      {value}
    </div>
  );

  const Stars = ({ rating }: { rating?: number }) => {
    if (!st2.showRating || !rating) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ fontSize: 14, color: i <= rating ? st2.ratingColor : "#d1d5db" }}>{"\u2605"}</span>
        ))}
      </div>
    );
  };

  const renderTestimonial = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%",
      padding: n > 1 ? "0 36px" : "0 8px", boxSizing: "border-box" }}>
      {item.avatar?.trim() && (
        <div style={{ width: 68, height: 68, borderRadius: "50%", overflow: "hidden",
          background: "#e2e8f0", marginBottom: 10, flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,.12)" }}>
          <img src={item.avatar} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <Stars rating={item.rating} />
      {editDiv("quote", `"${stripQ(item.quote || "Trich dan nguoi dung...")}"`, {
        fontStyle: "italic", fontSize: st2.quoteFontSize, color: st2.quoteColor,
        textAlign: st2.quoteAlign, lineHeight: 1.7, marginBottom: 8, padding: "0 2px",
      })}
      {editDiv("name", item.name || "Ten nguoi dung", {
        fontSize: st2.nameFontSize, fontWeight: 700, color: st2.nameColor,
        textAlign: st2.nameAlign, marginTop: 4, lineHeight: 1.3,
      })}
      {item.role != null && editDiv("role", item.role || "", {
        fontSize: st2.roleFontSize, color: st2.roleColor,
        textAlign: st2.roleAlign, opacity: 0.8, lineHeight: 1.3,
      })}
    </div>
  );

  const renderMedia = () => (
    <div style={{ display: "flex", flexDirection: "column", width: "100%",
      padding: n > 1 ? "0 36px" : "0", boxSizing: "border-box" }}>
      {item.image?.trim() && (
        <div style={{ width: "100%", borderRadius: 8, overflow: "hidden",
          background: "#e2e8f0", marginBottom: 10, aspectRatio: "16/9" }}>
          <img src={item.image} alt="" draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}
      {(item.title || item.name) && editDiv("title", item.title || item.name || "", {
        fontSize: st2.titleFontSize, fontWeight: 700, color: st2.titleColor,
        textAlign: st2.titleAlign, lineHeight: 1.3, marginBottom: 4,
      })}
      {item.desc?.trim() && editDiv("desc", item.desc, {
        fontSize: st2.descFontSize, color: st2.descColor,
        textAlign: st2.descAlign, lineHeight: 1.5,
      })}
    </div>
  );

  const renderHero = () => {
    const heroBg = item.bgImage?.trim()
      ? `url(${item.bgImage}) center/cover no-repeat`
      : item.bgColor?.trim() || bg;
    return (
      <div style={{ position: "absolute", inset: 0, background: heroBg, borderRadius: br, overflow: "hidden" }}>
        {item.bgImage?.trim() && (
          <div style={{ position: "absolute", inset: 0, background: st2.overlayColor, opacity: st2.overlayOpacity }} />
        )}
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 48px", boxSizing: "border-box", gap: 8 }}>
          {editDiv("title", item.title || "Tieu de hero", {
            fontSize: Math.max(16, st2.titleFontSize + 4), fontWeight: 800, color: "#ffffff",
            textAlign: st2.titleAlign, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,.4)",
          })}
          {item.subtitle?.trim() && editDiv("subtitle", item.subtitle, {
            fontSize: st2.descFontSize + 1, color: "rgba(255,255,255,0.88)",
            textAlign: st2.descAlign, lineHeight: 1.5,
          })}
          {item.btnText?.trim() && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <span style={{ background: st2.btnBg, color: st2.btnColor, padding: "7px 22px",
                borderRadius: st2.btnRadius, fontSize: 12, fontWeight: 700, fontFamily: ff }}>
                {item.btnText}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLogos = () => (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center",
      alignItems: "center", gap: 16, padding: "8px 16px", width: "100%", boxSizing: "border-box" }}>
      {carouselItems.slice(0, 8).map((logo, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center",
          opacity: i === cur ? 1 : 0.45, transition: "opacity .2s" }}>
          {logo.image?.trim() ? (
            <img src={logo.image} alt={logo.name || ""} draggable={false}
              style={{ height: st2.logoHeight, maxWidth: 120, objectFit: "contain", display: "block",
                filter: st2.logoGrayscale ? "grayscale(1)" : "none" }} />
          ) : (
            <div style={{ width: 80, height: st2.logoHeight, background: "#e2e8f0", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{logo.name || "Logo"}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCards = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%",
      padding: n > 1 ? "0 36px" : "0 8px", boxSizing: "border-box" }}>
      <div style={{ background: st2.cardBg, borderRadius: st2.cardRadius, padding: "14px",
        width: "100%", boxShadow: "0 2px 12px rgba(0,0,0,.06)", boxSizing: "border-box" }}>
        {item.image?.trim() && (
          <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden",
            background: "#e2e8f0", marginBottom: 10 }}>
            <img src={item.image} alt="" draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}
        {editDiv("title", item.title || "Tieu de", {
          fontSize: st2.titleFontSize, fontWeight: 700, color: st2.titleColor,
          textAlign: st2.titleAlign, lineHeight: 1.3, marginBottom: 6,
        })}
        {item.desc?.trim() && editDiv("desc", item.desc, {
          fontSize: st2.descFontSize, color: st2.descColor,
          textAlign: st2.descAlign, lineHeight: 1.5,
        })}
      </div>
    </div>
  );

  const renderStats = () => (
    <div style={{ display: "flex", justifyContent: "center", gap: 24,
      flexWrap: "wrap", padding: "8px 16px", width: "100%", boxSizing: "border-box" }}>
      {carouselItems.map((stat, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          opacity: i === cur ? 1 : 0.55, transition: "opacity .2s" }}>
          <span style={{ fontSize: st2.numberFontSize, fontWeight: 800, color: st2.numberColor,
            fontFamily: ff, lineHeight: 1 }}>
            {stat.number || stat.title || "0"}
          </span>
          <span style={{ fontSize: 11, color: st2.labelColor, fontFamily: ff }}>
            {stat.label || stat.desc || ""}
          </span>
        </div>
      ))}
    </div>
  );

  // ── product / multi-slide layout ──────────────────────────────────────────
  const renderProduct = () => {
    const spv = Math.max(1, Math.round(st2.slidesPerView ?? 3));
    const gap = st2.slideGap ?? 12;
    const showCap = st2.showCaption ?? false;
    // translateX for current "page": scroll 1 slide at a time
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
        <div style={{
          display: "flex",
          gap: gap,
          transition: `transform ${st2.transitionMs}ms ease`,
          transform: `translateX(calc(-${cur} * (calc((100% - ${gap * (spv - 1)}px) / ${spv}) + ${gap}px)))`,
          willChange: "transform",
          height: "100%",
          alignItems: "stretch",
        }}>
          {carouselItems.map((it, i) => (
            <div key={i} style={{
              flexShrink: 0,
              width: `calc((100% - ${gap * (spv - 1)}px) / ${spv})`,
              borderRadius: st2.cardRadius,
              overflow: "hidden",
              background: st2.cardBg,
              boxShadow: "0 2px 10px rgba(0,0,0,.08)",
              display: "flex",
              flexDirection: "column",
              transition: `box-shadow .2s`,
            }}>
              {it.image?.trim() ? (
                <div style={{ flex: 1, overflow: "hidden", background: "#f1f5f9" }}>
                  <img
                    src={it.image}
                    alt={it.title || ""}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Slide {i + 1}</span>
                </div>
              )}
              {showCap && (it.title || it.desc) && (
                <div style={{ padding: "8px 10px", background: st2.cardBg }}>
                  {it.title && <div style={{ fontSize: st2.titleFontSize - 2, fontWeight: 600, color: st2.titleColor, fontFamily: ff, lineHeight: 1.3 }}>{it.title}</div>}
                  {it.desc && <div style={{ fontSize: st2.descFontSize - 1, color: st2.descColor, fontFamily: ff, marginTop: 3, lineHeight: 1.4 }}>{it.desc}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isHero = lt === "hero";
  const isLogos = lt === "logos";
  const isStats = lt === "stats";
  const isCards = lt === "cards";
  const isTestimonial = lt === "testimonial";
  const isProduct = lt === "product";

  const dotH = st2.dotStyle === "bar" ? 3 : 7;
  const getDotW = (active: boolean) => st2.dotStyle === "circle" ? 7 : active ? 24 : 7;
  const getDotR = () => st2.dotStyle === "bar" ? 2 : 4;

  const arrowBase: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    zIndex: 10, border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    background: isHero ? "rgba(255,255,255,0.2)" : st2.arrowBg,
    color: isHero ? "#fff" : st2.arrowColor,
    fontSize: 20, lineHeight: 1,
    width: st2.arrowStyle === "minimal" ? 24 : 32,
    height: st2.arrowStyle === "minimal" ? 24 : 32,
    borderRadius: st2.arrowStyle === "pill" ? "4px" : "50%",
    boxShadow: st2.arrowStyle !== "minimal" ? "0 1px 4px rgba(0,0,0,.15)" : "none",
  };

  return (
    <div
      style={{ ...fill, background: isHero ? "transparent" : bg, borderRadius: br,
        overflow: isHero || isProduct ? "hidden" : "visible", opacity: el.opacity ?? 1 }}
      onTouchStart={(e) => { touchXRef.current = e.changedTouches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchXRef.current;
        if (Math.abs(dx) > 40) { handleGo(dx < 0 ? cur + 1 : cur - 1); }
      }}
    >
      {isProduct ? (
        <>
          {renderProduct()}
          {/* Product arrows — overlay on left/right edges */}
          {st2.showArrows && n > (st2.slidesPerView ?? 3) && (
            <>
              <button type="button" aria-label="Slide truoc"
                onPointerDown={(e) => { e.stopPropagation(); handleGo(cur - 1); }}
                style={{ ...arrowBase, left: 4 }}>&#8249;</button>
              <button type="button" aria-label="Slide tiep"
                onPointerDown={(e) => { e.stopPropagation(); handleGo(cur + 1); }}
                style={{ ...arrowBase, right: 4 }}>&#8250;</button>
            </>
          )}
          {st2.showDots && n > (st2.slidesPerView ?? 3) && (
            <div style={{ position: "absolute", bottom: 6, left: 0, right: 0,
              display: "flex", gap: 4, justifyContent: "center" }}>
              {Array.from({ length: Math.max(0, n - (st2.slidesPerView ?? 3) + 1) }).map((_, di) => (
                <button key={di} type="button"
                  onPointerDown={(e) => { e.stopPropagation(); handleGo(di); }}
                  style={{ width: getDotW(di === cur), height: dotH, borderRadius: getDotR(),
                    background: di === cur ? st2.dotActiveColor : st2.dotColor,
                    border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
                    transition: "width .25s, background .25s" }}
                />
              ))}
            </div>
          )}
        </>
      ) : isHero ? renderHero() : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", width: "100%", height: "100%",
          padding: isLogos || isStats ? "0" : "14px 0 10px",
          boxSizing: "border-box", overflow: "hidden" }}>
          {isTestimonial && renderTestimonial()}
          {lt === "media" && renderMedia()}
          {isCards && renderCards()}
          {isLogos && renderLogos()}
          {isStats && renderStats()}

          {!isLogos && !isStats && st2.showDots && n > 1 && (
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 10, flexShrink: 0 }}>
              {carouselItems.slice(0, 12).map((_, di) => (
                <button key={di} type="button"
                  onPointerDown={(e) => { e.stopPropagation(); handleGo(di); }}
                  style={{ width: getDotW(di === cur), height: dotH, borderRadius: getDotR(),
                    background: di === cur ? st2.dotActiveColor : st2.dotColor,
                    border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
                    transition: "width .25s, background .25s" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isHero && st2.showDots && n > 1 && (
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0,
          display: "flex", gap: 6, justifyContent: "center" }}>
          {carouselItems.slice(0, 12).map((_, di) => (
            <button key={di} type="button"
              onPointerDown={(e) => { e.stopPropagation(); handleGo(di); }}
              style={{ width: getDotW(di === cur), height: dotH, borderRadius: getDotR(),
                background: di === cur ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                border: "none", cursor: "pointer", padding: 0, transition: "width .25s" }}
            />
          ))}
        </div>
      )}

      {!isLogos && !isStats && !isProduct && st2.showArrows && n > 1 && (
        <>
          <button type="button" aria-label="Slide truoc"
            onPointerDown={(e) => { e.stopPropagation(); handleGo(cur - 1); }}
            style={{ ...arrowBase, left: isHero ? 10 : 4 }}>&#8249;</button>
          <button type="button" aria-label="Slide tiep"
            onPointerDown={(e) => { e.stopPropagation(); handleGo(cur + 1); }}
            style={{ ...arrowBase, right: isHero ? 10 : 4 }}>&#8250;</button>
        </>
      )}
    </div>
  );
}

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
  const iconColor = (s.color as string) || "#4f46e5";
  const size = Math.min(Number(el.width || 48), Number(el.height || 48)) * 0.8;
  const content = el.content ?? "";

  // Iconify format: "prefix:name" (vd: "mdi:home", "logos:facebook")
  if (content.includes(":")) {
    const [prefix, ...rest] = content.split(":");
    const name = rest.join(":");
    const colorParam = iconColor.replace("#", "%23");
    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=${colorParam}`;
    return (
      <div style={{ ...buildElementCss(el), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={svgUrl} alt={name} width={size} height={size} style={{ display: "block" }} />
      </div>
    );
  }

  // Format cũ: Unicode char từ cache
  const iconData = content ? getIconById(content) : null;
  const iconChar = iconData?.char ?? content ?? "★";
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
  let cfg: {
    title?: string;
    titleColor?: string;
    buttonText?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    backgroundColor?: string;
    formBorderRadius?: number;
    inputRadius?: number;
    fields?: { id: string; label?: string; placeholder?: string; type?: string; required?: boolean }[];
    inputStyle?: string;
    formOtp?: boolean;
  } = {};
  try { cfg = JSON.parse(el.content || "{}"); } catch {}

  const fs = (s.fontSize as number) || 14;
  const btnBg = cfg.buttonColor ?? (s.buttonColor as string) ?? "#1e293b";
  const btnText = cfg.buttonTextColor ?? "#ffffff";
  const formBg = cfg.backgroundColor ?? (s.backgroundColor as string) ?? "#ffffff";
  const borderRadius = cfg.formBorderRadius ?? 8;
  const inputRadius = cfg.inputRadius ?? 4;
  const titleColor = cfg.titleColor ?? "#1e293b";

  const inputBase: React.CSSProperties = cfg.inputStyle === "filled"
    ? { background: "#f1f5f9", border: "none", borderRadius: inputRadius }
    : cfg.inputStyle === "underlined"
      ? { background: "transparent", border: "none", borderBottom: "1.5px solid #94a3b8", borderRadius: 0 }
      : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: inputRadius };

  const fields = cfg.fields?.length
    ? cfg.fields
    : [
        { id: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text" },
        { id: "email", label: "Email", placeholder: "Email", type: "email" },
      ];

  const css = buildElementCss(el);

  return (
    <div style={{
      ...css,
      border: `1px solid ${formBg === "#ffffff" ? "#e2e8f0" : "transparent"}`,
      borderRadius,
      padding: 16,
      background: formBg,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {cfg.title && (
        <div style={{ fontSize: fs + 2, fontWeight: 700, color: titleColor, marginBottom: 4 }}>
          {cfg.title}
        </div>
      )}
      {fields.map((f) =>
        f.type === "textarea" ? (
          <textarea
            key={f.id}
            placeholder={f.placeholder || f.label || f.id}
            style={{ width: "100%", padding: "9px 12px", fontSize: fs - 1, ...inputBase, boxSizing: "border-box", resize: "none", height: 64, fontFamily: "inherit" }}
            readOnly
          />
        ) : (
          <input
            key={f.id}
            type={f.type === "phone" ? "tel" : f.type === "password" ? "password" : f.type || "text"}
            placeholder={f.placeholder || f.label || f.id}
            style={{ width: "100%", padding: "9px 12px", fontSize: fs - 1, ...inputBase, boxSizing: "border-box", fontFamily: "inherit" }}
            readOnly
          />
        )
      )}
      {cfg.formOtp && (
        <div style={{ fontSize: fs - 2, color: "#6366f1", textAlign: "center", cursor: "pointer" }}>
          Gửi lại mã OTP
        </div>
      )}
      <div style={{
        width: "100%",
        padding: "11px 16px",
        background: btnBg,
        color: btnText,
        border: "none",
        borderRadius: inputRadius,
        fontWeight: 700,
        fontSize: fs - 1,
        textAlign: "center",
        marginTop: 4,
        cursor: "default",
        letterSpacing: "0.02em",
      }}>
        {cfg.buttonText || "Gửi"}
      </div>
    </div>
  );
}

function HtmlCodeElement({ el }: { el: EditorElement }) {
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  let hc: { code?: string; iframeSrc?: string; subType?: string } = {};
  try { hc = JSON.parse(el.content || "{}"); } catch {}

  const isFullScreen = !!(el.styles as Record<string, unknown> | undefined)?.fullScreen;

  const style: React.CSSProperties = isFullScreen
    ? {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: autoHeight ?? el.height ?? 900,
        border: "none",
      }
    : { ...buildElementCss(el), overflow: "hidden", border: "none" };

  if (hc.subType === "iframe" && hc.iframeSrc?.trim()) {
    return (
      <iframe
        src={hc.iframeSrc.trim()}
        style={style}
        title="Embedded"
        onLoad={(e) => {
          if (isFullScreen) {
            try {
              const frame = e.target as HTMLIFrameElement;
              const h =
                frame.contentWindow?.document.documentElement.scrollHeight ??
                frame.contentWindow?.document.body?.scrollHeight;
              if (h && h > 200) setAutoHeight(h);
            } catch {
              /* cross-origin or not ready */
            }
          }
        }}
      />
    );
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
    menu: "☰ Menu",
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

// ─── Form auto-height preview ────────────────────────────────────────────────
function FormElementPreview({ el }: { el: EditorElement }) {
  const updateEl = useEditorStore((st) => st.updateElement);
  const measureRef = useRef<HTMLDivElement>(null);

  type FormFieldParsed = {
    id: string; label?: string; placeholder?: string; type?: string;
    options?: string[]; required?: boolean;
    min?: number; max?: number; minLabel?: string; maxLabel?: string;
    maxRating?: number; description?: string; accept?: string; maxSizeMb?: number;
  };
  let cfg: {
    title?: string; titleColor?: string; buttonText?: string;
    buttonColor?: string; buttonTextColor?: string; backgroundColor?: string;
    accentColor?: string; formBorderRadius?: number; inputRadius?: number;
    fields?: FormFieldParsed[]; inputStyle?: string;
  } = {};
  try { cfg = JSON.parse(el.content || "{}"); } catch {}

  const s = el.styles ?? {};
  const fs2 = (s.fontSize as number) || 14;
  const ff = s.fontFamily ? `${s.fontFamily}, sans-serif` : undefined;
  const fw = (s.fontWeight as number) || 400;
  const fStyle = (s.fontStyle as string) || "normal";
  const fDeco = (s.textDecoration as string) || "none";
  const fmBg = cfg.backgroundColor ?? (s.backgroundColor as string) ?? "#ffffff";
  const fmBtnBg = cfg.buttonColor ?? "#1e293b";
  const fmBtnText = cfg.buttonTextColor ?? "#ffffff";
  const fmTitleColor = cfg.titleColor ?? (s.color as string) ?? "#1e293b";
  const fmBorderRadius = cfg.formBorderRadius ?? 8;
  const fmInputRadius = cfg.inputRadius ?? 4;
  const fmAccent = cfg.accentColor ?? fmBtnBg;
  const inputStyle = cfg.inputStyle ?? "outlined";

  const inputS: React.CSSProperties = inputStyle === "filled"
    ? { background: fmAccent + "18", border: "none", borderRadius: fmInputRadius }
    : inputStyle === "underlined"
      ? { background: "transparent", border: "none", borderBottom: `1.5px solid ${fmAccent}88`, borderRadius: 0 }
      : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: fmInputRadius };

  const baseInput: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: fs2, fontFamily: ff,
    fontWeight: fw, fontStyle: fStyle, textDecoration: fDeco, color: "#374151",
    ...inputS, boxSizing: "border-box",
  };
  const labelS: React.CSSProperties = { fontSize: fs2 - 2, fontWeight: 500, color: "#374151", fontFamily: ff, marginBottom: 3, display: "block" };

  const fields: FormFieldParsed[] = cfg.fields || [
    { id: "name", label: "Họ và tên", type: "text" },
    { id: "email", label: "Email", type: "email" },
  ];

  // Index of the last textarea — it will grow to fill remaining height
  const lastTextareaIdx = fields.reduce((acc, f, i) => (f.type === "textarea" ? i : acc), -1);

  const renderField = (f: FormFieldParsed, idx: number) => {
    const tp = f.type || "text";
    const lbl = f.label || f.id || "";
    const ph = f.placeholder || lbl;
    const opts = f.options ?? [];
    const reqStar = f.required ? <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span> : null;
    // Last textarea fills remaining vertical space
    const grows = tp === "textarea" && idx === lastTextareaIdx;
    const wrapStyle: React.CSSProperties = {
      display: "flex", flexDirection: "column", gap: 3,
      ...(grows ? { flex: "1 1 auto", minHeight: 60 } : { flexShrink: 0 }),
    };

    if (tp === "section") {
      return (
        <div key={f.id} style={{ flexShrink: 0, paddingBottom: 6, borderBottom: "1.5px solid #e2e8f0" }}>
          <div style={{ fontSize: fs2 + 1, fontWeight: 700, color: "#0f172a", fontFamily: ff }}>{lbl}</div>
          {f.description && <div style={{ fontSize: fs2 - 2, color: "#64748b", marginTop: 2, fontFamily: ff }}>{f.description}</div>}
        </div>
      );
    }
    if (tp === "textarea") {
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <textarea
            readOnly placeholder={ph}
            style={{ ...baseInput, flex: grows ? "1 1 auto" : undefined, minHeight: 56, height: grows ? 0 : undefined, resize: "none" }}
          />
        </div>
      );
    }
    if (tp === "select" || tp === "dropdown") {
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <select style={baseInput}>
            <option>{ph || "Chọn một mục"}</option>
            {opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    if (tp === "radio") {
      return (
        <div key={f.id} style={{ ...wrapStyle, gap: 4 }}>
          <span style={labelS}>{lbl}{reqStar}</span>
          {opts.map((o) => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fs2, fontFamily: ff, color: "#374151", cursor: "default" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${fmAccent}`, flexShrink: 0, display: "inline-block" }} />{o}
            </label>
          ))}
          {opts.length === 0 && <span style={{ fontSize: fs2 - 2, color: "#94a3b8" }}>Chưa có lựa chọn</span>}
        </div>
      );
    }
    if (tp === "checkboxes") {
      return (
        <div key={f.id} style={{ ...wrapStyle, gap: 4 }}>
          <span style={labelS}>{lbl}{reqStar}</span>
          {opts.map((o) => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fs2, fontFamily: ff, color: "#374151", cursor: "default" }}>
              <span style={{ width: 16, height: 16, borderRadius: fmInputRadius, border: "1.5px solid #94a3b8", flexShrink: 0, display: "inline-block" }} />{o}
            </label>
          ))}
          {opts.length === 0 && <span style={{ fontSize: fs2 - 2, color: "#94a3b8" }}>Chưa có lựa chọn</span>}
        </div>
      );
    }
    if (tp === "checkbox") {
      return (
        <label key={f.id} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: fs2, fontFamily: ff, color: "#374151", cursor: "default" }}>
          <span style={{ width: 16, height: 16, borderRadius: fmInputRadius, border: "1.5px solid #94a3b8", flexShrink: 0, display: "inline-block" }} />{lbl}
        </label>
      );
    }
    if (tp === "scale") {
      const scMin = f.min ?? 1;
      const scMax = f.max ?? 5;
      const nums = Array.from({ length: scMax - scMin + 1 }, (_, i) => scMin + i);
      return (
        <div key={f.id} style={{ ...wrapStyle, gap: 4 }}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {nums.map((v) => (
              <div key={v} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${fmAccent}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs2 - 2, color: "#64748b" }}>{v}</div>
              </div>
            ))}
          </div>
          {(f.minLabel || f.maxLabel) && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: fs2 - 3, color: "#94a3b8", fontFamily: ff }}>
              <span>{f.minLabel ?? ""}</span><span>{f.maxLabel ?? ""}</span>
            </div>
          )}
        </div>
      );
    }
    if (tp === "rating") {
      const maxR = f.maxRating ?? 5;
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: maxR }).map((_, i) => <span key={i} style={{ fontSize: 22, color: "#d1d5db", lineHeight: 1 }}>★</span>)}
          </div>
        </div>
      );
    }
    if (tp === "date") {
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <div style={{ ...baseInput, display: "flex", alignItems: "center", justifyContent: "space-between", height: 38 }}>
            <span style={{ color: "#94a3b8" }}>dd/mm/yyyy</span><span>📅</span>
          </div>
        </div>
      );
    }
    if (tp === "time") {
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <div style={{ ...baseInput, display: "flex", alignItems: "center", justifyContent: "space-between", height: 38 }}>
            <span style={{ color: "#94a3b8" }}>--:--</span><span>⏰</span>
          </div>
        </div>
      );
    }
    if (tp === "file") {
      return (
        <div key={f.id} style={wrapStyle}>
          <span style={labelS}>{lbl}{reqStar}</span>
          <div style={{ border: "2px dashed #cbd5e1", borderRadius: fmInputRadius, padding: "10px 12px", textAlign: "center", color: "#94a3b8", fontSize: fs2 - 1, fontFamily: ff }}>
            📎 {f.accept ? `Tải lên (${f.accept})` : "Tải tệp lên"}{f.maxSizeMb ? ` · tối đa ${f.maxSizeMb}MB` : ""}
          </div>
        </div>
      );
    }
    return (
      <div key={f.id} style={wrapStyle}>
        <span style={labelS}>{lbl}{reqStar}</span>
        <input readOnly placeholder={ph} style={baseInput} />
      </div>
    );
  };

  // Auto-set height only when content (fields) changes — not on every render.
  // A hidden measurement div gives us natural content height without affecting layout.
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const naturalH = node.scrollHeight;
    if (naturalH > 0 && Math.abs(naturalH - (el.height ?? 0)) > 8) {
      updateEl(el.id, { height: naturalH });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.content, el.id]);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: fmBorderRadius,
    background: fmBg,
    opacity: el.opacity ?? 1,
    padding: 16,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden",
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 16px",
    background: fmBtnBg,
    color: fmBtnText,
    borderRadius: fmInputRadius,
    fontWeight: 600,
    fontSize: fs2,
    fontFamily: ff,
    textAlign: "center",
    flexShrink: 0,
    cursor: "default",
    border: "none",
    width: "100%",
  };

  return (
    <>
      {/* Visible form — fills element boundary via inset:0 */}
      <div style={containerStyle}>
        {cfg.title && (
          <div style={{ fontSize: Math.min(fs2 + 2, 18), fontWeight: 600, color: fmTitleColor, fontFamily: ff, flexShrink: 0 }}>
            {cfg.title}
          </div>
        )}
        {fields.map((f, i) => renderField(f, i))}
        <div style={btnStyle}>{cfg.buttonText || "Gửi"}</div>
      </div>

      {/* Hidden measurement div — natural height without flex stretch */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute", visibility: "hidden", pointerEvents: "none",
          left: 0, top: 0, width: el.width ?? 300,
          padding: 16, boxSizing: "border-box",
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {cfg.title && <div style={{ fontSize: Math.min(fs2 + 2, 18), fontWeight: 600 }}>{cfg.title}</div>}
        {fields.map((f) => {
          const tp = f.type || "text";
          const lbl = f.label || f.id || "";
          if (tp === "textarea") return <div key={f.id}><div style={{ height: 14 }} /><textarea readOnly style={{ width: "100%", minHeight: 80, boxSizing: "border-box" }} /></div>;
          if (tp === "section") return <div key={f.id} style={{ height: 32 }} />;
          return <div key={f.id}><div style={{ height: 14 }} /><div style={{ height: 38 }}>{lbl}</div></div>;
        })}
        <div style={{ height: 42 }} />
      </div>
    </>
  );
}

// ─── Menu element ─────────────────────────────────────────────────────────────
type MenuItemData = { label: string; href?: string; target?: string };
type MenuContent = {
  items?: MenuItemData[];
  activeIndex?: number;
  variant?: number;
  align?: string;
  activeColor?: string;
  activeBgColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textTransform?: string;
  gap?: number;
  backgroundColor?: string;
  borderRadius?: number;
};

function parseMenuContent(raw?: string | null): MenuContent {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function MenuElement({ el }: { el: EditorElement }) {
  const mc = parseMenuContent(el.content);
  const items: MenuItemData[] = mc.items ?? [
    { label: "Trang chủ" }, { label: "Giới thiệu" }, { label: "Dịch vụ" }, { label: "Liên hệ" },
  ];
  const activeIdx = mc.activeIndex ?? 0;
  const variant = mc.variant ?? 1;
  const align = (mc.align as React.CSSProperties["justifyContent"]) === "center"
    ? "center" : mc.align === "right" ? "flex-end" : "flex-start";
  const activeColor = mc.activeColor ?? "#f97316";
  const activeBg = mc.activeBgColor ?? "#fff7ed";
  const textColor = mc.textColor ?? "#1e293b";
  const fontSize = mc.fontSize ?? 14;
  const fontWeight = (mc.fontWeight ?? 600) as React.CSSProperties["fontWeight"];
  const fontFamily = mc.fontFamily ? `'${mc.fontFamily}', sans-serif` : "'Inter', sans-serif";
  const textTransform = (mc.textTransform ?? "none") as React.CSSProperties["textTransform"];
  const gap = mc.gap ?? 8;
  const bg = mc.backgroundColor ?? "transparent";
  const borderRadius = mc.borderRadius ?? 0;

  const containerStyle: React.CSSProperties = {
    position: "absolute", inset: 0, display: "flex", alignItems: "center",
    justifyContent: align, flexWrap: "wrap", gap, padding: "0 8px",
    backgroundColor: bg, borderRadius, boxSizing: "border-box", overflow: "hidden",
  };

  const getItemStyle = (idx: number): React.CSSProperties => {
    const isActive = idx === activeIdx;
    const base: React.CSSProperties = {
      fontSize, fontFamily, fontWeight, textTransform, cursor: "pointer",
      whiteSpace: "nowrap", transition: "all 0.15s",
    };
    switch (variant) {
      case 1: // boxed active item
        return { ...base, padding: "6px 14px", borderRadius: 6,
          color: isActive ? activeColor : textColor,
          backgroundColor: isActive ? activeBg : "transparent",
          fontWeight: isActive ? 700 : fontWeight };
      case 2: // plain text
        return { ...base, padding: "4px 10px", color: isActive ? activeColor : textColor };
      case 3: // colored all items
        return { ...base, padding: "4px 10px", color: activeColor };
      case 4: // uppercase blue
        return { ...base, padding: "4px 12px", color: isActive ? activeColor : textColor,
          textTransform: "uppercase", letterSpacing: 0.5,
          borderBottom: isActive ? `2px solid ${activeColor}` : "2px solid transparent" };
      case 5: // bold uppercase black
        return { ...base, padding: "4px 12px", color: textColor,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
          opacity: isActive ? 1 : 0.6 };
      case 6: // large colored
        return { ...base, padding: "4px 14px", color: activeColor,
          fontSize: (mc.fontSize ?? 14) + 2, fontWeight: 700 };
      case 7: // small gray
        return { ...base, padding: "4px 8px", color: isActive ? activeColor : "#94a3b8",
          fontSize: Math.max(11, (mc.fontSize ?? 14) - 2) };
      case 8: // uppercase accent
        return { ...base, padding: "4px 12px", color: activeColor,
          textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 };
      case 9: // teal minimal
        return { ...base, padding: "4px 10px", color: isActive ? activeColor : textColor,
          fontSize: Math.max(11, (mc.fontSize ?? 14) - 1),
          borderBottom: isActive ? `1.5px solid ${activeColor}` : "none" };
      default:
        return { ...base, padding: "4px 10px", color: isActive ? activeColor : textColor };
    }
  };

  return (
    <div style={containerStyle}>
      {items.map((item, idx) => (
        <span key={idx} style={getItemStyle(idx)}>
          {item.label || `Mục ${idx + 1}`}
        </span>
      ))}
    </div>
  );
}

/** Cắt dòng trên canvas — tránh khối chữ lộn xộn */
function frameLineClamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
    overflow: "hidden",
    wordBreak: "break-word",
  };
}

/** Khung layout mẫu — đồng bộ tỷ lệ chữ với kích thước phần tử */
function FrameBlockPreview({ el }: { el: EditorElement }) {
  const fc = parseFrameContent(el.content ?? undefined);
  const s = el.styles ?? {};
  const scale = getFrameCanvasScale(el);
  const fz = (n: number) => `${Math.round(n * scale)}px`;
  const g = (n: number) => Math.round(n * scale);

  const fill: React.CSSProperties = { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden" };
  const outer: React.CSSProperties = {
    ...fill,
    borderRadius: (s.borderRadius as number) ?? 12,
    boxShadow: (s.boxShadow as string) || undefined,
    border: (s.border as string) || ((s.borderWidth as number) ? `${s.borderWidth}px solid ${(s.borderColor as string) ?? "#e2e8f0"}` : undefined),
    opacity: el.opacity ?? 1,
    fontFamily: fc.fontFamily ? `'${fc.fontFamily}', Inter, sans-serif` : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
  const pad = Math.round((fc.padding ?? 16) * Math.min(1.15, scale + 0.08));
  const bg = fc.background || "#fff";

  if (fc.variant === "quote") {
    const qm = fc.quoteMarkColor ?? "#0044ff";
    return (
      <div style={outer}>
        <div
          style={{
            padding: pad,
            minHeight: "100%",
            boxSizing: "border-box",
            background: bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: g(8),
            boxShadow: "inset 0 -24px 48px -28px rgba(0,68,255,0.07)",
          }}
        >
          <span style={{ fontSize: fz(fc.quoteMarkFontSize ?? 24), lineHeight: 1, color: qm, fontWeight: 800 }}>&ldquo;</span>
          <p
            style={{
              margin: 0,
              fontSize: fz(fc.quoteTextFontSize ?? 11),
              lineHeight: 1.55,
              color: fc.quoteTextColor ?? "#334155",
              maxWidth: "92%",
              ...frameLineClamp(5),
            }}
          >
            {fc.quoteText}
          </p>
          <span style={{ fontSize: fz(fc.quoteFooterFontSize ?? 10), fontWeight: 700, color: fc.quoteFooterColor ?? "#0044ff", ...frameLineClamp(1) }}>{fc.quoteFooter}</span>
        </div>
      </div>
    );
  }

  if (fc.variant === "split-feature") {
    const pos = fc.splitImagePosition === "right" ? "row-reverse" : "row";
    const imgUrl = fc.splitImage?.trim() ? resolveAsset(fc.splitImage!) : "";
    const ir = fc.splitImageRadius ?? 8;
    return (
      <div style={outer}>
        <div
          style={{
            padding: pad,
            minHeight: "100%",
            boxSizing: "border-box",
            background: bg,
            display: "flex",
            flexDirection: pos,
            gap: g(10),
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: "0 0 42%",
              maxWidth: "48%",
              minWidth: 0,
              borderRadius: ir,
              overflow: "hidden",
              background: "#f1f5f9",
              alignSelf: "stretch",
            }}
          >
            {imgUrl ? (
              <img src={imgUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", minHeight: g(72), objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", minHeight: g(72), background: "linear-gradient(135deg,#e2e8f0,#f8fafc)" }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: g(5) }}>
            <div style={{ fontSize: fz(fc.splitTitleFontSize ?? 12), fontWeight: 700, color: fc.splitTitleColor ?? "#0f172a", lineHeight: 1.3, ...frameLineClamp(2) }}>{fc.splitTitle}</div>
            <div style={{ fontSize: fz(fc.splitBodyFontSize ?? 10), color: fc.splitBodyColor ?? "#64748b", lineHeight: 1.5, ...frameLineClamp(5) }}>{fc.splitBody}</div>
          </div>
        </div>
      </div>
    );
  }

  if (fc.variant === "profile-cta") {
    const imgUrl = fc.profileImage?.trim() ? resolveAsset(fc.profileImage!) : "";
    const h = Number(el.height) || 260;
    const rawSize = Math.round((fc.profileImageSize ?? 96) * scale);
    const layout = fc.profileLayout ?? "vertical";
    const size =
      layout === "vertical"
        ? Math.min(Math.max(rawSize, 56), Math.min(120, Math.round(h * 0.38)))
        : Math.min(Math.max(rawSize, 48), Math.min(112, Math.round(h * 0.5)));
    const round = fc.profileImageRound !== false;
    const br = fc.profileBtnRadius ?? 6;
    const btnPy = Math.max(4, g(5));
    const btnPx = g(12);

    const imgBlock = (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: round ? "50%" : g(10),
          overflow: "hidden",
          flexShrink: 0,
          background: "#f1f5f9",
          boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
        }}
      >
        {imgUrl ? <img src={imgUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
      </div>
    );

    const titleBlock = (fc.profileTitle ?? "").trim() ? (
      <div
        style={{
          fontSize: fz(fc.profileTitleFontSize ?? 11),
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: fc.profileTitleColor ?? "#0d9488",
          lineHeight: 1.25,
          textAlign: layout === "vertical" ? "center" : "left",
          ...frameLineClamp(3),
        }}
      >
        {fc.profileTitle}
      </div>
    ) : null;

    const btnEl = (
      <div
        style={{
          alignSelf: layout === "vertical" ? "center" : "flex-start",
          marginTop: g(4),
          padding: `${btnPy}px ${btnPx}px`,
          background: fc.profileBtnBg ?? "#0d9488",
          color: fc.profileBtnColor ?? "#fff",
          borderRadius: br,
          fontSize: fz(fc.profileBtnFontSize ?? 10),
          fontWeight: 700,
          maxWidth: "100%",
          textAlign: "center",
          ...frameLineClamp(1),
        }}
      >
        {fc.profileBtnText}
      </div>
    );

    if (layout === "vertical") {
      return (
        <div style={outer}>
          <div
            style={{
              padding: pad,
              minHeight: "100%",
              boxSizing: "border-box",
              background: bg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: g(8),
            }}
          >
            {imgBlock}
            {(fc.profileName ?? "").trim() ? (
              <div style={{ fontSize: fz(fc.profileNameFontSize ?? 12), fontWeight: 700, color: fc.profileNameColor ?? "#0f172a", ...frameLineClamp(1) }}>{fc.profileName}</div>
            ) : null}
            {(fc.profileRole ?? "").trim() ? (
              <div style={{ fontSize: fz(fc.profileRoleFontSize ?? 10), color: fc.profileRoleColor ?? "#64748b", marginTop: g(-4), ...frameLineClamp(1) }}>{fc.profileRole}</div>
            ) : null}
            {titleBlock}
            <div style={{ fontSize: fz(fc.profileBodyFontSize ?? 10), color: fc.profileBodyColor ?? "#64748b", lineHeight: 1.5, maxWidth: "96%", ...frameLineClamp(5) }}>{fc.profileBody}</div>
            {btnEl}
          </div>
        </div>
      );
    }

    return (
      <div style={outer}>
        <div
          style={{
            padding: pad,
            minHeight: "100%",
            boxSizing: "border-box",
            background: bg,
            display: "flex",
            flexDirection: "row",
            gap: g(12),
            alignItems: "center",
          }}
        >
          {imgBlock}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: g(5), alignItems: "stretch" }}>
            {titleBlock}
            <div style={{ fontSize: fz(fc.profileBodyFontSize ?? 10), color: fc.profileBodyColor ?? "#64748b", lineHeight: 1.45, ...frameLineClamp(4) }}>{fc.profileBody}</div>
            {btnEl}
          </div>
        </div>
      </div>
    );
  }

  if (fc.variant === "blank") {
    const hint = fc.blankHint ?? "";
    return (
      <div style={outer}>
        <div
          style={{
            padding: pad,
            minHeight: "100%",
            boxSizing: "border-box",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #cbd5e1",
            borderRadius: g(8),
            margin: g(2),
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: fz(fc.blankHintFontSize ?? 10),
              lineHeight: 1.5,
              color: fc.blankHintColor ?? "#94a3b8",
              textAlign: "center",
              maxWidth: "88%",
              ...frameLineClamp(6),
            }}
          >
            {hint || "Khung trống — chỉnh ở panel bên phải."}
          </p>
        </div>
      </div>
    );
  }

  /* numbered — số + mô tả; tên/chức danh tùy chọn phía trên đoạn mô tả */
  const numFs = fz(fc.numValueFontSize ?? 30);
  const showMeta = Boolean((fc.numName ?? "").trim() || (fc.numRole ?? "").trim());
  return (
    <div style={outer}>
      <div
        style={{
          padding: pad,
          minHeight: "100%",
          boxSizing: "border-box",
          background: bg,
          display: "flex",
          flexDirection: "row",
          gap: g(14),
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: numFs,
            fontWeight: 800,
            lineHeight: 1,
            color: fc.numValueColor ?? "#4c1d95",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
            paddingTop: g(2),
          }}
        >
          {fc.numValue}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: g(4) }}>
          {showMeta ? (
            <>
              {(fc.numName ?? "").trim() ? (
                <div style={{ fontSize: fz(fc.numNameFontSize ?? 12), fontWeight: 700, color: fc.numNameColor ?? "#0f172a", ...frameLineClamp(1) }}>{fc.numName}</div>
              ) : null}
              {(fc.numRole ?? "").trim() ? (
                <div style={{ fontSize: fz(fc.numRoleFontSize ?? 10), color: fc.numRoleColor ?? "#64748b", marginTop: g(-2), ...frameLineClamp(1) }}>{fc.numRole}</div>
              ) : null}
            </>
          ) : null}
          <p style={{ margin: 0, fontSize: fz(fc.numBodyFontSize ?? 10), color: fc.numBodyColor ?? "#64748b", lineHeight: 1.5, ...frameLineClamp(6) }}>{fc.numBody}</p>
        </div>
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
      // Hỗ trợ padding riêng lẻ
      const hasSidePadding = s.paddingTop != null || s.paddingRight != null || s.paddingBottom != null || s.paddingLeft != null;
      const paddingValue = hasSidePadding
        ? `${s.paddingTop ?? 0}px ${s.paddingRight ?? 0}px ${s.paddingBottom ?? 0}px ${s.paddingLeft ?? 0}px`
        : s.padding ? `${s.padding}px` : undefined;
      const defaultFontSize = el.type === "headline" ? 36 : el.type === "paragraph" ? 15 : 16;
      const defaultLineHeight = el.type === "headline" ? "1.2" : el.type === "paragraph" ? "1.75" : "1.6";
      const defaultColor = el.type === "paragraph" ? "#475569" : el.type === "headline" ? "#0f172a" : "#1e293b";
      const ts: React.CSSProperties = {
        ...fill,
        overflow: "hidden",
        fontSize: s.fontSize ? `${s.fontSize}px` : `${defaultFontSize}px`,
        fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : "'Inter', sans-serif",
        fontWeight: (s.fontWeight as React.CSSProperties["fontWeight"]) || (el.type === "headline" ? 700 : 400),
        fontStyle: s.fontStyle as React.CSSProperties["fontStyle"],
        textDecoration: s.textDecoration as string,
        textTransform: s.textTransform as React.CSSProperties["textTransform"],
        textAlign: (s.textAlign as React.CSSProperties["textAlign"]) || "left",
        lineHeight: String(s.lineHeight || defaultLineHeight),
        letterSpacing: s.letterSpacing != null ? `${s.letterSpacing}px` : undefined,
        color: (s.color as string) || defaultColor,
        padding: paddingValue,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        opacity: el.opacity ?? 1,
        textShadow: s.textShadow as string | undefined,
        boxShadow: s.boxShadow as string | undefined,
        backgroundColor: s.backgroundColor as string | undefined,
        borderRadius: s.borderRadius ? `${s.borderRadius}px` : undefined,
        borderWidth: s.borderWidth ? `${s.borderWidth}px` : undefined,
        borderColor: s.borderColor as string | undefined,
        borderStyle: s.borderWidth && Number(s.borderWidth) > 0 ? "solid" : undefined,
      };
      const placeholder = el.type === "headline" ? "Tiêu đề chính của bạn" : el.type === "paragraph" ? "Đây là đoạn văn bản mô tả..." : "Văn bản của bạn";
      return isHtml
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled editor content
        ? <div style={ts} dangerouslySetInnerHTML={{ __html: content }} />
        : <div style={ts}>{content || <span style={{ opacity: 0.35 }}>{placeholder}</span>}</div>;
    }

    case "button": {
      const bg = (s.backgroundColor as string) || "#4f46e5";
      const br = (s.borderRadius as number) ?? 10;
      const borderW = (s.borderWidth as number) ?? 0;
      const isGradient = bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient");
      const hasSidePad = s.paddingTop != null || s.paddingRight != null || s.paddingBottom != null || s.paddingLeft != null;
      const paddingVal = hasSidePad
        ? `${s.paddingTop ?? 0}px ${s.paddingRight ?? 28}px ${s.paddingBottom ?? 0}px ${s.paddingLeft ?? 28}px`
        : s.padding ? `${s.padding}px` : "0 28px";
      const iconLeft = (s.iconLeft as string) || "";
      const iconRight = (s.iconRight as string) || "";
      const iconSize = Math.round(Math.min(Number(el.height || 52), 28) * 0.55);
      const renderBtnIcon = (key: string) => {
        if (!key) return null;
        const [pfx, ...rest] = key.split(":");
        const name = rest.join(":");
        const colorEnc = ((s.color as string) || "#fff").replace("#", "%23");
        return <img src={`https://api.iconify.design/${pfx}/${name}.svg?color=${colorEnc}`} alt={name} width={iconSize} height={iconSize} style={{ display: "block", flexShrink: 0 }} />;
      };
      const bs: React.CSSProperties = {
        ...fill,
        background: isGradient ? bg : undefined,
        backgroundColor: isGradient ? undefined : bg,
        color: (s.color as string) || "#fff",
        fontSize: s.fontSize ? `${s.fontSize}px` : "15px",
        fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : "'Inter', sans-serif",
        fontWeight: (s.fontWeight as React.CSSProperties["fontWeight"]) || 600,
        display: "flex",
        alignItems: "center",
        justifyContent: (s.justifyContent as React.CSSProperties["justifyContent"]) || "center",
        gap: "6px",
        borderRadius: br >= 999 ? "9999px" : `${br}px`,
        border: borderW > 0 ? `${borderW}px solid ${(s.borderColor as string) || "#4f46e5"}` : "none",
        boxShadow: (s.boxShadow as string) || undefined,
        padding: paddingVal,
        textDecoration: "none",
        overflow: "hidden",
        opacity: el.opacity ?? 1,
        letterSpacing: s.letterSpacing != null ? `${s.letterSpacing}px` : undefined,
        textTransform: s.textTransform as React.CSSProperties["textTransform"],
        cursor: "pointer",
        whiteSpace: "nowrap",
      };
      return (
        <div style={bs}>
          {iconLeft && renderBtnIcon(iconLeft)}
          <span>{el.content || "Nhấn vào đây"}</span>
          {iconRight && renderBtnIcon(iconRight)}
        </div>
      );
    }

    case "image": {
      const url = resolveAsset(el.imageUrl || "");
      const br = (s.borderRadius as number) ?? 0;
      const radiusCss = br >= 999 ? "50%" : `${br}px`;
      const borderW = (s.borderWidth as number) ?? 0;

      // CSS filter từ sliders
      const fBrightness = (s.filterBrightness as number) ?? 100;
      const fContrast   = (s.filterContrast   as number) ?? 100;
      const fSaturate   = (s.filterSaturate   as number) ?? 100;
      const fBlur       = (s.filterBlur       as number) ?? 0;
      const fGray       = (s.filterGrayscale  as number) ?? 0;
      const hasFilter   = fBrightness !== 100 || fContrast !== 100 || fSaturate !== 100 || fBlur !== 0 || fGray;
      const filterCss   = hasFilter
        ? `brightness(${fBrightness}%) contrast(${fContrast}%) saturate(${fSaturate}%) blur(${fBlur}px) grayscale(${fGray * 100}%)`
        : undefined;

      // Flip transform
      const flipX = (s.flipX as number) === 1;
      const flipY = (s.flipY as number) === 1;
      const flipTransform = flipX && flipY ? "scale(-1,-1)" : flipX ? "scaleX(-1)" : flipY ? "scaleY(-1)" : undefined;

      const cs: React.CSSProperties = {
        ...fill,
        overflow: "hidden",
        opacity: el.opacity ?? 1,
        borderRadius: radiusCss,
        border: borderW > 0 ? `${borderW}px solid ${(s.borderColor as string) || "#e2e8f0"}` : undefined,
        boxShadow: (s.boxShadow as string) || undefined,
        backgroundColor: url ? undefined : "#e2e8f0",
      };

      const overlayColor = (s.overlayColor as string) || "";
      const overlayOpacity = Number(s.overlayOpacity ?? 0);

      return (
        <div style={cs}>
          {url ? (
            <>
              <img
                src={url}
                alt={el.content || ""}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: (s.objectFit as React.CSSProperties["objectFit"]) || "cover",
                  objectPosition: (s.objectPosition as string) || "center",
                  borderRadius: radiusCss,
                  display: "block",
                  filter: filterCss,
                  transform: flipTransform,
                }}
              />
              {overlayColor && overlayOpacity > 0 && (
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity,
                  borderRadius: radiusCss,
                  pointerEvents: "none",
                }} />
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, border: "1px dashed #94a3b8", borderRadius: radiusCss }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Chưa có ảnh</span>
            </div>
          )}
        </div>
      );
    }

    case "shape": {
      const bg = (s.backgroundColor as string) || "#e0e7ff";
      const isGradient = bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient");
      const radius = (s.borderRadius as number) ?? 12;
      const tl  = (s.borderTopLeftRadius     as number) ?? radius;
      const tr  = (s.borderTopRightRadius    as number) ?? radius;
      const br2 = (s.borderBottomRightRadius as number) ?? radius;
      const bl2 = (s.borderBottomLeftRadius  as number) ?? radius;
      const allSame = tl === tr && tr === br2 && br2 === bl2;
      const radiusCss = allSame && tl >= 999 ? "50%" : `${tl}px ${tr}px ${br2}px ${bl2}px`;
      const borderW = (s.borderWidth as number) ?? 0;
      const overlayC = (s.overlayColor as string) || "";
      const overlayO = Number(s.overlayOpacity || 0);
      // fill có position:absolute + inset:0 — KHÔNG override bằng position:relative
      const ss: React.CSSProperties = {
        ...fill,
        background: isGradient ? bg : undefined,
        backgroundColor: isGradient ? undefined : bg,
        borderRadius: radiusCss,
        overflow: "hidden",
        border: borderW > 0 ? `${borderW}px ${(s.borderStyle as string) || "solid"} ${(s.borderColor as string) || "#6366f1"}` : undefined,
        boxShadow: (s.boxShadow as string) || undefined,
        opacity: el.opacity ?? 1,
      };
      return (
        <div style={ss}>
          {overlayC && overlayO > 0 && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: overlayC, opacity: overlayO, borderRadius: radiusCss, pointerEvents: "none" }} />
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
      const iconColor = (s.color as string) || "#4f46e5";
      const size = Math.min(Number(el.width || 48), Number(el.height || 48)) * 0.8;
      const content = el.content ?? "";

      // Iconify format: "prefix:name"
      if (content.includes(":")) {
        const [prefix, ...rest] = content.split(":");
        const name = rest.join(":");
        const colorParam = iconColor.replace("#", "%23");
        const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=${colorParam}`;
        return (
          <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", opacity: el.opacity ?? 1 }}>
            <img src={svgUrl} alt={name} width={size} height={size} style={{ display: "block" }} />
          </div>
        );
      }

      // Format cũ: Unicode char
      const iconData = content ? getIconById(content) : null;
      const iconChar = iconData?.char ?? content ?? "★";
      return (
        <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, fontSize: size, lineHeight: 1, opacity: el.opacity ?? 1 }}>
          {iconChar}
        </div>
      );
    }

    case "video": {
      const url = el.videoUrl || "";
      if (!url) return (
        <div style={{ ...fill, backgroundColor: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><polygon points="5,3 19,12 5,21"/></svg>
          <span style={{ color: "#94a3b8", fontSize: 11 }}>Video — nhập URL hoặc tải lên</span>
        </div>
      );
      let src = url;
      if (src.includes("youtube.com/watch")) {
        const v = new URLSearchParams(src.split("?")[1] || "").get("v");
        if (v) src = `https://www.youtube.com/embed/${v}?modestbranding=1&rel=0`;
      } else if (src.includes("youtu.be/")) {
        const id = src.split("youtu.be/")[1]?.split("?")[0];
        if (id) src = `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0`;
      }
      const isEmbed = src.includes("youtube") || src.includes("vimeo");
      if (isEmbed) {
        return (
          <div style={{ ...fill, overflow: "hidden", position: "relative" }}>
            <iframe src={src} style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }} allowFullScreen title="Video" />
            {/* Overlay trong suốt để giữ pointer events cho drag/resize trong editor */}
            <div style={{ position: "absolute", inset: 0, cursor: "move", background: "transparent" }} />
          </div>
        );
      }
      return (
        <div style={{ ...fill, overflow: "hidden", position: "relative" }}>
          {/* biome-ignore lint/a11y/useMediaCaption: editor preview */}
          <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
            controls={false}
            autoPlay={false} loop={false} muted
          />
          {/* Overlay trong suốt để giữ pointer events cho drag/resize */}
          <div style={{ position: "absolute", inset: 0, cursor: "move", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 40, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>Video</span>
            </div>
          </div>
        </div>
      );
    }

    case "form":
      return <FormElementPreview el={el} />;

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

    case "gallery":
      return <GalleryPreview el={el} />;

    case "product-detail":
      return <ProductDetailPreview el={el} />;

    case "collection-list": {
      type CLItem = { image?: string; title?: string; price?: string; originalPrice?: string; badge?: string; rating?: number };
      type CLData = { columns?: number; gap?: number; cardRadius?: number; showBadge?: boolean; showRating?: boolean; showOriginalPrice?: boolean; accentColor?: string; items?: CLItem[] };
      let cl: CLData = {};
      try { cl = JSON.parse(el.content || "{}"); } catch {}
      const items = cl.items ?? [];
      const cols = Math.max(1, Math.min(6, cl.columns ?? 3));
      const gap = cl.gap ?? 10;
      const cardRad = cl.cardRadius ?? 8;
      const showBadge = cl.showBadge !== false;
      const showRating = cl.showRating === true;
      const showOrigPrice = cl.showOriginalPrice !== false;
      const accent = cl.accentColor || "#ee4d2d";
      const bg = (s.backgroundColor as string) || "#f8fafc";
      const radius = (s.borderRadius as number) || 12;
      const renderStarsCL = (r: number) =>
        Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < Math.round(r) ? "#f59e0b" : "#d1d5db", fontSize: 9 }}>★</span>
        ));
      return (
        <div style={{ ...fill, background: bg, borderRadius: radius, padding: 10, boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, alignContent: "start", overflow: "hidden", opacity: el.opacity ?? 1, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
          {items.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 28 }}>🛍️</span>
              <span>Danh sách sản phẩm</span>
            </div>
          ) : items.map((item, i) => {
            const img = item.image?.trim() ? resolveAsset(item.image) : "";
            const hasOrigPrice = showOrigPrice && item.originalPrice && item.originalPrice !== item.price;
            return (
              <div key={i} style={{ background: "#fff", borderRadius: cardRad, overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                {/* Image area */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#f0f0f0", overflow: "hidden", flexShrink: 0 }}>
                  {img ? (
                    <img src={img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: 20 }}>🖼️</div>
                  )}
                  {showBadge && item.badge && (
                    <span style={{ position: "absolute", top: 5, left: 5, background: accent, color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 3, lineHeight: 1.4, letterSpacing: 0.3 }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                {/* Info area */}
                <div style={{ padding: "7px 8px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  {showRating && (item.rating ?? 0) > 0 && (
                    <div style={{ display: "flex", gap: 1 }}>{renderStarsCL(item.rating!)}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
                    {item.title || "Sản phẩm"}
                  </div>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", paddingTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: accent, lineHeight: 1 }}>{item.price || "—"}</span>
                    {hasOrigPrice && (
                      <span style={{ fontSize: 9, color: "#9ca3af", textDecoration: "line-through" }}>{item.originalPrice}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "carousel":
      return (
        <CarouselPreview
          el={el}
          onSelectCarouselTextField={onSelectCarouselTextField}
        />
      );

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

    case "frame":
      return <FrameBlockPreview el={el} />;

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

    case "popup": {
      const pop = parsePopupContent(el.content ?? undefined);
      const s = el.styles ?? {};
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const radius = (s.borderRadius as number) ?? 12;
      const popupFlat = Number(s.popupFlat) === 1;
      const layout = pop.layout ?? (popupFlat ? "flat" : "header");
      const headerBg = (s.headerBackgroundColor as string) ?? "#1e293b";
      const headerColor = (s.headerTextColor as string) ?? "#ffffff";
      const bodyColor = (s.bodyTextColor as string) ?? (s.color as string) ?? "#334155";
      const btnColor = (s.btnColor as string) ?? "#1e2d7d";
      const btnTextColor = (s.btnTextColor as string) ?? "#ffffff";
      const btnRadius = (s.btnRadius as number) ?? 8;
      const title = pop.title?.trim() || "Tiêu đề popup";
      const body = pop.body?.trim() || "Nội dung popup sẽ hiển thị ở đây...";
      const showBtn = pop.showBtn === true;
      const btnText = pop.btnText || "Tìm hiểu thêm";
      const emoji = pop.imageEmoji;
      const isHeader = layout === "header";

      return (
        <div style={{ ...fill, background: bg, borderRadius: radius, boxShadow: "0 8px 32px rgba(15,23,42,0.12)", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.06)" }}>
          {/* Indicator badge */}
          <div style={{ position: "absolute", top: 6, right: 6, background: "#6366f1", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em", zIndex: 2, opacity: 0.85 }}>POPUP</div>
          {isHeader ? (
            <div style={{ background: headerBg, padding: "10px 14px", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: headerColor, lineHeight: 1.3 }}>{title}</div>
            </div>
          ) : null}
          <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            {emoji && !isHeader && (
              <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</div>
            )}
            {!isHeader && (
              <div style={{ fontSize: 13, fontWeight: 700, color: (s.headerTextColor as string) ?? "#0f172a", lineHeight: 1.35 }}>{title}</div>
            )}
            <div style={{ fontSize: 11, color: bodyColor, lineHeight: 1.5, flexGrow: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              {body.split("\n").map((line, i) => <span key={i}>{line}{i < body.split("\n").length - 1 && <br />}</span>)}
            </div>
            {showBtn && (
              <div style={{ marginTop: "auto" }}>
                <div style={{ display: "inline-block", padding: "7px 16px", background: btnColor, color: btnTextColor, borderRadius: btnRadius, fontSize: 11, fontWeight: 600 }}>{btnText}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "group": {
      let data: { v?: number; items?: EditorElement[] } = {};
      try {
        data = JSON.parse(el.content || "{}");
      } catch {
        data = {};
      }
      const items = data.items ?? [];
      const br = (s.borderRadius as number) ?? 0;
      const userBorder = s.border as string | undefined;
      // Always show dashed indicator in editor; use actual border from styles if user set one
      const editorBorder = userBorder && userBorder !== "none" ? userBorder : "1.5px dashed #6366f1";
      const bg = (s.backgroundColor as string) || "transparent";
      const pad = Number(s.padding ?? 0);
      const shadow = s.boxShadow as string | undefined;
      return (
        <div
          style={{
            ...fill,
            overflow: "hidden",
            border: editorBorder,
            borderRadius: br,
            background: bg,
            boxSizing: "border-box",
            opacity: el.opacity ?? 1,
            ...(shadow ? { boxShadow: shadow } : {}),
          }}
        >
          {items.map((child) => (
            <div
              key={child.id}
              style={{
                position: "absolute",
                left: (child.x ?? 0) + pad,
                top: (child.y ?? 0) + pad,
                width: child.width ?? 100,
                height: child.height ?? 40,
                pointerEvents: "none",
                zIndex: child.zIndex ?? 1,
              }}
            >
              <InnerElementRenderer el={child} onSelectCarouselTextField={onSelectCarouselTextField} />
            </div>
          ))}
        </div>
      );
    }

    case "menu": {
      return <MenuElement el={el} />;
    }

    default: {
      const labelMap: Record<string, string> = {
        cart: "🛒 Giỏ hàng",
        "blog-list": "📰 Blog",
        "blog-detail": "📄 Bài viết",
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

function rectsIntersect(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx0: number,
  by0: number,
  bx1: number,
  by1: number,
): boolean {
  return ax < bx1 && ax + aw > bx0 && ay < by1 && ay + ah > by0;
}

function DomSection({
  section,
  primarySelectedId,
  multiSelectedElementIds,
  selectedSectionId,
  editingId,
  canvasWidth,
  onElementActivate,
  onResizeStart,
  onSectionClick,
  onBackgroundPointerDown,
  onStartEdit,
  onCommitEdit,
  onOpenHtmlEditor,
  onSelectCarouselTextField,
  sectionGuides = null,
}: {
  section: EditorSection;
  primarySelectedId: number | null;
  multiSelectedElementIds: number[];
  selectedSectionId: number | null;
  editingId: number | null;
  canvasWidth: number;
  onElementActivate: (e: React.PointerEvent, el: EditorElement, section: EditorSection) => void;
  onResizeStart: (e: React.PointerEvent, el: EditorElement, dir: ResizeDirection) => void;
  onSectionClick: (id: number) => void;
  /** Nền section bị nhấn — canvas sẽ bắt đầu vùng chọn marquee */
  onBackgroundPointerDown: (e: React.PointerEvent, section: EditorSection) => void;
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
    backgroundSize: section.backgroundSize ?? "cover",
    backgroundPosition: section.backgroundPosition ?? "center center",
    backgroundRepeat: section.backgroundRepeat ?? "no-repeat",
    overflow: "visible",
    flexShrink: 0,
    outline: isSelectedSection ? "2px solid #4f46e5" : hovered ? "1.5px dashed #a5b4fc" : "none",
    outlineOffset: -1,
    opacity: section.visible === false ? 0.4 : 1,
  };

  return (
    <div
      data-section-id={section.id}
      style={sectionStyle}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement) !== e.currentTarget) return;
        onBackgroundPointerDown(e, section);
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
      {/* Background overlay */}
      {section.backgroundOverlayColor && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: section.backgroundOverlayColor,
            opacity: (section.backgroundOverlayOpacity ?? 50) / 100,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {(section.elements ?? [])
        .filter((el) => !el.isHidden)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((el) => {
          const isHighlighted = el.id === primarySelectedId || multiSelectedElementIds.includes(el.id);
          const showResizeHandles =
            isHighlighted &&
            multiSelectedElementIds.length < 2 &&
            el.id === primarySelectedId &&
            el.id !== editingId &&
            !el.isLocked;
          return (
            <ElementWrapper
              key={el.id}
              el={el}
              isHighlighted={isHighlighted}
              showResizeHandles={showResizeHandles}
              isEditing={el.id === editingId}
              onPointerDown={(e) => {
                if (el.isLocked) return;
                e.stopPropagation();
                onElementActivate(e, el, section);
              }}
              onResizeStart={onResizeStart}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onOpenHtmlEditor={onOpenHtmlEditor}
              onSelectCarouselTextField={onSelectCarouselTextField}
            />
          );
        })}
      {sectionGuides && <SmartGuidesOverlay guides={sectionGuides} />}
    </div>
  );
}

const TEXT_TYPES = new Set(["text", "headline", "paragraph", "button", "list"]);

function ElementWrapper({
  el,
  isHighlighted,
  showResizeHandles,
  isEditing,
  onPointerDown,
  onResizeStart,
  onStartEdit,
  onCommitEdit,
  onOpenHtmlEditor,
  onSelectCarouselTextField,
}: {
  el: EditorElement;
  /** Viền chọn (đơn hoặc đa chọn) */
  isHighlighted: boolean;
  /** Tay nắm resize — tắt khi đang chọn từ 2 phần tử trở lên */
  showResizeHandles: boolean;
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
    zIndex: el.zIndex ?? 0,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    outline: isEditing ? "2px solid #f59e0b" : isHighlighted ? "2px solid #4f46e5" : hovered && !el.isLocked ? "1.5px dashed #818cf8" : "none",
    outlineOffset: 0,
    cursor: el.isLocked ? "default" : isEditing ? "text" : "move",
    userSelect: isEditing ? "text" : "none",
    boxSizing: "border-box",
    // Clip content to element boundary so resize handles are meaningful
    overflow: el.type === "form" || el.type === "carousel" || el.type === "product-detail" || el.type === "collection-list" ? "hidden" : undefined,
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
      {showResizeHandles && (
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
    selectMultipleElements,
    selectSection,
    selectPage,
    updateElement,
    moveElementToSection,
    duplicateElement,
    removeElement,
    pushHistory,
    multiSelectedElementIds,
    setMultiSelectedElementIds,
    groupElements,
    ungroupElement,
  } = useEditorStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  /** Marquee (bôi đen) ở không gian thiết kế tuyệt đối của canvas */
  const marqueeRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    pointerId: number;
    captureEl: HTMLElement;
    startSectionId: number;
  } | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const gridSize = useEditorStore((s) => s.gridSize) || 8;
  const showGuides = useEditorStore((s) => s.showGuides);
  const [smartGuides, setSmartGuides] = useState<{ sectionId: number; data: SmartGuidesOverlayState } | null>(null);
  const [editingElementId, setEditingElementId] = useState<number | null>(null);
  const [htmlEditorElementId, setHtmlEditorElementId] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeCarouselText, setActiveCarouselText] = useState<{ elementId: number; field: "quote" | "name" | "role" | "title" | "desc" } | null>(null);
  const [fontOptions, setFontOptions] = useState<string[]>([]);

  useEffect(() => {
    void fetchFontList().then((f) => setFontOptions(f.slice(0, 48)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable || t?.closest?.("[contenteditable=\"true\"]")) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const ids = useEditorStore.getState().multiSelectedElementIds;
      if (ids.length < 2) return;
      e.preventDefault();
      ids.forEach((id) => useEditorStore.getState().removeElement(id));
      useEditorStore.getState().setMultiSelectedElementIds([]);
      useEditorStore.getState().selectPage();
      useEditorStore.getState().pushHistory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  /** Vị trí toolbar khi chọn từ 2 phần tử trở lên (bounding box) */
  const multiToolbarPos = useMemo(() => {
    const ids = multiSelectedElementIds;
    if (ids.length < 2) return null;
    const metas = ids
      .map((id) => findElementMeta(sections, id))
      .filter((m): m is NonNullable<typeof m> => m != null);
    if (metas.length < 2) return null;
    const sec0 = metas[0].section.id;
    if (!metas.every((m) => m.section.id === sec0)) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    for (const m of metas) {
      const w = m.el.width ?? 100;
      const h = m.el.height ?? 40;
      const top = m.sectionY + m.el.y;
      minX = Math.min(minX, m.el.x);
      minY = Math.min(minY, top);
      maxR = Math.max(maxR, m.el.x + w);
      maxB = Math.max(maxB, top + h);
    }
    const cx = ((minX + maxR) / 2) * effectiveZoom;
    const yTop = minY * effectiveZoom;
    const isTop = yTop > 50;
    return {
      left: cx,
      top: isTop ? yTop - 10 : maxB * effectiveZoom + 10,
      placement: isTop ? "top" : "bottom",
    };
  }, [multiSelectedElementIds, sections, effectiveZoom]);

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

  const handleMultiSelect = useCallback(
    (elementId: number, sectionId: number) => {
      const state = useEditorStore.getState();
      let base = [...state.multiSelectedElementIds];
      if (base.length === 0 && state.selected.type === "element") {
        const meta = findElementMeta(state.sections, state.selected.id);
        if (meta && meta.section.id === sectionId) base = [state.selected.id];
      }
      const sameSec = base.filter((id) => {
        const m = findElementMeta(state.sections, id);
        return m && m.section.id === sectionId;
      });
      const next = sameSec.includes(elementId)
        ? sameSec.filter((x) => x !== elementId)
        : [...sameSec, elementId];
      if (next.length < 2) {
        setMultiSelectedElementIds([]);
        if (next.length === 1) selectElement(next[0]);
        return;
      }
      selectMultipleElements(next);
    },
    [selectElement, selectMultipleElements, setMultiSelectedElementIds],
  );

  const handleElementActivate = useCallback(
    (e: React.PointerEvent, el: EditorElement, section: EditorSection) => {
      if (el.isLocked) return;
      if (e.shiftKey) {
        e.stopPropagation();
        handleMultiSelect(el.id, section.id);
        onOpenSettings?.();
        return;
      }
      selectElement(el.id);
      onOpenSettings?.();
      handleDragStart(e, el, section);
    },
    [handleMultiSelect, selectElement, onOpenSettings, handleDragStart],
  );

  /** Chốt marquee → chọn tất cả phần tử giao với vùng bôi, xuyên qua nhiều section */
  const finalizeMarqueePick = useCallback(
    (rect: { x0: number; y0: number; x1: number; y1: number }) => {
      const stSections = useEditorStore.getState().sections;
      const mx0 = Math.min(rect.x0, rect.x1);
      const my0 = Math.min(rect.y0, rect.y1);
      const mx1 = Math.max(rect.x0, rect.x1);
      const my1 = Math.max(rect.y0, rect.y1);
      const picked: number[] = [];
      let sy = 0;
      for (const s of visibleSectionsOrdered(stSections)) {
        const sh = s.height ?? 600;
        const secBottom = sy + sh;
        if (my1 >= sy && my0 <= secBottom) {
          const localY0 = my0 - sy;
          const localY1 = my1 - sy;
          for (const elem of s.elements ?? []) {
            if (elem.isHidden || elem.isLocked) continue;
            const ew = elem.width ?? 100;
            const eh = elem.height ?? 40;
            if (rectsIntersect(elem.x, elem.y, ew, eh, mx0, localY0, mx1, localY1)) {
              picked.push(elem.id);
            }
          }
        }
        sy += sh;
      }
      if (picked.length === 0) {
        setMultiSelectedElementIds([]);
        return;
      }
      if (picked.length === 1) {
        selectElement(picked[0]);
        onOpenSettings?.();
        return;
      }
      selectMultipleElements(picked);
      onOpenSettings?.();
    },
    [selectElement, selectMultipleElements, onOpenSettings],
  );

  /** Bắt đầu marquee khi click xuống nền section (được DomSection gọi lên) */
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent, section: EditorSection) => {
      const stSections = useEditorStore.getState().sections;
      const sectionTarget = e.currentTarget as HTMLElement;
      const rect = sectionTarget.getBoundingClientRect();
      const localX = (e.clientX - rect.left) / effectiveZoom;
      const localY = (e.clientY - rect.top) / effectiveZoom;
      const offset = sectionTopOffset(stSections, section.id);
      const absX = localX;
      const absY = offset + localY;
      marqueeRef.current = {
        x0: absX,
        y0: absY,
        x1: absX,
        y1: absY,
        pointerId: e.pointerId,
        captureEl: sectionTarget,
        startSectionId: section.id,
      };
      setMarquee({ x0: absX, y0: absY, x1: absX, y1: absY });
      try {
        sectionTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [effectiveZoom],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const store = useEditorStore.getState();
    const stSections = store.sections;

    // marquee (bôi đen) — cập nhật theo trục tuyệt đối của canvas
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      const secSections = stSections;
      // toạ độ con trỏ trong không gian thiết kế tuyệt đối của canvas
      const capRect = m.captureEl.getBoundingClientRect();
      const localX = (e.clientX - capRect.left) / effectiveZoom;
      const localY = (e.clientY - capRect.top) / effectiveZoom;
      // Tìm section của captureEl để cộng offset
      const capSectionId = (() => {
        const attr = m.captureEl.getAttribute("data-section-id");
        return attr ? Number(attr) : null;
      })();
      let offset = 0;
      if (capSectionId != null) offset = sectionTopOffset(secSections, capSectionId);
      const absX = localX;
      const absY = offset + localY;
      m.x1 = absX;
      m.y1 = absY;
      setMarquee({ x0: m.x0, y0: m.y0, x1: absX, y1: absY });
      return;
    }

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
  }, [snap, updateElement, moveElementToSection, canvasWidth, snapToGrid, showGuides, effectiveZoom]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Chốt marquee trước
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      try {
        m.captureEl.releasePointerCapture(m.pointerId);
      } catch {
        /* ignore */
      }
      const dw = Math.abs(m.x1 - m.x0);
      const dh = Math.abs(m.y1 - m.y0);
      marqueeRef.current = null;
      setMarquee(null);
      if (dw >= 4 || dh >= 4) {
        finalizeMarqueePick({ x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 });
      } else {
        // Click trên nền (không kéo) → chọn section như trước khi có marquee
        selectSection(m.startSectionId);
      }
      void e;
      return;
    }
    if (dragRef.current !== null || resizeRef.current !== null) {
      pushHistory();
    }
    dragRef.current = null;
    resizeRef.current = null;
    setSmartGuides(null);
  }, [pushHistory, finalizeMarqueePick, selectSection]);

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
              primarySelectedId={selectedElementId}
              multiSelectedElementIds={multiSelectedElementIds}
              selectedSectionId={selectedSectionId}
              editingId={editingElementId}
              canvasWidth={canvasWidth}
              onElementActivate={handleElementActivate}
              onResizeStart={handleResizeStart}
              onSectionClick={(id) => {
                selectSection(id);
              }}
              onBackgroundPointerDown={handleBackgroundPointerDown}
              onStartEdit={handleStartEdit}
              onCommitEdit={handleCommitEdit}
              onOpenHtmlEditor={(id) => setHtmlEditorElementId(id)}
              onSelectCarouselTextField={(elementId, field) => setActiveCarouselText({ elementId, field })}
              sectionGuides={smartGuides?.sectionId === section.id ? smartGuides.data : null}
            />
          ))}
        {/* Marquee overlay (chọn xuyên section) */}
        {marquee && (
          <div
            style={{
              position: "absolute",
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.max(1, Math.abs(marquee.x1 - marquee.x0)),
              height: Math.max(1, Math.abs(marquee.y1 - marquee.y0)),
              border: "1px dashed #4f46e5",
              background: "rgba(79, 70, 229, 0.12)",
              pointerEvents: "none",
              zIndex: 10000,
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      {/* Toolbar đa chọn (≥2 phần tử) */}
      {multiToolbarPos && multiSelectedElementIds.length >= 2 && (
        <div
          style={{
            position: "absolute",
            left: multiToolbarPos.left,
            top: multiToolbarPos.top,
            transform: `translate(-50%, ${multiToolbarPos.placement === "top" ? "-100%" : "0"})`,
            zIndex: 2001,
            whiteSpace: "nowrap",
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MultiSelectionToolbar
            count={multiSelectedElementIds.length}
            onCreateGroup={() => {
              const meta = findElementMeta(sections, multiSelectedElementIds[0]);
              if (!meta) return;
              groupElements(meta.section.id, multiSelectedElementIds);
              pushHistory();
            }}
            onDelete={() => {
              multiSelectedElementIds.forEach((id) => removeElement(id));
              setMultiSelectedElementIds([]);
              selectPage();
              pushHistory();
            }}
          />
        </div>
      )}

      {/* Toolbar một phần tử — chỉ khi không đang đa chọn ≥2 */}
      {toolbarPos && selEl && multiSelectedElementIds.length < 2 && (
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
            textFormat={textFormat}
            fontOptions={fontOptions}
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
            imageObjectFit={
              selEl.el.type === "image"
                ? ((["cover", "contain", "fill", "scale-down"].includes(String(selEl.el.styles?.objectFit))
                    ? selEl.el.styles?.objectFit
                    : "cover") as "cover" | "contain" | "fill" | "scale-down")
                : undefined
            }
            onImageObjectFitChange={
              selEl.el.type === "image"
                ? (fit) => {
                    updateElement(selEl.el.id, { styles: { ...selEl.el.styles, objectFit: fit } });
                    pushHistory();
                  }
                : undefined
            }
            groupAction={selEl.el.type === "group" ? "ungroup" : "none"}
            onUngroup={
              selEl.el.type === "group"
                ? () => {
                    ungroupElement(selEl.el.id);
                    pushHistory();
                  }
                : undefined
            }
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
