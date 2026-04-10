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

/** Ảnh upload lưu dạng `/uploads/...` và phục vụ từ API; trong iframe srcDoc URL tương đối resolve theo origin Vite → cần base trùng backend (giống MediaPanel getFullUrl). */
const DEFAULT_PREVIEW_ASSET_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 600;

/** Tránh chuỗi `</script>` trong mã tùy chỉnh làm đứt thẻ `<script>` hoặc gây SyntaxError trong iframe srcDoc. */
function sanitizeClosingScriptLikeSequences(html: string): string {
  return html.replace(/<\/script/gi, "<\\/script");
}

/** Ngữ cảnh gửi lead (page + workspace) khi xuất HTML / xem trước. */
type LpHtmlContext = { pageId: number; workspaceId: number };

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
  /** Popup: không gộp font/border vào wrapper (wrapper chỉ là neo vị trí) */
  if (el.type !== "popup") {
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
    if (s.padding) styles.push(`padding:${s.padding}px`);

    if (s.borderWidth && Number(s.borderWidth) > 0)
      styles.push(`border:${s.borderWidth}px solid ${(s.borderColor as string) ?? "#e2e8f0"}`);

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
    case "headline":
      styles.push("margin:0", "line-height:1.2", "font-weight:700");
      if (!s.color) styles.push("color:#1e293b");
      return `<h2 style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Headline"))}</h2>`;

    case "paragraph":
      styles.push("margin:0", "line-height:1.6");
      if (!s.color) styles.push("color:#334155");
      return `<p style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Paragraph"))}</p>`;

    case "text":
      if (!s.color) styles.push("color:#1e293b");
      return `<span style="${styles.join(";")}">${wrapLink(escHtml(textContent || "Text"))}</span>`;

    case "button": {
      const bg = (s.backgroundColor as string) ?? "#4f46e5";
      const br = (s.borderRadius as number) ?? 8;
      const borderW = (s.borderWidth as number) ?? 0;
      const borderC = (s.borderColor as string) ?? "#e2e8f0";
      const boxShadow = (s.boxShadow as string) ?? "";
      const padding = (s.padding as number) ?? 0;
      const hoverBg = (s.hoverBackgroundColor as string) ?? "";
      const href = el.href?.trim() || "javascript:void(0)";
      const target = el.target ?? "_self";
      const content = escHtml(textContent || "Button");

      styles.push(
        `background-color:${bg}`,
        `border-radius:${br}px`,
        "display:flex", "align-items:center", "justify-content:center",
        `color:${(s.color as string) ?? "#fff"}`,
        "font-weight:600", "cursor:pointer", "box-sizing:border-box",
        "text-decoration:none", "transition:all 0.2s ease",
        borderW > 0 ? `border:${borderW}px solid ${borderC}` : "border:none",
        padding > 0 ? `padding:${padding}px` : "padding:0 16px",
      );
      if (boxShadow) styles.push(`box-shadow:${boxShadow}`);

      const hoverJs = hoverBg
        ? ` onmouseover="this.style.backgroundColor='${escHtml(hoverBg)}'" onmouseout="this.style.backgroundColor='${escHtml(bg)}'"`
        : ` onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='none'"`;

      return `<a href="${escHtml(href)}" target="${escHtml(target)}" class="lp-btn" style="${styles.join(";")}"${hoverJs}>${content}</a>`;
    }

    case "image":
      if (imgUrl) {
        styles.push("overflow:hidden");
        const shadow = s.shadow ? `;box-shadow:${s.shadow}` : "";
        return `<div style="${styles.join(";")}${shadow}"><img src="${escHtml(imgUrl)}" alt="${escHtml(textContent)}" style="width:100%;height:100%;object-fit:cover;border-radius:${(s.borderRadius as number) ?? 0}px" /></div>`;
      }
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Image</span></div>`;

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
      const bg = (s.backgroundColor as string) ?? "#e0e7ff";
      const radius = (s.borderRadius as number) ?? 8;
      const borderW = (s.borderWidth as number) ?? 0;
      const borderC = (s.borderColor as string) ?? "#e2e8f0";
      const borderStyle = (s.borderStyle as string) ?? "solid";
      const boxShadow = (s.boxShadow as string) ?? "";
      const overlayColor = (s.overlayColor as string) ?? "";
      const overlayOpacity = Number(s.overlayOpacity ?? 0) || 0;
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(el.content || "[]");
        urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
      } catch {}
      const tl = (s.borderTopLeftRadius as number) ?? radius;
      const tr = (s.borderTopRightRadius as number) ?? radius;
      const bl = (s.borderBottomLeftRadius as number) ?? radius;
      const br = (s.borderBottomRightRadius as number) ?? radius;
      const radiusCss = radius >= 999 ? "50%" : `${tl}px ${tr}px ${br}px ${bl}px`;
      // Không push "position:relative" — phần tử đã có "position:absolute" từ styles[] trên.
      // Thêm relative sẽ ghi đè absolute khiến shape hiển thị sai vị trí trong preview.
      styles.push(
        `background-color:${bg === "transparent" ? "rgba(248,250,252,0.5)" : bg}`,
        `border-radius:${radiusCss}`,
        "overflow:hidden",
      );
      if (borderW > 0) styles.push(`border:${borderW}px ${borderStyle} ${borderC}`);
      if (boxShadow) styles.push(`box-shadow:${boxShadow}`);
      let inner = "";
      if (urls.length > 0) {
        const gap = 4;
        const cols = Math.min(urls.length, 3);
        inner = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;padding:${gap}px;position:absolute;inset:0">${urls.map((u) => `<div style="background:url(${escHtml(u)}) center/cover;border-radius:4px;min-height:0"></div>`).join("")}</div>`;
      }
      if (overlayColor && overlayOpacity > 0) {
        inner += `<div style="position:absolute;inset:0;background:${overlayColor};opacity:${overlayOpacity};border-radius:${radiusCss};pointer-events:none"></div>`;
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
      const iconData = el.content ? getIconById(el.content) : null;
      const iconChar = iconData?.char ?? (el.content === "star" ? "★" : el.content || "★");
      const iconColor = (s.color as string) ?? iconData?.color ?? "#4f46e5";
      styles.push(
        "display:flex",
        "align-items:center",
        "justify-content:center",
        `color:${iconColor}`,
        `font-size:${Math.min((ew as number) ?? 48, (eh as number) ?? 48) * 0.8}px`,
      );
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
        buttonText?: string;
        formConfigId?: number;
        redirectUrl?: string;
        fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string }[];
        inputStyle?: string;
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
      const leadAttrs =
        hasLeadCtx
          ? ` data-lp-lead="1" data-lp-page-id="${Number(pid)}" data-lp-workspace-id="${Number(wid)}"${
              linkedFormId != null ? ` data-lp-form-config-id="${linkedFormId}"` : ""
            } data-lp-element-id="${el.id}"${
              redirectUrl ? ` data-lp-redirect="${escHtml(redirectUrl)}"` : ""
            }`
          : "";
      const title = formConfig.title ?? "Liên hệ";
      const buttonText = formConfig.buttonText ?? "Gửi";
      const fields = Array.isArray(formConfig.fields) ? formConfig.fields : [{ id: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text" }, { id: "email", label: "Email", placeholder: "Email", type: "email" }];
      const inputStyle = formConfig.inputStyle ?? "outlined";
      const inputBase = inputStyle === "filled"
        ? "background:#f1f5f9;border:none"
        : inputStyle === "underlined"
          ? "background:transparent;border:none;border-bottom:2px solid #1e293b;border-radius:0"
          : "background:#fff;border:1px solid #e2e8f0;border-radius:4px";
      const fs = (s.fontSize as number) ?? 14;
      const ff = s.fontFamily ? `font-family:${escHtml(String(s.fontFamily))},sans-serif;` : "";
      const fw = s.fontWeight ? `font-weight:${s.fontWeight};` : "font-weight:400;";
      const fStyle = s.fontStyle ? `font-style:${escHtml(String(s.fontStyle))};` : "";
      const fDeco = s.textDecoration ? `text-decoration:${escHtml(String(s.textDecoration))};` : "";
      const tColor = s.color ? `color:${escHtml(String(s.color))}` : "color:#1e293b";
      const bg = s.backgroundColor ? `background:${escHtml(String(s.backgroundColor))}` : "background:#fff";
      const inputBaseWithColor = inputStyle === "underlined" ? "background:transparent;border:none;border-bottom:2px solid rgba(0,0,0,0.3);border-radius:0" : inputBase;
      styles.push("border:1px solid #e2e8f0", "border-radius:8px", "padding:16px", bg, "display:flex", "flex-direction:column", "gap:8px");
      let inner = "";
      if (title && formType !== "login") {
        inner += `<div style="font-size:${Math.min(fs + 2, 18)}px;font-weight:600;${tColor};${ff}margin-bottom:4px">${escHtml(title)}</div>`;
      }
      if (formType === "otp") {
        inner += `<div style="font-size:${fs - 2}px;color:#64748b;${ff}margin-bottom:4px">Nhập mã OTP được gửi đến số điện thoại của bạn để xác nhận</div>`;
      }
      if (formType === "login") {
        inner += `<form class="lp-form" data-lp-form-type="login" style="display:flex;gap:8px;align-items:center">
          <input type="text" name="accessCode" placeholder="Mã truy cập" style="flex:1;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}${tColor};${inputBaseWithColor};box-sizing:border-box" />
          <button type="submit" style="padding:10px 20px;${tColor.replace("color:","background:")};${bg.replace("background:","color:")};border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:${fs}px;${ff}">
            ${escHtml(buttonText)}
          </button>
        </form>`;
      } else {
        inner += `<form class="lp-form" data-lp-form-type="${escHtml(formType)}"${leadAttrs}>`;
        for (const f of fields) {
          const ph = (f.placeholder ?? f.label ?? f.id) as string;
          const nm = (f.name ?? f.id) as string;
          const tp = (f.type ?? "text") as string;
          if (tp === "textarea") {
            inner += `<div style="margin-bottom:4px"><textarea name="${escHtml(nm)}" placeholder="${escHtml(ph)}" style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}${tColor};${inputBaseWithColor};min-height:60px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea></div>`;
          } else {
            inner += `<div style="margin-bottom:4px"><input type="${tp === "phone" ? "tel" : tp}" name="${escHtml(nm)}" placeholder="${escHtml(ph)}" style="width:100%;padding:10px 12px;font-size:${fs}px;${ff}${fw}${fStyle}${fDeco}${tColor};${inputBaseWithColor};box-sizing:border-box" /></div>`;
          }
        }
        inner += `<button type="submit" style="width:100%;padding:12px;${tColor.replace("color:","background:")};${bg.replace("background:","color:")};border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:${fs}px;${ff}text-align:center;margin-top:4px">${escHtml(buttonText)}</button></form>`;
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
      const layoutType = (s.layoutType as string) ?? "grid";
      const cols = Number(s.columns ?? 3) || 3;
      const gap = Number(s.gap ?? 8) || 8;
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const borderRadius = (s.borderRadius as number) ?? 8;
      const border = (s.border as string) ?? "1px solid #e2e8f0";
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(el.content || "[]");
        urls = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
      } catch {}
      const cellBg = (s.itemBackgroundColor as string) ?? "#e2e8f0";

      const imgCell = (url: string, extra = "") =>
        `<div style="background:${cellBg};aspect-ratio:1/1;border-radius:6px;overflow:hidden${extra}"><img src="${escHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`;
      const emptyCell = () =>
        `<div style="background:${cellBg};aspect-ratio:1/1;border-radius:6px"></div>`;

      if (layoutType === "minimal" && urls[0]) {
        styles.push(
          `overflow:hidden`,
          `border-radius:${borderRadius}px`,
          `background-color:${bg}`,
          `border:${border}`,
        );
        return `<div data-lp-gallery="minimal" style="${styles.join(";")}"><img src="${escHtml(urls[0])}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`;
      }

      if (layoutType === "product-main-thumbs" && urls.length >= 1) {
        styles.push(
          `display:flex`,
          `flex-direction:column`,
          `gap:${gap}px`,
          `overflow:hidden`,
          `border-radius:${borderRadius}px`,
          `background-color:${bg}`,
          `border:${border}`,
          `padding:${gap}px`,
        );
        const main = `<div style="flex:1;min-height:0;border-radius:6px;overflow:hidden"><img src="${escHtml(urls[0])}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`;
        const thumbs = urls.slice(1, 4).map((u) => imgCell(u)).join("");
        const pad = 3 - urls.slice(1, 4).length;
        let thumbRow = thumbs;
        for (let i = 0; i < pad; i++) thumbRow += emptyCell();
        return `<div data-lp-gallery="product-main-thumbs" style="${styles.join(";")}">${main}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:${gap}px">${thumbRow}</div></div>`;
      }

      if (layoutType === "vertical-thumbs" && urls.length >= 1) {
        styles.push(
          `display:grid`,
          `grid-template-columns:auto 1fr`,
          `gap:${gap}px`,
          `overflow:hidden`,
          `border-radius:${borderRadius}px`,
          `background-color:${bg}`,
          `border:${border}`,
          `padding:${gap}px`,
        );
        const main = `<div style="min-height:0;border-radius:6px;overflow:hidden"><img src="${escHtml(urls[0])}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" /></div>`;
        const thumbCol = urls.slice(1, 4).map((u) => imgCell(u)).join("");
        return `<div data-lp-gallery="vertical-thumbs" style="${styles.join(";")}"><div style="display:flex;flex-direction:column;gap:${gap}px">${thumbCol}</div>${main}</div>`;
      }

      styles.push(
        `display:grid`,
        `grid-template-columns:repeat(${cols},1fr)`,
        `gap:${gap}px`,
        `overflow:hidden`,
        `border-radius:${borderRadius}px`,
        `background-color:${bg}`,
        `border:${border}`,
        `padding:${gap}px`,
      );
      let cells = "";
      const total = Math.max(urls.length, cols * 2);
      for (let i = 0; i < total; i++) {
        cells += urls[i] ? imgCell(urls[i]) : emptyCell();
      }
      return `<div data-lp-grid="true" style="${styles.join(";")}">${cells}</div>`;
    }

    case "product-detail": {
      const pd = parseProductDetailContent(el.content ?? undefined);
      const mainImg = pd.images[0];
      const bg = (s.backgroundColor as string) ?? "#ffffff";
      const radius = (s.borderRadius as number) ?? 12;
      styles.push(
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        `overflow:visible`,
        `padding:12px`,
        `box-sizing:border-box`,
        `display:flex`,
        `flex-direction:column`,
        `align-items:stretch`,
        `min-height:0`,
      );
      let inner = "";
      if (mainImg) {
        /* Không dùng flex-basis % (dễ vỡ khi iframe/mobile + rule img height:auto). Dùng aspect-ratio + cover. */
        inner += `<div style="width:100%;flex:0 0 auto;border-radius:8px;overflow:hidden;background:#e2e8f0;margin-bottom:10px;aspect-ratio:1/1;max-height:min(52vh,480px)"><img src="${escHtml(mainImg)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" /></div>`;
      }
      inner += `<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:4px;flex-shrink:0;line-height:1.35;word-break:break-word">${escHtml(pd.title.trim() || "Tên sản phẩm")}</div>`;
      const priceStr = (pd.salePrice.trim() || pd.price.trim() || "0đ") || "0đ";
      inner += `<div style="font-size:16px;font-weight:700;color:#dc2626;flex-shrink:0">${escHtml(priceStr)}</div>`;
      if (pd.badge.trim()) {
        inner += `<span style="display:inline-block;background:#dc2626;color:#fff;font-size:9px;font-weight:600;padding:2px 6px;border-radius:4px;margin-top:4px;flex-shrink:0">${escHtml(pd.badge)}</span>`;
      }
      if (pd.description.trim()) {
        inner += `<p style="font-size:12px;color:#64748b;margin-top:8px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow:visible;flex-shrink:0">${escHtml(pd.description)}</p>`;
      }
      return `<div data-lp-product-detail="true" style="${styles.join(";")}">` + inner + `</div>`;
    }

    case "collection-list": {
      let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
      try { cl = JSON.parse(el.content || "{}"); } catch {}
      const items = cl.items ?? [];
      const cols = Math.max(1, cl.columns ?? 3);
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const radius = (s.borderRadius as number) ?? 12;
      const rows = Math.max(1, Math.ceil(items.length / cols));
      /* Khớp editor: hàng theo nội dung (auto), ảnh vuông theo chiều ngang ô — không dùng 1fr + flex:1 (ảnh phình quá to, lệch so với canvas). */
      styles.push(
        `display:grid`,
        `grid-template-columns:repeat(${cols},1fr)`,
        `grid-template-rows:repeat(${rows},auto)`,
        `align-content:start`,
        `gap:10px`,
        `background-color:${bg}`,
        `border-radius:${radius}px`,
        `padding:12px`,
        `overflow:visible`,
        `box-sizing:border-box`,
        `min-height:0`,
        `font-size:16px`,
      );
      const card = (item: { image?: string; title?: string; price?: string }) => {
        const img = item.image?.trim();
        const imgHtml = img
          ? `<div style="width:100%;flex-shrink:0;margin-bottom:8px"><div style="width:100%;aspect-ratio:1/1;border-radius:6px;overflow:hidden;background:#e2e8f0"><img src="${escHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" /></div></div>`
          : `<div style="width:100%;flex-shrink:0;margin-bottom:8px"><div style="width:100%;aspect-ratio:1/1;border-radius:6px;background:#e2e8f0"></div></div>`;
        return `<div style="background:#fff;border-radius:8px;padding:8px;overflow:hidden;display:flex;flex-direction:column;align-items:stretch;align-self:start;width:100%;box-sizing:border-box">${imgHtml}<div style="font-size:11px;font-weight:600;color:#334155;line-height:1.35;margin-top:0;margin-bottom:4px;flex-shrink:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word">${escHtml(item.title || "Sản phẩm")}</div><div style="font-size:12px;font-weight:700;color:#dc2626;flex-shrink:0;line-height:1.25">${escHtml(item.price || "0đ")}</div></div>`;
      };
      const cells = items.map((item) => card(item)).join("");
      return `<div data-lp-collection-list="true" style="${styles.join(";")}">${cells || '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px;align-self:center">Danh sách sản phẩm</div>'}</div>`;
    }

    case "carousel": {
      const { layoutType: lt, items: carouselItems, carouselStyle: cStyle } = parseCarouselContent(el.content ?? undefined);
      const cs = mergeCarouselStyle(cStyle);
      const layoutType = lt === "testimonial" || lt === "media" ? lt : "testimonial";
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const autoplayMs = Math.max(1000, cs.autoplayMs ?? 5000);
      const dotActiveColor = cs.dotActiveColor ?? "#6366f1";
      const dotColor = cs.dotColor ?? "#d1d5db";
      styles.push(
        `background-color:${bg}`,
        `border-radius:12px`,
        `overflow:visible`,
        `padding:24px 40px 16px`,
        `box-sizing:border-box`,
        `display:flex`,
        `flex-direction:column`,
        `align-items:center`,
        `justify-content:center`,
        `position:relative`,
      );
      if (carouselItems.length === 0) {
        return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Carousel</span></div>`;
      }
      const n = carouselItems.length;
      const stripQ = (str: string) => escHtml(str.replace(/^[""\u201c\u2018']+|[""\u201d\u2019']+$/g, "").trim());
      const buildSlide = (item: (typeof carouselItems)[0], si: number) => {
        let inner = "";
        if (layoutType === "testimonial") {
          if (item.avatar?.trim()) {
            inner += `<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:#e2e8f0;margin:0 auto 14px;box-shadow:0 2px 14px rgba(0,0,0,.13);flex-shrink:0"><img src="${escHtml(item.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`;
          }
          const q = stripQ(item.quote || "Trích dẫn hài lòng của khách hàng về sản phẩm/dịch vụ");
          inner += `<div style="font-style:italic;font-size:${cs.quoteFontSize}px;color:${cs.quoteColor};text-align:center;line-height:1.7;padding:0 8px;margin-bottom:14px">\u201c${q.slice(0,220)}\u201d</div>`;
          inner += `<div style="font-size:${cs.nameFontSize}px;font-weight:700;color:${cs.nameColor};text-align:center;line-height:1.3;margin-bottom:3px">${escHtml(item.name || "Tên khách hàng")}</div>`;
          if (item.role) inner += `<div style="font-size:${cs.roleFontSize}px;color:${cs.roleColor};text-align:center;opacity:0.72;line-height:1.3">${escHtml(item.role)}</div>`;
        } else {
          if (item.image?.trim()) {
            inner += `<div style="width:100%;border-radius:10px;overflow:hidden;background:#e2e8f0;margin-bottom:12px;aspect-ratio:16/9;flex-shrink:0"><img src="${escHtml(item.image)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`;
          }
          if (item.title || item.name) inner += `<div style="font-size:${cs.titleFontSize}px;font-weight:700;color:${cs.titleColor};text-align:${cs.titleAlign};margin-bottom:5px;line-height:1.3">${escHtml(item.title || item.name || "")}</div>`;
          if (item.desc?.trim()) inner += `<div style="font-size:${cs.descFontSize}px;color:${cs.descColor};text-align:${cs.descAlign};line-height:1.55;opacity:0.82">${escHtml(item.desc)}</div>`;
        }
        return `<div data-lp-carousel-slide data-slide-index="${si}" style="display:${si===0?"flex":"none"};flex-direction:column;align-items:center;width:100%;box-sizing:border-box;padding:0 ${n>1?"28px":"4px"}">${inner || `<span style="color:#94a3b8;font-size:12px">Slide ${si + 1}</span>`}</div>`;
      };
      const slidesHtml = carouselItems.map((it, si) => buildSlide(it, si)).join("");
      const maxDots = 12;
      const dotCount = Math.min(n, maxDots);
      const dotsHtml = carouselItems.slice(0, maxDots).map((_, di) => {
        const active = di === 0;
        return `<button type="button" data-lp-carousel-dot="${di}" aria-label="Slide ${di + 1}" aria-current="${active ? "true" : "false"}" style="width:${active ? 20 : 7}px;height:7px;border:none;border-radius:4px;background:${active ? dotActiveColor : dotColor};cursor:pointer;padding:0;flex-shrink:0;transition:background .25s,width .25s"></button>`;
      }).join("");
      const carouselId = "carousel_" + Math.random().toString(36).substring(2, 9);
      const dotsRow = dotCount > 1
        ? `<div style="display:flex;gap:5px;align-items:center;margin-top:14px;justify-content:center;flex-shrink:0">${dotsHtml}</div>`
        : "";
      const navBtns = n > 1 ? `
        <button type="button" data-lp-carousel-prev aria-label="Slide trước" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);z-index:10;width:32px;height:32px;border-radius:50%;border:none;background:rgba(15,23,42,0.32);color:#fff;cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0">&#8249;</button>
        <button type="button" data-lp-carousel-next aria-label="Slide tiếp" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:10;width:32px;height:32px;border-radius:50%;border:none;background:rgba(15,23,42,0.32);color:#fff;cursor:pointer;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0">&#8250;</button>` : "";
      
      const isolateScript = n > 1 ? `<script>
        (function(){
          var init = function() {
            var widget = document.getElementById('${carouselId}');
            if(!widget) return;
            var slides=widget.querySelectorAll('[data-lp-carousel-slide]');
            var dots=widget.querySelectorAll('[data-lp-carousel-dot]');
            var btnPrev=widget.querySelector('[data-lp-carousel-prev]');
            var btnNext=widget.querySelector('[data-lp-carousel-next]');
            var cur=0;
            function go(i){
              i=(i%${n}+${n})%${n};cur=i;
              for(var k=0;k<slides.length;k++) slides[k].style.display=(k===i)?'flex':'none';
              for(var d=0;d<dots.length;d++){
                var on=(d===i);
                dots[d].setAttribute('aria-current',on?'true':'false');
                dots[d].style.background=on?'${escHtml(dotActiveColor)}':'${escHtml(dotColor)}';
                dots[d].style.width=on?'20px':'7px';
              }
            }
            var timer=setInterval(function(){go(cur+1)}, ${autoplayMs});
            function reset(){clearInterval(timer);timer=setInterval(function(){go(cur+1)}, ${autoplayMs});}
            if(btnPrev) btnPrev.addEventListener('click', function(e){e.preventDefault();go(cur-1);reset();});
            if(btnNext) btnNext.addEventListener('click', function(e){e.preventDefault();go(cur+1);reset();});
            dots.forEach(function(d,i){ d.addEventListener('click', function(e){e.preventDefault();go(i);reset();})});
          };
          if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
          else init();
        })();
      </script>` : "";

      return `<div id="${carouselId}" data-lp-carousel="1" data-autoplay-ms="${autoplayMs}" data-dot-active="${escHtml(dotActiveColor)}" data-dot-color="${escHtml(dotColor)}" style="${styles.join(";")}"><div style="display:flex;flex-direction:column;width:100%;align-items:center">${slidesHtml}</div>${dotsRow}${navBtns}</div>${isolateScript}`;
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

    case "frame": {
      const borderColor = (s.borderColor as string) ?? "#cbd5e1";
      const radius = (s.borderRadius as number) ?? 8;
      styles.push(
        `border:2px dashed ${borderColor}`,
        `border-radius:${radius}px`,
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "background:#f9fafb",
      );
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Frame</span></div>`;
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
      const headerBg = (s.headerBackgroundColor as string) ?? "#1e293b";
      const headerColor = (s.headerTextColor as string) ?? "#ffffff";
      const bodyColor = (s.bodyTextColor as string) ?? (s.color as string) ?? "#334155";
      const pid = el.id;
      const maxW = Math.min(920, Math.max(280, Number(ew ?? 500)));

      const cardInner = popupFlat
        ? (() => {
            const titleC = (s.headerTextColor as string) ?? (s.color as string) ?? "#0f172a";
            return `<div data-lp-popup="true" style="background:${escHtml(bg)};border-radius:${radius}px;box-shadow:0 12px 40px rgba(15,23,42,0.12);overflow:hidden;display:flex;flex-direction:column;border:1px solid #e2e8f0"><div style="padding:14px 14px 6px;font-size:15px;font-weight:700;color:${escHtml(
              titleC,
            )}">${escHtml(title)}</div><div style="padding:4px 14px 14px;font-size:13px;color:${escHtml(bodyColor)};line-height:1.5">${formatBlockBodyHtml(bodyRaw)}</div></div>`;
          })()
        : `<div data-lp-popup="true" style="background:${escHtml(bg)};border-radius:${radius}px;box-shadow:0 12px 40px rgba(15,23,42,0.12);overflow:hidden;display:flex;flex-direction:column;border:1px solid #e2e8f0"><header style="background:${escHtml(headerBg)};color:${escHtml(headerColor)};padding:10px 14px;font-size:13px;font-weight:600">${escHtml(title)}</header><div style="padding:14px;font-size:13px;color:${escHtml(bodyColor)};line-height:1.5">${formatBlockBodyHtml(bodyRaw)}</div></div>`;

      return `<div style="${styles.join(";")}"><div class="lp-popup-overlay" id="lp-popup-overlay-${pid}" data-lp-popup-id="${pid}" style="position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box"><div class="lp-popup-panel" role="dialog" aria-modal="true" style="position:relative;width:100%;max-width:min(90vw, ${maxW}px);margin:auto"><button type="button" class="lp-popup-close" data-lp-popup-close="${pid}" aria-label="Đóng" style="position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;border:none;border-radius:8px;background:rgba(15,23,42,0.08);cursor:pointer;font-size:20px;line-height:1;color:#475569">×</button>${cardInner}</div></div></div>`;
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

    case "antigravity":
      styles.push("background:#0f172a", "display:flex", "align-items:center", "justify-content:center", "border:2px solid #38bdf8", "border-radius:12px");
      return `<div style="${styles.join(";")}"><span style="color:#bae6fd;font-size:16px;font-weight:bold">🚀 Antigravity UI (React Component)</span></div>`;

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
      const ff = el.styles?.fontFamily;
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
  }
): string {
  const assetBaseUrl = (opts?.apiBaseUrl ?? DEFAULT_PREVIEW_ASSET_BASE).replace(/\/?$/, "/");
  const recaptchaSiteKey = (opts?.recaptchaSiteKey ?? (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ?? "").trim();
  const recaptchaHeadScript = recaptchaSiteKey
    ? `<script src="https://www.google.com/recaptcha/api.js?render=${escHtml(recaptchaSiteKey)}" async defer></script>`
    : "";
  const bodyRecaptchaAttr = recaptchaSiteKey ? ` data-lp-recaptcha-sitekey="${escHtml(recaptchaSiteKey)}"` : "";
  const lpCtx: LpHtmlContext | undefined =
    opts?.pageId != null && opts?.workspaceId != null ? { pageId: opts.pageId, workspaceId: opts.workspaceId } : undefined;
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
              .map((el) => addDataAttrs(el, elementToHtml(el, designBase, sectionH, htmlCodeFullScreen, lpCtx)))
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
              .map((el) => addDataAttrs(el, elementToHtml(el, designBase, sectionH, true, lpCtx)));
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
  function lpClosePopup(pid){
    var o=document.getElementById('lp-popup-overlay-'+pid);
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
    var o=document.getElementById('lp-popup-overlay-'+pid);
    if(!o)return;
    o.style.display='flex';
    o.classList.add('lp-popup-visible');
    document.body.classList.add('lp-popup-open');
  }
  document.querySelectorAll('[data-lp-popup-close]').forEach(function(btn){
    btn.addEventListener('click',function(e){ e.stopPropagation(); var id=parseInt(btn.getAttribute('data-lp-popup-close')||'0',10); if(!isNaN(id))lpClosePopup(id); });
  });
  document.querySelectorAll('.lp-popup-overlay').forEach(function(overlay){
    overlay.addEventListener('click',function(e){ if(e.target===overlay){ var id=parseInt(overlay.getAttribute('data-lp-popup-id')||'0',10); if(!isNaN(id))lpClosePopup(id); } });
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape')lpCloseAllPopups(); });
  document.querySelectorAll('.lp-element[data-action-type]').forEach(function(el){
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
        else { var pid=parseInt(t2,10); if(!isNaN(pid))lpOpenPopup(pid); }
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
      function doPost(token){
        var payload={
          pageId:parseInt(pageId,10),
          workspaceId:parseInt(wsId,10),
          formId:!isNaN(fid)?fid:null,
          elementId:form.getAttribute('data-lp-element-id'),
          data:data
        };
        if(token)payload.recaptchaToken=token;
        fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
          .then(function(r){return r.text().then(function(t){var j=null;try{j=JSON.parse(t);}catch(x){}return{ok:r.ok,status:r.status,j:j};});})
          .then(function(x){
            if(btn){btn.disabled=false;}
            if(x.ok&&x.j&&x.j.ok){
              var red=form.getAttribute('data-lp-redirect');
              if(red&&red.trim()){window.location.href=red.trim();}
              else{alert('Đã gửi thành công!');}
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
