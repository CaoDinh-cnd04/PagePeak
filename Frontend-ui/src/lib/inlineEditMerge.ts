import type { EditorElement } from "@/types/editor";
import { parseProductDetailContent } from "@/lib/productDetailContent";
import { parseCarouselContent, parseTabsContent } from "@/lib/tabsContent";

/** Gắn lên Fabric Textbox con trong Group — text:changed gộp vào JSON thay vì ghi đè cả content. */
export type InlineEditMeta =
  | { kind: "product-detail"; field: "title" | "price" | "description" }
  | { kind: "tabs"; field: "label" | "title" | "desc"; tabIndex: number }
  | { kind: "collection-list"; field: "title" | "price"; itemIndex: number }
  | { kind: "blog-list"; field: "title" | "excerpt" | "date"; itemIndex: number }
  | { kind: "blog-detail"; field: "title" | "author" | "date" | "body" }
  | {
      kind: "carousel";
      field: "quote" | "name" | "role" | "title" | "desc";
      itemIndex: number;
    };

function partialToTextStyleRecord(
  partial: Partial<{ fontSize: number; fontFamily: string; fill: string; fontWeight: number; textAlign: string }>,
): Record<string, string | number> {
  const patch: Record<string, string | number> = {};
  if (partial.fontSize != null) patch.fontSize = partial.fontSize;
  if (partial.fontFamily != null) patch.fontFamily = partial.fontFamily;
  if (partial.fill != null) patch.color = partial.fill;
  if (partial.fontWeight != null) patch.fontWeight = partial.fontWeight;
  if (partial.textAlign != null) patch.textAlign = partial.textAlign;
  return patch;
}

function readTextStyleObj(o: unknown): Partial<{
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: number;
  textAlign: string;
}> {
  if (!o || typeof o !== "object") return {};
  const s = o as Record<string, unknown>;
  return {
    fontSize: typeof s.fontSize === "number" ? s.fontSize : s.FontSize != null ? Number(s.FontSize) : undefined,
    fontFamily: typeof s.fontFamily === "string" ? s.fontFamily : typeof s.FontFamily === "string" ? s.FontFamily : undefined,
    color: typeof s.color === "string" ? s.color : typeof s.Color === "string" ? s.Color : undefined,
    fontWeight: typeof s.fontWeight === "number" ? s.fontWeight : s.FontWeight != null ? Number(s.FontWeight) : undefined,
    textAlign: typeof s.textAlign === "string" ? s.textAlign : typeof s.TextAlign === "string" ? s.TextAlign : undefined,
  };
}

