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

/**
 * Layout types for Carousel:
 *  "testimonial"  — avatar + quote + name + role + optional rating
 *  "media"        — image + title + desc (classic banner)
 *  "hero"         — full-bleed bg image + title + subtitle + CTA button
 *  "logos"        — logo/partner grid-row (mini items, no text)
 *  "cards"        — feature cards (icon/image + title + desc)
 *  "stats"        — statistics (number + label)
 */
export type CarouselLayoutType = "testimonial" | "media" | "hero" | "logos" | "cards" | "stats" | "product";

export type CarouselStyle = {
  fontFamily?: string;
  // transition
  transitionType?: "slide" | "fade" | "none";
  transitionMs?: number;
  autoplayMs?: number;
  // navigation
  showArrows?: boolean;
  showDots?: boolean;
  arrowStyle?: "circle" | "pill" | "minimal";
  arrowBg?: string;
  arrowColor?: string;
  dotColor?: string;
  dotActiveColor?: string;
  dotStyle?: "circle" | "bar" | "pill";
  // testimonial
  quoteFontSize?: number;
  quoteColor?: string;
  quoteAlign?: "left" | "center" | "right";
  nameFontSize?: number;
  nameColor?: string;
  nameAlign?: "left" | "center" | "right";
  roleFontSize?: number;
  roleColor?: string;
  roleAlign?: "left" | "center" | "right";
  showRating?: boolean;
  ratingColor?: string;
  // media / hero / cards
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: "left" | "center" | "right";
  descFontSize?: number;
  descColor?: string;
  descAlign?: "left" | "center" | "right";
  // hero extras
  overlayColor?: string;
  overlayOpacity?: number;
  btnBg?: string;
  btnColor?: string;
  btnRadius?: number;
  // logos
  logoHeight?: number;
  logoGrayscale?: boolean;
  // cards extras
  cardBg?: string;
  cardRadius?: number;
  // stats extras
  numberFontSize?: number;
  numberColor?: string;
  labelColor?: string;
  // product / multi-slide
  slidesPerView?: number;
  slideGap?: number;
  showCaption?: boolean;
};

const DEFAULT_CAROUSEL_STYLE: Required<Omit<CarouselStyle, "fontFamily">> = {
  transitionType: "slide",
  transitionMs: 450,
  autoplayMs: 5000,
  showArrows: true,
  showDots: true,
  arrowStyle: "circle",
  arrowBg: "rgba(255,255,255,0.9)",
  arrowColor: "#374151",
  dotColor: "#d1d5db",
  dotActiveColor: "#6366f1",
  dotStyle: "circle",
  quoteFontSize: 13,
  quoteColor: "#374151",
  quoteAlign: "center",
  nameFontSize: 13,
  nameColor: "#111827",
  nameAlign: "center",
  roleFontSize: 11,
  roleColor: "#6b7280",
  roleAlign: "center",
  showRating: false,
  ratingColor: "#f59e0b",
  titleFontSize: 16,
  titleColor: "#111827",
  titleAlign: "center",
  descFontSize: 12,
  descColor: "#64748b",
  descAlign: "center",
  overlayColor: "#000000",
  overlayOpacity: 0.35,
  btnBg: "#6366f1",
  btnColor: "#ffffff",
  btnRadius: 8,
  logoHeight: 48,
  logoGrayscale: false,
  cardBg: "#ffffff",
  cardRadius: 12,
  numberFontSize: 28,
  numberColor: "#6366f1",
  labelColor: "#64748b",
  slidesPerView: 3,
  slideGap: 12,
  showCaption: false,
};

export function mergeCarouselStyle(style?: CarouselStyle | null): typeof DEFAULT_CAROUSEL_STYLE & { fontFamily?: string } {
  const s = style ?? {};
  return {
    ...DEFAULT_CAROUSEL_STYLE,
    ...s,
    fontFamily: typeof s.fontFamily === "string" && s.fontFamily.trim() ? s.fontFamily.trim() : undefined,
  };
}

export type CarouselItem = {
  image?: string;
  avatar?: string;
  quote?: string;
  name?: string;
  role?: string;
  title?: string;
  desc?: string;
  rating?: number;
  btnText?: string;
  btnUrl?: string;
  /** Hero CTA: url | cuộn tới section | mở popup (giống tab Sự kiện) */
  btnLinkType?: "url" | "section" | "popup";
  btnSectionId?: number;
  btnPopupTarget?: string;
  bgImage?: string;
  bgColor?: string;
  subtitle?: string;
  number?: string;
  label?: string;
  url?: string;
};

