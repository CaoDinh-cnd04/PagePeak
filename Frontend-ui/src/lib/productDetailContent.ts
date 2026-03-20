export type ProductDetailTextStyle = {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number;
  textAlign?: string;
};

/** Đọc style từng dòng chữ trong JSON (titleStyle / descriptionStyle / priceStyle). */
export function getProductDetailFieldStyle(
  content: string | null | undefined,
  field: "title" | "price" | "description",
): ProductDetailTextStyle {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const key = field === "title" ? "titleStyle" : field === "description" ? "descriptionStyle" : "priceStyle";
  const pascalKey = key === "titleStyle" ? "TitleStyle" : key === "descriptionStyle" ? "DescriptionStyle" : "PriceStyle";
  const s = raw[key] ?? raw[pascalKey];
  if (!s || typeof s !== "object") return {};
  const o = s as Record<string, unknown>;
  return {
    fontSize: typeof o.fontSize === "number" ? o.fontSize : o.FontSize != null ? Number(o.FontSize) : undefined,
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : typeof o.FontFamily === "string" ? o.FontFamily : undefined,
    color: typeof o.color === "string" ? o.color : typeof o.Color === "string" ? o.Color : undefined,
    fontWeight: typeof o.fontWeight === "number" ? o.fontWeight : o.FontWeight != null ? Number(o.FontWeight) : undefined,
    textAlign: typeof o.textAlign === "string" ? o.textAlign : typeof o.TextAlign === "string" ? o.TextAlign : undefined,
  };
}

/** JSON từ backend có thể PascalCase — đồng bộ canvas / panel / HTML preview. */
export function parseProductDetailContent(content: string | null | undefined): {
  images: string[];
  title: string;
  price: string;
  salePrice: string;
  description: string;
  badge: string;
} {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const imgs = raw.images ?? raw.Images;
  const imageArr = Array.isArray(imgs) ? imgs.filter((u): u is string => typeof u === "string") : [];
  return {
    images: imageArr,
    title: String(raw.title ?? raw.Title ?? ""),
    price: String(raw.price ?? raw.Price ?? ""),
    salePrice: String(raw.salePrice ?? raw.SalePrice ?? ""),
    description: String(raw.description ?? raw.Description ?? ""),
    badge: String(raw.badge ?? raw.Badge ?? ""),
  };
}
