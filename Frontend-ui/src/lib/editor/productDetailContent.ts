export type ProductDetailTextStyle = {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number;
  textAlign?: string;
};

export type ProductVariant = {
  label: string;
  type?: "color" | "size" | "text";
  options: string[];
};

export type ProductDetailContent = {
  images: string[];
  title: string;
  price: string;
  salePrice: string;
  description: string;
  badge: string;
  rating: number;
  reviewCount: number;
  totalSold: number;
  sku: string;
  stockStatus: "instock" | "outofstock" | "limited";
  stockText: string;
  category: string;
  tags: string[];
  features: string[];
  variants: ProductVariant[];
  quantity: number;
  showQuantity: boolean;
  buyButtonText: string;
  addCartText: string;
  layout: "vertical" | "horizontal";
  showRating: boolean;
  showFeatures: boolean;
  showVariants: boolean;
  showActions: boolean;
  showBadge: boolean;
  showDescription: boolean;
  accentColor: string;
  buyButtonBgColor: string;
  cartButtonBgColor: string;
  cardRadius: number;
  imageRadius: number;
};

export const DEFAULT_PRODUCT_DETAIL: ProductDetailContent = {
  images: [],
  title: "Tên sản phẩm",
  price: "",
  salePrice: "0đ",
  description: "",
  badge: "",
  rating: 0,
  reviewCount: 0,
  totalSold: 0,
  sku: "",
  stockStatus: "instock",
  stockText: "",
  category: "",
  tags: [],
  features: [],
  variants: [],
  quantity: 1,
  showQuantity: true,
  buyButtonText: "Mua ngay",
  addCartText: "Thêm vào giỏ hàng",
  layout: "horizontal",
  showRating: true,
  showFeatures: false,
  showVariants: true,
  showActions: true,
  showBadge: true,
  showDescription: false,
  accentColor: "#ee4d2d",
  buyButtonBgColor: "#ee4d2d",
  cartButtonBgColor: "#ffffff",
  cardRadius: 8,
  imageRadius: 4,
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

function readStr(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string") return v;
  }
  return "";
}

function readNum(raw: Record<string, unknown>, defaultVal: number, ...keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
  }
  return defaultVal;
}

function readBool(raw: Record<string, unknown>, defaultVal: boolean, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "boolean") return v;
  }
  return defaultVal;
}

function readStrArray(raw: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = raw[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function readVariants(raw: Record<string, unknown>): ProductVariant[] {
  const v = raw.variants ?? raw.Variants;
  if (!Array.isArray(v)) return [];
  const result: ProductVariant[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = String(o.label ?? o.Label ?? "");
    if (!label) continue;
    const opts = o.options ?? o.Options;
    result.push({
      label,
      type: (o.type ?? o.Type) as ProductVariant["type"],
      options: Array.isArray(opts) ? opts.filter((x): x is string => typeof x === "string") : [],
    });
  }
  return result;
}

/** JSON từ backend có thể PascalCase — đồng bộ canvas / panel / HTML preview. */
export function parseProductDetailContent(content: string | null | undefined): ProductDetailContent {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const imgs = raw.images ?? raw.Images;
  const imageArr = Array.isArray(imgs) ? imgs.filter((u): u is string => typeof u === "string") : [];

  const stockRaw = readStr(raw, "stockStatus", "StockStatus");
  const stockStatus: ProductDetailContent["stockStatus"] =
    stockRaw === "outofstock" ? "outofstock" : stockRaw === "limited" ? "limited" : "instock";

  const layoutRaw = readStr(raw, "layout", "Layout");
  const layout: ProductDetailContent["layout"] = layoutRaw === "horizontal" ? "horizontal" : "vertical";

  return {
    images: imageArr,
    title: readStr(raw, "title", "Title") || "Tên sản phẩm",
    price: readStr(raw, "price", "Price"),
    salePrice: readStr(raw, "salePrice", "SalePrice"),
    description: readStr(raw, "description", "Description"),
    badge: readStr(raw, "badge", "Badge"),
    rating: readNum(raw, 0, "rating", "Rating"),
    reviewCount: readNum(raw, 0, "reviewCount", "ReviewCount"),
    totalSold: readNum(raw, 0, "totalSold", "TotalSold"),
    sku: readStr(raw, "sku", "Sku", "SKU"),
    stockStatus,
    stockText: readStr(raw, "stockText", "StockText"),
    category: readStr(raw, "category", "Category"),
    tags: readStrArray(raw, "tags", "Tags"),
    features: readStrArray(raw, "features", "Features"),
    variants: readVariants(raw),
    quantity: readNum(raw, 1, "quantity", "Quantity"),
    showQuantity: readBool(raw, true, "showQuantity", "ShowQuantity"),
    buyButtonText: readStr(raw, "buyButtonText", "BuyButtonText") || "Mua ngay",
    addCartText: readStr(raw, "addCartText", "AddCartText") || "Thêm vào giỏ hàng",
    layout,
    showRating: readBool(raw, true, "showRating", "ShowRating"),
    showFeatures: readBool(raw, false, "showFeatures", "ShowFeatures"),
    showVariants: readBool(raw, true, "showVariants", "ShowVariants"),
    showActions: readBool(raw, true, "showActions", "ShowActions"),
    showBadge: readBool(raw, true, "showBadge", "ShowBadge"),
    showDescription: readBool(raw, false, "showDescription", "ShowDescription"),
    accentColor: readStr(raw, "accentColor", "AccentColor") || "#ee4d2d",
    buyButtonBgColor: readStr(raw, "buyButtonBgColor", "BuyButtonBgColor") || readStr(raw, "accentColor", "AccentColor") || "#ee4d2d",
    cartButtonBgColor: readStr(raw, "cartButtonBgColor", "CartButtonBgColor") || "#ffffff",
    cardRadius: readNum(raw, 8, "cardRadius", "CardRadius"),
    imageRadius: readNum(raw, 4, "imageRadius", "ImageRadius"),
  };
}