/** Carousel: backend có thể trả `Items` thay `items`. */
export function parseCarouselContent(content: string | null | undefined): {
  layoutType: string;
  items: CarouselItem[];
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
    const num = (v: unknown, d: number) => {
      if (v === null || v === undefined || v === "") return d;
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const bool = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);
    const align = (v: unknown, d: "left" | "center" | "right"): "left" | "center" | "right" =>
      v === "left" || v === "right" || v === "center" ? v : d;
    carouselStyle = {
      fontFamily: str(o.fontFamily),
      transitionType: (o.transitionType === "slide" || o.transitionType === "fade" || o.transitionType === "none") ? o.transitionType : "slide",
      transitionMs: num(o.transitionMs, DEFAULT_CAROUSEL_STYLE.transitionMs),
      autoplayMs: num(o.autoplayMs, DEFAULT_CAROUSEL_STYLE.autoplayMs),
      showArrows: bool(o.showArrows, DEFAULT_CAROUSEL_STYLE.showArrows),
      showDots: bool(o.showDots, DEFAULT_CAROUSEL_STYLE.showDots),
      arrowStyle: (o.arrowStyle === "pill" || o.arrowStyle === "minimal") ? o.arrowStyle : "circle",
      arrowBg: str(o.arrowBg) ?? DEFAULT_CAROUSEL_STYLE.arrowBg,
      arrowColor: str(o.arrowColor) ?? DEFAULT_CAROUSEL_STYLE.arrowColor,
      dotColor: str(o.dotColor) ?? DEFAULT_CAROUSEL_STYLE.dotColor,
      dotActiveColor: str(o.dotActiveColor) ?? DEFAULT_CAROUSEL_STYLE.dotActiveColor,
      dotStyle: (o.dotStyle === "bar" || o.dotStyle === "pill") ? o.dotStyle : "circle",
      quoteFontSize: num(o.quoteFontSize, DEFAULT_CAROUSEL_STYLE.quoteFontSize),
      quoteColor: str(o.quoteColor) ?? DEFAULT_CAROUSEL_STYLE.quoteColor,
      quoteAlign: align(o.quoteAlign, DEFAULT_CAROUSEL_STYLE.quoteAlign),
      nameFontSize: num(o.nameFontSize, DEFAULT_CAROUSEL_STYLE.nameFontSize),
      nameColor: str(o.nameColor) ?? DEFAULT_CAROUSEL_STYLE.nameColor,
      nameAlign: align(o.nameAlign, DEFAULT_CAROUSEL_STYLE.nameAlign),
      roleFontSize: num(o.roleFontSize, DEFAULT_CAROUSEL_STYLE.roleFontSize),
      roleColor: str(o.roleColor) ?? DEFAULT_CAROUSEL_STYLE.roleColor,
      roleAlign: align(o.roleAlign, DEFAULT_CAROUSEL_STYLE.roleAlign),
      showRating: bool(o.showRating, false),
      ratingColor: str(o.ratingColor) ?? DEFAULT_CAROUSEL_STYLE.ratingColor,
      titleFontSize: num(o.titleFontSize, DEFAULT_CAROUSEL_STYLE.titleFontSize),
      titleColor: str(o.titleColor) ?? DEFAULT_CAROUSEL_STYLE.titleColor,
      titleAlign: align(o.titleAlign, DEFAULT_CAROUSEL_STYLE.titleAlign),
      descFontSize: num(o.descFontSize, DEFAULT_CAROUSEL_STYLE.descFontSize),
      descColor: str(o.descColor) ?? DEFAULT_CAROUSEL_STYLE.descColor,
      descAlign: align(o.descAlign, DEFAULT_CAROUSEL_STYLE.descAlign),
      overlayColor: str(o.overlayColor) ?? DEFAULT_CAROUSEL_STYLE.overlayColor,
      overlayOpacity: num(o.overlayOpacity, DEFAULT_CAROUSEL_STYLE.overlayOpacity),
      btnBg: str(o.btnBg) ?? DEFAULT_CAROUSEL_STYLE.btnBg,
      btnColor: str(o.btnColor) ?? DEFAULT_CAROUSEL_STYLE.btnColor,
      btnRadius: num(o.btnRadius, DEFAULT_CAROUSEL_STYLE.btnRadius),
      logoHeight: num(o.logoHeight, DEFAULT_CAROUSEL_STYLE.logoHeight),
      logoGrayscale: bool(o.logoGrayscale, false),
      cardBg: str(o.cardBg) ?? DEFAULT_CAROUSEL_STYLE.cardBg,
      cardRadius: num(o.cardRadius, DEFAULT_CAROUSEL_STYLE.cardRadius),
      numberFontSize: num(o.numberFontSize, DEFAULT_CAROUSEL_STYLE.numberFontSize),
      numberColor: str(o.numberColor) ?? DEFAULT_CAROUSEL_STYLE.numberColor,
      labelColor: str(o.labelColor) ?? DEFAULT_CAROUSEL_STYLE.labelColor,
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
        rating: o.rating != null ? Number(o.rating) : undefined,
        btnText: typeof o.btnText === "string" ? o.btnText : "",
        btnUrl: typeof o.btnUrl === "string" ? o.btnUrl : "",
        btnLinkType: o.btnLinkType === "section" || o.btnLinkType === "popup" ? o.btnLinkType : "url",
        btnSectionId:
          o.btnSectionId != null && o.btnSectionId !== "" && !Number.isNaN(Number(o.btnSectionId))
            ? Number(o.btnSectionId)
            : undefined,
        btnPopupTarget: typeof o.btnPopupTarget === "string" ? o.btnPopupTarget : undefined,
        bgImage: typeof o.bgImage === "string" ? o.bgImage : "",
        bgColor: typeof o.bgColor === "string" ? o.bgColor : "",
        subtitle: typeof o.subtitle === "string" ? o.subtitle : "",
        number: typeof o.number === "string" ? o.number : "",
        label: typeof o.label === "string" ? o.label : "",
        url: typeof o.url === "string" ? o.url : "",
      };
    }),
    carouselStyle,
  };
}