/** Đọc style đã lưu trong JSON để áp dụng lên Fabric Textbox (canvas + preview sau này). */
export function getInlineTextStyleForFabric(
  el: EditorElement,
  meta: InlineEditMeta,
  defaults: { fontSize: number; fontFamily: string; color: string; fontWeight: number; textAlign: string },
): { fontSize: number; fontFamily: string; fill: string; fontWeight: number; textAlign: string } {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(el.content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  let styleObj: unknown;
  if (meta.kind === "product-detail") {
    const key = meta.field === "title" ? "titleStyle" : meta.field === "description" ? "descriptionStyle" : "priceStyle";
    const pascal = key === "titleStyle" ? "TitleStyle" : key === "descriptionStyle" ? "DescriptionStyle" : "PriceStyle";
    styleObj = raw[key] ?? raw[pascal];
  } else if (meta.kind === "tabs") {
    const items = (raw.items ?? raw.Items) as unknown[] | undefined;
    const row =
      Array.isArray(items) && items[meta.tabIndex] && typeof items[meta.tabIndex] === "object"
        ? (items[meta.tabIndex] as Record<string, unknown>)
        : {};
    const sk = meta.field === "label" ? "labelStyle" : meta.field === "title" ? "titleStyle" : "descStyle";
    styleObj = row[sk] ?? row[sk === "labelStyle" ? "LabelStyle" : sk === "titleStyle" ? "TitleStyle" : "DescStyle"];
  } else if (meta.kind === "collection-list") {
    const items = (raw.items ?? raw.Items) as unknown[] | undefined;
    const row =
      Array.isArray(items) && items[meta.itemIndex] && typeof items[meta.itemIndex] === "object"
        ? (items[meta.itemIndex] as Record<string, unknown>)
        : {};
    const sk = meta.field === "title" ? "titleStyle" : "priceStyle";
    styleObj = row[sk] ?? row[sk === "titleStyle" ? "TitleStyle" : "PriceStyle"];
  } else if (meta.kind === "carousel") {
    const items = (raw.items ?? raw.Items) as unknown[] | undefined;
    const row =
      Array.isArray(items) && items[meta.itemIndex] && typeof items[meta.itemIndex] === "object"
        ? (items[meta.itemIndex] as Record<string, unknown>)
        : {};
    const sk =
      meta.field === "quote"
        ? "quoteStyle"
        : meta.field === "name"
          ? "nameStyle"
          : meta.field === "role"
            ? "roleStyle"
            : meta.field === "title"
              ? "titleStyle"
              : "descStyle";
    styleObj = row[sk];
  } else if (meta.kind === "blog-list") {
    const items = (raw.posts ?? raw.Posts) as unknown[] | undefined;
    const row =
      Array.isArray(items) && items[meta.itemIndex] && typeof items[meta.itemIndex] === "object"
        ? (items[meta.itemIndex] as Record<string, unknown>)
        : {};
    const sk =
      meta.field === "title" ? "titleStyle" : meta.field === "excerpt" ? "excerptStyle" : "dateStyle";
    styleObj = row[sk];
  } else if (meta.kind === "blog-detail") {
    const sk =
      meta.field === "title"
        ? "titleStyle"
        : meta.field === "author"
          ? "authorStyle"
          : meta.field === "date"
            ? "dateStyle"
            : "bodyStyle";
    styleObj = raw[sk] ?? raw[sk === "titleStyle" ? "TitleStyle" : sk === "authorStyle" ? "AuthorStyle" : sk === "dateStyle" ? "DateStyle" : "BodyStyle"];
  } else {
    styleObj = undefined;
  }

  const s = readTextStyleObj(styleObj);
  return {
    fontSize: s.fontSize ?? defaults.fontSize,
    fontFamily: s.fontFamily ?? defaults.fontFamily,
    fill: s.color ?? defaults.color,
    fontWeight: s.fontWeight ?? defaults.fontWeight,
    textAlign: (s.textAlign as string) ?? defaults.textAlign,
  };
}

/** Gộp style chữ vào JSON (mọi khối có _inlineEdit). */
export function mergeInlineTextStyle(
  el: EditorElement,
  meta: InlineEditMeta,
  partial: Partial<{ fontSize: number; fontFamily: string; fill: string; fontWeight: number; textAlign: string }>,
): string | null {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(el.content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const patch = partialToTextStyleRecord(partial);

  if (meta.kind === "product-detail") {
    const key = meta.field === "title" ? "titleStyle" : meta.field === "description" ? "descriptionStyle" : "priceStyle";
    const prev = (raw[key] as Record<string, string | number> | undefined) ?? {};
    return JSON.stringify({ ...raw, [key]: { ...prev, ...patch } });
  }

  if (meta.kind === "tabs") {
    const itemsRaw = raw.items ?? raw.Items;
    const arr = Array.isArray(itemsRaw) ? [...itemsRaw] : [];
    const i = meta.tabIndex;
    if (i < 0 || i >= arr.length) return JSON.stringify({ ...raw, items: arr });
    const row = { ...(typeof arr[i] === "object" && arr[i] ? (arr[i] as Record<string, unknown>) : {}) };
    const sk = meta.field === "label" ? "labelStyle" : meta.field === "title" ? "titleStyle" : "descStyle";
    const prev = (row[sk] as Record<string, string | number> | undefined) ?? {};
    row[sk] = { ...prev, ...patch };
    arr[i] = row;
    return JSON.stringify({ ...raw, items: arr });
  }

  if (meta.kind === "collection-list") {
    const itemsRaw = raw.items ?? raw.Items;
    const arr = Array.isArray(itemsRaw) ? [...itemsRaw] : [];
    const i = meta.itemIndex;
    if (i < 0 || i >= arr.length) return JSON.stringify({ ...raw, items: arr });
    const row = { ...(typeof arr[i] === "object" && arr[i] ? (arr[i] as Record<string, unknown>) : {}) };
    const sk = meta.field === "title" ? "titleStyle" : "priceStyle";
    const prev = (row[sk] as Record<string, string | number> | undefined) ?? {};
    row[sk] = { ...prev, ...patch };
    arr[i] = row;
    return JSON.stringify({ ...raw, items: arr });
  }

  if (meta.kind === "carousel") {
    const layoutType = String(raw.layoutType ?? raw.LayoutType ?? "media");
    const itemsRaw = raw.items ?? raw.Items;
    const arr = Array.isArray(itemsRaw) ? [...itemsRaw] : [];
    const i = meta.itemIndex;
    if (i < 0 || i >= arr.length) return JSON.stringify({ ...raw, layoutType, items: arr });
    const row = { ...(typeof arr[i] === "object" && arr[i] ? (arr[i] as Record<string, unknown>) : {}) };
    const sk =
      meta.field === "quote"
        ? "quoteStyle"
        : meta.field === "name"
          ? "nameStyle"
          : meta.field === "role"
            ? "roleStyle"
            : meta.field === "title"
              ? "titleStyle"
              : "descStyle";
    const prev = (row[sk] as Record<string, string | number> | undefined) ?? {};
    row[sk] = { ...prev, ...patch };
    arr[i] = row;
    return JSON.stringify({ ...raw, layoutType, items: arr });
  }

  if (meta.kind === "blog-list") {
    const itemsRaw = raw.posts ?? raw.Posts;
    const arr = Array.isArray(itemsRaw) ? [...itemsRaw] : [];
    const i = meta.itemIndex;
    if (i < 0 || i >= arr.length) return JSON.stringify({ ...raw, posts: arr });
    const row = { ...(typeof arr[i] === "object" && arr[i] ? (arr[i] as Record<string, unknown>) : {}) };
    const sk =
      meta.field === "title" ? "titleStyle" : meta.field === "excerpt" ? "excerptStyle" : "dateStyle";
    const prev = (row[sk] as Record<string, string | number> | undefined) ?? {};
    row[sk] = { ...prev, ...patch };
    arr[i] = row;
    return JSON.stringify({ ...raw, posts: arr });
  }

  if (meta.kind === "blog-detail") {
    const sk =
      meta.field === "title"
        ? "titleStyle"
        : meta.field === "author"
          ? "authorStyle"
          : meta.field === "date"
            ? "dateStyle"
            : "bodyStyle";
    const prev = (raw[sk] as Record<string, string | number> | undefined) ?? {};
    return JSON.stringify({ ...raw, [sk]: { ...prev, ...patch } });
  }

  return null;
}

export function mergeInlineContent(el: EditorElement, meta: InlineEditMeta | undefined, text: string): string | null {
  if (!meta) return null;

  if (meta.kind === "product-detail") {
    let raw: Record<string, unknown> = {};
    try {
      const p = JSON.parse(el.content || "{}");
      if (p && typeof p === "object") raw = p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    const pd = parseProductDetailContent(el.content ?? undefined);
    if (meta.field === "title") return JSON.stringify({ ...raw, title: text });
    if (meta.field === "description") return JSON.stringify({ ...raw, description: text });
    if (meta.field === "price") {
      const hadSale = pd.salePrice.trim().length > 0;
      if (hadSale) return JSON.stringify({ ...raw, salePrice: text });
      return JSON.stringify({ ...raw, price: text });
    }
    return null;
  }

  if (meta.kind === "tabs") {
    const td = parseTabsContent(el.content ?? undefined);
    const items = [...td.items];
    const i = meta.tabIndex;
    if (i < 0 || i >= items.length) return JSON.stringify({ ...td, items });
    const cur = { ...items[i] };
    if (meta.field === "label") cur.label = text;
    else if (meta.field === "title") cur.title = text;
    else if (meta.field === "desc") cur.desc = text;
    items[i] = cur;
    return JSON.stringify({ ...td, items });
  }

  if (meta.kind === "collection-list") {
    let cl: { items?: { image?: string; title?: string; price?: string }[]; columns?: number } = {};
    try {
      cl = JSON.parse(el.content || "{}");
    } catch {
      cl = {};
    }
    const items = [...(cl.items ?? [])];
    const i = meta.itemIndex;
    if (i < 0 || i >= items.length) return JSON.stringify({ ...cl, items });
    const row = { ...items[i] };
    if (meta.field === "title") row.title = text;
    else if (meta.field === "price") row.price = text;
    items[i] = row;
    return JSON.stringify({ ...cl, items });
  }

  if (meta.kind === "carousel") {
    const cd = parseCarouselContent(el.content ?? undefined);
    const items = [...cd.items];
    const i = meta.itemIndex;
    if (i < 0 || i >= items.length) return JSON.stringify({ layoutType: cd.layoutType, items });
    const row = { ...items[i] };
    if (meta.field === "quote") row.quote = text;
    else if (meta.field === "name") row.name = text;
    else if (meta.field === "role") row.role = text;
    else if (meta.field === "title") row.title = text;
    else if (meta.field === "desc") row.desc = text;
    items[i] = row;
    return JSON.stringify({ layoutType: cd.layoutType, items });
  }

  if (meta.kind === "blog-list") {
    let raw: Record<string, unknown> = {};
    try {
      const p = JSON.parse(el.content || "{}");
      if (p && typeof p === "object") raw = p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    const items = [...((raw.posts ?? raw.Posts) as { title?: string; excerpt?: string; date?: string }[] | undefined) ?? []];
    const i = meta.itemIndex;
    if (i < 0 || i >= items.length) return JSON.stringify({ ...raw, posts: items });
    const row = { ...items[i] };
    if (meta.field === "title") row.title = text;
    else if (meta.field === "excerpt") row.excerpt = text;
    else if (meta.field === "date") row.date = text;
    items[i] = row;
    return JSON.stringify({ ...raw, posts: items });
  }

  if (meta.kind === "blog-detail") {
    let raw: Record<string, unknown> = {};
    try {
      const p = JSON.parse(el.content || "{}");
      if (p && typeof p === "object") raw = p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    if (meta.field === "title") return JSON.stringify({ ...raw, title: text });
    if (meta.field === "author") return JSON.stringify({ ...raw, author: text });
    if (meta.field === "date") return JSON.stringify({ ...raw, date: text });
    if (meta.field === "body") return JSON.stringify({ ...raw, body: text });
    return null;
  }

  return null;
}
