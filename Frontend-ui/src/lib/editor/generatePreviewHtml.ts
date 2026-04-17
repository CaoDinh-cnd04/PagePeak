import DOMPurify from "isomorphic-dompurify";
import { getIconById } from "@/lib/editor/data/iconData";
import type { EditorSection, EditorElement, UtilityEffectsSettings } from "@/types/editor";
import { parseProductDetailContent } from "@/lib/editor/productDetailContent";
import { parseTabsContent, parseCarouselContent, mergeCarouselStyle } from "@/lib/editor/tabsContent";
import {
  parseBlogListContent,
  parseBlogDetailContent,
  parsePopupContent,
  parseSocialShareContent,
} from "@/lib/editor/blogContent";
import { parseCartContent, getCartDisplayItems } from "@/lib/editor/cartContent";
import { parseGoogleFormLink, extractGoogleFormSubmitUrl } from "@/lib/dashboard/forms/formConfigSchema";
import { parseFrameContent } from "@/lib/editor/frameContent";

/** Ảnh upload lưu dạng `/uploads/...` và phục vụ từ API; trong iframe srcDoc URL tương đối resolve theo origin Vite → cần base trùng backend (giống MediaPanel getFullUrl). */
const DEFAULT_PREVIEW_ASSET_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 600;

/** Tránh chuỗi `</script>` trong mã tùy chỉnh làm đứt thẻ `<script>` hoặc gây SyntaxError trong iframe srcDoc. */
function sanitizeClosingScriptLikeSequences(html: string): string {
  return html.replace(/<\/script/gi, "<\\/script");
}

/** Ngữ cảnh gửi lead (page + workspace) khi xuất HTML / xem trước. */
type LpHtmlContext = {
  pageId: number;
  workspaceId: number;
  /** formConfigId → fieldsJson — dùng để nhúng cấu hình Google Form vào form HTML */
  formConfigsMap?: Record<number, string>;
};

/**
 * Chiều cao section trên canvas có thể nhỏ hơn tổng y+h của phần tử (tràn xuống dưới).
 * Preview phải mở rộng vùng section theo max(y+h) để không cắt ảnh/chữ; inner vẫn cao `sectionH` (logic)
 * bằng height % = sectionH/effectiveH so khớp % với editor.
 */
function computeSectionEffectiveHeight(
  section: EditorSection,
  sectionH: number,
  htmlCodeFullScreen: boolean,
): number {
  const sectionEls = section.elements ?? (section as { Elements?: unknown[] }).Elements ?? [];
  const els = Array.isArray(sectionEls) ? sectionEls : [];
  let maxBottom = sectionH;
  for (const el of els) {
    if (!el || typeof el !== "object") continue;
    const ee = el as EditorElement & { y?: number; Y?: number; height?: number; Height?: number };
    if (ee.isHidden) continue;
    if (htmlCodeFullScreen && ee.type === "html-code") continue;
    const y = Number(ee.y ?? ee.Y ?? 0);
    const h = Number(ee.height ?? ee.Height ?? 0);
    maxBottom = Math.max(maxBottom, y + h);
  }
  return Math.max(1, maxBottom);
}

function getElementContent(el: EditorElement): string {
  const c = (el as { content?: string; Content?: string }).content ?? (el as { Content?: string }).Content;
  return typeof c === "string" ? c : "";
}

function formatBlockBodyHtml(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return '<p style="margin:0;color:#94a3b8;font-size:12px">Chưa có nội dung</p>';
  if (/<[a-z][\s\S]*>/i.test(t)) {
    return DOMPurify.sanitize(t, {
      ALLOWED_TAGS: ["p", "br", "b", "i", "strong", "em", "a", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "code", "pre", "span", "div"],
      ALLOWED_ATTR: ["href", "target", "class", "style"],
    });
  }
  return `<p style="margin:0;white-space:pre-wrap;line-height:1.55">${escHtml(t)}</p>`;
}

