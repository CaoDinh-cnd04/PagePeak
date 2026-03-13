import type { EditorSection, EditorElement } from "@/types/editor";

function elementToHtml(el: EditorElement): string {
  if (el.isHidden) return "";

  const styles: string[] = [
    `position:absolute`,
    `left:${el.x}px`,
    `top:${el.y}px`,
    el.width != null ? `width:${el.width}px` : "",
    el.height != null ? `height:${el.height}px` : "",
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
      const hoverStyle = hoverBg ? ` onmouseover="this.style.backgroundColor='${hoverBg}'" onmouseout="this.style.backgroundColor='${bg}'"` : "";
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
        if (el.videoUrl.includes("youtube") || el.videoUrl.includes("vimeo")) {
          return `<div style="${styles.join(";")}"><iframe src="${escHtml(el.videoUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
        }
        return `<div style="${styles.join(";")}"><video src="${escHtml(el.videoUrl)}" style="width:100%;height:100%;object-fit:cover" controls></video></div>`;
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
      const bg = (s.backgroundColor as string) ?? "#d1d5db";
      styles.push(`background-color:${bg}`);
      return `<div style="${styles.join(";")}"></div>`;
    }

    case "icon":
      styles.push("display:flex", "align-items:center", "justify-content:center", `color:${(s.color as string) ?? "#4f46e5"}`, `font-size:${Math.min(el.width ?? 48, el.height ?? 48) * 0.8}px`);
      return `<div style="${styles.join(";")}">★</div>`;

    case "countdown": {
      styles.push("display:flex", "align-items:center", "justify-content:center", "gap:8px", "font-family:monospace", "font-size:24px", "font-weight:700");
      return `<div style="${styles.join(";")}"><span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span>:<span style="background:#f1f5f9;padding:8px 12px;border-radius:6px">00</span></div>`;
    }

    case "form": {
      styles.push("border:1px dashed #cbd5e1", "border-radius:8px", "padding:16px", "background:#fff");
      return `<div style="${styles.join(";")}"><div style="margin-bottom:8px"><input style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px" placeholder="Họ tên" /></div><div style="margin-bottom:8px"><input style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px" placeholder="Email" /></div><button style="width:100%;padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer">Gửi</button></div>`;
    }

    case "html":
      return `<div style="${styles.join(";")}">${el.content ?? ""}</div>`;

    case "list": {
      const items = (el.content ?? "").split("\n").map((i) => `<li>${escHtml(i)}</li>`).join("");
      styles.push("list-style:disc inside", "line-height:1.8");
      return `<ul style="${styles.join(";")}">${items}</ul>`;
    }

    case "gallery": {
      styles.push("display:grid", "grid-template-columns:repeat(3,1fr)", "gap:4px", "overflow:hidden", "border-radius:8px");
      let cells = "";
      for (let i = 0; i < 6; i++) cells += `<div style="background:#e2e8f0;aspect-ratio:1/1"></div>`;
      return `<div style="${styles.join(";")}">${cells}</div>`;
    }

    case "carousel":
      styles.push("background:#f8fafc", "display:flex", "align-items:center", "justify-content:center", "border:1px dashed #cbd5e1", "border-radius:8px");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:14px">Carousel</span></div>`;

    case "tabs": {
      const tabNames = (el.content ?? "Tab 1\nTab 2").split("\n");
      let tabsHtml = '<div style="display:flex;border-bottom:1px solid #e2e8f0">';
      tabNames.forEach((t, i) => {
        tabsHtml += `<span style="padding:8px 16px;font-size:13px;${i === 0 ? "color:#4f46e5;font-weight:600;border-bottom:2px solid #4f46e5" : "color:#94a3b8"}">${escHtml(t)}</span>`;
      });
      tabsHtml += '</div><div style="padding:12px;color:#94a3b8;font-size:13px">Nội dung tab</div>';
      styles.push("border:1px solid #e2e8f0", "border-radius:8px", "overflow:hidden", "background:#fff");
      return `<div style="${styles.join(";")}">${tabsHtml}</div>`;
    }

    case "frame":
      styles.push("border:2px dashed #cbd5e1", "border-radius:8px", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Frame</span></div>`;

    case "accordion": {
      const lines = (el.content ?? "Q|A").split("\n");
      let accHtml = "";
      lines.forEach((line) => {
        const [q] = line.split("|");
        accHtml += `<div style="border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:4px;font-size:13px"><div style="font-weight:500;display:flex;justify-content:space-between"><span>${escHtml(q ?? "")}</span><span>▼</span></div></div>`;
      });
      return `<div style="${styles.join(";")}">${accHtml}</div>`;
    }

    case "table": {
      const rows = (el.content ?? "A,B\n1,2").split("\n");
      let tableHtml = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      rows.forEach((row, ri) => {
        tableHtml += "<tr>";
        row.split(",").forEach((cell) => {
          const tag = ri === 0 ? "th" : "td";
          tableHtml += `<${tag} style="border:1px solid #e2e8f0;padding:6px 8px;text-align:left${ri === 0 ? ";background:#f8fafc;font-weight:600" : ""}">${escHtml(cell)}</${tag}>`;
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
    .replace(/"/g, "&quot;");
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
  opts?: { metaTitle?: string; metaDescription?: string; deviceWidth?: number }
): string {
  const title = opts?.metaTitle ?? "Preview";
  const desc = opts?.metaDescription ?? "";
  const width = opts?.deviceWidth ?? 960;

  const fonts = collectFonts(sections);
  const fontLinks = fonts.length > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join("&")}&display=swap" rel="stylesheet" />`
    : "";

  const sectionsHtml = sections
    .filter((s) => s.visible !== false)
    .map((section) => {
      const sectionH = section.height ?? 600;
      const secStyles: string[] = [
        "position:relative",
        `width:${width}px`,
        `height:${sectionH}px`,
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
      const els = section.elements.map((el) => elementToHtml(el)).join("\n");
      return `<div style="${secStyles.join(";")}">\n${els}\n</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  ${desc ? `<meta name="description" content="${escHtml(desc)}" />` : ""}
  ${fontLinks}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #e8ecf1; }
    .page-container { width: ${width}px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 40px rgba(0,0,0,0.08); }
  </style>
</head>
<body>
  <div class="page-container">
    ${sectionsHtml}
  </div>
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
