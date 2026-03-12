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
  | "list"
  | "gallery"
  | "carousel"
  | "tabs"
  | "frame"
  | "accordion"
  | "table"
  | "collection-list"
  | "product"
  | "product-list"
  | "product-detail"
  | "cart"
  | "blog-list"
  | "blog-detail"
  | "popup"
  | "map"
  | "social-share"
  | "rating"
  | "progress";

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
  height?: number | null;
  visible: boolean;
  isLocked: boolean;
  customClass?: string | null;
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
};

export type ToolCategoryData = {
  id: number;
  name: string;
  icon: string;
  order: number;
  items: ToolItemData[];
};

export type PageContent = {
  pageId: number;
  workspaceId: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  metaTitle?: string | null;
  metaDescription?: string | null;
  pageType: string;
  mobileFriendly: boolean;
  sections: EditorSection[];
};
