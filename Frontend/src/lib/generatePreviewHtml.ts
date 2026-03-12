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
  if (s.borderRadius) styles.push(`border-radius:${s.borderRadius}px`);

  const wrapLink = (inner: string) => {
    if (el.href) {
      return `<a href="${escHtml(el.href)}" target="${el.target ?? "_self"}" style="text-decoration:none;color:inherit;display:block;width:100%;height:100%">${inner}</a>`;
    }
    return inner;
  };

  let inner = "";

  switch (el.type) {
    case "headline":
      styles.push("margin:0", "line-height:1.2", "font-weight:700");
      inner = `<h2 style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</h2>`;
      return inner;

    case "paragraph":
      styles.push("margin:0", "line-height:1.6");
      inner = `<p style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</p>`;
      return inner;

    case "text":
      inner = `<span style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? ""))}</span>`;
      return inner;

    case "button": {
      const bg = (s.backgroundColor as string) ?? "#4f46e5";
      const br = (s.borderRadius as number) ?? 8;
      styles.push(
        `background-color:${bg}`,
        `border-radius:${br}px`,
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "color:#fff",
        "font-weight:600",
        "cursor:pointer",
        "border:none",
        "box-sizing:border-box"
      );
      return `<div style="${styles.join(";")}">${wrapLink(escHtml(el.content ?? "Button"))}</div>`;
    }

    case "image":
      if (el.imageUrl) {
        styles.push("overflow:hidden");
        return `<div style="${styles.join(";")}"><img src="${escHtml(el.imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`;
      }
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Image</span></div>`;

    case "video":
      if (el.videoUrl) {
        styles.push("overflow:hidden");
        return `<div style="${styles.join(";")}"><iframe src="${escHtml(el.videoUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
      }
      styles.push("background:#0f172a", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">Video</span></div>`;

    case "shape": {
      const bg = (s.backgroundColor as string) ?? "#e0e7ff";
      styles.push(`background-color:${bg}`);
      return `<div style="${styles.join(";")}"></div>`;
    }

    case "divider": {
      const bg = (s.backgroundColor as string) ?? "#d1d5db";
      styles.push(`background-color:${bg}`);
      return `<div style="${styles.join(";")}"></div>`;
    }

    case "html":
      return `<div style="${styles.join(";")}">${el.content ?? ""}</div>`;

    case "list": {
      const items = (el.content ?? "").split("\n").map((i) => `<li>${escHtml(i)}</li>`).join("");
      styles.push("list-style:disc inside");
      return `<ul style="${styles.join(";")}">${items}</ul>`;
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
      return `<div style="${styles.join(";")}"><div style="width:${pct}%;height:100%;background:#4f46e5;border-radius:9999px"></div></div>`;
    }

    default:
      styles.push("background:#f1f5f9", "display:flex", "align-items:center", "justify-content:center");
      return `<div style="${styles.join(";")}"><span style="color:#94a3b8;font-size:12px">${el.type}</span></div>`;
  }
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generatePreviewHtml(
  sections: EditorSection[],
  opts?: { metaTitle?: string; metaDescription?: string; deviceWidth?: number }
): string {
  const title = opts?.metaTitle ?? "Preview";
  const desc = opts?.metaDescription ?? "";
  const width = opts?.deviceWidth ?? 960;

  const sectionsHtml = sections
    .filter((s) => s.visible !== false)
    .map((section) => {
      const secStyles: string[] = [
        "position:relative",
        `min-height:${section.height ?? 600}px`,
        `background-color:${section.backgroundColor ?? "#ffffff"}`,
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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #f1f5f9; }
    .page-container { max-width: ${width}px; margin: 0 auto; background: #fff; min-height: 100vh; }
  </style>
</head>
<body>
  <div class="page-container">
    ${sectionsHtml}
  </div>
</body>
</html>`;
}
