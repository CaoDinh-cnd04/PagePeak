import DOMPurify from "isomorphic-dompurify";
import { getIconById } from "@/data/iconData";
import type { EditorSection, EditorElement } from "@/types/editor";
import { parseProductDetailContent } from "@/lib/productDetailContent";
import { parseTabsContent, parseCarouselContent } from "@/lib/tabsContent";

/** Ảnh upload lưu dạng `/uploads/...` và phục vụ từ API; trong iframe srcDoc URL tương đối resolve theo origin Vite → cần base trùng backend (giống MediaPanel getFullUrl). */
const DEFAULT_PREVIEW_ASSET_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 600;

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

function elementToHtml(el: EditorElement, sectionWidth: number, sectionHeight: number, htmlCodeFullScreen = false): string {
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
        ew != null ? `width:${widthPct.toFixed(2)}%` : "",
        /* collection-list: chiều cao theo nội dung lưới — tránh khoảng trống dưới như khung % cố định */
        eh != null && el.type !== "collection-list"
          ? `height:${heightPct.toFixed(2)}%`
          : "",
        eh != null && el.type === "collection-list"
          ? `height:auto;max-height:${heightPct.toFixed(2)}%`
          : "",
        `z-index:${el.zIndex ?? 0}`,
        el.rotation ? `transform:rotate(${el.rotation}deg)` : "",
        `opacity:${el.opacity ?? 1}`,
      ].filter(Boolean);

  const s = el.styles ?? {};
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
      styles.push(
        `background-color:${bg === "transparent" ? "rgba(248,250,252,0.5)" : bg}`,
        `border-radius:${radiusCss}`,
        "overflow:hidden",
        "position:relative",
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
      styles.push("display:flex", "align-items:center", "justify-content:center", "gap:8px", "font-family:monospace", "font-size:24px", "font-weight:700");
      return `<div style="${styles.join(";")}"><span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span></div>`;
    }

    case "form": {
      let formConfig: { formType?: string; title?: string; buttonText?: string; fields?: { id: string; name?: string; label?: string; placeholder?: string; type?: string }[]; inputStyle?: string } = {};
      try {
        const parsed = JSON.parse(el.content || "{}");
        formConfig = typeof parsed === "object" ? parsed : {};
      } catch {
        const legacy = (el.content || "name,email").split(",").map((f: string) => f.trim()).filter(Boolean);
        formConfig = { formType: "contact", title: "Liên hệ", buttonText: "Gửi", fields: legacy.map((id) => ({ id, name: id, label: id, placeholder: id, type: "text" })), inputStyle: "outlined" };
      }
      const formType = formConfig.formType ?? "contact";
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
      styles.push("border:1px solid #e2e8f0", "border-radius:8px", "padding:16px", "background:#fff", "display:flex", "flex-direction:column", "gap:8px");
      let inner = "";
      if (title && formType !== "login") {
        inner += `<div style="font-size:${Math.min(fs + 2, 18)}px;font-weight:600;color:#1e293b;margin-bottom:4px">${escHtml(title)}</div>`;
      }
      if (formType === "otp") {
        inner += `<div style="font-size:${fs - 2}px;color:#64748b;margin-bottom:4px">Nhập mã OTP được gửi đến số điện thoại của bạn để xác nhận</div>`;
      }
      if (formType === "login") {
        inner += `<form class="lp-form" data-lp-form-type="login" style="display:flex;gap:8px;align-items:center">
          <input type="text" name="accessCode" placeholder="Mã truy cập" style="flex:1;padding:10px 12px;font-size:${fs}px;${inputBase}" />
          <button type="submit" style="padding:10px 20px;background:#000;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:${fs}px">${escHtml(buttonText)}</button>
        </form>`;
      } else {
        inner += `<form class="lp-form" data-lp-form-type="${escHtml(formType)}">`;
        for (const f of fields) {
          const ph = (f.placeholder ?? f.label ?? f.id) as string;
          const nm = (f.name ?? f.id) as string;
          const tp = (f.type ?? "text") as string;
          if (tp === "textarea") {
            inner += `<div style="margin-bottom:4px"><textarea name="${escHtml(nm)}" placeholder="${escHtml(ph)}" style="width:100%;padding:10px 12px;font-size:${fs}px;${inputBase};min-height:60px;resize:vertical;font-family:inherit"></textarea></div>`;
          } else {
            inner += `<div style="margin-bottom:4px"><input type="${tp === "phone" ? "tel" : tp}" name="${escHtml(nm)}" placeholder="${escHtml(ph)}" style="width:100%;padding:10px 12px;font-size:${fs}px;${inputBase}" /></div>`;
          }
        }
        inner += `<button type="submit" style="width:100%;padding:12px;background:#000;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:${fs}px;margin-top:4px">${escHtml(buttonText)}</button></form>`;
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
      const doc = wrapDoc(rawCode || "<div style='padding:16px;color:#64748b;font-size:12px'>Chưa có mã HTML</div>");
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
      const { layoutType: lt, items: carouselItems } = parseCarouselContent(el.content ?? undefined);
      const layoutType = lt === "testimonial" || lt === "media" ? lt : "testimonial";
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      styles.push(
        `background-color:${bg}`,
        `border-radius:12px`,
        `overflow:hidden`,
        `padding:16px`,
        `box-sizing:border-box`,
        `display:flex`,
        `flex-direction:column`,
        `align-items:center`,
        `justify-content:center`,
      );
      if (carouselItems.length === 0) {
        return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Carousel</span></div>`;
      }
      const item = carouselItems[0];
      let inner = "";
      if (layoutType === "testimonial") {
        if (item.avatar?.trim()) {
          inner += `<div style="width:60px;height:60px;border-radius:50%;overflow:hidden;background:#e2e8f0;margin-bottom:8px"><img src="${escHtml(item.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`;
        }
        inner += `<div style="font-style:italic;font-size:12px;color:#374151;text-align:center;margin-bottom:8px;line-height:1.5">&ldquo;${escHtml((item.quote || "Trích dẫn...").slice(0, 120))}&rdquo;</div>`;
        inner += `<div style="font-size:13px;font-weight:700;color:#111827">${escHtml(item.name || "Tên")}</div>`;
        if (item.role) inner += `<div style="font-size:11px;color:#6b7280">${escHtml(item.role)}</div>`;
      } else {
        if (item.image?.trim()) {
          inner += `<div style="width:100%;flex:1;min-height:0;border-radius:8px;overflow:hidden;background:#e2e8f0;margin-bottom:8px"><img src="${escHtml(item.image)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`;
        }
        if (item.title || item.name) inner += `<div style="font-size:13px;font-weight:600;color:#111827;text-align:center">${escHtml(item.title || item.name || "")}</div>`;
      }
      if (carouselItems.length > 1) {
        const dots = carouselItems.slice(0, 5).map((_, di) =>
          `<div style="width:${di === 0 ? 16 : 6}px;height:6px;border-radius:3px;background:${di === 0 ? "#6366f1" : "#d1d5db"}"></div>`
        ).join("");
        inner += `<div style="display:flex;gap:4px;align-items:center;margin-top:8px">${dots}</div>`;
      }
      return `<div style="${styles.join(";")}">${inner}</div>`;
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
      items.forEach((line) => {
        const [q] = line.split("|");
        accHtml += `<div style="border:1px solid ${borderColor};border-radius:4px;padding:8px 12px;margin-bottom:4px;font-size:13px;background:${headerBg};color:${headerColor};"><div style="font-weight:500;display:flex;justify-content:space-between"><span>${escHtml(
          q ?? "",
        )}</span><span>▼</span></div></div>`;
      });
      return `<div style="${styles.join(";")}">${accHtml}</div>`;
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

    case "map":
      styles.push("background:#ecfdf5", "display:flex", "align-items:center", "justify-content:center", "border:1px solid #a7f3d0", "border-radius:8px");
      return `<div style="${styles.join(";")}"><span style="color:#059669;font-size:14px">📍 Google Maps</span></div>`;

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

    case "antigravity":
      styles.push("background:#0f172a", "display:flex", "align-items:center", "justify-content:center", "border:2px solid #38bdf8", "border-radius:12px");
      return `<div style="${styles.join(";")}"><span style="color:#bae6fd;font-size:16px;font-weight:bold">🚀 Antigravity UI (React Component)</span></div>`;

    default:
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center", "border:1px dashed #cbd5e1", "border-radius:4px");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">${escHtml(el.type.replace(/-/g, " "))}</span></div>`;
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
};

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
  }
): string {
  const assetBaseUrl = (opts?.apiBaseUrl ?? DEFAULT_PREVIEW_ASSET_BASE).replace(/\/?$/, "/");
  const ps = opts?.pageSettings ?? {};
  const title = opts?.metaTitle ?? "Preview";
  const desc = opts?.metaDescription ?? "";
  const keywords = opts?.metaKeywords ?? ps.metaKeywords ?? "";
  const metaImage = opts?.metaImageUrl ?? ps.metaImageUrl ?? "";
  const favicon = opts?.faviconUrl ?? ps.faviconUrl ?? "";
  const codeBeforeHead = opts?.codeBeforeHead ?? ps.codeBeforeHead ?? "";
  const codeBeforeBody = opts?.codeBeforeBody ?? ps.codeBeforeBody ?? "";
  const useLazyload = opts?.useLazyload ?? ps.useLazyload ?? false;

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
              .map((el) => addDataAttrs(el, elementToHtml(el, designBase, sectionH, htmlCodeFullScreen)))
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
              .map((el) => addDataAttrs(el, elementToHtml(el, designBase, sectionH, true)));
          })
          .join("\n")
      : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <base href="${escHtml(assetBaseUrl)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  ${desc ? `<meta name="description" content="${escHtml(desc)}" />` : ""}
  ${keywords ? `<meta name="keywords" content="${escHtml(keywords)}" />` : ""}
  ${metaImage ? `<meta property="og:image" content="${escHtml(metaImage)}" />` : ""}
  ${favicon ? `<link rel="icon" href="${escHtml(favicon)}" type="image/x-icon" />` : ""}
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous" />
  ${fontLinks}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100vh; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #e8ecf1; }
    .page-container { max-width: ${layoutMaxWidth}px; width: 100%; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 40px rgba(0,0,0,0.08); }
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
      .lp-element:not([data-lp-collection-list]) { font-size: 0.9em !important; }
      /* Tránh height:auto làm vỡ ảnh cover trong khối sản phẩm / lưới */
      .lp-element:not([data-lp-grid]):not([data-lp-gallery]):not([data-lp-product-detail]):not([data-lp-collection-list]):not([data-lp-tabs]) img,
      .lp-element:not([data-lp-grid]):not([data-lp-gallery]):not([data-lp-product-detail]):not([data-lp-collection-list]):not([data-lp-tabs]) video { max-width: 100% !important; height: auto !important; object-fit: contain; }
      .lp-element[data-lp-grid] { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
    }
    @media (max-width: 480px) {
      .lp-element:not([data-lp-collection-list]) { font-size: 0.85em !important; }
      .lp-element[data-lp-grid] { grid-template-columns: 1fr !important; gap: 4px !important; }
    }
  </style>
  ${codeBeforeHead ? codeBeforeHead.trim() : ""}