function elementToHtml(
  el: EditorElement,
  sectionWidth: number,
  sectionHeight: number,
  htmlCodeFullScreen = false,
  ctx?: LpHtmlContext,
): string {
  if (el.isHidden) return "";

  const e = el as EditorElement & { X?: number; Y?: number; Width?: number; Height?: number };
  const ex = Number(e.x ?? e.X ?? 0);
  const ey = Number(e.y ?? e.Y ?? 0);
  const ew = e.width ?? e.Width;
  const eh = e.height ?? e.Height;
  const sw = Math.max(sectionWidth, 1);
  const sh = Math.max(sectionHeight, 1);
  const leftPct = (ex / sw) * 100;
  const topPct = (ey / sh) * 100;
  const widthPct = ew != null ? (Number(ew) / sw) * 100 : 0;
  const heightPct = eh != null ? (Number(eh) / sh) * 100 : 0;

  const styles: string[] = htmlCodeFullScreen && el.type === "html-code"
    ? [
        "position:fixed",
        "top:0",
        "left:0",
        "right:0",
        "bottom:0",
        "width:100vw",
        "min-height:100vh",
        "z-index:9999",
        "border:none",
        "margin:0",
        "padding:0",
        "overflow:auto",
        "-webkit-overflow-scrolling:touch",
        `opacity:${el.opacity ?? 1}`,
      ]
    : [
        `position:absolute`,
        `left:${leftPct.toFixed(2)}%`,
        `top:${topPct.toFixed(2)}%`,
        /* popup: neo không chiếm khung — overlay fixed trong case "popup" */
        el.type === "popup"
          ? "width:0;height:0;overflow:visible"
          : ew != null
            ? `width:${widthPct.toFixed(2)}%`
            : "",
        el.type === "popup"
          ? ""
          : eh != null && el.type !== "collection-list"
            ? `height:${heightPct.toFixed(2)}%`
            : "",
        el.type === "popup"
          ? ""
          : eh != null && el.type === "collection-list"
            ? `height:auto;max-height:${heightPct.toFixed(2)}%`
            : "",
        `z-index:${el.zIndex ?? 0}`,
        el.rotation ? `transform:rotate(${el.rotation}deg)` : "",
        `opacity:${el.opacity ?? 1}`,
      ].filter(Boolean);

  const s = el.styles ?? {};
  /** Popup / group / frame: không gộp font vào wrapper ngoài */
  if (el.type !== "popup" && el.type !== "group" && el.type !== "frame") {
    if (s.fontSize) styles.push(`font-size:${s.fontSize}px`);
    if (s.fontWeight) styles.push(`font-weight:${s.fontWeight}`);
    if (s.color) styles.push(`color:${s.color}`);
    if (s.fontFamily) styles.push(`font-family:'${s.fontFamily}', sans-serif`);
    if (s.borderRadius) styles.push(`border-radius:${s.borderRadius}px`);
    if (s.letterSpacing) styles.push(`letter-spacing:${s.letterSpacing}px`);
    if (s.lineHeight) styles.push(`line-height:${s.lineHeight}`);
    if (s.textTransform) styles.push(`text-transform:${s.textTransform}`);
    if (s.fontStyle) styles.push(`font-style:${s.fontStyle}`);
    if (s.textDecoration) styles.push(`text-decoration:${s.textDecoration}`);
    if (s.textAlign) styles.push(`text-align:${s.textAlign}`);

    if (s.borderWidth && Number(s.borderWidth) > 0)
      styles.push(`border:${s.borderWidth}px solid ${(s.borderColor as string) ?? "#e2e8f0"}`);

    if (s.boxShadow) styles.push(`box-shadow:${s.boxShadow}`);
    if (s.textShadow) styles.push(`text-shadow:${s.textShadow}`);

    // Hỗ trợ padding riêng lẻ (top/right/bottom/left) thay cho padding chung
    const pt = s.paddingTop as number | undefined;
    const pr = s.paddingRight as number | undefined;
    const pb = s.paddingBottom as number | undefined;
    const pl = s.paddingLeft as number | undefined;
    if (pt != null || pr != null || pb != null || pl != null) {
      styles.push(`padding:${pt ?? 0}px ${pr ?? 0}px ${pb ?? 0}px ${pl ?? 0}px`);
    } else if (s.padding) {
      styles.push(`padding:${s.padding}px`);
    }

    /** Panel Hiệu ứng: animationName / animationIterationCount — tương thích animation cũ */
    const animName = ((s.animationName as string) || (s.animation as string) || "").trim();
    if (animName && animName !== "none") {
      const dur = Number(s.animationDuration) || 1;
      const delay = Number(s.animationDelay) || 0;
      const repeat =
        (s.animationIterationCount as string) === "infinite" || s.animationRepeat ? "infinite" : "1";
      styles.push(`animation:${animName} ${dur}s ${delay}s ${repeat} both`);
    }

    const hoverAnim = ((s.hoverAnimation as string) || "").trim();
    if ((hoverAnim && hoverAnim !== "none") || s.hoverEffect) styles.push("transition:all 0.3s ease");

    const actionType = ((s.actionType as string) || "none").trim();
    if (actionType !== "none" && actionType !== "javascript") styles.push("cursor:pointer");
  }

  const wrapLink = (inner: string) => {
    if (el.href) {
      return `<a href="${escHtml(el.href)}" target="${el.target ?? "_self"}" style="text-decoration:none;color:inherit;display:block;width:100%;height:100%">${inner}</a>`;
    }
    return inner;
  };

  const textContent = getElementContent(el);
  const imgUrl = (el as { imageUrl?: string; ImageUrl?: string }).imageUrl ?? (el as { ImageUrl?: string }).ImageUrl;
  const vidUrl = (el as { videoUrl?: string; VideoUrl?: string }).videoUrl ?? (el as { VideoUrl?: string }).VideoUrl;

  switch (el.type) {
    case "headline": {
      if (!s.lineHeight) styles.push("line-height:1.2");
      if (!s.fontWeight) styles.push("font-weight:700");
      styles.push("margin:0", "white-space:pre-wrap", "word-break:break-word");
      if (!s.color) styles.push("color:#0f172a");
      return `<h2 style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Tiêu đề chính của bạn"))}</h2>`;
    }

    case "paragraph": {
      if (!s.lineHeight) styles.push("line-height:1.75");
      styles.push("margin:0", "white-space:pre-wrap", "word-break:break-word");
      if (!s.color) styles.push("color:#475569");
      return `<p style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Đoạn văn bản mô tả..."))}</p>`;
    }

    case "text": {
      styles.push("margin:0", "white-space:pre-wrap", "word-break:break-word", "display:block");
      if (!s.color) styles.push("color:#1e293b");
      return `<div style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Văn bản của bạn"))}</div>`;
    }

    case "button": {
      const bg = (s.backgroundColor as string) ?? "#4f46e5";
      const br = (s.borderRadius as number) ?? 10;
      const borderW = (s.borderWidth as number) ?? 0;
      const borderC = (s.borderColor as string) ?? "#4f46e5";
      const boxShadow = (s.boxShadow as string) ?? "";
      const hoverBg = (s.hoverBackgroundColor as string) ?? "";
      const hoverColorVal = (s.hoverColor as string) ?? "";
      const iconLeft = (s.iconLeft as string) ?? "";
      const iconRight = (s.iconRight as string) ?? "";
      const btnColor = (s.color as string) ?? "#fff";
      const justifyContent = (s.justifyContent as string) ?? "center";
      const isGradient = bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient");
      const href = el.href?.trim() || "javascript:void(0)";
      const target = el.target ?? "_self";

      // Padding: ưu tiên paddingTop/Right/Bottom/Left, fallback padding chung
      const bpt = s.paddingTop as number | undefined;
      const bpr = s.paddingRight as number | undefined;
      const bpb = s.paddingBottom as number | undefined;
      const bpl = s.paddingLeft as number | undefined;
      const paddingCss = (bpt != null || bpr != null || bpb != null || bpl != null)
        ? `padding:${bpt ?? 0}px ${bpr ?? 28}px ${bpb ?? 0}px ${bpl ?? 28}px`
        : s.padding ? `padding:${s.padding}px` : "padding:0 28px";

      const radiusCss = br >= 999 ? "border-radius:9999px" : `border-radius:${br}px`;
      const bgCss = isGradient ? `background:${bg}` : `background-color:${bg}`;

      styles.push(
        bgCss, radiusCss,
        "display:flex", "align-items:center", `justify-content:${justifyContent}`,
        "gap:6px",
        `color:${btnColor}`,
        `font-weight:${(s.fontWeight as number) ?? 600}`,
        "cursor:pointer", "box-sizing:border-box",
        "text-decoration:none", "transition:all 0.2s ease",
        "white-space:nowrap", "overflow:hidden",
        borderW > 0 ? `border:${borderW}px solid ${borderC}` : "border:none",
        paddingCss,
      );
      if (boxShadow) styles.push(`box-shadow:${boxShadow}`);

      // Render icon helper
      const renderIcon = (key: string) => {
        if (!key) return "";
        const [pfx, ...rest] = key.split(":");
        const name = rest.join(":");
        const colorEnc = btnColor.replace("#", "%23");
        const iconH = Math.min(Number(eh) * 0.5, 20);
        return `<img src="https://api.iconify.design/${pfx}/${name}.svg?color=${colorEnc}" alt="${escHtml(name)}" width="${iconH}" height="${iconH}" style="display:block;flex-shrink:0" loading="lazy" />`;
      };

      const labelHtml = escHtml(textContent || "Nhấn vào đây");
      const innerHtml = `${renderIcon(iconLeft)}<span>${labelHtml}</span>${renderIcon(iconRight)}`;

      // Hover JS inline
      let hoverJs = "";
      if (hoverBg || hoverColorVal) {
        const restoreBg = isGradient ? `this.style.background='${escHtml(bg)}';this.style.backgroundColor=''` : `this.style.backgroundColor='${escHtml(bg)}'`;
        const applyBg = isGradient ? `this.style.background='${escHtml(hoverBg || bg)}';this.style.backgroundColor=''` : `this.style.backgroundColor='${escHtml(hoverBg || bg)}'`;
        hoverJs = ` onmouseover="${applyBg};${hoverColorVal ? `this.style.color='${escHtml(hoverColorVal)}'` : ""}" onmouseout="${restoreBg};${hoverColorVal ? `this.style.color='${escHtml(btnColor)}'` : ""}"`;
      } else {
        hoverJs = ` onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter='none'"`;
      }

      return `<a href="${escHtml(href)}" target="${escHtml(target)}" class="lp-btn" style="${styles.join(";")}"${hoverJs}>${innerHtml}</a>`;
    }

    case "image": {
      const br = (s.borderRadius as number) ?? 0;
      const radiusCss = br >= 999 ? "50%" : `${br}px`;
      const borderW = (s.borderWidth as number) ?? 0;
      const borderCss = borderW > 0 ? `border:${borderW}px solid ${(s.borderColor as string) ?? "#e2e8f0"}` : "";
      const shadow = (s.boxShadow as string) || (s.shadow as string) || "";
      styles.push(
        "overflow:hidden",
        `border-radius:${radiusCss}`,
        ...(borderCss ? [borderCss] : []),
        ...(shadow ? [`box-shadow:${shadow}`] : []),
      );

      if (!imgUrl) {
        styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
        return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Chưa có ảnh</span></div>`;
      }

      // CSS filter
      const fBrightness = (s.filterBrightness as number) ?? 100;
      const fContrast   = (s.filterContrast   as number) ?? 100;
      const fSaturate   = (s.filterSaturate   as number) ?? 100;
      const fBlur       = (s.filterBlur       as number) ?? 0;
      const fGray       = (s.filterGrayscale  as number) ?? 0;
      const hasFilter   = fBrightness !== 100 || fContrast !== 100 || fSaturate !== 100 || fBlur !== 0 || fGray;
      const filterCss   = hasFilter
        ? `filter:brightness(${fBrightness}%) contrast(${fContrast}%) saturate(${fSaturate}%) blur(${fBlur}px) grayscale(${fGray * 100}%)`
        : "";

      // Flip transform
      const flipX = (s.flipX as number) === 1;
      const flipY = (s.flipY as number) === 1;
      const flipCss = flipX && flipY ? "scale(-1,-1)" : flipX ? "scaleX(-1)" : flipY ? "scaleY(-1)" : "";

      const objFit  = (s.objectFit     as string) || "cover";
      const objPos  = (s.objectPosition as string) || "center";
      const imgStyle = [
        "width:100%", "height:100%", "display:block",
        `object-fit:${objFit}`,
        `object-position:${objPos}`,
        `border-radius:${radiusCss}`,
        ...(filterCss ? [filterCss] : []),
        ...(flipCss ? [`transform:${flipCss}`] : []),
      ].join(";");

      const hrefWrap = el.href?.trim();
      const target = el.target ?? "_self";
      const imgTag = `<img src="${escHtml(imgUrl)}" alt="${escHtml(textContent)}" style="${imgStyle}" loading="lazy" />`;

      // Overlay
      const overlayColor   = (s.overlayColor   as string) || "";
      const overlayOpacity = Number(s.overlayOpacity ?? 0);
      const overlayHtml = overlayColor && overlayOpacity > 0
        ? `<div style="position:absolute;inset:0;background-color:${escHtml(overlayColor)};opacity:${overlayOpacity};border-radius:${radiusCss};pointer-events:none"></div>`
        : "";

      const inner = imgTag + overlayHtml;
      const wrapped = hrefWrap
        ? `<a href="${escHtml(hrefWrap)}" target="${escHtml(target)}" style="display:block;width:100%;height:100%;border-radius:${radiusCss}">${inner}</a>`
        : inner;

      return `<div style="${styles.join(";")}">${wrapped}</div>`;
    }

    case "video":
      if (vidUrl) {
        styles.push("overflow:hidden");
        const vControls = el.styles?.videoControls !== 0 && el.styles?.videoControls !== "0";
        const vAutoplay = !!el.styles?.videoAutoplay || el.styles?.videoAutoplay === "true";
        const vLoop = !!el.styles?.videoLoop || el.styles?.videoLoop === "true";
        const vMuted = !!el.styles?.videoMuted || el.styles?.videoMuted === "true";
        const vPoster = (el.styles?.videoPoster as string) ?? "";
        let src = vidUrl;
        if (src.includes("youtube")) {
          try {
            const u = new URL(src);
            if (u.hostname.includes("youtube.com")) {
              if (u.pathname === "/watch" && u.searchParams.get("v")) {
                const id = u.searchParams.get("v")!;
                src = `https://www.youtube.com/embed/${id}`;
              } else if (u.pathname.startsWith("/shorts/")) {
                const id = u.pathname.split("/")[2] ?? "";
                if (id) src = `https://www.youtube.com/embed/${id}`;
              }
            } else if (u.hostname === "youtu.be" && u.pathname.length > 1) {
              const id = u.pathname.slice(1);
              src = `https://www.youtube.com/embed/${id}`;
            }
          } catch {
            // ignore, fall back to original src
          }
        }
        if (src.includes("youtube") || src.includes("vimeo")) {
          const params = new URLSearchParams();
          if (vAutoplay) params.set("autoplay", "1");
          if (vMuted) params.set("mute", "1");
          if (vLoop && src.includes("youtube")) params.set("loop", "1");
          const sep = src.includes("?") ? "&" : "?";
          const iframeSrc = src + (params.toString() ? sep + params.toString() : "");
          return `<div style="${styles.join(";")}"><iframe src="${escHtml(iframeSrc)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
        }
        const vidAttrs = [`src="${escHtml(src)}"`, `style="width:100%;height:100%;object-fit:cover"`, vControls ? "controls" : "", vAutoplay ? "autoplay" : "", vLoop ? "loop" : "", vMuted ? "muted" : "", vPoster ? `poster="${escHtml(vPoster)}"` : ""].filter(Boolean).join(" ");
        return `<div style="${styles.join(";")}"><video ${vidAttrs}></video></div>`;
      }
      styles.push("background:#0f172a", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Video</span></div>`;

    case "shape": {
      const bg          = (s.backgroundColor as string) ?? "#e0e7ff";
      const isGradient  = bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient");
      const radius      = (s.borderRadius as number) ?? 12;
      const tl          = (s.borderTopLeftRadius     as number) ?? radius;
      const tr          = (s.borderTopRightRadius    as number) ?? radius;
      const br          = (s.borderBottomRightRadius as number) ?? radius;
      const bl          = (s.borderBottomLeftRadius  as number) ?? radius;
      const allSame     = tl === tr && tr === br && br === bl;
      const radiusCss   = allSame && tl >= 999 ? "50%" : `${tl}px ${tr}px ${br}px ${bl}px`;
      const borderW     = (s.borderWidth  as number) ?? 0;
      const borderC     = (s.borderColor  as string) ?? "#6366f1";
      const borderStyle = (s.borderStyle  as string) ?? "solid";
      const boxShadow   = (s.boxShadow    as string) ?? "";
      const overlayColor   = (s.overlayColor   as string) ?? "";
      const overlayOpacity = Number(s.overlayOpacity ?? 0) || 0;

      // background: gradient hoặc solid
      if (isGradient) {
        styles.push(`background:${bg}`);
      } else {
        styles.push(`background-color:${bg === "transparent" ? "transparent" : bg}`);
      }
      styles.push(`border-radius:${radiusCss}`, "overflow:hidden");
      if (borderW > 0) styles.push(`border:${borderW}px ${borderStyle} ${borderC}`);
      if (boxShadow)   styles.push(`box-shadow:${boxShadow}`);

      let inner = "";
      if (overlayColor && overlayOpacity > 0) {
        inner += `<div style="position:absolute;inset:0;background-color:${escHtml(overlayColor)};opacity:${overlayOpacity};border-radius:${radiusCss};pointer-events:none"></div>`;
      }
      return `<div style="${styles.join(";")}">${inner}</div>`;
    }

    case "divider": {
      const color = (s.backgroundColor as string) ?? "#d1d5db";
        const thickness = ((s.height as number) ?? el.height ?? 2) || 2;
      const style = (s.lineStyle as string) ?? "solid";
      const borderStyle = style === "dashed" ? "dashed" : style === "dotted" ? "dotted" : "solid";
      if (style === "double") {
        const lineH = Math.max(1, thickness / 2);
        const gap = Math.max(2, lineH);
        return `<div style="${styles.join(";")}display:flex;flex-direction:column;justify-content:center;gap:${gap}px"><div style="height:${lineH}px;background:${color};border-radius:2px"></div><div style="height:${lineH}px;background:${color};border-radius:2px"></div></div>`;
      }
      styles.push(`border-bottom:${thickness}px ${borderStyle} ${color}`);
      return `<div style="${styles.join(";")}"></div>`;
    }

    case "icon": {
      const iconColor = (s.color as string) ?? "#4f46e5";
      const iconSize = Math.min((ew as number) ?? 48, (eh as number) ?? 48) * 0.8;
      const content = el.content ?? "";
      styles.push("display:flex", "align-items:center", "justify-content:center");

      // Iconify format: "prefix:name"
      if (content.includes(":")) {
        const [prefix, ...rest] = content.split(":");
        const name = rest.join(":");
        const colorParam = iconColor.replace("#", "%23");
        const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=${colorParam}`;
        return `<div style="${styles.join(";")}"><img src="${svgUrl}" alt="${escHtml(name)}" width="${iconSize}" height="${iconSize}" style="display:block" loading="lazy" /></div>`;
      }

      // Format cũ: Unicode char
      const iconData = content ? getIconById(content) : null;
      const iconChar = iconData?.char ?? (content === "star" ? "★" : content || "★");
      styles.push(`color:${iconColor}`, `font-size:${iconSize}px`);
      return `<div style="${styles.join(";")}">${escHtml(iconChar)}</div>`;
    }

    case "countdown": {
      styles.push("display:flex", "align-items:center", "justify-content:center", "gap:8px", "font-family:monospace", "font-size:clamp(14px,2.5vw,22px)", "font-weight:700");
      let label = "Đếm ngược";
      try {
        const j = JSON.parse(el.content || "{}");
        if (j?.label && typeof j.label === "string") label = j.label;
      } catch {
        /* ignore */
      }
      return `<div style="${styles.join(";")}" class="lp-countdown"><span style="color:#64748b;font-size:11px;margin-right:8px">${escHtml(label)}</span><span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span></div>`;
    }

    case "form": {
      let formConfig: {
        formType?: string;
        title?: string;
        titleColor?: string;
        buttonText?: string;
        buttonColor?: string;
        buttonTextColor?: string;
        backgroundColor?: string;
        formBorderRadius?: number;
        inputRadius?: number;
        accentColor?: string;
        formConfigId?: number;
        redirectUrl?: string;
        fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string }[];
        inputStyle?: string;
        emailNotifyEnabled?: boolean;
        emailNotifyRecipient?: string;
        successMessage?: string;
        sendConfirmationEmail?: boolean;
      } = {};
      try {
        const parsed = JSON.parse(el.content || "{}");
        formConfig = typeof parsed === "object" ? parsed : {};
      } catch {
        const legacy = (el.content || "name,email").split(",").map((f: string) => f.trim()).filter(Boolean);
        formConfig = { formType: "contact", title: "Liên hệ", buttonText: "Gửi", fields: legacy.map((id) => ({ id, name: id, label: id, placeholder: id, type: "text" })), inputStyle: "outlined" };
      }
      const formType = formConfig.formType ?? "contact";
      const pid = ctx?.pageId;
      const wid = ctx?.workspaceId;
      const hasLeadCtx =
        pid != null && wid != null && Number.isFinite(Number(pid)) && Number.isFinite(Number(wid));
      const linkedFormId =
        typeof formConfig.formConfigId === "number" && Number.isFinite(formConfig.formConfigId)
          ? formConfig.formConfigId
          : undefined;
      const redirectUrl =
        typeof formConfig.redirectUrl === "string" && formConfig.redirectUrl.trim()
          ? formConfig.redirectUrl.trim()
          : "";
      const successMsg =
        typeof formConfig.successMessage === "string" && formConfig.successMessage.trim()
          ? formConfig.successMessage.trim()
          : "";
      // Build lead data-attributes
      let leadAttrs = "";
      if (hasLeadCtx) {
        leadAttrs = ` data-lp-lead="1" data-lp-page-id="${Number(pid)}" data-lp-workspace-id="${Number(wid)}"`;
        if (linkedFormId != null) leadAttrs += ` data-lp-form-config-id="${linkedFormId}"`;
        leadAttrs += ` data-lp-element-id="${el.id}"`;
        if (redirectUrl) leadAttrs += ` data-lp-redirect="${escHtml(redirectUrl)}"`;
        if (successMsg) leadAttrs += ` data-lp-success-msg="${escHtml(successMsg)}"`;
        if (formConfig.emailNotifyEnabled) {
          leadAttrs += ` data-lp-email-notify="1"`;
          if (formConfig.emailNotifyRecipient?.trim()) {
            leadAttrs += ` data-lp-email-recipient="${escHtml(formConfig.emailNotifyRecipient.trim())}"`;
          }
        }
        if (formConfig.sendConfirmationEmail) {
          leadAttrs += ` data-lp-send-confirm="1"`;
        }
        // Embed Google Form config when available
        if (linkedFormId != null && ctx?.formConfigsMap) {
          const fieldsJson = ctx.formConfigsMap[linkedFormId];
          if (fieldsJson) {
            const gfConfig = parseGoogleFormLink(fieldsJson);
            if (gfConfig && gfConfig.apiUrl && gfConfig.mappings.some((m) => m.googleFormField)) {
              const submitUrl = extractGoogleFormSubmitUrl(gfConfig.apiUrl);
              if (submitUrl) {
                const gfData = JSON.stringify({ submitUrl, mappings: gfConfig.mappings.filter((m) => m.googleFormField) });
                leadAttrs += ` data-google-form='${gfData.replace(/'/g, "&#39;")}'`;
              }
            }
          }
        }
      }

      // Visual settings — prefer formConfig values over element styles
      const fmBg = formConfig.backgroundColor ?? (s.backgroundColor ? String(s.backgroundColor) : "#ffffff");
      const fmBtnBg = formConfig.buttonColor ?? "#1e293b";
      const fmBtnText = formConfig.buttonTextColor ?? "#ffffff";
      const fmTitleColor = formConfig.titleColor ?? (s.color ? String(s.color) : "#1e293b");
      const fmBorderRadius = formConfig.formBorderRadius ?? 8;
      const fmInputRadius = formConfig.inputRadius ?? 4;
      const fmAccent = formConfig.accentColor ?? fmBtnBg;

      const title = formConfig.title ?? "Liên hệ";
      const buttonText = formConfig.buttonText ?? "Gửi";
      const fields = Array.isArray(formConfig.fields) ? formConfig.fields : [{ id: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text" }, { id: "email", label: "Email", placeholder: "Email", type: "email" }];
      const inputStyle = formConfig.inputStyle ?? "outlined";

      const inputBase =
        inputStyle === "filled"
          ? `background:${fmAccent}18;border:none;border-radius:${fmInputRadius}px`
          : inputStyle === "underlined"
            ? `background:transparent;border:none;border-bottom:1.5px solid ${fmAccent}88;border-radius:0`
            : `background:#fff;border:1px solid #e2e8f0;border-radius:${fmInputRadius}px`;

      const fs = (s.fontSize as number) ?? 14;
      const ff = s.fontFamily ? `font-family:${escHtml(String(s.fontFamily))},sans-serif;` : "";
      const fw = s.fontWeight ? `font-weight:${s.fontWeight};` : "font-weight:400;";
      const fStyle = s.fontStyle ? `font-style:${escHtml(String(s.fontStyle))};` : "";
      const fDeco = s.textDecoration ? `text-decoration:${escHtml(String(s.textDecoration))};` : "";

      styles.push(
        `background:${escHtml(fmBg)}`,
        `border-radius:${fmBorderRadius}px`,
        "padding:16px",
        "display:flex",
        "flex-direction:column",
        "gap:8px",
        "border:1px solid rgba(0,0,0,0.08)",
      );

      let inner = "";
      if (title && formType !== "login") {
        inner += `<div style="font-size:${Math.min(fs + 2, 18)}px;font-weight:600;color:${escHtml(fmTitleColor)};${ff}margin-bottom:4px">${escHtml(title)}</div>`;
      }
      if (formType === "otp") {
        inner += `<div style="font-size:${fs - 2}px;color:#64748b;${ff}margin-bottom:4px">Nhập mã OTP được gửi đến số điện thoại của bạn để xác nhận</div>`;
      }
      if (formType === "login") {
        inner += `<form class="lp-form" data-lp-form-type="login" style="display:flex;gap:8px;align-items:center">
          <input type="text" name="accessCode" placeholder="Mã truy cập" style="flex:1;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}color:#1e293b;${inputBase};box-sizing:border-box" />
          <button type="submit" style="padding:10px 20px;background:${escHtml(fmBtnBg)};color:${escHtml(fmBtnText)};border:none;border-radius:${fmInputRadius}px;font-weight:600;cursor:pointer;font-size:${fs}px;${ff}white-space:nowrap">
            ${escHtml(buttonText)}
          </button>
        </form>`;
      } else {
        inner += `<form class="lp-form" data-lp-form-type="${escHtml(formType)}"${leadAttrs}>`;
        for (const f of fields) {
          const ph = (f.placeholder ?? f.label ?? f.id) as string;
          const nm = (f.name ?? f.id) as string;
          const tp = (f.type ?? "text") as string;
          const lbl = (f.label ?? nm) as string;
          const req = (f as { required?: boolean }).required ? ' required' : '';
          const reqStar = (f as { required?: boolean }).required ? `<span style="color:#ef4444;margin-left:2px">*</span>` : "";
          const fieldLblStyle = `display:block;font-size:${fs - 2}px;font-weight:500;color:#374151;margin-bottom:4px;${ff}`;

          if (tp === "section") {
            // Section title — no input, just a heading
            const desc = (f as { description?: string }).description ?? "";
            inner += `<div style="margin:8px 0 4px;padding-bottom:6px;border-bottom:1.5px solid #e2e8f0"><div style="font-size:${fs + 1}px;font-weight:700;color:#0f172a;${ff}">${escHtml(lbl)}</div>${desc ? `<div style="font-size:${fs - 2}px;color:#64748b;margin-top:2px;${ff}">${escHtml(desc)}</div>` : ""}</div>`;
          } else if (tp === "textarea") {
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><textarea name="${escHtml(nm)}" placeholder="${escHtml(ph)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}color:#374151;${inputBase};min-height:60px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea></div>`;
          } else if ((tp === "select" || tp === "dropdown") && Array.isArray((f as { options?: string[] }).options)) {
            const opts = ((f as { options?: string[] }).options ?? []).map((o) => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join("");
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><select name="${escHtml(nm)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}color:#374151;${inputBase};box-sizing:border-box"><option value="">${escHtml(ph || "Chọn một mục")}</option>${opts}</select></div>`;
          } else if (tp === "radio" && Array.isArray((f as { options?: string[] }).options)) {
            const opts = ((f as { options?: string[] }).options ?? []).map((o, i) =>
              `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:${fs}px;${ff}color:#374151;padding:4px 0"><input type="radio" name="${escHtml(nm)}" value="${escHtml(o)}"${i === 0 && req ? ' required' : ''} style="accent-color:${fmAccent};width:16px;height:16px;flex-shrink:0" />${escHtml(o)}</label>`
            ).join("");
            inner += `<div style="margin-bottom:8px"><div style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</div><div style="padding:4px 0">${opts}</div></div>`;
          } else if (tp === "checkboxes" && Array.isArray((f as { options?: string[] }).options)) {
            const opts = ((f as { options?: string[] }).options ?? []).map((o) =>
              `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:${fs}px;${ff}color:#374151;padding:3px 0"><input type="checkbox" name="${escHtml(nm)}" value="${escHtml(o)}" style="accent-color:${fmAccent};width:16px;height:16px;flex-shrink:0" />${escHtml(o)}</label>`
            ).join("");
            inner += `<div style="margin-bottom:8px"><div style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</div><div style="padding:4px 0">${opts}</div></div>`;
          } else if (tp === "checkbox") {
            inner += `<div style="margin-bottom:8px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:${fs}px;${ff}color:#374151"><input type="checkbox" name="${escHtml(nm)}"${req} style="accent-color:${fmAccent};width:16px;height:16px;flex-shrink:0" />${escHtml(lbl)}</label></div>`;
          } else if (tp === "scale") {
            const scMin = Number((f as { min?: number }).min ?? 1);
            const scMax = Number((f as { max?: number }).max ?? 5);
            const scMinLbl = (f as { minLabel?: string }).minLabel ?? "";
            const scMaxLbl = (f as { maxLabel?: string }).maxLabel ?? "";
            const scaleItems = Array.from({ length: scMax - scMin + 1 }, (_, i) => scMin + i).map((v) =>
              `<label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-size:${fs - 2}px;${ff}color:#374151"><input type="radio" name="${escHtml(nm)}" value="${v}" style="accent-color:${fmAccent}" />${v}</label>`
            ).join("");
            inner += `<div style="margin-bottom:8px"><div style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</div><div style="display:flex;align-items:flex-start;gap:6px;padding:6px 0">${scaleItems}</div><div style="display:flex;justify-content:space-between;font-size:${fs - 3}px;color:#94a3b8;${ff}padding:0 2px">${scMinLbl ? `<span>${escHtml(scMinLbl)}</span>` : "<span></span>"}${scMaxLbl ? `<span>${escHtml(scMaxLbl)}</span>` : ""}</div></div>`;
          } else if (tp === "rating") {
            const maxR = Number((f as { maxRating?: number }).maxRating ?? 5);
            const stars = Array.from({ length: maxR }, (_, i) =>
              `<label style="cursor:pointer;font-size:22px;color:#d1d5db;padding:0 2px" title="${i + 1} sao"><input type="radio" name="${escHtml(nm)}" value="${i + 1}" style="display:none" />★</label>`
            ).join("");
            inner += `<div style="margin-bottom:8px"><div style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</div><div style="display:flex;gap:2px;padding:4px 0">${stars}</div></div>`;
          } else if (tp === "date") {
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><input type="date" name="${escHtml(nm)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}color:#374151;${inputBase};box-sizing:border-box" /></div>`;
          } else if (tp === "time") {
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><input type="time" name="${escHtml(nm)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}color:#374151;${inputBase};box-sizing:border-box" /></div>`;
          } else if (tp === "number") {
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><input type="number" name="${escHtml(nm)}" placeholder="${escHtml(ph)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}color:#374151;${inputBase};box-sizing:border-box" /></div>`;
          } else if (tp === "file") {
            const accept = (f as { accept?: string }).accept ?? "";
            const maxMb = (f as { maxSizeMb?: number }).maxSizeMb ?? 10;
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><div style="border:2px dashed #cbd5e1;border-radius:${fmInputRadius}px;padding:12px;text-align:center;color:#94a3b8;font-size:${fs - 1}px;${ff}"><input type="file" name="${escHtml(nm)}"${accept ? ` accept="${escHtml(accept)}"` : ""}${req} style="font-size:${fs - 1}px;${ff}color:#334155;width:100%" /><div style="margin-top:4px;font-size:${fs - 3}px;color:#94a3b8">Tối đa ${maxMb}MB${accept ? ` · ${escHtml(accept)}` : ""}</div></div></div>`;
          } else {
            // text, email, phone, and fallback
            const htmlType = tp === "phone" ? "tel" : tp === "email" ? "email" : "text";
            inner += `<div style="margin-bottom:8px"><label style="${fieldLblStyle}">${escHtml(lbl)}${reqStar}</label><input type="${htmlType}" name="${escHtml(nm)}" placeholder="${escHtml(ph)}"${req} style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}color:#374151;${inputBase};box-sizing:border-box" /></div>`;
          }
        }
        inner += `<button type="submit" style="width:100%;padding:12px;background:${escHtml(fmBtnBg)};color:${escHtml(fmBtnText)};border:none;border-radius:${fmInputRadius}px;font-weight:600;cursor:pointer;font-size:${fs}px;${ff}text-align:center;margin-top:4px">${escHtml(buttonText)}</button></form>`;
      }
      return `<div class="lp-element lp-form-container" style="${styles.join(";")}">${inner}</div>`;
    }

    case "html":
      return `<div style="${styles.join(";")}">${DOMPurify.sanitize(textContent, { ALLOWED_TAGS: ["a", "b", "i", "u", "em", "strong", "p", "br", "span", "div", "h1", "h2", "h3", "ul", "ol", "li", "img", "iframe", "blockquote", "code", "pre"], ALLOWED_ATTR: ["href", "target", "src", "alt", "width", "height", "class", "style", "allowfullscreen", "frameborder"] })}</div>`;

    case "html-code": {
      let hc: { subType?: string; code?: string; iframeSrc?: string } = {};
      try { hc = JSON.parse(el.content || "{}"); } catch {}
      const subType = hc.subType ?? "html-js";
      styles.push("overflow:hidden", "border:none");
      if (subType === "iframe" && hc.iframeSrc?.trim()) {
        return `<iframe src="${escHtml(hc.iframeSrc.trim())}" style="${styles.join(";")}" title="Embedded content" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`;
      }
      const rawCode = (hc.code ?? "").trim();
      const wrapDoc = (body: string) => {
        if (/^\s*<!DOCTYPE/i.test(body) || /^\s*<html/i.test(body)) return body;
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0">${body}</body></html>`;
      };
      const safeCode = sanitizeClosingScriptLikeSequences(
        rawCode || "<div style='padding:16px;color:#64748b;font-size:12px'>Chưa có mã HTML</div>",
      );
      const doc = wrapDoc(safeCode);
      const srcdoc = doc.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return `<iframe srcdoc="${srcdoc}" style="${styles.join(";")}" title="Custom HTML" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`;
    }

    case "list": {
      const items = textContent.split("\n").map((i) => `<li>${escHtml(i)}</li>`).join("");
      styles.push("list-style:disc inside", "line-height:1.8");
      return `<ul style="${styles.join(";")}">${items}</ul>`;
    }

    case "gallery": {
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(el.content || "[]");
        urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
      } catch {}

      if (urls.length === 0) {
        styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
        return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Gallery — chưa có ảnh</span></div>`;
      }

      const showThumbs    = Number(s.showThumbnails ?? 1) !== 0;
      const thumbPos      = (s.thumbnailPosition as string) || "bottom";
      const thumbW        = Number(s.thumbWidth ?? 80);
      const thumbH        = Number(s.thumbHeight ?? 60);
      const thumbGap      = Number(s.thumbGap ?? 6);
      const galleryGap    = Number(s.galleryGap ?? 8);
      const showArrows    = Number(s.showArrows ?? 1) !== 0;
      const showDots      = Number(s.showDots ?? 0) !== 0;
      const autoPlay      = Number(s.autoPlay ?? 1) !== 0;
      const autoPlaySpeed = Number(s.autoPlaySpeed ?? 5);
      const borderRadius  = Number(s.borderRadius ?? 8);
      const thumbRadius   = Number(s.thumbnailBorderRadius ?? 4);
      const objFit        = (s.mainObjectFit as string) || "cover";
      const transition    = (s.transition as string) || "fade";
      const total         = urls.length;
      const gid           = `lpgal${Math.floor(Math.abs(Number(el.id ?? 0)) % 1e6)}`;

      const isHoriz = thumbPos === "top" || thumbPos === "bottom";
      const flexDir = thumbPos === "top" ? "column-reverse" : thumbPos === "left" ? "row-reverse" : thumbPos === "right" ? "row" : "column";

      styles.push("overflow:hidden", `border-radius:${borderRadius}px`);

      // Main slides HTML
      const slidesHtml = urls.map((u, i) =>
        `<img src="${escHtml(u)}" alt="" data-idx="${i}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${objFit};display:block;${transition === "fade" ? `opacity:${i === 0 ? 1 : 0};transition:opacity 0.45s ease` : `transform:translateX(${i === 0 ? 0 : 100}%);transition:transform 0.45s ease`}" />`
      ).join("");

      // Arrows
      const arrowStyle = "position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.45);border:none;cursor:pointer;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;padding:0";
      const arrowsHtml = (showArrows && total > 1)
        ? `<button class="${gid}-prev" style="${arrowStyle};left:8px" aria-label="Prev">&#8249;</button><button class="${gid}-next" style="${arrowStyle};right:8px" aria-label="Next">&#8250;</button>`
        : "";

      // Dots
      const dotsHtml = (showDots && total > 1)
        ? `<div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:2">
            ${urls.map((_, i) => `<button class="${gid}-dot" data-idx="${i}" style="width:${i === 0 ? 20 : 8}px;height:8px;border-radius:4px;background:${i === 0 ? "#fff" : "rgba(255,255,255,0.5)"};border:none;cursor:pointer;transition:all 0.25s ease;padding:0"></button>`).join("")}
           </div>`
        : "";

      // Main area
      const mainHtml = `<div class="${gid}-main" style="flex:1;min-height:0;min-width:0;position:relative;border-radius:${borderRadius}px;overflow:hidden;flex-shrink:1">
        ${slidesHtml}${arrowsHtml}${dotsHtml}
      </div>`;

      // Thumbnail strip
      const thumbsHtml = (showThumbs && total > 1)
        ? `<div class="${gid}-thumbs" style="display:flex;flex-direction:${isHoriz ? "row" : "column"};gap:${thumbGap}px;overflow:auto;flex-shrink:0;padding:2px">
            ${urls.map((u, i) => `<img src="${escHtml(u)}" alt="" class="${gid}-thumb" data-idx="${i}" loading="lazy" style="width:${thumbW}px;height:${thumbH}px;border-radius:${thumbRadius}px;object-fit:cover;flex-shrink:0;cursor:pointer;border:${i === 0 ? "2px solid #4f46e5" : "2px solid transparent"};opacity:${i === 0 ? 1 : 0.65};transition:all 0.2s;box-sizing:border-box" />`).join("")}
           </div>`
        : "";

      const wrapStyle = `display:flex;flex-direction:${flexDir};gap:${galleryGap}px;padding:4px;box-sizing:border-box;border-radius:${borderRadius}px;overflow:hidden`;
      const galleryHtml = `<div id="${gid}" style="${styles.join(";")};${wrapStyle}">${mainHtml}${thumbsHtml}</div>`;

      // JS slideshow script
      const script = `
<script>
(function(){
  var root=document.getElementById('${gid}');
  if(!root)return;
  var imgs=root.querySelectorAll('.${gid}-main img');
  var dots=root.querySelectorAll('.${gid}-dot');
  var thumbs=root.querySelectorAll('.${gid}-thumb');
  var cur=0,n=${total},tr='${transition}';
  function goTo(idx){
    var prev=cur;
    cur=(idx+n)%n;
    imgs.forEach(function(img,i){
      if(tr==='slide'){img.style.transform='translateX('+(i===cur?0:i<cur?-100:100)+'%)';}
      else{img.style.opacity=i===cur?'1':'0';}
    });
    dots.forEach(function(d,i){d.style.background=i===cur?'#fff':'rgba(255,255,255,0.5)';d.style.width=i===cur?'20px':'8px';});
    thumbs.forEach(function(t,i){t.style.border=i===cur?'2px solid #4f46e5':'2px solid transparent';t.style.opacity=i===cur?'1':'0.65';});
  }
  var prev=root.querySelector('.${gid}-prev');
  var next=root.querySelector('.${gid}-next');
  if(prev)prev.addEventListener('click',function(){goTo(cur-1);});
  if(next)next.addEventListener('click',function(){goTo(cur+1);});
  dots.forEach(function(d){d.addEventListener('click',function(){goTo(parseInt(d.dataset.idx));});});
  thumbs.forEach(function(t){t.addEventListener('click',function(){goTo(parseInt(t.dataset.idx));});});
  ${autoPlay ? `setInterval(function(){goTo(cur+1);},${autoPlaySpeed * 1000});` : ""}
})();
</script>`;

      return galleryHtml + script;
    }

    case "product-detail": {
      const pd = parseProductDetailContent(el.content ?? undefined);
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const bxShadow = (s.boxShadow as string) ?? "";
      const radius = pd.cardRadius ?? (s.borderRadius as number) ?? 12;
      const imgRadius = pd.imageRadius ?? 8;
      const accent = pd.accentColor || "#6366f1";
      const uid = `pd_${String(el.id).replace(/[^a-z0-9]/gi, "")}`;

      // Button styles from element.styles overrides
      const buyBtnBg = (s.buyButtonBg as string) || accent;
      const buyBtnColor = (s.buyButtonColor as string) || "#ffffff";
      const buyBtnRadius = (s.buyButtonRadius as number) ?? 6;
      const cartBtnBorderColor = (s.cartButtonBorderColor as string) || accent;
      const cartBtnColor = (s.cartButtonColor as string) || accent;
      const cartBtnRadius = (s.cartButtonRadius as number) ?? 6;
      const btnFontSize = (s.buttonFontSize as number) || 12;
      const btnPaddingV = (s.buttonPaddingV as number) ?? 8;

      const isHorizontal = pd.layout === "horizontal";
      const stockInfo: Record<string, { color: string; label: string }> = {
        instock:   { color: "#16a34a", label: pd.stockText || "Còn hàng" },
        limited:   { color: "#d97706", label: pd.stockText || "Sắp hết hàng" },
        outofstock:{ color: "#dc2626", label: pd.stockText || "Hết hàng" },
      };
      const si = stockInfo[pd.stockStatus] ?? stockInfo.instock;

      // Color name → CSS
      const colorMap: Record<string, string> = {
        "đen":"#1a1a1a","den":"#1a1a1a","trắng":"#f5f5f5","trang":"#f5f5f5","trắng kem":"#faf6ee","trang kem":"#faf6ee",
        "đỏ":"#dc2626","do":"#dc2626","xanh":"#3b82f6","xanh lá":"#22c55e","xanh la":"#22c55e","xanh dương":"#2563eb",
        "navy":"#1e3a5f","hồng":"#f472b6","hong":"#f472b6","hồng đậu":"#b5505b","hong dau":"#b5505b",
        "vàng":"#f59e0b","vang":"#f59e0b","cam":"#f97316","tím":"#8b5cf6","tim":"#8b5cf6",
        "xám":"#9ca3af","xam":"#9ca3af","nâu":"#92400e","nau":"#92400e","bạc":"#cbd5e1",
      };
      const getColor = (name: string) => colorMap[name.toLowerCase().trim()] ?? null;

      // Build stars
      const buildStars = (rating: number) => {
        let s2 = "";
        for (let i = 1; i <= 5; i++)
          s2 += `<span style="color:${i <= Math.round(rating) ? "#f59e0b" : "#ddd"};font-size:11px">★</span>`;
        return s2;
      };

      styles.push(
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        ...(bxShadow ? [`box-shadow:${bxShadow}`] : []),
        `overflow:hidden`,
        `display:flex`,
        `flex-direction:${isHorizontal ? "row" : "column"}`,
        `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`,
      );

      const validImgs = pd.images.filter(Boolean);
      const salePriceStr = (pd.salePrice && pd.salePrice !== "0đ") ? pd.salePrice : pd.price || "—";
      const showOrigPrice = pd.salePrice && pd.price && pd.salePrice !== pd.price && pd.salePrice !== "0đ";

      // ── Image column ──
      const imgItems = validImgs.map((url, i) =>
        `<img id="${uid}_img_${i}" src="${escHtml(url)}" alt="" loading="${i === 0 ? "eager" : "lazy"}" ` +
        `style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:${i === 0 ? 1 : 0};transition:opacity .25s" />`
      ).join("");

      const thumbsHtml = validImgs.length > 1
        ? `<div style="display:flex;flex-direction:${isHorizontal ? "column" : "row"};gap:4px;${isHorizontal ? "width:52px;flex-shrink:0;overflow-y:hidden" : "height:52px;overflow-x:hidden;padding:2px 0"}">`
          + validImgs.map((url, i) =>
            `<div id="${uid}_th_${i}" onclick="${uid}_setImg(${i})" style="flex-shrink:0;width:48px;height:48px;border-radius:${imgRadius}px;overflow:hidden;border:2px solid ${i === 0 ? accent : "#e0e0e0"};cursor:pointer;background:#f8f8f8;transition:border .15s;${i === 0 ? `box-shadow:0 0 0 1px ${accent}` : ""}"><img src="${escHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`
          ).join("") + `</div>`
        : "";

      const arrowsHtml = validImgs.length > 1 ? `
        <button onclick="${uid}_setImg(${uid}_cur-1)" style="position:absolute;left:4px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:15px;line-height:22px;text-align:center;color:#333;z-index:3">‹</button>
        <button onclick="${uid}_setImg(${uid}_cur+1)" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:15px;line-height:22px;text-align:center;color:#333;z-index:3">›</button>` : "";

      const badgeHtml = pd.showBadge && pd.badge
        ? `<span style="position:absolute;top:6px;left:6px;background:${accent};color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:2px;z-index:2">${escHtml(pd.badge)}</span>` : "";

      const mainImgArea = validImgs.length > 0
        ? `<div style="position:relative;flex:1;background:#f8f8f8;border-radius:${imgRadius}px;overflow:hidden;min-height:0">${imgItems}${badgeHtml}${arrowsHtml}</div>`
        : `<div style="flex:1;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;border-radius:${imgRadius}px">Ảnh sản phẩm</div>`;

      const imgColStyle = isHorizontal
        ? `width:42%;height:100%;display:flex;flex-direction:row;gap:4px;padding:10px 0 10px 10px;box-sizing:border-box;flex-shrink:0`
        : `width:100%;height:40%;display:flex;flex-direction:column;gap:4px;flex-shrink:0`;

      let inner = `<div style="${imgColStyle}">${mainImgArea}${isHorizontal && thumbsHtml ? thumbsHtml : ""}</div>`;
      if (!isHorizontal && thumbsHtml) inner += thumbsHtml;

      // ── Info column ──
      inner += `<div style="flex:1;padding:${isHorizontal ? "10px 12px 12px 8px" : "8px 12px 10px"};display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0;min-width:0;box-sizing:border-box">`;

      // Category label (vertical only)
      if (pd.category && !isHorizontal) {
        inner += `<div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">${escHtml(pd.category)}</div>`;
      }

      // Title
      inner += `<div style="font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.35;word-break:break-word;display:-webkit-box;-webkit-line-clamp:${isHorizontal ? 3 : 2};-webkit-box-orient:vertical;overflow:hidden">${escHtml(pd.title)}</div>`;

      // Rating + sold
      if (pd.showRating && pd.rating > 0) {
        let ratingRow = `<div style="display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap">`;
        ratingRow += `<span style="display:flex;gap:1px">${buildStars(pd.rating)}</span>`;
        ratingRow += `<span style="color:#f59e0b;font-weight:700;font-size:11px">${pd.rating.toFixed(1)}</span>`;
        if (pd.reviewCount > 0) ratingRow += `<span style="font-size:10px;color:#999">(${pd.reviewCount.toLocaleString()})</span>`;
        if (pd.totalSold > 0) ratingRow += `<span style="font-size:10px;color:#999;border-left:1px solid #e0e0e0;padding-left:5px">${pd.totalSold.toLocaleString()} đã bán</span>`;
        ratingRow += `</div>`;
        inner += ratingRow;
      }

      // Price
      inner += `<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;background:#fafafa;padding:5px 8px;border-radius:4px">`;
      inner += `<span style="font-size:${isHorizontal ? 20 : 16}px;font-weight:800;color:${accent};line-height:1">${escHtml(salePriceStr)}</span>`;
      if (showOrigPrice) inner += `<span style="font-size:10px;color:#aaa;text-decoration:line-through">${escHtml(pd.price)}</span>`;
      inner += `</div>`;

      // Variants
      if (pd.showVariants) {
        pd.variants.forEach((v) => {
          inner += `<div style="flex-shrink:0"><div style="font-size:10px;font-weight:600;color:#333;margin-bottom:4px">${escHtml(v.label)}: <span style="font-weight:400;color:#555">${escHtml(v.options[0] ?? "")}</span></div>`;
          inner += `<div style="display:flex;flex-wrap:wrap;gap:4px">`;
          v.options.slice(0, 8).forEach((opt, oi) => {
            const cssColor = v.type === "color" ? getColor(opt) : null;
            if (cssColor) {
              inner += `<div title="${escHtml(opt)}" style="width:22px;height:22px;border-radius:50%;background:${cssColor};border:2px solid ${oi === 0 ? accent : "#ddd"};cursor:pointer;${oi === 0 ? `box-shadow:0 0 0 1px ${accent}` : ""}"></div>`;
            } else {
              inner += `<span style="font-size:10px;padding:3px 8px;border-radius:2px;border:1px solid ${oi === 0 ? accent : "#ddd"};background:${oi === 0 ? "#fff" : "#fafafa"};color:${oi === 0 ? accent : "#555"};font-weight:${oi === 0 ? 700 : 400};cursor:pointer">${escHtml(opt)}</span>`;
            }
          });
          inner += `</div></div>`;
        });
      }

      // Quantity
      if (pd.showQuantity) {
        inner += `<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">`;
        inner += `<span style="font-size:10px;font-weight:600;color:#555">Số lượng:</span>`;
        inner += `<div style="display:flex;align-items:center;border:1px solid #ddd;border-radius:4px;overflow:hidden">`;
        inner += `<button onclick="this.nextElementSibling.textContent=Math.max(1,+this.nextElementSibling.textContent-1)" style="width:24px;height:24px;border:none;background:#f5f5f5;cursor:pointer;font-size:14px;line-height:24px;color:#444">−</button>`;
        inner += `<span style="width:30px;text-align:center;font-size:12px;font-weight:700;color:#222;line-height:24px">1</span>`;
        inner += `<button onclick="this.previousElementSibling.textContent=+this.previousElementSibling.textContent+1" style="width:24px;height:24px;border:none;background:#f5f5f5;cursor:pointer;font-size:14px;line-height:24px;color:#444">+</button>`;
        inner += `</div>`;
        inner += `<span style="font-size:9px;color:${si.color};font-weight:600">${escHtml(si.label)}</span>`;
        inner += `</div>`;
      }

      // Description
      if (pd.showDescription && pd.description) {
        inner += `<div style="font-size:10px;color:#666;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;flex-shrink:0">${escHtml(pd.description)}</div>`;
      }

      // Features
      if (pd.showFeatures && pd.features.length > 0) {
        inner += `<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">${pd.features.slice(0, 3).map((f) =>
          `<div style="display:flex;gap:5px;font-size:10px;color:#555"><span style="color:#22c55e;font-weight:700">✓</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(f)}</span></div>`
        ).join("")}</div>`;
      }

      // Buttons
      if (pd.showActions) {
        const cartBtnBg2 = (s.cartButtonBg as string) || pd.cartButtonBgColor || "#fff3f0";
        const cartBtnClr = (s.cartButtonColor as string) || accent;
        const cartBtnBdr = (s.cartButtonBorderColor as string) || accent;
        const cartR = (s.cartButtonRadius as number) ?? 2;
        const buyR = (s.buyButtonRadius as number) ?? 2;
        const bFS = (s.buttonFontSize as number) || 11;
        const bPV = (s.buttonPaddingV as number) ?? 8;

        const cartBtn = pd.addCartText
          ? `<a href="#" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:${bPV}px 8px;border:1.5px solid ${cartBtnBdr};border-radius:${cartR}px;background:${cartBtnBg2};color:${cartBtnClr};font-weight:700;font-size:${bFS}px;text-decoration:none;box-sizing:border-box">🛒 ${escHtml(pd.addCartText)}</a>`
          : "";
        const buyBtn = `<a href="#" style="flex:${pd.addCartText ? 1 : 2};display:block;padding:${bPV}px 8px;background:${buyBtnBg};border-radius:${buyR}px;color:${buyBtnColor};font-weight:700;font-size:${bFS}px;text-align:center;text-decoration:none;box-sizing:border-box">${escHtml(pd.buyButtonText)}</a>`;
        inner += `<div style="display:flex;gap:6px;margin-top:${isHorizontal ? "auto" : "6px"};padding-top:4px;flex-shrink:0;border-top:1px solid #f0f0f0">${cartBtn}${buyBtn}</div>`;
      }

      inner += `</div>`;

      // Gallery JS
      const galleryScript = validImgs.length > 1 ? `<script>
(function(){
  var uid="${uid}",n=${validImgs.length},cur=0;
  window[uid+"_cur"]=0;
  function setImg(i){
    if(i<0)i=n-1; if(i>=n)i=0; cur=i; window[uid+"_cur"]=i;
    for(var j=0;j<n;j++){
      var im=document.getElementById(uid+"_img_"+j);
      if(im)im.style.opacity=(j===i?"1":"0");
      var th=document.getElementById(uid+"_th_"+j);
      if(th)th.style.border="1.5px solid "+(j===i?"${accent}":"#ddd");
    }
  }
  window[uid+"_setImg"]=setImg;
})();
</script>` : "";

      return `<div data-lp-product-detail="true" style="${styles.join(";")}">${inner}</div>${galleryScript}`;
    }

    case "collection-list": {
      type CLItem2 = { image?: string; title?: string; price?: string; originalPrice?: string; badge?: string; rating?: number };
      type CLData2 = { columns?: number; gap?: number; cardRadius?: number; showBadge?: boolean; showRating?: boolean; showOriginalPrice?: boolean; accentColor?: string; items?: CLItem2[] };
      let cl: CLData2 = {};
      try { cl = JSON.parse(el.content || "{}"); } catch {}
      const items = cl.items ?? [];
      const cols = Math.max(1, Math.min(6, cl.columns ?? 3));
      const gap = cl.gap ?? 10;
      const cardRad = cl.cardRadius ?? 8;
      const showBadge = cl.showBadge !== false;
      const showRating = cl.showRating === true;
      const showOrigPrice = cl.showOriginalPrice !== false;
      const accent = cl.accentColor || "#ee4d2d";
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const radius = (s.borderRadius as number) ?? 12;
      styles.push(
        `display:grid`,
        `grid-template-columns:repeat(${cols},1fr)`,
        `align-content:start`,
        `gap:${gap}px`,
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        `padding:10px`,
        `overflow:visible`,
        `box-sizing:border-box`,
        `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`,
      );
      const buildStarsCL = (r: number) => {
        let st = "";
        for (let i = 1; i <= 5; i++)
          st += `<span style="color:${i <= Math.round(r) ? "#f59e0b" : "#d1d5db"};font-size:9px">★</span>`;
        return st;
      };
      const card = (item: CLItem2) => {
        const img = item.image?.trim();
        const hasOrigPrice = showOrigPrice && item.originalPrice && item.originalPrice !== item.price;
        const badgeHtml = showBadge && item.badge
          ? `<span style="position:absolute;top:5px;left:5px;background:${accent};color:#fff;font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;line-height:1.4;letter-spacing:0.3px">${escHtml(item.badge)}</span>`
          : "";
        const imgHtml = img
          ? `<img src="${escHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:20px">🖼️</div>`;
        const ratingHtml = showRating && (item.rating ?? 0) > 0
          ? `<div style="display:flex;gap:1px;margin-bottom:2px">${buildStarsCL(item.rating!)}</div>` : "";
        const priceRow = `<span style="font-size:12px;font-weight:800;color:${accent};line-height:1">${escHtml(item.price || "—")}</span>${hasOrigPrice ? `<span style="font-size:9px;color:#9ca3af;text-decoration:line-through;margin-left:4px">${escHtml(item.originalPrice!)}</span>` : ""}`;
        return `<div style="background:#fff;border-radius:${cardRad}px;overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,0.07)">` +
          `<div style="position:relative;width:100%;aspect-ratio:1/1;background:#f0f0f0;overflow:hidden;flex-shrink:0">${imgHtml}${badgeHtml}</div>` +
          `<div style="padding:7px 8px 8px;flex:1;display:flex;flex-direction:column;gap:3px">` +
          ratingHtml +
          `<div style="font-size:11px;font-weight:600;color:#1a1a1a;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word">${escHtml(item.title || "Sản phẩm")}</div>` +
          `<div style="margin-top:auto;display:flex;align-items:baseline;flex-wrap:wrap;padding-top:2px">${priceRow}</div>` +
          `</div></div>`;
      };
      const cells = items.map((item) => card(item)).join("");
      return `<div data-lp-collection-list="true" style="${styles.join(";")}">${cells || '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:13px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="font-size:28px">🛍️</span><span>Danh sách sản phẩm</span></div>'}</div>`;
    }

    case "carousel": {
      const { layoutType: lt, items: carouselItems, carouselStyle: cStyle } = parseCarouselContent(el.content ?? undefined);
      const cs = mergeCarouselStyle(cStyle);
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const br = s.borderRadius != null ? Number(s.borderRadius) : 12;
      const autoplayMs = Math.max(1000, cs.autoplayMs ?? 5000);
      const transMs = cs.transitionMs ?? 450;
      const transFade = cs.transitionType === "fade";
      const isHero = lt === "hero";
      const isLogos = lt === "logos";
      const isStats = lt === "stats";
      const isCards = lt === "cards";
      const isTestimonial = lt === "testimonial";
      const isMedia = lt === "media";
      const isProduct = lt === "product";
      const dotActiveColor = cs.dotActiveColor ?? "#6366f1";
      const dotColor = cs.dotColor ?? "#d1d5db";
      const ff = cs.fontFamily ? `font-family:${escHtml(cs.fontFamily)},sans-serif;` : "";
      const dotH = cs.dotStyle === "bar" ? 3 : 7;
      const getDotBr = () => cs.dotStyle === "bar" ? 2 : 4;

      const baseOverflow = isHero ? "hidden" : "visible";
      styles.push(
        `background-color:${isHero ? "transparent" : bg}`,
        `border-radius:${br}px`,
        `overflow:${baseOverflow}`,
        `box-sizing:border-box`,
      );
      if (!isHero) styles.push(`padding:${isLogos || isStats ? "12px 16px" : "16px 8px 10px"}`);

      if (carouselItems.length === 0) {
        return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Carousel</span></div>`;
      }
      const n = carouselItems.length;
      const stripQ = (str: string) => escHtml(str.replace(/^["\u201c\u2018']+|["\u201d\u2019']+$/g, "").trim());

      const buildStars = (rating?: number) => {
        if (!cs.showRating || !rating) return "";
        const stars = [1,2,3,4,5].map(i => `<span style="color:${i<=rating?cs.ratingColor:"#d1d5db"}">\u2605</span>`).join("");
        return `<div style="display:flex;justify-content:center;gap:2px;margin-bottom:6px;font-size:14px">${stars}</div>`;
      };

      const buildSlide = (item: (typeof carouselItems)[0], si: number) => {
        let inner = "";
        const pad = n > 1 ? "0 32px" : "0 4px";
        const displayBase = transFade
          ? `opacity:${si===0?1:0};pointer-events:${si===0?"auto":"none"}`
          : `display:${si===0?"flex":"none"}`;

        if (isTestimonial) {
          if (item.avatar?.trim()) {
            inner += `<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:#e2e8f0;margin:0 auto 10px;box-shadow:0 2px 14px rgba(0,0,0,.13);flex-shrink:0"><img src="${escHtml(item.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`;
          }
          inner += buildStars(item.rating);
          const q = stripQ(item.quote || "Tr\u00edch d\u1eabn kh\u00e1ch h\u00e0ng");
          inner += `<div style="${ff}font-style:italic;font-size:${cs.quoteFontSize}px;color:${cs.quoteColor};text-align:${cs.quoteAlign};line-height:1.7;padding:0 6px;margin-bottom:12px">\u201c${q}\u201d</div>`;
          inner += `<div style="${ff}font-size:${cs.nameFontSize}px;font-weight:700;color:${cs.nameColor};text-align:${cs.nameAlign};line-height:1.3;margin-bottom:2px">${escHtml(item.name || "Kh\u00e1ch h\u00e0ng")}</div>`;
          if (item.role) inner += `<div style="${ff}font-size:${cs.roleFontSize}px;color:${cs.roleColor};text-align:${cs.roleAlign};opacity:0.75;line-height:1.3">${escHtml(item.role)}</div>`;
          return `<div data-lp-carousel-slide data-slide-index="${si}" style="${transFade?"position:absolute;inset:0;transition:opacity "+transMs+"ms;"+displayBase:"flex-direction:column;align-items:center;width:100%;box-sizing:border-box;padding:"+pad+";"+displayBase+";flex-direction:column;align-items:center"}">${inner}</div>`;
        }

        if (isMedia) {
          if (item.image?.trim()) {
            inner += `<div style="width:100%;border-radius:8px;overflow:hidden;background:#e2e8f0;margin-bottom:10px;aspect-ratio:16/9;flex-shrink:0"><img src="${escHtml(item.image)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`;
          }
          if (item.title || item.name) inner += `<div style="${ff}font-size:${cs.titleFontSize}px;font-weight:700;color:${cs.titleColor};text-align:${cs.titleAlign};margin-bottom:4px;line-height:1.3">${escHtml(item.title || item.name || "")}</div>`;
          if (item.desc?.trim()) inner += `<div style="${ff}font-size:${cs.descFontSize}px;color:${cs.descColor};text-align:${cs.descAlign};line-height:1.55">${escHtml(item.desc)}</div>`;
          return `<div data-lp-carousel-slide data-slide-index="${si}" style="${transFade?"position:absolute;inset:0;transition:opacity "+transMs+"ms;"+displayBase:"flex-direction:column;align-items:center;width:100%;box-sizing:border-box;padding:"+pad+";"+displayBase+";flex-direction:column;align-items:center"}">${inner}</div>`;
        }

        if (isHero) {
          const heroBg = item.bgImage?.trim()
            ? `background:url(${escHtml(item.bgImage)}) center/cover no-repeat`
            : `background:${item.bgColor?.trim() || bg}`;
          let heroInner = `<div style="position:absolute;inset:0;${heroBg};border-radius:${br}px;overflow:hidden">`;
          if (item.bgImage?.trim()) {
            heroInner += `<div style="position:absolute;inset:0;background:${cs.overlayColor};opacity:${cs.overlayOpacity}"></div>`;
          }
          heroInner += `<div style="position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 48px;box-sizing:border-box;gap:8px">`;
          heroInner += `<div style="${ff}font-size:${cs.titleFontSize+4}px;font-weight:800;color:#fff;text-align:${cs.titleAlign};line-height:1.2;text-shadow:0 2px 8px rgba(0,0,0,.4)">${escHtml(item.title || "Ti\u00eau \u0111\u1ec1")}</div>`;
          if (item.subtitle?.trim()) heroInner += `<div style="${ff}font-size:${cs.descFontSize+1}px;color:rgba(255,255,255,0.88);text-align:${cs.descAlign};line-height:1.5">${escHtml(item.subtitle)}</div>`;
          if (item.btnText?.trim()) {
            const linkT = item.btnLinkType ?? "url";
            let aAttrs = "";
            if (linkT === "url") {
              const u = item.btnUrl?.trim();
              aAttrs = u ? `href="${escHtml(u)}"` : 'href="#"';
            } else if (linkT === "section") {
              const sid = item.btnSectionId;
              const st = sid != null && Number.isFinite(Number(sid)) ? String(sid) : "";
              aAttrs =
                `href="#" data-lp-carousel-cta="1" data-action-type="section" data-action-target="${escHtml(st)}"`;
            } else {
              const pt = (item.btnPopupTarget ?? "").trim();
              aAttrs =
                `href="#" data-lp-carousel-cta="1" data-action-type="popup" data-action-target="${escHtml(pt)}"`;
            }
            heroInner +=
              `<a ${aAttrs} style="margin-top:6px;display:inline-block;${ff}background:${cs.btnBg};color:${cs.btnColor};padding:9px 24px;border-radius:${cs.btnRadius}px;font-size:13px;font-weight:700;text-decoration:none;cursor:pointer">${escHtml(item.btnText)}</a>`;
          }
          heroInner += `</div></div>`;
          return `<div data-lp-carousel-slide data-slide-index="${si}" style="position:absolute;inset:0;${transFade?"transition:opacity "+transMs+"ms;":""}${displayBase}">${heroInner}</div>`;
        }

        if (isCards) {
          inner += `<div style="background:${cs.cardBg};border-radius:${cs.cardRadius}px;padding:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);box-sizing:border-box;width:100%">`;
          if (item.image?.trim()) inner += `<div style="width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#e2e8f0;margin-bottom:10px"><img src="${escHtml(item.image)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`;
          inner += `<div style="${ff}font-size:${cs.titleFontSize}px;font-weight:700;color:${cs.titleColor};text-align:${cs.titleAlign};line-height:1.3;margin-bottom:5px">${escHtml(item.title || "Ti\u00eau \u0111\u1ec1")}</div>`;
          if (item.desc?.trim()) inner += `<div style="${ff}font-size:${cs.descFontSize}px;color:${cs.descColor};text-align:${cs.descAlign};line-height:1.5">${escHtml(item.desc)}</div>`;
          inner += `</div>`;
          return `<div data-lp-carousel-slide data-slide-index="${si}" style="${transFade?"position:absolute;inset:0;transition:opacity "+transMs+"ms;"+displayBase:"flex-direction:column;align-items:center;width:100%;box-sizing:border-box;padding:"+pad+";"+displayBase+";flex-direction:column;align-items:center"}">${inner}</div>`;
        }

        // logos / stats — no slide animation, show all
        return "";
      };

      // Product / multi-slide: N items visible simultaneously, translateX animation
      if (isProduct) {
        const spv = Math.max(1, Math.round((cs as { slidesPerView?: number }).slidesPerView ?? 3));
        const gap = (cs as { slideGap?: number }).slideGap ?? 12;
        const showCap = (cs as { showCaption?: boolean }).showCaption ?? false;
        const productId = "cprod_" + Math.random().toString(36).substring(2, 9);
        const totalSlides = carouselItems.length;
        const maxOffset = Math.max(0, totalSlides - spv);
        const slideWidthExpr = `calc((100% - ${gap * (spv - 1)}px) / ${spv})`;

        const slidesHtmlProd = carouselItems.map((it) => {
          let slideInner = "";
          if (it.image?.trim()) {
            slideInner += `<div style="flex:1;overflow:hidden;background:#f1f5f9"><img src="${escHtml(it.image)}" alt="${escHtml(it.title || "")}" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`;
          } else {
            slideInner += `<div style="flex:1;background:#e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:11px;color:#94a3b8">Ảnh</span></div>`;
          }
          if (showCap && (it.title || it.desc)) {
            slideInner += `<div style="padding:6px 10px;background:${cs.cardBg ?? "#fff"}">`;
            if (it.title) slideInner += `<div style="${ff}font-size:${(cs.titleFontSize ?? 14) - 2}px;font-weight:600;color:${cs.titleColor ?? "#1e293b"};line-height:1.3">${escHtml(it.title)}</div>`;
            if (it.desc) slideInner += `<div style="${ff}font-size:${(cs.descFontSize ?? 12) - 1}px;color:${cs.descColor ?? "#64748b"};margin-top:2px">${escHtml(it.desc)}</div>`;
            slideInner += `</div>`;
          }
          return `<div style="flex-shrink:0;width:${slideWidthExpr};border-radius:${cs.cardRadius ?? 10}px;overflow:hidden;background:${cs.cardBg ?? "#fff"};box-shadow:0 2px 10px rgba(0,0,0,.08);display:flex;flex-direction:column">${slideInner}</div>`;
        }).join("");

        const arwBg = cs.arrowBg ?? "rgba(255,255,255,0.9)";
        const arwColor = cs.arrowColor ?? "#374151";
        const arwW = 32;
        let prodArrows = "";
        if (cs.showArrows && totalSlides > spv) {
          prodArrows = `<button type="button" data-prod-prev aria-label="Trước" style="position:absolute;left:4px;top:50%;transform:translateY(-50%);z-index:10;width:${arwW}px;height:${arwW}px;border-radius:50%;border:none;background:${arwBg};color:${arwColor};cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 4px rgba(0,0,0,.15)">&#8249;</button>`
                      + `<button type="button" data-prod-next aria-label="Tiếp" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);z-index:10;width:${arwW}px;height:${arwW}px;border-radius:50%;border:none;background:${arwBg};color:${arwColor};cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 4px rgba(0,0,0,.15)">&#8250;</button>`;
        }

        let prodDots = "";
        if (cs.showDots && totalSlides > spv) {
          const dotCount = maxOffset + 1;
          const dotsHtml = Array.from({ length: dotCount }).map((_, di) => {
            const active = di === 0;
            const dw = cs.dotStyle === "circle" ? 7 : (active ? 24 : 7);
            return `<button type="button" data-prod-dot="${di}" style="width:${dw}px;height:${dotH}px;border:none;border-radius:${getDotBr()}px;background:${active ? dotActiveColor : dotColor};cursor:pointer;padding:0;flex-shrink:0;transition:background .25s,width .25s"></button>`;
          }).join("");
          prodDots = `<div style="display:flex;gap:4px;justify-content:center;margin-top:8px">${dotsHtml}</div>`;
        }

        const prodScript = `<script>(function(){
  var w=document.getElementById('${productId}');
  if(!w) return;
  var track=w.querySelector('[data-prod-track]');
  var prev=w.querySelector('[data-prod-prev]');
  var next=w.querySelector('[data-prod-next]');
  var dots=w.querySelectorAll('[data-prod-dot]');
  var cur=0,max=${maxOffset},spv=${spv},gap=${gap},ms=${transMs};
  var dotAc="${escHtml(dotActiveColor)}",dotIn="${escHtml(dotColor)}",dotStyle="${cs.dotStyle ?? "circle"}",dotH=${dotH},dotBr=${getDotBr()};
  function getW(on){return dotStyle==="circle"?7:(on?24:7);}
  function go(i){
    i=Math.max(0,Math.min(max,i));
    cur=i;
    track.style.transform='translateX(calc(-'+i+' * (calc((100% - '+gap*(spv-1)+'px) / '+spv+') + '+gap+'px)))';
    dots.forEach(function(d,k){var on=k===i;d.style.background=on?dotAc:dotIn;d.style.width=getW(on)+'px';d.style.height=dotH+'px';d.style.borderRadius=dotBr+'px';});
  }
  if(prev) prev.addEventListener('click',function(){go(cur-1);});
  if(next) next.addEventListener('click',function(){go(cur+1);});
  dots.forEach(function(d,k){d.addEventListener('click',function(){go(k);});});
  var timer=${autoplayMs > 0 ? `setInterval(function(){go(cur+1>max?0:cur+1);},${autoplayMs})` : "null"};
  w.addEventListener('mouseenter',function(){if(timer)clearInterval(timer);});
  w.addEventListener('mouseleave',function(){if(timer){timer=setInterval(function(){go(cur+1>max?0:cur+1);},${autoplayMs});}});
})();<\/script>`;

        // Rebuild compact styles for the product outer wrapper
        const prodOuterStyle = styles.map(st => st.replace(/overflow:[^;]+/, "overflow:hidden")).join(";");

        return `<div id="${productId}" style="${prodOuterStyle}">` +
          `<div data-prod-track style="display:flex;gap:${gap}px;transition:transform ${transMs}ms ease;will-change:transform;height:100%;align-items:stretch">` +
          slidesHtmlProd +
          `</div>` +
          prodArrows +
          prodDots +
          `</div>` +
          prodScript;
      }

      // Logos: show all items in a row
      if (isLogos) {
        const logosHtml = carouselItems.slice(0,8).map(it =>
          `<div style="display:flex;align-items:center;justify-content:center;opacity:0.7;transition:opacity .2s">` +
          (it.image?.trim()
            ? `<img src="${escHtml(it.image)}" alt="${escHtml(it.name||"")}" style="height:${cs.logoHeight}px;max-width:120px;object-fit:contain;display:block;${cs.logoGrayscale?"filter:grayscale(1)":""}" />`
            : `<div style="width:80px;height:${cs.logoHeight}px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:#94a3b8">${escHtml(it.name||"Logo")}</span></div>`
          ) + `</div>`
        ).join("");
        return `<div style="${styles.join(";")}"><div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:16px;width:100%">${logosHtml}</div></div>`;
      }

      // Stats: show all
      if (isStats) {
        const statsHtml = carouselItems.map(it =>
          `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">` +
          `<span style="${ff}font-size:${cs.numberFontSize}px;font-weight:800;color:${cs.numberColor};line-height:1">${escHtml(it.number||it.title||"0")}</span>` +
          `<span style="${ff}font-size:11px;color:${cs.labelColor}">${escHtml(it.label||it.desc||"")}</span>` +
          `</div>`
        ).join("");
        return `<div style="${styles.join(";")}"><div style="display:flex;justify-content:center;gap:32px;flex-wrap:wrap;width:100%">${statsHtml}</div></div>`;
      }

      const slidesHtml = carouselItems.map((it, si) => buildSlide(it, si)).join("");
      const carouselId = "carousel_" + Math.random().toString(36).substring(2, 9);
      const maxDots = 12;
      const dotCount = Math.min(n, maxDots);

      // Hero dots positioned absolute at bottom
      let dotsRow = "";
      if (cs.showDots && dotCount > 1) {
        const heroDotsHtml = carouselItems.slice(0, maxDots).map((_, di) => {
          const active = di === 0;
          const dw = cs.dotStyle === "circle" ? 7 : (active ? 24 : 7);
          const dbg = isHero ? (active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)") : (active ? dotActiveColor : dotColor);
          return `<button type="button" data-lp-carousel-dot="${di}" aria-label="Slide ${di+1}" aria-current="${active?"true":"false"}" style="width:${dw}px;height:${dotH}px;border:none;border-radius:${getDotBr()}px;background:${dbg};cursor:pointer;padding:0;flex-shrink:0;transition:background .25s,width .25s"></button>`;
        }).join("");
        if (isHero) {
          dotsRow = `<div style="position:absolute;bottom:12px;left:0;right:0;display:flex;gap:6px;justify-content:center;pointer-events:auto">${heroDotsHtml}</div>`;
        } else {
          dotsRow = `<div style="display:flex;gap:5px;align-items:center;margin-top:12px;justify-content:center;flex-shrink:0">${heroDotsHtml}</div>`;
        }
      }

      // Arrows
      let navBtns = "";
      if (cs.showArrows && n > 1) {
        const arwBg = isHero ? "rgba(255,255,255,0.18)" : cs.arrowBg;
        const arwColor = isHero ? "#fff" : cs.arrowColor;
        const arwW = cs.arrowStyle === "minimal" ? 24 : 32;
        const arwR = cs.arrowStyle === "pill" ? "4px" : "50%";
        const arwShadow = cs.arrowStyle !== "minimal" ? "box-shadow:0 1px 4px rgba(0,0,0,.15);" : "";
        const arwLeft = isHero ? 10 : 6;
        const arwRight = isHero ? 10 : 6;
        navBtns = `<button type="button" data-lp-carousel-prev aria-label="Slide tr\u01b0\u1edbc" style="position:absolute;left:${arwLeft}px;top:50%;transform:translateY(-50%);z-index:10;width:${arwW}px;height:${arwW}px;border-radius:${arwR};border:none;background:${arwBg};color:${arwColor};cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;${arwShadow}">&#8249;</button><button type="button" data-lp-carousel-next aria-label="Slide ti\u1ebfp" style="position:absolute;right:${arwRight}px;top:50%;transform:translateY(-50%);z-index:10;width:${arwW}px;height:${arwW}px;border-radius:${arwR};border:none;background:${arwBg};color:${arwColor};cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;${arwShadow}">&#8250;</button>`;
      }

      const wrapInner = isHero
        ? slidesHtml
        : `<div style="display:flex;flex-direction:column;width:100%;align-items:center;${transFade?"position:relative":""}">` + slidesHtml + `</div>` + dotsRow;
      const heroExtra = isHero ? dotsRow : "";

      const isolateScript = n > 1 ? `<script>
        (function(){
          var cfg={n:${n},autoMs:${autoplayMs},fade:${transFade?1:0},transMs:${transMs},dotAc:"${escHtml(dotActiveColor)}",dotIn:"${escHtml(dotColor)}",isHero:${isHero?1:0},dotStyle:"${cs.dotStyle}",dotH:${dotH},dotBr:${getDotBr()}};
          var init=function(){
            var w=document.getElementById('${carouselId}');
            if(!w) return;
            var slides=w.querySelectorAll('[data-lp-carousel-slide]');
            var dots=w.querySelectorAll('[data-lp-carousel-dot]');
            var prev=w.querySelector('[data-lp-carousel-prev]');
            var next=w.querySelector('[data-lp-carousel-next]');
            var cur=0;
            function getW(on){return cfg.dotStyle==="circle"?7:(on?24:7);}
            function getBg(on,hero){return hero?(on?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.4)"):(on?cfg.dotAc:cfg.dotIn);}
            function go(i){
              i=(i%cfg.n+cfg.n)%cfg.n;
              if(cfg.fade){
                slides.forEach(function(sl,k){
                  sl.style.opacity=k===i?'1':'0';
                  sl.style.pointerEvents=k===i?'auto':'none';
                });
              } else {
                slides.forEach(function(sl,k){
                  sl.style.display=k===i?'flex':'none';
                });
              }
              dots.forEach(function(d,k){
                var on=k===i;
                d.setAttribute('aria-current',on?'true':'false');
                d.style.background=getBg(on,cfg.isHero);
                d.style.width=getW(on)+'px';
                d.style.height=cfg.dotH+'px';
                d.style.borderRadius=cfg.dotBr+'px';
              });
              cur=i;
            }
            var timer=setInterval(function(){go(cur+1);},cfg.autoMs);
            function reset(){clearInterval(timer);timer=setInterval(function(){go(cur+1);},cfg.autoMs);}
            if(prev) prev.addEventListener('click',function(e){e.preventDefault();go(cur-1);reset();});
            if(next) next.addEventListener('click',function(e){e.preventDefault();go(cur+1);reset();});
            dots.forEach(function(d,i){d.addEventListener('click',function(e){e.preventDefault();go(i);reset();});});
            w.addEventListener('touchstart',function(e){w._ts=e.changedTouches[0].clientX;},{passive:true});
            w.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-(w._ts||0);if(Math.abs(dx)>40){go(dx<0?cur+1:cur-1);reset();}});
          };
          if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
          else init();
        })();
      </script>` : "";

      return `<div id="${carouselId}" data-lp-carousel="1" style="${styles.join(";")}">${wrapInner}${heroExtra}${navBtns}</div>${isolateScript}`;
    }

    case "tabs": {
      const { items: tabItems } = parseTabsContent(el.content ?? undefined);
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      styles.push(
        `background-color:${bg}`,
        `border-radius:8px`,
        `overflow:hidden`,
        `box-sizing:border-box`,
        `display:flex`,
        `flex-direction:column`,
      );
      if (tabItems.length === 0) {
        return `<div data-lp-tabs="true" style="${styles.join(";")};"><div style="padding:8px;background:#f1f5f9;font-size:11px;color:#94a3b8">Tab 1 | Tab 2 | Tab 3</div><div style="flex:1;display:flex;align-items:center;justify-content:center"><span style="color:#94a3b8;font-size:12px">Nội dung tab</span></div></div>`;
      }
      const slice = tabItems.slice(0, 5);
      const tabBar = slice
        .map(
          (tab, ti) =>
            `<button type="button" role="tab" data-lp-tab-btn data-tab-index="${ti}" aria-selected="${ti === 0 ? "true" : "false"}" style="padding:8px 12px;font-size:11px;font-weight:${ti === 0 ? 700 : 400};background:${ti === 0 ? "#6366f1" : "transparent"};color:${ti === 0 ? "#fff" : "#64748b"};border:none;cursor:pointer;flex:1">${escHtml(tab.label || `Tab ${ti + 1}`)}</button>`,
        )
        .join("");
      const panels = slice
        .map((tab, ti) => {
          let inner = "";
          if (tab.image?.trim()) {
            inner += `<div style="flex:0 0 auto;max-height:55%;overflow:hidden;background:#e2e8f0;border-radius:6px;margin:8px"><img src="${escHtml(tab.image)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" /></div>`;
          }
          if (tab.title) inner += `<div style="font-size:13px;font-weight:600;color:#1e293b;padding:0 8px 4px">${escHtml(tab.title)}</div>`;
          if (tab.desc) inner += `<div style="font-size:11px;color:#64748b;padding:0 8px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escHtml(tab.desc)}</div>`;
          if (!inner) inner = `<span style="color:#94a3b8;font-size:12px;padding:8px">Chưa có nội dung</span>`;
          return `<div data-lp-tab-panel role="tabpanel" style="display:${ti === 0 ? "flex" : "none"};flex-direction:column;flex:1;overflow:auto;min-height:0">${inner}</div>`;
        })
        .join("");
      return `<div data-lp-tabs="true" class="lp-tabs-widget" style="${styles.join(";")}"><div style="display:flex;background:#f1f5f9;flex-shrink:0">${tabBar}</div><div style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">${panels}</div></div>`;
    }

    case "group": {
      let data: { v?: number; items?: EditorElement[] } = {};
      try {
        data = JSON.parse(el.content || "{}");
      } catch {
        data = {};
      }
      const items = data.items ?? [];
      const gw = Math.max(Number(ew) || 100, 1);
      const gh = Math.max(Number(eh) || 100, 1);
      const br = (s.borderRadius as number) ?? 0;
      const bdRaw = s.border as string | undefined;
      // Filter out editor-indicator borders (dashed #6366f1) — they must not show in published pages
      const bd = bdRaw && bdRaw !== "none" && !bdRaw.includes("#6366f1") ? bdRaw : "none";
      const bg = (s.backgroundColor as string) || "transparent";
      const pad = Number(s.padding ?? 0);
      const shadow = s.boxShadow ? `box-shadow:${s.boxShadow};` : "";
      const inner = items
        .map((child) => {
          const adjusted = pad > 0
            ? { ...child, x: (child.x ?? 0) + pad, y: (child.y ?? 0) + pad }
            : child;
          const merged = mergeStylesFromJson(adjusted as EditorElementWithStylesJson);
          return addDataAttrs(merged, elementToHtml(merged, gw, gh, htmlCodeFullScreen, ctx));
        })
        .join("");
      return `<div style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:${br}px;border:${bd};background:${bg};box-sizing:border-box;${shadow}"><div style="position:relative;width:100%;min-height:100%;height:100%">${inner}</div></div>`;
    }

    case "frame": {
      const fc = parseFrameContent(textContent);
      const frameFf = fc.fontFamily?.trim()
        ? `'${escHtml(fc.fontFamily.trim())}',system-ui,sans-serif`
        : "system-ui,sans-serif";
      const radius = (s.borderRadius as number) ?? 12;
      const pad = fc.padding ?? 16;
      const bg = fc.background || "#ffffff";
      styles.push("overflow:hidden", `border-radius:${radius}px`, "box-sizing:border-box");
      if (s.boxShadow) styles.push(`box-shadow:${s.boxShadow}`);
      if (s.border && String(s.border).trim()) styles.push(`border:${s.border}`);
      else if (s.borderWidth && Number(s.borderWidth) > 0)
        styles.push(`border:${s.borderWidth}px solid ${(s.borderColor as string) ?? "#e2e8f0"}`);

      let inner = "";
      if (fc.variant === "quote") {
        const qm = fc.quoteMarkColor ?? "#0044ff";
        const tc = fc.quoteTextColor ?? "#334155";
        const fc2 = fc.quoteFooterColor ?? "#0044ff";
        const qmf = fc.quoteMarkFontSize ?? 36;
        const qtf = fc.quoteTextFontSize ?? 13;
        const qff = fc.quoteFooterFontSize ?? 12;
        inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;font-family:${frameFf};box-shadow:inset 0 -24px 48px -28px rgba(0,68,255,0.07)">
          <span style="font-size:${qmf}px;line-height:1;color:${escHtml(qm)};font-weight:800">&ldquo;</span>
          <p style="margin:0;font-size:${qtf}px;line-height:1.65;color:${escHtml(tc)};max-width:92%">${escHtml(fc.quoteText ?? "")}</p>
          <span style="font-size:${qff}px;font-weight:700;color:${escHtml(fc2)}">${escHtml(fc.quoteFooter ?? "")}</span>
        </div>`;
      } else if (fc.variant === "split-feature") {
        const img = (fc.splitImage ?? "").trim();
        const pos = fc.splitImagePosition === "right" ? "row-reverse" : "row";
        const ir = fc.splitImageRadius ?? 8;
        const imgBlock = img
          ? `<img src="${escHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:${ir}px" loading="lazy" />`
          : `<div style="width:100%;height:100%;min-height:120px;background:#e2e8f0;border-radius:${ir}px"></div>`;
        const stf = fc.splitTitleFontSize ?? 15;
        const sbf = fc.splitBodyFontSize ?? 12;
        inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;flex-direction:${pos};gap:14px;align-items:stretch;font-family:${frameFf}">
          <div style="flex:1;min-width:0;overflow:hidden;border-radius:${ir}px">${imgBlock}</div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:4px 0">
            <div style="font-size:${stf}px;font-weight:700;color:${escHtml(fc.splitTitleColor ?? "#0f172a")};line-height:1.35">${escHtml(fc.splitTitle ?? "")}</div>
            <div style="font-size:${sbf}px;color:${escHtml(fc.splitBodyColor ?? "#64748b")};line-height:1.6;white-space:pre-wrap;word-break:break-word">${escHtml(fc.splitBody ?? "")}</div>
          </div>
        </div>`;
      } else if (fc.variant === "profile-cta") {
        const img = (fc.profileImage ?? "").trim();
        const size = fc.profileImageSize ?? 96;
        const round = fc.profileImageRound !== false;
        const br = fc.profileBtnRadius ?? 8;
        const btnBg = fc.profileBtnBg ?? "#0d9488";
        const btnFg = fc.profileBtnColor ?? "#ffffff";
        const layout = fc.profileLayout ?? "vertical";
        const imgEl = img
          ? `<img src="${escHtml(img)}" alt="" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:${round ? "50%" : "12px"};flex-shrink:0;display:block;box-shadow:0 2px 8px rgba(15,23,42,0.08)" loading="lazy" />`
          : `<div style="width:${size}px;height:${size}px;border-radius:${round ? "50%" : "12px"};background:#e2e8f0;flex-shrink:0"></div>`;
        const ptf = fc.profileTitleFontSize ?? 13;
        const pnf = fc.profileNameFontSize ?? 14;
        const prf = fc.profileRoleFontSize ?? 12;
        const pbf = fc.profileBodyFontSize ?? 12;
        const pbtnf = fc.profileBtnFontSize ?? 12;
        const titleHtml = (fc.profileTitle ?? "").trim()
          ? `<div style="font-size:${ptf}px;font-weight:800;letter-spacing:0.06em;color:${escHtml(fc.profileTitleColor ?? "#0d9488")};line-height:1.3;text-align:${layout === "vertical" ? "center" : "left"}">${escHtml(fc.profileTitle ?? "")}</div>`
          : "";
        const nameHtml = (fc.profileName ?? "").trim()
          ? `<div style="font-size:${pnf}px;font-weight:700;color:${escHtml(fc.profileNameColor ?? "#0f172a")};text-align:${layout === "vertical" ? "center" : "left"}">${escHtml(fc.profileName ?? "")}</div>`
          : "";
        const roleHtml = (fc.profileRole ?? "").trim()
          ? `<div style="font-size:${prf}px;color:${escHtml(fc.profileRoleColor ?? "#64748b")};margin-top:2px;text-align:${layout === "vertical" ? "center" : "left"}">${escHtml(fc.profileRole ?? "")}</div>`
          : "";
        const btn = `<a href="${escHtml(fc.profileBtnUrl ?? "#")}" style="display:inline-block;margin-top:10px;padding:10px 18px;background:${escHtml(btnBg)};color:${escHtml(btnFg)};border-radius:${br}px;font-size:${pbtnf}px;font-weight:700;text-decoration:none;align-self:${layout === "vertical" ? "center" : "flex-start"}">${escHtml(fc.profileBtnText ?? "")}</a>`;
        if (layout === "vertical") {
          inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;font-family:${frameFf}">
            ${imgEl}
            ${nameHtml}
            ${roleHtml}
            ${titleHtml}
            <div style="font-size:${pbf}px;color:${escHtml(fc.profileBodyColor ?? "#64748b")};line-height:1.6;max-width:92%;white-space:pre-wrap;word-break:break-word">${escHtml(fc.profileBody ?? "")}</div>
            ${btn}
          </div>`;
        } else {
          inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;flex-direction:row;gap:16px;align-items:center;font-family:${frameFf}">
            ${imgEl}
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;align-items:flex-start">
              ${titleHtml}
              <div style="font-size:${pbf}px;color:${escHtml(fc.profileBodyColor ?? "#64748b")};line-height:1.6;white-space:pre-wrap;word-break:break-word">${escHtml(fc.profileBody ?? "")}</div>
              ${btn}
            </div>
          </div>`;
        }
      } else if (fc.variant === "blank") {
        const hint = escHtml(fc.blankHint ?? "Khung trống — chỉnh nền và viền ở panel bên phải.");
        const bhf = fc.blankHintFontSize ?? 12;
        const bhc = fc.blankHintColor ?? "#94a3b8";
        inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;align-items:center;justify-content:center;font-family:${frameFf};border:2px dashed #cbd5e1;border-radius:10px;margin:4px">
          <p style="margin:0;font-size:${bhf}px;line-height:1.55;color:${escHtml(bhc)};text-align:center;max-width:90%">${hint}</p>
        </div>`;
      } else {
        const nv = fc.numValueColor ?? "#4c1d95";
        const nnf = fc.numNameFontSize ?? 14;
        const nrf = fc.numRoleFontSize ?? 12;
        const nvf = fc.numValueFontSize ?? 44;
        const nbf = fc.numBodyFontSize ?? 12;
        const showMeta = ((fc.numName ?? "").trim().length > 0) || ((fc.numRole ?? "").trim().length > 0);
        const metaBlock = showMeta
          ? `<div style="margin-bottom:6px"><div style="font-size:${nnf}px;font-weight:700;color:${escHtml(fc.numNameColor ?? "#0f172a")}">${escHtml(fc.numName ?? "")}</div><div style="font-size:${nrf}px;color:${escHtml(fc.numRoleColor ?? "#64748b")};margin-top:2px">${escHtml(fc.numRole ?? "")}</div></div>`
          : "";
        inner = `<div style="padding:${pad}px;min-height:100%;box-sizing:border-box;background:${escHtml(bg)};display:flex;flex-direction:row;gap:16px;align-items:flex-start;font-family:${frameFf}">
          <span style="font-size:${nvf}px;font-weight:800;line-height:1;color:${escHtml(nv)};flex-shrink:0">${escHtml(fc.numValue ?? "")}</span>
          <div style="flex:1;min-width:0">${metaBlock}<p style="margin:0;font-size:${nbf}px;color:${escHtml(fc.numBodyColor ?? "#64748b")};line-height:1.6;white-space:pre-wrap;word-break:break-word">${escHtml(fc.numBody ?? "")}</p></div>
        </div>`;
      }

      return `<div data-lp-frame="${escHtml(fc.variant)}" style="${styles.join(";")}">${inner}</div>`;
    }

    case "accordion": {
      const lines = (el.content ?? "Q|A").split("\n").filter((l) => l.trim());
      const items = lines.length ? lines : ["Câu hỏi 1|Trả lời 1", "Câu hỏi 2|Trả lời 2"];

      const borderColor = (s.borderColor as string) ?? "#e2e8f0";
      const headerBg = (s.headerBgColor as string) ?? "#ffffff";
      const headerColor = (s.headerTextColor as string) ?? "#0f172a";

      let accHtml = "";
      items.forEach((line, ii) => {
        const parts = line.split("|");
        const q = (parts[0] ?? "").trim();
        const a = parts.slice(1).join("|").trim();
        const open = ii === 0;
        accHtml += `<div data-lp-acc-item style="border:1px solid ${borderColor};border-radius:4px;margin-bottom:4px;overflow:hidden;background:${headerBg}">
          <button type="button" data-lp-acc-header style="width:100%;text-align:left;padding:8px 12px;font-size:13px;font-weight:500;background:${headerBg};color:${headerColor};border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;font-family:inherit">
            <span style="flex:1;word-break:break-word">${escHtml(q)}</span><span data-lp-acc-icon aria-hidden="true" style="flex-shrink:0;font-size:10px">${open ? "▲" : "▼"}</span>
          </button>
          <div data-lp-acc-panel style="display:${open ? "block" : "none"};padding:8px 12px 10px;font-size:12px;color:#64748b;line-height:1.55;border-top:1px solid ${borderColor};white-space:pre-wrap;word-break:break-word">${escHtml(a)}</div>
        </div>`;
      });
      return `<div data-lp-accordion="1" style="${styles.join(";")}">${accHtml}</div>`;
    }

    case "table": {
      const rows = (el.content ?? "A,B\n1,2").split("\n").filter((r) => r.trim());
      const borderColor = (s.borderColor as string) ?? "#e2e8f0";
      const headerBg = (s.headerBgColor as string) ?? "#f8fafc";
      const headerColor = (s.headerTextColor as string) ?? "#0f172a";
      const rowBg = (s.rowBgColor as string) ?? "#ffffff";
      const cellColor = (s.cellTextColor as string) ?? "#0f172a";

      let tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid ${borderColor}">`;
      rows.forEach((row, ri) => {
        tableHtml += "<tr>";
        row.split(",").forEach((cell) => {
          const tag = ri === 0 ? "th" : "td";
          const bg = ri === 0 ? headerBg : rowBg;
          const color = ri === 0 ? headerColor : cellColor;
          const extra = ri === 0 ? "font-weight:600" : "";
          tableHtml += `<${tag} style="border:1px solid ${borderColor};padding:6px 8px;text-align:left;background:${bg};color:${color};${extra}">${escHtml(
            cell,
          )}</${tag}>`;
        });
        tableHtml += "</tr>";
      });
      tableHtml += "</table>";
      return `<div style="${styles.join(";")}">${tableHtml}</div>`;
    }

    case "map": {
      const raw = (textContent || "").trim();
      const parts = raw.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n));
      const lat = parts[0] ?? 10.762622;
      const lng = parts[1] ?? 106.660172;
      const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      styles.push("overflow:hidden", "border-radius:8px", "border:1px solid #e2e8f0");
      return `<iframe src="${escHtml(src)}" style="${styles.join(";")}" title="Bản đồ" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }

    case "rating": {
      const count = Math.min(5, Number(el.content ?? 5));
      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<span style="color:${i <= count ? "#f59e0b" : "#d1d5db"};font-size:20px">★</span>`;
      }
      styles.push("display:flex", "align-items:center", "gap:2px");
      return `<div style="${styles.join(";")}">${starsHtml}</div>`;
    }

    case "progress": {
      const pct = Math.min(100, Number(el.content ?? 75));
      styles.push(`background:${(s.backgroundColor as string) ?? "#e2e8f0"}`, "border-radius:9999px", "overflow:hidden");
      return `<div style="${styles.join(";")}"><div style="width:${pct}%;height:100%;background:#4f46e5;border-radius:9999px;transition:width 0.5s"></div></div>`;
    }

    case "cart": {
      const cd = parseCartContent(textContent);
      const lines = getCartDisplayItems(cd);
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const radius = (s.borderRadius as number) ?? 12;
      const emptyMsg = cd.emptyMessage?.trim() || "Giỏ hàng trống";
      const btnText = cd.checkoutButtonText?.trim() || "Thanh toán";
      const showThumb = cd.showThumbnail !== false;
      const showQty = cd.showQty !== false;
      styles.push(
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        "border:1px solid #e2e8f0",
        "box-sizing:border-box",
        "padding:12px",
        "display:flex",
        "flex-direction:column",
        "gap:8px",
        "font-size:13px",
      );
      if (lines.length === 0) {
        return `<div data-lp-cart="true" style="${styles.join(";")}"><p style="margin:0;text-align:center;color:#94a3b8;font-size:12px;padding:12px">${escHtml(emptyMsg)}</p><button type="button" style="width:100%;padding:10px;background:#1e293b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:12px">${escHtml(btnText)}</button></div>`;
      }
      const row = (it: { title?: string; price?: string; qty?: number; image?: string }) => {
        const thumb = showThumb && it.image?.trim()
          ? `<div style="width:40px;height:40px;border-radius:6px;overflow:hidden;background:#e2e8f0;flex-shrink:0"><img src="${escHtml(it.image.trim())}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`
          : showThumb
            ? `<div style="width:40px;height:40px;border-radius:6px;background:#f1f5f9;flex-shrink:0"></div>`
            : "";
        const q = showQty && (it.qty ?? 1) > 0 ? `<span style="color:#64748b;font-size:11px">×${it.qty ?? 1}</span>` : "";
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9">${thumb}<div style="flex:1;min-width:0"><div style="font-weight:600;color:#0f172a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(it.title || "Sản phẩm")}</div></div><div style="text-align:right;white-space:nowrap">${q}<div style="font-weight:700;color:#dc2626;font-size:12px">${escHtml(it.price || "")}</div></div></div>`;
      };
      const inner = lines.map((it) => row(it)).join("");
      return `<div data-lp-cart="true" style="${styles.join(";")}"><div style="font-weight:700;font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">Giỏ hàng</div>${inner}<button type="button" style="margin-top:4px;width:100%;padding:10px;background:#1e293b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:12px">${escHtml(btnText)}</button></div>`;
    }

    case "blog-list": {
      const bl = parseBlogListContent(textContent);
      const posts = bl.posts ?? [];
      const cols = Math.max(1, Math.min(6, bl.columns ?? 2));
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const radius = (s.borderRadius as number) ?? 12;
      const fs = (s.fontSize as number) ?? 14;
      styles.push(
        `display:grid`,
        `grid-template-columns:repeat(${cols},1fr)`,
        `gap:12px`,
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        `padding:14px`,
        `box-sizing:border-box`,
        `overflow:visible`,
        `font-size:${fs}px`,
      );
      const card = (post: { title?: string; excerpt?: string; date?: string; image?: string }) => {
        const img = post.image?.trim();
        const imgBlock = img
          ? `<div style="width:100%;aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:#e2e8f0;margin-bottom:8px"><img src="${escHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`
          : "";
        return `<article style="background:#fff;border-radius:10px;padding:10px;border:1px solid #e2e8f0;display:flex;flex-direction:column;align-items:stretch">${imgBlock}<h3 style="margin:0 0 6px;font-size:${Math.min(fs + 2, 18)}px;font-weight:700;color:#0f172a;line-height:1.3">${escHtml(post.title || "Tiêu đề bài")}</h3><p style="margin:0 0 8px;font-size:${Math.max(fs - 2, 11)}px;color:#64748b;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escHtml(post.excerpt || "")}</p><time style="font-size:11px;color:#94a3b8">${escHtml(post.date || "")}</time></article>`;
      };
      const inner = posts.length ? posts.map((p) => card(p)).join("") : `<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;padding:16px">Danh sách bài viết — thêm bài ở panel bên phải</div>`;
      return `<div data-lp-blog-list="true" style="${styles.join(";")}">${inner}</div>`;
    }

    case "blog-detail": {
      const bd = parseBlogDetailContent(textContent);
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const radius = (s.borderRadius as number) ?? 12;
      const fs = (s.fontSize as number) ?? 15;
      styles.push(
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        `padding:20px`,
        `box-sizing:border-box`,
        `overflow:visible`,
      );
      const title = bd.title?.trim() || "Tiêu đề bài viết";
      const meta = [bd.author, bd.date].filter(Boolean).join(" · ");
      return `<article data-lp-blog-detail="true" style="${styles.join(";")}"><h1 style="margin:0 0 12px;font-size:${Math.min(fs + 10, 28)}px;font-weight:800;color:#0f172a;line-height:1.25">${escHtml(title)}</h1>${meta ? `<p style="margin:0 0 16px;font-size:12px;color:#64748b">${escHtml(meta)}</p>` : ""}<div style="font-size:${fs}px;color:#334155;line-height:1.65">${formatBlockBodyHtml(bd.body ?? "")}</div></article>`;
    }

    case "popup": {
      const pop = parsePopupContent(textContent);
      const title = pop.title?.trim() || "Popup";
      const bodyRaw = pop.body?.trim() || "Nội dung popup — chỉnh ở panel bên phải.";
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const radius = (s.borderRadius as number) ?? 12;
      const popupFlat = Number(s.popupFlat) === 1;
      const layout = pop.layout ?? (popupFlat ? "flat" : "header");
      const isHeader = layout === "header";
      const headerBg = (s.headerBackgroundColor as string) ?? "#1e293b";
      const headerColor = (s.headerTextColor as string) ?? "#ffffff";
      const titleColor = (s.headerTextColor as string) ?? (s.color as string) ?? "#0f172a";
      const bodyColor = (s.bodyTextColor as string) ?? (s.color as string) ?? "#334155";
      const btnColor = (s.btnColor as string) ?? "#1e2d7d";
      const btnTextColor = (s.btnTextColor as string) ?? "#ffffff";
      const btnRadius = (s.btnRadius as number) ?? 8;
      const animation = pop.animation ?? "fade";
      const closeOnOverlay = pop.closeOnOverlay !== false;
      const showBtn = pop.showBtn === true;
      const btnText = pop.btnText?.trim() || "Tìm hiểu thêm";
      const btnUrl = pop.btnUrl?.trim() || "#";
      const emoji = pop.imageEmoji?.trim() || "";
      const pid = el.id;
      const maxW = Math.min(920, Math.max(280, Number(ew ?? 500)));

      const animStyle = animation === "slide-up"
        ? `@keyframes lp-slide-up-${pid}{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`
        : animation === "zoom"
          ? `@keyframes lp-zoom-${pid}{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`
          : `@keyframes lp-fade-${pid}{from{opacity:0}to{opacity:1}}`;
      const animName = animation === "slide-up" ? `lp-slide-up-${pid}` : animation === "zoom" ? `lp-zoom-${pid}` : `lp-fade-${pid}`;

      const emojiHtml = emoji ? `<div style="font-size:32px;line-height:1;margin-bottom:8px;text-align:center">${escHtml(emoji)}</div>` : "";
      const btnHtml = showBtn ? `<div style="margin-top:16px"><a href="${escHtml(btnUrl)}" style="display:inline-block;padding:10px 22px;background:${escHtml(btnColor)};color:${escHtml(btnTextColor)};border-radius:${btnRadius}px;font-size:13px;font-weight:600;text-decoration:none;text-align:center">${escHtml(btnText)}</a></div>` : "";

      const cardInner = isHeader
        ? `<div data-lp-popup="true" style="background:${escHtml(bg)};border-radius:${radius}px;box-shadow:0 20px 60px rgba(15,23,42,0.18);overflow:hidden;display:flex;flex-direction:column;animation:${animName} 0.3s ease;border:1px solid rgba(0,0,0,0.06)"><header style="background:${escHtml(headerBg)};color:${escHtml(headerColor)};padding:12px 16px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px">${emoji ? `<span>${escHtml(emoji)}</span>` : ""}<span>${escHtml(title)}</span></header><div style="padding:16px 18px;font-size:13px;color:${escHtml(bodyColor)};line-height:1.6">${formatBlockBodyHtml(bodyRaw)}${btnHtml}</div></div>`
        : `<div data-lp-popup="true" style="background:${escHtml(bg)};border-radius:${radius}px;box-shadow:0 20px 60px rgba(15,23,42,0.18);overflow:hidden;display:flex;flex-direction:column;animation:${animName} 0.3s ease;border:1px solid rgba(0,0,0,0.06)"><div style="padding:18px 20px 16px">${emojiHtml}<div style="font-size:16px;font-weight:700;color:${escHtml(titleColor)};line-height:1.3;margin-bottom:8px">${escHtml(title)}</div><div style="font-size:13px;color:${escHtml(bodyColor)};line-height:1.6">${formatBlockBodyHtml(bodyRaw)}</div>${btnHtml}</div></div>`;

      const overlayClickAttr = closeOnOverlay ? ` data-lp-popup-close-overlay="${pid}"` : "";
      return `<style>${animStyle}</style><div style="${styles.join(";")}"><div class="lp-popup-overlay" id="lp-popup-overlay-${pid}" data-lp-popup-id="${pid}"${overlayClickAttr} style="position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;backdrop-filter:blur(2px)"><div class="lp-popup-panel" role="dialog" aria-modal="true" style="position:relative;width:100%;max-width:min(90vw,${maxW}px);margin:auto" onclick="event.stopPropagation()"><button type="button" class="lp-popup-close" data-lp-popup-close="${pid}" aria-label="Đóng" style="position:absolute;top:-10px;right:-10px;z-index:2;width:28px;height:28px;border:none;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer;font-size:16px;line-height:1;color:#475569;display:flex;align-items:center;justify-content:center">×</button>${cardInner}</div></div></div>`;
    }

    case "social-share": {
      const sd = parseSocialShareContent(textContent);
      const nets = sd.networks?.length ? sd.networks : ["facebook", "twitter", "linkedin", "link"];
      const labels: Record<string, string> = {
        facebook: "Facebook",
        twitter: "X",
        linkedin: "LinkedIn",
        instagram: "Instagram",
        zalo: "Zalo",
        link: "Copy link",
      };
      styles.push("display:flex", "align-items:center", "justify-content:center", "gap:8px", "flex-wrap:wrap", "padding:4px");
      const chips = nets.slice(0, 8).map((n) => {
        const lab = labels[n] ?? n;
        return `<span style="display:inline-flex;align-items:center;justify-content:center;padding:6px 12px;border-radius:9999px;background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;border:1px solid #e2e8f0">${escHtml(lab)}</span>`;
      });
      return `<div data-lp-social-share="true" style="${styles.join(";")}" class="lp-social-share">${chips.join("")}</div>`;
    }

    case "menu": {
      let mc: { items?: Array<{label:string;href?:string}>;activeIndex?:number;variant?:number;align?:string;activeColor?:string;activeBgColor?:string;textColor?:string;fontSize?:number;fontWeight?:number;fontFamily?:string;textTransform?:string;gap?:number;backgroundColor?:string;borderRadius?:number } = {};
      try { mc = JSON.parse(el.content || "{}"); } catch {}
      const mItems = mc.items ?? [{label:"Trang chủ"},{label:"Giới thiệu"},{label:"Dịch vụ"},{label:"Liên hệ"}];
      const mActiveIdx = mc.activeIndex ?? 0;
      const mActiveColor = mc.activeColor ?? "#f97316";
      const mActiveBg = mc.activeBgColor ?? "#fff7ed";
      const mTextColor = mc.textColor ?? "#1e293b";
      const mFontSize = mc.fontSize ?? 14;
      const mFontWeight = mc.fontWeight ?? 600;
      const mFontFamily = mc.fontFamily ?? "Inter";
      const mTT = mc.textTransform ?? "none";
      const mGap = mc.gap ?? 8;
      const mBg = mc.backgroundColor ?? "transparent";
      const mBR = mc.borderRadius ?? 0;
      const mAlign = mc.align === "center" ? "center" : mc.align === "right" ? "flex-end" : "flex-start";
      const mVariant = mc.variant ?? 1;
      styles.push(`background:${mBg}`, `border-radius:${mBR}px`, "display:flex", `align-items:center`, `justify-content:${mAlign}`, `flex-wrap:wrap`, `gap:${mGap}px`, "padding:0 8px", "box-sizing:border-box", "overflow:hidden");
      const chips = mItems.map((item, idx) => {
        const isActive = idx === mActiveIdx;
        let itemStyle = `font-size:${mFontSize}px;font-family:${mFontFamily},sans-serif;font-weight:${isActive && mVariant===1?700:mFontWeight};text-transform:${mTT};white-space:nowrap;cursor:pointer;text-decoration:none;`;
        if (mVariant === 1) itemStyle += `padding:6px 14px;border-radius:6px;color:${isActive?mActiveColor:mTextColor};background:${isActive?mActiveBg:"transparent"};`;
        else if (mVariant === 3) itemStyle += `padding:4px 10px;color:${mActiveColor};`;
        else if (mVariant === 4) itemStyle += `padding:4px 12px;color:${isActive?mActiveColor:mTextColor};text-transform:uppercase;letter-spacing:0.5px;border-bottom:${isActive?`2px solid ${mActiveColor}`:"2px solid transparent"};`;
        else if (mVariant === 5) itemStyle += `padding:4px 12px;color:${mTextColor};font-weight:700;text-transform:uppercase;opacity:${isActive?1:0.6};`;
        else if (mVariant === 6) itemStyle += `padding:4px 14px;color:${mActiveColor};font-size:${mFontSize+2}px;font-weight:700;`;
        else if (mVariant === 7) itemStyle += `padding:4px 8px;color:${isActive?mActiveColor:"#94a3b8"};font-size:${Math.max(11,mFontSize-2)}px;`;
        else if (mVariant === 8) itemStyle += `padding:4px 12px;color:${mActiveColor};text-transform:uppercase;font-weight:700;letter-spacing:1px;`;
        else if (mVariant === 9) itemStyle += `padding:4px 10px;color:${isActive?mActiveColor:mTextColor};font-size:${Math.max(11,mFontSize-1)}px;border-bottom:${isActive?`1.5px solid ${mActiveColor}`:"none"};`;
        else itemStyle += `padding:4px 10px;color:${isActive?mActiveColor:mTextColor};`;
        const mHref = (item as { linkType?: string; sectionId?: number; href?: string }).linkType === "section" && (item as { sectionId?: number }).sectionId
          ? `#lp-section-${(item as { sectionId?: number }).sectionId}`
          : escHtml(item.href ?? "#");
        const mOnClick = (item as { linkType?: string; sectionId?: number }).linkType === "section" && (item as { sectionId?: number }).sectionId
          ? ` onclick="event.preventDefault();var s=document.getElementById('lp-section-${(item as { sectionId?: number }).sectionId}');if(s){var pc=document.querySelector('.page-container');var m=pc&&pc.style.transform&&pc.style.transform.match(/scale\\(([^)]+)\\)/);var sc=m?parseFloat(m[1]):1;window.scrollTo({top:s.getBoundingClientRect().top*sc+window.scrollY,behavior:'smooth'});}return false;"`
          : "";
        return `<a href="${mHref}"${mOnClick} style="${itemStyle}">${escHtml(item.label)}</a>`;
      });
      return `<div style="${styles.join(";")}"> ${chips.join("")}</div>`;
    }

    default: {
      const fallbackType = String(el.type ?? "element");
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center", "border:1px dashed #cbd5e1", "border-radius:4px");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">${escHtml(fallbackType.replace(/-/g, " "))}</span></div>`;
    }
  }
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Map hoverAnimation (panel) → data-hover (script xem trước) */
function mapHoverAnimationToDataHover(s: Record<string, unknown>): string {
  const ha = String(s.hoverAnimation ?? "").trim();
  const legacy = s.hoverEffect ? String(s.hoverType ?? "scale-up") : "";
  if (ha && ha !== "none") {
    const m: Record<string, string> = {
      hoverScaleUp: "scale-up",
      hoverScaleDown: "scale-down",
      hoverShadow: "shadow",
      hoverShake: "shake",
    };
    return m[ha] ?? "scale-up";
  }
  return legacy;
}

