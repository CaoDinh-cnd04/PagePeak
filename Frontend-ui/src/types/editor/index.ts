export type EditorElementType =
  | "text"
  | "headline"
  | "paragraph"
  | "button"
  | "image"
  | "video"
  | "shape"
  | "icon"
  | "divider"
  | "countdown"
  | "form"
  | "html"
  | "html-code"
  | "list"
  | "gallery"
  | "product-detail"
  | "collection-list"
  | "frame"
  | "accordion"
  | "table"
  | "cart"
  | "blog-list"
  | "blog-detail"
  | "popup"
  | "map"
  | "social-share"
  | "rating"
  | "progress"
  | "carousel"
  | "tabs"
  | "menu"
  | "group";

/** Popup độc lập (chỉnh trong trang edit popup), lưu trong PageContent.popups */
export type PagePopupDef = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  elements: EditorElement[];
};

export type EditorElement = {
  id: number;
  sectionId: number;
  type: EditorElementType;
  order: number;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  zIndex: number;
  rotation: number;
  opacity: number;
  isLocked: boolean;
  isHidden: boolean;
  content?: string | null;
  href?: string | null;
  target?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  styles: Record<string, string | number>;
};

export type EditorSection = {
  id: number;
  pageId: number;
  order: number;
  name?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  /** CSS background-size: "cover" | "contain" | "auto" */
  backgroundSize?: "cover" | "contain" | "auto" | null;
  /** CSS background-position, e.g. "center center" | "top left" */
  backgroundPosition?: string | null;
  /** CSS background-repeat */
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y" | null;
  /** Overlay color hex, e.g. "#000000" */
  backgroundOverlayColor?: string | null;
  /** Overlay opacity 0-100 */
  backgroundOverlayOpacity?: number | null;
  height?: number | null;
  visible: boolean;
  isLocked: boolean;
  customClass?: string | null;
  layoutMode?: "auto" | "manual";
  sectionTabs?: boolean;
  elements: EditorElement[];
};

export type ElementPresetData = {
  id: number;
  name: string;
  tabName?: string | null;
  defaultContent?: string | null;
  stylesJson: string;
  defaultWidth?: number | null;
  defaultHeight?: number | null;
  order: number;
};

export type ToolItemData = {
  id: number;
  name: string;
  icon: string;
  elementType: string;
  order: number;
  hasSubTabs: boolean;
  subTabs?: string | null;
  presets: ElementPresetData[];
  /** Chỉ dùng khi elementType === "section": thêm section kèm layout mẫu */
  sectionTemplate?: "blank" | "hero";
};

export type ToolCategoryData = {
  id: number;
  name: string;
  icon: string;
  order: number;
  items: ToolItemData[];
  /** Panel phụ đặc biệt (không liệt kê tool con) */
  sidebarAction?: "media" | "integrations" | "blog" | "popup" | "utilities";
};

/** Hiệu ứng toàn trang (Tiện ích → Thư viện) — xuất HTML / preview */
export type UtilityEffectsSettings = {
  snow?: boolean;
  cherryBlossom?: boolean;
  fireworks?: boolean;
};

export type PageSettings = {
  metaKeywords?: string;
  metaImageUrl?: string;
  faviconUrl?: string;
  facebookPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
  tiktokPixelId?: string;
  zaloAdsType?: "ladipage" | "personal" | "none";
  zaloAdsPixelId?: string;
  googleTagManagerId?: string;
  codeBeforeHead?: string;
  codeBeforeBody?: string;
  useDelayJS?: boolean;
  useLazyload?: boolean;
  /** Hiệu ứng (tuyết, hoa, pháo hoa) */
  utilityEffects?: UtilityEffectsSettings;
  /** Bật/tắt ứng dụng tiện ích (reCAPTCHA, METU, …) — lưu theo id catalog */
  utilityAppToggles?: Record<string, boolean>;
};

export type PageContent = {
  pageId: number;
  workspaceId: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  faviconUrl?: string | null;
  metaImageUrl?: string | null;
  pageType: string;
  mobileFriendly: boolean;
  sections: EditorSection[];
  /** Popup độc lập (không gắn section) — chỉnh trong editor popup */
  popups?: PagePopupDef[];
  pageSettings?: PageSettings | null;
};

export type ZoomLevel = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2 | 3;

export const ZOOM_PRESETS: { label: string; value: number }[] = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];
