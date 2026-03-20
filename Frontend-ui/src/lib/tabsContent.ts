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
  };
}