/** Gộp stylesJson (lưu API) với styles (store) — sự kiện nhấn (actionType) thường nằm trong stylesJson */
type EditorElementWithStylesJson = EditorElement & { stylesJson?: string | null };

function mergeStylesFromJson(el: EditorElementWithStylesJson): EditorElement {
  const fromObj = (el.styles && typeof el.styles === "object" ? el.styles : {}) as Record<string, string | number>;
  const raw = el.stylesJson;
  if (typeof raw !== "string" || !raw.trim()) {
    return { ...el, styles: fromObj };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string | number>;
    return { ...el, styles: { ...parsed, ...fromObj } };
  } catch {
    return { ...el, styles: fromObj };
  }
}

function addDataAttrs(el: EditorElement, html: string): string {
  const s = el.styles ?? {};
  const customClass = String(s.customClass ?? "").trim();
  const classNames = ["lp-element", ...customClass.split(/\s+/).filter(Boolean)].join(" ");
  const attrs: string[] = [`class="${escHtml(classNames)}"`];
  const cid = String(s.customId ?? "").trim();
  if (cid) attrs.push(`id="${escHtml(cid)}"`);

  if (String(s.hideOnDesktop) === "true") attrs.push(`data-lp-hide-desktop="true"`);
  if (String(s.hideOnMobile) === "true") attrs.push(`data-lp-hide-mobile="true"`);

  const dh = mapHoverAnimationToDataHover(s as Record<string, unknown>);
  if (dh) attrs.push(`data-hover="${escHtml(dh)}"`);

  if (s.tooltipText) {
    attrs.push(
      `data-tooltip="${escHtml(String(s.tooltipText))}"`,
      `data-tt-bg="${escHtml(String(s.tooltipBgColor ?? "#1e293b"))}"`,
      `data-tt-pos="${s.tooltipPosition ?? "top"}"`,
      `data-tt-size="${s.tooltipSize ?? "medium"}"`,
    );
  }

  const ga = String(s.trackingGoogleAds ?? "").trim();
  if (ga) attrs.push(`data-track-ga="${escHtml(ga)}"`);
  const fb = String(s.trackingFacebook ?? "").trim();
  if (fb) attrs.push(`data-track-fb="${escHtml(fb)}"`);

  const at = String(s.actionType ?? "none").trim();
  if (at && at !== "none") {
    attrs.push(`data-action-type="${escHtml(at)}"`);
    const tgt = String(s.actionTarget ?? "").trim();
    if (tgt) attrs.push(`data-action-target="${escHtml(tgt)}"`);
    if (String(s.actionOpenNewTab) === "true") attrs.push(`data-action-newtab="true"`);

    if (at === "section" && tgt) {
      const clickJs = `event.preventDefault(); event.stopPropagation(); var sec=document.getElementById('lp-section-${escHtml(tgt)}'); if(sec) { var pc=document.querySelector('.page-container'); var m=pc&&pc.style.transform.match(/scale\\(([^)]+)\\)/); var sc=m&&m[1]?parseFloat(m[1]):1; window.scrollTo({top: sec.offsetTop*sc, behavior:'smooth'}); } return false;`;
      attrs.push(`onclick="${escHtml(clickJs)}"`);
    }
  }

  return html.replace(/^<(\w+)/, `<$1 ${attrs.join(" ")}`);
}

