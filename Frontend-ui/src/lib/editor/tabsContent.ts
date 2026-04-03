export type TabsItem = {
  label?: string;
  image?: string;
  title?: string;
  desc?: string;
};

export function parseTabsContent(content: string | null | undefined): {
  navStyle?: string;
  items: TabsItem[];
} {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const itemsRaw = raw.items ?? raw.Items;
  const arr = Array.isArray(itemsRaw) ? itemsRaw : [];
  return {
    navStyle: (() => {
      const v = raw.navStyle ?? raw.NavStyle;
      return typeof v === "string" && v ? v : undefined;
    })(),
    items: arr.map((it) => {
      const o = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
      return {
        label: String(o.label ?? o.Label ?? ""),
        image: String(o.image ?? o.Image ?? ""),
        title: String(o.title ?? o.Title ?? ""),
        desc: String(o.desc ?? o.Desc ?? o.Description ?? ""),
      };
    }),
  };
}

export type CarouselStyle = {
  fontFamily?: string;
  quoteFontSize?: number;
  quoteColor?: string;
  nameFontSize?: number;
  nameColor?: string;
  roleFontSize?: number;
  roleColor?: string;
  titleFontSize?: number;
  titleColor?: string;
  descFontSize?: number;
  descColor?: string;
  dotColor?: string;
  dotActiveColor?: string;
  autoplayMs?: number;
  transitionMs?: number;
  quoteAlign?: "left" | "center" | "right";
  nameAlign?: "left" | "center" | "right";
  roleAlign?: "left" | "center" | "right";
  titleAlign?: "left" | "center" | "right";
  descAlign?: "left" | "center" | "right";
};

const DEFAULT_CAROUSEL_STYLE: Required<Omit<CarouselStyle, "fontFamily">> = {
  quoteFontSize: 12,
  quoteColor: "#374151",
  nameFontSize: 13,
  nameColor: "#111827",
  roleFontSize: 11,
  roleColor: "#6b7280",
  titleFontSize: 13,
  titleColor: "#111827",
  descFontSize: 11,
  descColor: "#64748b",
  dotColor: "#d1d5db",
  dotActiveColor: "#6366f1",
  autoplayMs: 5000,
  transitionMs: 450,
  quoteAlign: "center",
  nameAlign: "center",
  roleAlign: "center",
  titleAlign: "center",
  descAlign: "center",
};

export function mergeCarouselStyle(style?: CarouselStyle | null): typeof DEFAULT_CAROUSEL_STYLE & { fontFamily?: string } {
  const s = style ?? {};
  return {
    ...DEFAULT_CAROUSEL_STYLE,
    ...s,
    fontFamily: typeof s.fontFamily === "string" && s.fontFamily.trim() ? s.fontFamily.trim() : undefined,
  };
}

/** Carousel: backend có thể trả `Items` thay `items`. */
export function parseCarouselContent(content: string | null | undefined): {
  layoutType: string;
  items: {
    image?: string;
    avatar?: string;
    quote?: string;
    name?: string;
    role?: string;
    title?: string;
    desc?: string;
  }[];
  carouselStyle: CarouselStyle;
} {
  let raw: Record<string, unknown> = {};
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") raw = p as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const itemsRaw = raw.items ?? raw.Items;
  const arr = Array.isArray(itemsRaw) ? itemsRaw : [];
  const layoutType = String(raw.layoutType ?? raw.LayoutType ?? "media") || "media";
  const styleRaw = raw.carouselStyle ?? raw.CarouselStyle;
  let carouselStyle: CarouselStyle = {};
  if (styleRaw && typeof styleRaw === "object") {
    const o = styleRaw as Record<string, unknown>;
    const numOpt = (v: unknown, d: number) => {
      if (v === null || v === undefined || v === "") return d;
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    carouselStyle = {
      fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : undefined,
      quoteFontSize: numOpt(o.quoteFontSize, DEFAULT_CAROUSEL_STYLE.quoteFontSize),
      quoteColor: typeof o.quoteColor === "string" ? o.quoteColor : undefined,
      nameFontSize: numOpt(o.nameFontSize, DEFAULT_CAROUSEL_STYLE.nameFontSize),
      nameColor: typeof o.nameColor === "string" ? o.nameColor : undefined,
      roleFontSize: numOpt(o.roleFontSize, DEFAULT_CAROUSEL_STYLE.roleFontSize),
      roleColor: typeof o.roleColor === "string" ? o.roleColor : undefined,
      titleFontSize: numOpt(o.titleFontSize, DEFAULT_CAROUSEL_STYLE.titleFontSize),
      titleColor: typeof o.titleColor === "string" ? o.titleColor : undefined,
      descFontSize: numOpt(o.descFontSize, DEFAULT_CAROUSEL_STYLE.descFontSize),
      descColor: typeof o.descColor === "string" ? o.descColor : undefined,
      dotColor: typeof o.dotColor === "string" ? o.dotColor : undefined,
      dotActiveColor: typeof o.dotActiveColor === "string" ? o.dotActiveColor : undefined,
      autoplayMs: numOpt(o.autoplayMs, DEFAULT_CAROUSEL_STYLE.autoplayMs),
      transitionMs: numOpt(o.transitionMs, DEFAULT_CAROUSEL_STYLE.transitionMs),
      quoteAlign: (o.quoteAlign === "left" || o.quoteAlign === "right" || o.quoteAlign === "center") ? o.quoteAlign : DEFAULT_CAROUSEL_STYLE.quoteAlign,
      nameAlign: (o.nameAlign === "left" || o.nameAlign === "right" || o.nameAlign === "center") ? o.nameAlign : DEFAULT_CAROUSEL_STYLE.nameAlign,
      roleAlign: (o.roleAlign === "left" || o.roleAlign === "right" || o.roleAlign === "center") ? o.roleAlign : DEFAULT_CAROUSEL_STYLE.roleAlign,
      titleAlign: (o.titleAlign === "left" || o.titleAlign === "right" || o.titleAlign === "center") ? o.titleAlign : DEFAULT_CAROUSEL_STYLE.titleAlign,
      descAlign: (o.descAlign === "left" || o.descAlign === "right" || o.descAlign === "center") ? o.descAlign : DEFAULT_CAROUSEL_STYLE.descAlign,
    };
  }
  return {
    layoutType,
    items: arr.map((it) => {
      const o = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
      return {
        image: String(o.image ?? o.Image ?? ""),
        avatar: String(o.avatar ?? o.Avatar ?? ""),
        quote: String(o.quote ?? o.Quote ?? ""),
        name: String(o.name ?? o.Name ?? ""),
        role: String(o.role ?? o.Role ?? ""),
        title: String(o.title ?? o.Title ?? ""),
        desc: String(o.desc ?? o.Desc ?? ""),
      };
    }),
    carouselStyle,
  };
}