</head>
<body${opts?.thumbnail ? ' style="transform:scale(0.34);transform-origin:0 0;width:960px;min-height:600px"' : ""}${useLazyload ? ' data-lazyload="true"' : ""}>
  <div class="page-container">
    ${sectionsHtml}
  </div>
  ${htmlFullscreenOverlayHtml}
  <script>
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
  document.querySelectorAll('.lp-element[data-action-type]').forEach(function(el){
    var type=el.dataset.actionType,target=(el.dataset.actionTarget||'').trim(),nt=el.dataset.actionNewtab==='true';
    if(!type||type==='none'||type==='javascript')return;
    el.addEventListener('click',function(e){
      if(type==='link'&&target){ if(nt)window.open(target,'_blank'); else window.location.href=target; e.preventDefault(); }
      else if(type==='phone'&&target){ window.location.href='tel:'+target.replace(/\\s/g,''); e.preventDefault(); }
      else if(type==='email'&&target){ window.location.href='mailto:'+target; e.preventDefault(); }
      else if(type==='section'&&target){ var sec=document.getElementById('lp-section-'+target); if(sec)sec.scrollIntoView({behavior:'smooth'}); e.preventDefault(); }
    });
  });
  document.querySelectorAll('.lp-form').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(form);
      var data={};
      fd.forEach(function(v,k){data[k]=v;});
      var msg='Dữ liệu form (tạm thời):\n'+JSON.stringify(data,null,2);
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
  </script>
  ${codeBeforeBody ? codeBeforeBody.trim() : ""}
</body>
</html>`;
}

export function downloadHtml(sections: EditorSection[], opts?: { metaTitle?: string; metaDescription?: string; deviceWidth?: number; desktopCanvasWidth?: number; filename?: string; pageSettings?: PageSettingsOpts; metaKeywords?: string; metaImageUrl?: string; faviconUrl?: string; codeBeforeHead?: string; codeBeforeBody?: string; useLazyload?: boolean; apiBaseUrl?: string }) {
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