function collectFonts(sections: EditorSection[]): string[] {
  const fonts = new Set<string>();
  for (const section of sections) {
    for (const el of section.elements ?? []) {
      const ff = mergeStylesFromJson(el as EditorElementWithStylesJson).styles?.fontFamily;
      if (typeof ff === "string" && ff && ff !== "Inter") fonts.add(ff);
    }
  }
  return Array.from(fonts);
}

export type PageSettingsOpts = {
  metaKeywords?: string;
  metaImageUrl?: string;
  faviconUrl?: string;
  codeBeforeHead?: string;
  codeBeforeBody?: string;
  useDelayJS?: boolean;
  useLazyload?: boolean;
  utilityEffects?: UtilityEffectsSettings;
};

/** Hiệu ứng toàn trang (canvas overlay, z-index dưới popup 99998) */
function buildUtilityFxInlineScript(fx: UtilityEffectsSettings | undefined): string {
  const u = fx ?? {};
  if (!u.snow && !u.cherryBlossom && !u.fireworks) return "";
  return `
  (function(){
    var snow=${u.snow ? "1" : "0"}, cherry=${u.cherryBlossom ? "1" : "0"}, fw=${u.fireworks ? "1" : "0"};
    var cv=document.createElement("canvas");
    cv.setAttribute("aria-hidden","true");
    cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9990";
    document.body.appendChild(cv);
    var ctx=cv.getContext("2d");
    var W=0,H=0;
    function resize(){ W=cv.width=innerWidth; H=cv.height=innerHeight; }
    resize();
    addEventListener("resize",resize);
    var parts=[];
    var i,t;
    if(snow) for(i=0;i<72;i++) parts.push({k:"s",x:Math.random()*W,y:Math.random()*H,vy:0.6+Math.random()*1.4,r:0.6+Math.random()*1.8});
    if(cherry) for(i=0;i<36;i++) parts.push({k:"c",x:Math.random()*W,y:-Math.random()*H,vy:0.4+Math.random()*0.9,r:2+Math.random()*3,rot:Math.random()*6.28});
    var sparks=[];
    if(fw){
      setInterval(function(){
        if(sparks.length<12) sparks.push({x:Math.random()*W,y:Math.random()*H*0.55,life:0});
      },800);
    }
    function loop(){
      ctx.clearRect(0,0,W,H);
      for(i=0;i<parts.length;i++){
        t=parts[i];
        if(t.k==="s"){
          ctx.fillStyle="rgba(255,255,255,0.88)";
          ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,6.283); ctx.fill();
          t.y+=t.vy; t.x+=Math.sin(t.y*0.012)*0.6;
          if(t.y>H+8){ t.y=-8; t.x=Math.random()*W; }
        } else if(t.k==="c"){
          ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.rot);
          ctx.fillStyle="rgba(255,183,197,0.55)";
          ctx.scale(1,0.42);
          ctx.beginPath(); ctx.arc(0,0,t.r,0,6.283); ctx.fill();
          ctx.restore();
          t.y+=t.vy; t.x+=Math.sin(t.y*0.018)*1.8; t.rot+=0.018;
          if(t.y>H+8){ t.y=-8; t.x=Math.random()*W; }
        }
      }
      if(fw){
        for(i=sparks.length-1;i>=0;i--){
          var s=sparks[i]; s.life++;
          var a=1-s.life/50;
          if(a<=0){ sparks.splice(i,1); continue; }
          ctx.strokeStyle="rgba(255,210,80,"+(a*0.9)+")";
          ctx.lineWidth=2;
          for(var k=0;k<10;k++){
            var ang=k*0.628+s.life*0.08;
            ctx.beginPath();
            ctx.moveTo(s.x,s.y);
            ctx.lineTo(s.x+Math.cos(ang)*s.life*2.2,s.y+Math.sin(ang)*s.life*2.2);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();`;
}

