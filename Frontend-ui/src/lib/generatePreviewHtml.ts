import DOMPurify from "isomorphic-dompurify";
import type { EditorSection, EditorElement } from "@/types/editor";

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 600;

function elementToHtml(el: EditorElement, sectionWidth: number, sectionHeight: number): string {
  if (el.isHidden) return "";

  const leftPct = (el.x / sectionWidth) * 100;
  const topPct = (el.y / sectionHeight) * 100;
  const widthPct = el.width != null ? (el.width / sectionWidth) * 100 : 0;
  const heightPct = el.height != null ? (el.height / sectionHeight) * 100 : 0;

  const styles: string[] = [
    `position:absolute`,
    `left:${leftPct.toFixed(2)}%`,
    `top:${topPct.toFixed(2)}%`,
    el.width != null ? `width:${widthPct.toFixed(2)}%` : "",
    el.height != null ? `height:${heightPct.toFixed(2)}%` : "",
    `z-index:${el.zIndex}`,
    el.rotation ? `transform:rotate(${el.rotation}deg)` : "",
    `opacity:${el.opacity}`,
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

  if (s.animation) {
    const dur = Number(s.animationDuration) || 1;
    const delay = Number(s.animationDelay) || 0;
    const repeat = s.animationRepeat ? "infinite" : "1";
    styles.push(`animation:${s.animation} ${dur}s ${delay}s ${repeat} both`);
  }

  if (s.hoverEffect) styles.push("transition:all 0.3s ease");

  const wrapLink = (inner: string) => {
    if (el.href) {
      return `<a href="${escHtml(el.href)}" target="${el.target ?? "_self"}" style="text-decoration:none;color:inherit;display:block;width:100%;height:100%">${inner}</a>`;
    }
    return inner;
  };

  switch (el.type) {
    case "headline":
      styles.push("margin:0", "line-height:1.2", "font-weight:700");
      return `<h2 style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</h2>`;

    case "paragraph":
      styles.push("margin:0", "line-height:1.6");
      return `<p style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</p>`;

    case "text":
      return `<span style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</span>`;

    case "button": {
      const bg = (s.backgroundColor as string) ?? "#4f46e5";
      const br = (s.borderRadius as number) ?? 8;
      const hoverBg = (s.hoverBackgroundColor as string) ?? "";
      const border = (s.border as string) ?? "";
      const padding = (s.padding as number) ?? 0;
      styles.push(
        `background-color:${bg}`,
        `border-radius:${br}px`,
        "display:flex", "align-items:center", "justify-content:center",
        `color:${(s.color as string) ?? "#fff"}`,
        "font-weight:600", "cursor:pointer", "border:none", "box-sizing:border-box",
      );
      if (border) styles.push(`border:${border}`);
      if (padding) styles.push(`padding:${padding}px`);
      const hoverStyle = hoverBg ? ` onmouseover="this.style.backgroundColor='${escHtml(hoverBg)}'" onmouseout="this.style.backgroundColor='${escHtml(bg)}'"` : "";
      return `<div style="${styles.join(";")}"${hoverStyle}>${wrapLink(escHtml(el.content ?? "Button"))}</div>`;
    }

    case "image":
      if (el.imageUrl) {
        styles.push("overflow:hidden");
        const shadow = s.shadow ? `;box-shadow:${s.shadow}` : "";
        return `<div style="${styles.join(";")}${shadow}"><img src="${escHtml(el.imageUrl)}" alt="${escHtml(el.content ?? "")}" style="width:100%;height:100%;object-fit:cover;border-radius:${(s.borderRadius as number) ?? 0}px" /></div>`;
      }
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Image</span></div>`;

    case "video":
      if (el.videoUrl) {
        styles.push("overflow:hidden");
        let src = el.videoUrl;
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
          return `<div style="${styles.join(";")}"><iframe src="${escHtml(src)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
        }
        return `<div style="${styles.join(";")}"><video src="${escHtml(src)}" style="width:100%;height:100%;object-fit:cover" controls></video></div>`;
      }
      styles.push("background:#0f172a", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Video</span></div>`;

    case "shape": {
      const bg = (s.backgroundColor as string) ?? "#e0e7ff";
      const stroke = (s.strokeColor as string) ?? "";
      const strokeW = (s.strokeWidth as number) ?? 0;
      const shadow = s.shadow ? `;box-shadow:${s.shadow}` : "";
      styles.push(`background-color:${bg}`);
      if (stroke && strokeW) styles.push(`border:${strokeW}px ${(s.strokeStyle as string) ?? "solid"} ${stroke}`);
      return `<div style="${styles.join(";")}${shadow}"></div>`;
    }

    case "divider": {
      const color = (s.backgroundColor as string) ?? "#d1d5db";
      const thickness = (el.height ?? 2) || 2;
      const style = (s.lineStyle as string) ?? "solid";
      const borderStyle = style === "dashed" ? "dashed" : style === "dotted" ? "dotted" : "solid";
      styles.push(`border-bottom:${thickness}px ${borderStyle} ${color}`);
      return `<div style="${styles.join(";")}"></div>`;
    }

    case "icon": {
      const iconChar = el.content && el.content !== "star" ? el.content : "★";
      styles.push(
        "display:flex",
        "align-items:center",
        "justify-content:center",
        `color:${(s.color as string) ?? "#4f46e5"}`,
        `font-size:${Math.min(el.width ?? 48, el.height ?? 48) * 0.8}px`,
      );
      return `<div style="${styles.join(";")}">${escHtml(iconChar)}</div>`;
    }

    case "countdown": {
      styles.push("display:flex", "align-items:center", "justify-content:center", "gap:8px", "font-family:monospace", "font-size:24px", "font-weight:700");
      return `<div style="${styles.join(";")}"><span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span></div>`;
    }

    case "form": {
      styles.push("border:1px dashed #cbd5e1", "border-radius:8px", "padding:16px", "background:#fff");
      return `<div style="${styles.join(";")}"><div style="margin-bottom:8px"><input style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px" placeholder="Họ tên" /></div><div style="margin-bottom:8px"><input style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px" placeholder="Email" /></div><button style="width:100%;padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer">Gửi</button></div>`;
    }

    case "html":
      return `<div style="${styles.join(";")}">${DOMPurify.sanitize(el.content ?? "", { ALLOWED_TAGS: ["a", "b", "i", "u", "em", "strong", "p", "br", "span", "div", "h1", "h2", "h3", "ul", "ol", "li", "img", "iframe", "blockquote", "code", "pre"], ALLOWED_ATTR: ["href", "target", "src", "alt", "width", "height", "class", "style", "allowfullscreen", "frameborder"] })}</div>`;

    case "list": {
      const items = (el.content ?? "").split("\n").map((i) => `<li>${escHtml(i)}</li>`).join("");
      styles.push("list-style:disc inside", "line-height:1.8");
      return `<ul style="${styles.join(";")}">${items}</ul>`;
    }

    case "gallery": {
      const cols = Number(s.columns ?? 3) || 3;
      const gap = Number(s.gap ?? 8) || 8;
      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const borderRadius = (s.borderRadius as number) ?? 8;
      const border = (s.border as string) ?? "1px solid #e2e8f0";

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

      const cellBg = (s.itemBackgroundColor as string) ?? "#e2e8f0";
      let cells = "";
      const total = cols * 2;
      for (let i = 0; i < total; i++) {
        cells += `<div style="background:${cellBg};aspect-ratio:1/1;border-radius:6px"></div>`;
      }
      return `<div data-lp-grid="true" style="${styles.join(";")}">${cells}</div>`;
    }

    case "carousel": {
      const raw = (el.content || "").trim();
      const slides = (raw ? raw : "Slide 1|Mô tả ngắn slide 1\nSlide 2|Mô tả ngắn slide 2\nSlide 3|Mô tả ngắn slide 3")
        .split("\n")
        .map((line) => {
          const [title, desc] = line.split("|");
          return {
            title: (title || "").trim() || "Slide",
            desc: (desc || "").trim() || "Mô tả ngắn",
          };
        })
        .slice(0, 10);

      const bg = (s.backgroundColor as string) ?? "#f8fafc";
      const borderRadius = (s.borderRadius as number) ?? 12;
      const autoPlay = (s.autoPlay as unknown as boolean | undefined) ?? true;
      const interval = Number(s.intervalMs ?? 4000) || 4000;

      styles.push(
        `background:${bg}`,
        `border-radius:${borderRadius}px`,
        "overflow:hidden",
        "position:relative",
      );

      const slidesHtml = slides
        .map(
          (sl, idx) =>
            `<div class="pp-slide" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:${idx === 0 ? 1 : 0};transition:opacity 0.6s ease;">
  <div style="max-width:70%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,0.12);text-align:center;">
    <div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:8px;">${escHtml(sl.title)}</div>
    <div style="font-size:13px;color:#6b7280;line-height:1.7;">${escHtml(sl.desc)}</div>
  </div>
</div>`,
        )
        .join("");

      const dots = slides
        .map(
          (_sl, idx) =>
            `<span class="pp-dot" data-idx="${idx}" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${
              idx === 0 ? "#4f46e5" : "#cbd5e1"
            };margin:0 4px;cursor:pointer;"></span>`,
        )
        .join("");

      const js = `<script>(function(){try{var root=document.currentScript.previousElementSibling;var slides=root.querySelectorAll('.pp-slide');var dots=root.querySelectorAll('.pp-dot');if(!slides.length)return;var idx=0;function show(i){slides[idx].style.opacity=0;dots[idx].style.background='#cbd5e1';idx=i;slides[idx].style.opacity=1;dots[idx].style.background='#4f46e5';}dots.forEach(function(d){d.addEventListener('click',function(){var i=Number(d.getAttribute('data-idx')||'0');show(i);});});${
        autoPlay
          ? `setInterval(function(){show((idx+1)%slides.length);},${interval});`
          : ""
      }}catch(e){}})();</script>`;

      return `<div style="${styles.join(";")}">
  <div class="pp-carousel-inner" style="position:relative;width:100%;height:100%;">${slidesHtml}</div>
  <div style="position:absolute;left:50%;bottom:12px;transform:translateX(-50%);">${dots}</div>
</div>${js}`;
    }

    case "tabs": {
      const tabNames = (el.content ?? "Tab 1\nTab 2").split("\n").filter((t) => t.trim());
      const tabs = tabNames.length ? tabNames : ["Tab 1", "Tab 2"];

      const containerBg = (s.backgroundColor as string) ?? "#ffffff";
      const borderColor = (s.borderColor as string) ?? "#e2e8f0";
      const radius = (s.borderRadius as number) ?? 8;
      const activeBg = (s.activeTabBgColor as string) ?? "#eef2ff";
      const activeColor = (s.activeTabTextColor as string) ?? "#4f46e5";
      const inactiveBg = (s.inactiveTabBgColor as string) ?? "transparent";
      const inactiveColor = (s.inactiveTabTextColor as string) ?? "#94a3b8";
      const contentBg = (s.contentBgColor as string) ?? "#f9fafb";
      const contentColor = (s.contentTextColor as string) ?? "#94a3b8";

      styles.push(
        `border:1px solid ${borderColor}`,
        `border-radius:${radius}px`,
        `background:${containerBg}`,
        "overflow:hidden",
      );

      let tabsHtml = '<div style="display:flex;border-bottom:1px solid #e2e8f0">';
      tabs.forEach((t, i) => {
        const isActive = i === 0;
        tabsHtml += `<span style="padding:8px 16px;font-size:13px;border-bottom:2px solid ${
          isActive ? activeColor : "transparent"
        };background:${isActive ? activeBg : inactiveBg};color:${isActive ? activeColor : inactiveColor};font-weight:${
          isActive ? 600 : 500
        };">${escHtml(t)}</span>`;
      });
      tabsHtml += `</div><div style="padding:12px;background:${contentBg};color:${contentColor};font-size:13px">Nội dung tab</div>`;

      return `<div style="${styles.join(";")}">${tabsHtml}</div>`;
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

    case "product": {
      const name = (s.productName as string) ?? el.content ?? "Sản phẩm mẫu";
      const price = (s.productPrice as string) ?? "199.000₫";
      const desc = (s.productDescription as string) ?? "Mô tả ngắn về sản phẩm của bạn.";
      const buttonLabel = (s.productButtonLabel as string) ?? "Mua ngay";
      const priceColor = (s.productPriceColor as string) ?? "#dc2626";
      const btnBg = (s.productButtonBgColor as string) ?? "#4f46e5";
      const btnColor = (s.productButtonTextColor as string) ?? "#ffffff";
      const imgUrl = el.imageUrl ?? "";

      styles.push(
        "border:1px solid #e2e8f0",
        "border-radius:12px",
        "background:#ffffff",
        "padding:16px",
        "box-shadow:0 10px 30px rgba(15,23,42,0.08)",
      );

      const imgHtml = imgUrl
        ? `<div style="width:100%;padding-top:56%;border-radius:10px;margin-bottom:12px;background:#e5e7eb;background-size:cover;background-position:center;background-image:url(${escHtml(imgUrl)})"></div>`
        : `<div style="width:100%;padding-top:56%;border-radius:10px;background:#e5e7eb;margin-bottom:12px;"></div>`;
      const nameHtml = `<div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${escHtml(name)}</div>`;
      const priceHtml = `<div style="font-size:16px;font-weight:700;color:${priceColor};margin-bottom:6px;">${escHtml(price)}</div>`;
      const descHtml = `<div style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.6;">${escHtml(desc)}</div>`;
      const btnStyle = `width:100%;padding:9px 14px;border-radius:9999px;border:none;background:${btnBg};color:${btnColor};font-size:13px;font-weight:600;cursor:pointer;`;
      const btnHtml = el.href
        ? `<a href="${escHtml(el.href)}" target="_self" style="${btnStyle}display:block;text-align:center;text-decoration:none;">${escHtml(buttonLabel)}</a>`
        : `<button style="${btnStyle}">${escHtml(buttonLabel)}</button>`;

      return `<div style="${styles.join(";")}">${imgHtml}${nameHtml}${priceHtml}${descHtml}${btnHtml}</div>`;
    }

    case "collection-list": {
      const raw = (el.content || "").trim();
      const items = (raw ? raw : "Tiêu đề 1|Mô tả ngắn 1\nTiêu đề 2|Mô tả ngắn 2\nTiêu đề 3|Mô tả ngắn 3")
        .split("\n")
        .map((line) => {
          const [title, desc] = line.split("|");
          return {
            title: (title || "").trim() || "Item",
            desc: (desc || "").trim() || "Mô tả ngắn",
          };
        })
        .slice(0, 12);

      const cols = Number(s.columns ?? 3) || 3;
      const gap = Number(s.gap ?? 16) || 16;
      const bg = (s.backgroundColor as string) ?? "#f8fafc";

      styles.push(
        "display:grid",
        `grid-template-columns:repeat(${cols},minmax(0,1fr))`,
        `gap:${gap}px`,
        `background:${bg}`,
        "padding:16px",
        "border-radius:16px",
      );

      const cards = items
        .map(
          (it) =>
            `<div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:14px;box-shadow:0 8px 20px rgba(15,23,42,0.06);">
  <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${escHtml(it.title)}</div>
  <div style="font-size:12px;color:#6b7280;line-height:1.6;">${escHtml(it.desc)}</div>
</div>`,
        )
        .join("");

      return `<div data-lp-grid="true" style="${styles.join(";")}">${cards}</div>`;
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

function addDataAttrs(el: EditorElement, html: string): string {
  const s = el.styles ?? {};
  const attrs: string[] = ['class="lp-element"'];
  if (s.hoverEffect) attrs.push(`data-hover="${escHtml(String(s.hoverType ?? "scale-up"))}"`);
  if (s.tooltipText) {
    attrs.push(
      `data-tooltip="${escHtml(String(s.tooltipText))}"`,
      `data-tt-bg="${escHtml(String(s.tooltipBgColor ?? "#1e293b"))}"`,
      `data-tt-pos="${s.tooltipPosition ?? "top"}"`,
      `data-tt-size="${s.tooltipSize ?? "medium"}"`,
    );
  }
  return html.replace(/^<(\w+)/, `<$1 ${attrs.join(" ")}`);
}

function collectFonts(sections: EditorSection[]): string[] {
  const fonts = new Set<string>();
  for (const section of sections) {
    for (const el of section.elements) {
      const ff = el.styles?.fontFamily;
      if (typeof ff === "string" && ff && ff !== "Inter") fonts.add(ff);
    }
  }
  return Array.from(fonts);
}

export function generatePreviewHtml(
  sections: EditorSection[],
  opts?: { metaTitle?: string; metaDescription?: string; deviceWidth?: number; thumbnail?: boolean }
): string {
  const title = opts?.metaTitle ?? "Preview";
  const desc = opts?.metaDescription ?? "";

  const fonts = collectFonts(sections);
  const fontLinks = fonts.length > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join("&")}&display=swap" rel="stylesheet" />`
    : "";

  const designW = DESIGN_WIDTH;
  const sectionsHtml = sections
    .filter((s) => s.visible !== false)
    .map((section) => {
      const sectionH = section.height ?? DESIGN_HEIGHT;
      const secStyles: string[] = [
        "position:relative",
        "width:100%",
        "padding-bottom:" + (sectionH / designW) * 100 + "%",
        "height:0",
        `background-color:${section.backgroundColor ?? "#ffffff"}`,
        "overflow:hidden",
      ];
      if (section.backgroundImageUrl) {
        secStyles.push(
          `background-image:url(${section.backgroundImageUrl})`,
          "background-size:cover",
          "background-position:center"
        );
      }
      const els = section.elements.map((el) => addDataAttrs(el, elementToHtml(el, designW, sectionH))).join("\n");
      return `<div class="lp-section" style="${secStyles.join(";")}"><div class="lp-section-inner" style="position:absolute;top:0;left:0;width:100%;height:100%">\n${els}\n</div></div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  ${desc ? `<meta name="description" content="${escHtml(desc)}" />` : ""}
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous" />
  ${fontLinks}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #e8ecf1; }
    .page-container { max-width: ${DESIGN_WIDTH}px; width: 100%; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 40px rgba(0,0,0,0.08); }
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
    @media (max-width: 768px) {
      .page-container { box-shadow: none; }
      .lp-element { font-size: 0.9em !important; }
      .lp-element img, .lp-element video { max-width: 100% !important; height: auto !important; object-fit: contain; }
      .lp-element[data-lp-grid] { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
    }
    @media (max-width: 480px) {
      .lp-element { font-size: 0.85em !important; }
      .lp-element[data-lp-grid] { grid-template-columns: 1fr !important; gap: 4px !important; }
    }
  </style>
</head>
<body${opts?.thumbnail ? ' style="transform:scale(0.34);transform-origin:0 0;width:960px;min-height:600px"' : ""}>
  <div class="page-container">
    ${sectionsHtml}
  </div>
  <script>
  document.querySelectorAll('[data-hover]').forEach(function(el){
    var t=el.dataset.hover,orig={transform:el.style.transform,filter:el.style.filter,boxShadow:el.style.boxShadow};
    el.addEventListener('mouseenter',function(){
      if(t==='scale-up')el.style.transform='scale(1.05)';
      else if(t==='scale-down')el.style.transform='scale(0.95)';
      else if(t==='brighten')el.style.filter='brightness(1.15)';
      else if(t==='shadow')el.style.boxShadow='0 10px 30px rgba(0,0,0,.15)';
      else if(t==='lift')el.style.transform='translateY(-4px)';
    });
    el.addEventListener('mouseleave',function(){el.style.transform=orig.transform;el.style.filter=orig.filter;el.style.boxShadow=orig.boxShadow;});
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
  </script>
</body>
</html>`;
}

export function downloadHtml(sections: EditorSection[], opts?: { metaTitle?: string; metaDescription?: string; deviceWidth?: number; filename?: string }) {
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