export function generatePreviewHtml(
  sections: EditorSection[],
  opts?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    metaImageUrl?: string;
    faviconUrl?: string;
    codeBeforeHead?: string;
    codeBeforeBody?: string;
    useDelayJS?: boolean;
    useLazyload?: boolean;
    deviceWidth?: number;
    desktopCanvasWidth?: number;
    thumbnail?: boolean;
    htmlCodeFullScreen?: boolean;
    pageSettings?: PageSettingsOpts;
    /** Origin nơi phục vụ file tĩnh (uploads). Mặc định VITE_API_URL — dùng cho iframe srcDoc / tải HTML. */
    apiBaseUrl?: string;
    /** Gắn vào form để POST /api/public/leads (trang đã xuất bản). */
    pageId?: number;
    workspaceId?: number;
    /** reCAPTCHA v3 site key; mặc định `VITE_RECAPTCHA_SITE_KEY`. Cần khớp `Recaptcha:SecretKey` trên API. */
    recaptchaSiteKey?: string;
    /**
     * Khi true (xem trước trong editor): buộc page-container rộng đúng designBase px (không co theo viewport)
     * và scale toàn bộ trang về vừa màn hình — preview luôn khớp tỉ lệ với editor.
     * Khi false/undefined (xuất bản / download): layout responsive bình thường.
     */
    forPreview?: boolean;
    /**
     * Map formConfigId → fieldsJson dùng để nhúng cấu hình Google Form (entry ID mappings) vào HTML form.
     * Khi form element có formConfigId và fieldsJson chứa _googleFormLink, dữ liệu sẽ tự động forward sang Google Forms.
     */
    formConfigsMap?: Record<number, string>;
    /** Danh sách popup độc lập (PagePopupDef) cần được render trong trang */
    popups?: Array<{ id: string; name: string; width: number; height: number; backgroundColor?: string; elements: import("@/types/editor").EditorElement[] }>;
  }
): string {
  const assetBaseUrl = (opts?.apiBaseUrl ?? DEFAULT_PREVIEW_ASSET_BASE).replace(/\/?$/, "/");
  const recaptchaSiteKey = (opts?.recaptchaSiteKey ?? (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ?? "").trim();
  const recaptchaHeadScript = recaptchaSiteKey
    ? `<script src="https://www.google.com/recaptcha/api.js?render=${escHtml(recaptchaSiteKey)}" async defer></script>`
    : "";
  const bodyRecaptchaAttr = recaptchaSiteKey ? ` data-lp-recaptcha-sitekey="${escHtml(recaptchaSiteKey)}"` : "";
  const lpCtx: LpHtmlContext | undefined =
    opts?.pageId != null && opts?.workspaceId != null
      ? { pageId: opts.pageId, workspaceId: opts.workspaceId, formConfigsMap: opts.formConfigsMap }
      : undefined;
  const ps: PageSettingsOpts = opts?.pageSettings ?? {};
  const title = opts?.metaTitle ?? "Preview";
  const desc = opts?.metaDescription ?? "";
  const keywords = opts?.metaKeywords ?? ps.metaKeywords ?? "";
  const metaImage = opts?.metaImageUrl ?? ps.metaImageUrl ?? "";
  const favicon = opts?.faviconUrl ?? ps.faviconUrl ?? "";
  const codeBeforeHead = opts?.codeBeforeHead ?? ps.codeBeforeHead ?? "";
  const codeBeforeBody = opts?.codeBeforeBody ?? ps.codeBeforeBody ?? "";
  const useLazyload = opts?.useLazyload ?? ps.useLazyload ?? false;
  const utilityFxInline = buildUtilityFxInlineScript(ps.utilityEffects);

  const safeSections = Array.isArray(sections) ? sections : [];
  const visibleSections = safeSections.filter((s) => {
    if (!s || typeof s !== "object") return false;
    const v = (s as { visible?: boolean }).visible ?? (s as { isVisible?: boolean }).isVisible ?? true;
    return v !== false;
  });
  const fonts = collectFonts(safeSections);
  const fontLinks = fonts.length > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join("&")}&display=swap" rel="stylesheet" />`
    : "";

  const designBase = Math.max(opts?.desktopCanvasWidth ?? DESIGN_WIDTH, 1);
  const layoutMaxWidth = Math.max(opts?.deviceWidth ?? opts?.desktopCanvasWidth ?? DESIGN_WIDTH, 1);
  const htmlCodeFullScreen = opts?.htmlCodeFullScreen ?? false;
  const forPreview = opts?.forPreview ?? false;

  const sectionsHtml =
    visibleSections.length === 0
      ? `<div class="lp-empty-state" style="padding:60px 24px;text-align:center;color:#64748b;font-size:15px;">Chưa có nội dung. Thêm các phần tử vào trang trước khi xem trước.</div>`
      : visibleSections
          .map((section) => {
            const sec = section as EditorSection & { Height?: number };
            const sectionH = Math.max(
              Number(sec.height ?? sec.Height ?? DESIGN_HEIGHT) || DESIGN_HEIGHT,
              1,
            );
            const effectiveH = computeSectionEffectiveHeight(section as EditorSection, sectionH, htmlCodeFullScreen);
            const innerHeightPct = (sectionH / effectiveH) * 100;
            const secStyles: string[] = [
              "position:relative",
              "width:100%",
              "padding-bottom:" + (effectiveH / designBase) * 100 + "%",
              "height:0",
              `background-color:${section.backgroundColor ?? "#ffffff"}`,
              "overflow:visible",
            ];
            if (section.backgroundImageUrl) {
              secStyles.push(
                `background-image:url(${section.backgroundImageUrl})`,
                "background-size:cover",
                "background-position:center"
              );
            }
            const sectionEls = section.elements ?? (section as { Elements?: unknown[] }).Elements ?? [];
            const els = (Array.isArray(sectionEls) ? sectionEls : [])
              .filter((el) => !(htmlCodeFullScreen && el.type === "html-code"))
              .map((el) => {
                const merged = mergeStylesFromJson(el as EditorElementWithStylesJson);
                return addDataAttrs(merged, elementToHtml(merged, designBase, sectionH, htmlCodeFullScreen, lpCtx));
              })
              .join("\n");
            const secId = (section as { id?: number }).id ?? 0;
            return `<div id="lp-section-${secId}" class="lp-section" style="${secStyles.join(";")}"><div class="lp-section-inner" style="position:absolute;top:0;left:0;width:100%;height:${innerHeightPct.toFixed(4)}%;overflow:visible">\n${els}\n</div></div>`;
          })
          .join("\n");

  /** html-code full màn: không đặt trong .lp-section (overflow cắt position:fixed → chỉ thấy khung nhỏ). */
  const htmlFullscreenOverlayHtml =
    htmlCodeFullScreen && visibleSections.length > 0
      ? visibleSections
          .flatMap((section) => {
            const sectionEls = section.elements ?? (section as { Elements?: unknown[] }).Elements ?? [];
            const sec = section as EditorSection & { Height?: number };
            const sectionH = Math.max(
              Number(sec.height ?? sec.Height ?? DESIGN_HEIGHT) || DESIGN_HEIGHT,
              1,
            );
            return (Array.isArray(sectionEls) ? sectionEls : [])
              .filter((el) => !el.isHidden && el.type === "html-code")
              .map((el) => {
                const merged = mergeStylesFromJson(el as EditorElementWithStylesJson);
                return addDataAttrs(merged, elementToHtml(merged, designBase, sectionH, true, lpCtx));
              });
          })
          .join("\n")
      : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <base href="${escHtml(assetBaseUrl)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
  <title>${escHtml(title)}</title>
  ${desc ? `<meta name="description" content="${escHtml(desc)}" />` : ""}
  ${keywords ? `<meta name="keywords" content="${escHtml(keywords)}" />` : ""}
  ${metaImage ? `<meta property="og:image" content="${escHtml(metaImage)}" />` : ""}
  ${favicon ? `<link rel="icon" href="${escHtml(favicon)}" type="image/x-icon" />` : ""}
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous" />
  ${fontLinks}
  ${recaptchaHeadScript}
  <style>
    /* Reset & Base */
    html { scroll-behavior: smooth; } /* Fix native anchor sliding */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100vh; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #e8ecf1; }
    .page-container { width:${designBase}px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 40px rgba(0,0,0,0.08); transform-origin: 0 0; }
    .tt-popup { position:absolute; color:#fff; padding:6px 10px; border-radius:6px; font-size:12px; white-space:nowrap; pointer-events:none; z-index:9999; opacity:0; transition:opacity .2s; }
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeInDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes bounceIn{0%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.05)}70%{transform:scale(.9)}100%{transform:scale(1)}}
    @keyframes bounceInUp{0%{opacity:0;transform:translateY(40px)}60%{opacity:1;transform:translateY(-10px)}80%{transform:translateY(5px)}100%{transform:translateY(0)}}
    @keyframes bounceInDown{0%{opacity:0;transform:translateY(-40px)}60%{opacity:1;transform:translateY(10px)}80%{transform:translateY(-5px)}100%{transform:translateY(0)}}
    @keyframes zoomIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
    @keyframes zoomOut{from{opacity:0;transform:scale(1.5)}to{opacity:1;transform:scale(1)}}
    @keyframes slideInUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideInDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideInLeft{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}
    @keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
    @keyframes rotateIn{from{opacity:0;transform:rotate(-200deg)}to{opacity:1;transform:rotate(0)}}
    @keyframes flipInX{from{opacity:0;transform:perspective(400px) rotateX(90deg)}to{opacity:1;transform:perspective(400px) rotateX(0)}}
    @keyframes flipInY{from{opacity:0;transform:perspective(400px) rotateY(90deg)}to{opacity:1;transform:perspective(400px) rotateY(0)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    @keyframes flash{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes tada{0%{transform:scale(1)}10%,20%{transform:scale(.92) rotate(-2deg)}30%,50%,70%,90%{transform:scale(1.06) rotate(2deg)}40%,60%,80%{transform:scale(1.04) rotate(-2deg)}100%{transform:scale(1) rotate(0)}}
    /* Ẩn theo thiết bị (panel Nâng cao) */
    @media (min-width: 769px) {
      .lp-element[data-lp-hide-desktop="true"] { display: none !important; }
    }
    @media (max-width: 768px) {
      .lp-element[data-lp-hide-mobile="true"] { display: none !important; }
    }
    /* Phản hồi khi nhấn / hover (xem trước & trang xuất bản) — trước đây tap-highlight: transparent làm “mất” cảm giác bấm */
    .page-container a[href], .page-container button, .page-container input[type="submit"], .page-container input[type="button"], .page-container label[for] { cursor: pointer; }
    .page-container input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), .page-container textarea { cursor: text; }
    .lp-btn {
      user-select: none;
      -webkit-tap-highlight-color: rgba(30, 45, 125, 0.12);
      transition: opacity 0.12s ease, filter 0.12s ease, transform 0.1s ease;
    }
    .lp-btn:hover { filter: brightness(1.05); }
    .lp-btn:active { filter: brightness(0.92); transform: scale(0.99); }
    .page-container a[href]:not(.lp-btn) { transition: opacity 0.12s ease; -webkit-tap-highlight-color: rgba(30, 45, 125, 0.1); }
    .page-container a[href]:not(.lp-btn):active { opacity: 0.85; }
    .page-container button:not(:disabled):active, .page-container input[type="submit"]:active, .page-container input[type="button"]:active { opacity: 0.9; transform: scale(0.99); }
    @media (max-width: 768px) {
      .page-container { box-shadow: none; }
    }
    body.lp-popup-open { overflow: hidden; }
    .lp-popup-overlay.lp-popup-visible { display: flex !important; }
  </style>
  ${codeBeforeHead ? sanitizeClosingScriptLikeSequences(codeBeforeHead.trim()) : ""}
</head>
<body${opts?.thumbnail ? ' style="transform:scale(0.34);transform-origin:0 0;width:960px;min-height:600px"' : ""}${useLazyload ? ' data-lazyload="true"' : ""}${bodyRecaptchaAttr}>
  <div class="page-container">
    ${sectionsHtml}
  </div>
  ${htmlFullscreenOverlayHtml}
  ${(() => {
    // Render popup overlay HTML cho từng popup standalone (PagePopupDef)
    const popupDefs = opts?.popups ?? [];
    if (!popupDefs.length) return "";
    return popupDefs.map((popup) => {
      const popupEls = (popup.elements ?? [])
        .map((el) => {
          const merged = mergeStylesFromJson(el as EditorElementWithStylesJson);
          return addDataAttrs(merged, elementToHtml(merged, popup.width, popup.height, false, lpCtx));
        })
        .join("\n");
      const bg = popup.backgroundColor ?? "#ffffff";
      const pid = escHtml(String(popup.id));
      const bgEsc = escHtml(String(bg));
      return `<div class="lp-popup-overlay" id="lp-popup-overlay-${pid}" data-lp-popup-id="${pid}" data-lp-popup-close-overlay="${pid}" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;backdrop-filter:blur(3px)">
  <div class="lp-popup-panel" role="dialog" aria-modal="true" style="position:relative;width:${popup.width}px;max-width:min(95vw,${popup.width}px);background:${bgEsc};border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.22);overflow:hidden;animation:lp-fade 0.25s ease" onclick="event.stopPropagation()">
    <button type="button" class="lp-popup-close" data-lp-popup-close="${pid}" aria-label="Đóng" style="position:absolute;top:8px;right:8px;z-index:2;width:30px;height:30px;border:none;border-radius:50%;background:rgba(15,23,42,0.08);cursor:pointer;font-size:18px;line-height:1;color:#475569;display:flex;align-items:center;justify-content:center;transition:background 0.15s">×</button>
    <div style="position:relative;width:${popup.width}px;height:${popup.height}px;overflow:hidden">
      ${popupEls}
    </div>
  </div>
</div>`;
    }).join("\n");
  })()}
  <script>
  (function(){
  function lpInitInteractive(){
  document.querySelectorAll('[data-hover]').forEach(function(el){
    var t=el.dataset.hover,orig={transform:el.style.transform,filter:el.style.filter,boxShadow:el.style.boxShadow};
    el.addEventListener('mouseenter',function(){
      if(t==='scale-up')el.style.transform='scale(1.05)';
      else if(t==='scale-down')el.style.transform='scale(0.95)';
      else if(t==='brighten')el.style.filter='brightness(1.15)';
      else if(t==='shadow')el.style.boxShadow='0 10px 30px rgba(0,0,0,.15)';
      else if(t==='lift')el.style.transform='translateY(-4px)';
      else if(t==='shake')el.style.transform='translateX(3px)';
    });
    el.addEventListener('mouseleave',function(){el.style.transform=orig.transform;el.style.filter=orig.filter;el.style.boxShadow=orig.boxShadow;});
  });
  function lpPopupOverlayEl(pid){
    var want=String(pid);
    var nodes=document.querySelectorAll('.lp-popup-overlay');
    for(var i=0;i<nodes.length;i++){
      if((nodes[i].getAttribute('data-lp-popup-id')||'')===want)return nodes[i];
    }
    return null;
  }
  function lpClosePopup(pid){
    var o=lpPopupOverlayEl(pid);
    if(!o)return;
    o.style.display='none';
    o.classList.remove('lp-popup-visible');
    if(!document.querySelector('.lp-popup-overlay.lp-popup-visible'))document.body.classList.remove('lp-popup-open');
  }
  function lpCloseAllPopups(){
    document.querySelectorAll('.lp-popup-overlay').forEach(function(o){
      o.style.display='none';
      o.classList.remove('lp-popup-visible');
    });
    document.body.classList.remove('lp-popup-open');
  }
  function lpOpenPopup(pid){
    lpCloseAllPopups();
    var o=lpPopupOverlayEl(pid);
    if(!o)return;
    o.style.display='flex';
    o.classList.add('lp-popup-visible');
    document.body.classList.add('lp-popup-open');
  }
  document.querySelectorAll('[data-lp-popup-close]').forEach(function(btn){
    btn.addEventListener('click',function(e){ e.stopPropagation(); var id=btn.getAttribute('data-lp-popup-close')||''; if(id)lpClosePopup(id); });
  });
  document.querySelectorAll('.lp-popup-overlay').forEach(function(overlay){
    overlay.addEventListener('click',function(e){
      if(e.target===overlay){
        var closeOnOv=overlay.hasAttribute('data-lp-popup-close-overlay');
        if(closeOnOv){
          var id=overlay.getAttribute('data-lp-popup-id')||'';
          if(id)lpClosePopup(id);
        }
      }
    });
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape')lpCloseAllPopups(); });
  document.querySelectorAll('.lp-element[data-action-type],a[data-lp-carousel-cta][data-action-type]').forEach(function(el){
    var type=el.dataset.actionType,target=(el.dataset.actionTarget||'').trim(),nt=el.dataset.actionNewtab==='true';
    if(!type||type==='none'||type==='javascript')return;
    el.addEventListener('click',function(e){
      var t=e.target;
      if(t&&t.nodeType===3)t=t.parentElement;
      if(t&&t.closest){
        if(t.closest('form'))return;
        if(t.closest('input,textarea,select,label'))return;
        if(t.closest('iframe,video,audio'))return;
        var innerA=t.closest('a[href]');
        if(innerA&&innerA!==el)return;
      }
      if(type==='link'&&target){ if(nt)window.open(target,'_blank'); else window.location.href=target; e.preventDefault(); }
      else if(type==='phone'&&target){ window.location.href='tel:'+target.replace(/\\s/g,''); e.preventDefault(); }
      else if(type==='email'&&target){ window.location.href='mailto:'+target; e.preventDefault(); }
      else if(type==='section'&&target){ 
        e.preventDefault();
        var sec=document.getElementById('lp-section-'+target); 
        if(sec){
           var pc=document.querySelector('.page-container');
           var scale=1;
           if(pc && pc.style.transform){
             var m=pc.style.transform.match(/scale\(([^)]+)\)/);
             if(m&&m[1]) scale=parseFloat(m[1]);
           }
           // Không dùng scrollIntoView() vì có thể bị lỗi container hoặc scroll parent trong iframe.
           // Tính chính xác toạ độ Absolute top
           var targetY = sec.offsetTop * scale;
           try {
             if(typeof window.scrollTo === 'function') {
               window.scrollTo({top: targetY, behavior: 'smooth'});
             } else {
               window.scroll(0, targetY);
             }
           } catch(err) {
             document.documentElement.scrollTop = targetY;
             document.body.scrollTop = targetY;
           }
        } 
      }
      else if(type==='popup'&&target){
        var t2=String(target).trim();
        if(t2==='close'){ lpCloseAllPopups(); }
        else {
          // Hỗ trợ cả popup element (ID số nguyên) và popup standalone (ID dạng "popup_xxx")
          var n2=parseInt(t2,10);
          lpOpenPopup(!isNaN(n2)&&String(n2)===t2?n2:t2);
        }
        e.preventDefault();
      }
    });
  });
  function lpWithRecaptcha(cb){
    var k=document.body.getAttribute('data-lp-recaptcha-sitekey');
    var g=(window).grecaptcha;
    if(!k||!g){cb(null);return;}
    g.ready(function(){
      g.execute(k,{action:'lead_submit'}).then(function(t){cb(t);}).catch(function(){cb(null);});
    });
  }
  function lpSubmitToGoogleForms(data,gfConfig){
    try{
      var iframeName='gf_target_'+Date.now();
      var iframe=document.createElement('iframe');
      iframe.name=iframeName;
      iframe.style.display='none';
      document.body.appendChild(iframe);
      var gfForm=document.createElement('form');
      gfForm.method='POST';
      gfForm.action=gfConfig.submitUrl;
      gfForm.target=iframeName;
      gfConfig.mappings.forEach(function(m){
        if(!m.googleFormField||!data[m.landingPageField])return;
        var inp=document.createElement('input');
        inp.type='hidden';
        inp.name=m.googleFormField;
        inp.value=data[m.landingPageField];
        gfForm.appendChild(inp);
      });
      document.body.appendChild(gfForm);
      gfForm.submit();
      setTimeout(function(){
        try{document.body.removeChild(gfForm);}catch(x){}
        try{document.body.removeChild(iframe);}catch(x){}
      },5000);
    }catch(x){}
  }
  document.querySelectorAll('.lp-form[data-lp-lead="1"]').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var pageId=form.getAttribute('data-lp-page-id');
      var wsId=form.getAttribute('data-lp-workspace-id');
      if(!pageId||!wsId)return;
      var fd=new FormData(form);
      var data={};
      fd.forEach(function(v,k){data[k]=String(v);});
      var fc=form.getAttribute('data-lp-form-config-id');
      var fid=fc?parseInt(fc,10):NaN;
      var baseEl=document.querySelector('base');
      var apiRoot=baseEl&&baseEl.href?baseEl.href:(window.location.origin+'/');
      var url=new URL('api/public/leads',apiRoot).href;
      var btn=form.querySelector('button[type="submit"],input[type="submit"]');
      if(btn){btn.disabled=true;}
      var emailNotify=form.getAttribute('data-lp-email-notify')==='1';
      var emailRecipient=form.getAttribute('data-lp-email-recipient')||'';
      var sendConfirm=form.getAttribute('data-lp-send-confirm')==='1';
      var successMsg=form.getAttribute('data-lp-success-msg')||'';
      // Forward to Google Forms silently if configured
      var gfRaw=form.getAttribute('data-google-form');
      if(gfRaw){try{var gfConfig=JSON.parse(gfRaw);if(gfConfig&&gfConfig.submitUrl){lpSubmitToGoogleForms(data,gfConfig);}}catch(x){}}
      function doPost(token){
        var payload={
          pageId:parseInt(pageId,10),
          workspaceId:parseInt(wsId,10),
          formId:!isNaN(fid)?fid:null,
          elementId:form.getAttribute('data-lp-element-id'),
          data:data,
          emailNotifyEnabled:emailNotify,
          emailNotifyRecipient:emailRecipient||null,
          sendConfirmationEmail:sendConfirm
        };
        if(token)payload.recaptchaToken=token;
        fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
          .then(function(r){return r.text().then(function(t){var j=null;try{j=JSON.parse(t);}catch(x){}return{ok:r.ok,status:r.status,j:j};});})
          .then(function(x){
            if(btn){btn.disabled=false;}
            if(x.ok&&x.j&&x.j.ok){
              var red=form.getAttribute('data-lp-redirect');
              if(red&&red.trim()){window.location.href=red.trim();}
              else{var msg=successMsg||'Đã gửi thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.';alert(msg);}
            }else{
              var err=x.j&&x.j.error;
              if(err==='page_not_published'){alert('Trang cần được xuất bản trước khi gửi form.');}
              else if(err==='recaptcha_required'||err==='recaptcha_failed'||err==='recaptcha_low_score'){alert('Xác thực bảo mật thất bại. Tải lại trang và thử lại.');}
              else{alert('Gửi thất bại. Vui lòng thử lại.');}
            }
          })
          .catch(function(){if(btn){btn.disabled=false;}alert('Gửi thất bại. Kiểm tra kết nối mạng.');});
      }
      lpWithRecaptcha(doPost);
    });
  });
  document.querySelectorAll('.lp-form:not([data-lp-lead])').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(form);
      var data={};
      fd.forEach(function(v,k){data[k]=v;});
      var msg='Dữ liệu form (demo):\n'+JSON.stringify(data,null,2);
      alert(msg);
    });
  });
  document.querySelectorAll('[data-tooltip]').forEach(function(el){
    var tip=document.createElement('span');tip.className='tt-popup';
    tip.textContent=el.dataset.tooltip;tip.style.background=el.dataset.ttBg||'#1e293b';
    var sz=el.dataset.ttSize||'medium';tip.style.maxWidth=sz==='small'?'200px':sz==='large'?'400px':'300px';
    el.appendChild(tip);
    el.addEventListener('mouseenter',function(){
      tip.style.opacity='1';var p=el.dataset.ttPos||'top';
      if(p==='top'){tip.style.bottom='100%';tip.style.left='50%';tip.style.transform='translateX(-50%)';tip.style.marginBottom='6px';}
      else if(p==='bottom'){tip.style.top='100%';tip.style.left='50%';tip.style.transform='translateX(-50%)';tip.style.marginTop='6px';}
      else if(p==='left'){tip.style.right='100%';tip.style.top='50%';tip.style.transform='translateY(-50%)';tip.style.marginRight='6px';}
      else if(p==='right'){tip.style.left='100%';tip.style.top='50%';tip.style.transform='translateY(-50%)';tip.style.marginLeft='6px';}
    });
    el.addEventListener('mouseleave',function(){tip.style.opacity='0';});
  });
  document.querySelectorAll('.lp-tabs-widget[data-lp-tabs]').forEach(function(widget){
    var btns=widget.querySelectorAll('[data-lp-tab-btn]');
    var panels=widget.querySelectorAll('[data-lp-tab-panel]');
    function setActive(i){
      var n=Math.min(btns.length,panels.length);
      i=((i%n)+n)%n;
      for(var idx=0;idx<btns.length;idx++){
        var on=idx===i;
        btns[idx].setAttribute('aria-selected',on?'true':'false');
        btns[idx].style.fontWeight=on?'700':'400';
        btns[idx].style.background=on?'#6366f1':'transparent';
        btns[idx].style.color=on?'#fff':'#64748b';
      }
      for(var j=0;j<panels.length;j++){
        panels[j].style.display=j===i?'flex':'none';
      }
    }
    btns.forEach(function(btn,idx){
      btn.addEventListener('click',function(){setActive(idx);});
    });
  });
  document.querySelectorAll('.lp-element[data-lp-accordion]').forEach(function(root){
    root.querySelectorAll('[data-lp-acc-header]').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var item=btn.closest('[data-lp-acc-item]');
        if(!item)return;
        var panel=item.querySelector('[data-lp-acc-panel]');
        var icon=btn.querySelector('[data-lp-acc-icon]');
        if(!panel)return;
        var open=panel.style.display!=='none';
        panel.style.display=open?'none':'block';
        if(icon) icon.textContent=open?'\u25bc':'\u25b2';
      });
    });
  });
  ${utilityFxInline}
  } /* end lpInitInteractive */
  
  /* Trong iframe srcDoc, DOMContentLoaded và load có thể không fire ổn định.
     Vì script nằm ở cuối <body>, ta có thể khởi động ngay lập tức: */
  lpInitInteractive();
  
  })();
  </script>
  <script>
  (function(){
    var d=${designBase};
    function doScale(){
      var vw=window.innerWidth;
      var s=vw<d?vw/d:1;
      var pc=document.querySelector('.page-container');
      if(!pc)return;
      pc.style.transformOrigin='0 0';
      pc.style.transform=s<1?'scale('+s+')':'';
      document.body.style.height=s<1?Math.ceil(pc.offsetHeight*s)+'px':'';
    }
    doScale();
    window.addEventListener('resize',doScale);
    window.addEventListener('load',doScale);
  })();
  </script>
  ${codeBeforeBody ? sanitizeClosingScriptLikeSequences(codeBeforeBody.trim()) : ""}
</body>
</html>`;
}

export function downloadHtml(
  sections: EditorSection[],
  opts?: {
    metaTitle?: string;
    metaDescription?: string;
    deviceWidth?: number;
    desktopCanvasWidth?: number;
    filename?: string;
    pageSettings?: PageSettingsOpts;
    metaKeywords?: string;
    metaImageUrl?: string;
    faviconUrl?: string;
    codeBeforeHead?: string;
    codeBeforeBody?: string;
    useLazyload?: boolean;
    apiBaseUrl?: string;
    pageId?: number;
    workspaceId?: number;
    recaptchaSiteKey?: string;
    formConfigsMap?: Record<number, string>;
  },
) {
  const html = generatePreviewHtml(sections, opts);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts?.filename ?? "page.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
