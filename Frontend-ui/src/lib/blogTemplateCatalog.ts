/**
 * Catalog mẫu Blog cho sidebar (lọc theo danh mục + kéo thả / click chèn).
 * Nguồn: BLOG_LIST_PRESETS / BLOG_DETAIL_PRESETS trong editorDataPresets.
 */

import type { ElementPresetData } from "@/types/editor";
import { BLOG_DETAIL_PRESETS, BLOG_LIST_PRESETS, type BlogDetailPreset, type BlogListPreset } from "@/lib/editorDataPresets";

export type BlogTemplateCategoryId = "all" | "magazine" | "news" | "minimal" | "tutorial";

export const BLOG_TEMPLATE_CATEGORY_LABELS: { id: BlogTemplateCategoryId; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "magazine", label: "Magazine" },
  { id: "news", label: "Tin tức" },
  { id: "minimal", label: "Tối giản" },
  { id: "tutorial", label: "Hướng dẫn" },
];

export type BlogCanvasTemplateEntry = {
  id: string;
  kind: "blog-list" | "blog-detail";
  name: string;
  description: string;
  categoryIds: BlogTemplateCategoryId[];
  thumbnailUrl: string;
};

function thumbFromList(p: BlogListPreset): string {
  const first = p.content.posts?.[0]?.image?.trim();
  return first || "https://picsum.photos/seed/blogthumb/320/200";
}

function thumbFromDetail(p: BlogDetailPreset): string {
  return "https://picsum.photos/seed/bdthumb/320/200";
}

/** Gán danh mục theo id preset (code-first). */
const LIST_CAT: Record<string, BlogTemplateCategoryId[]> = {
  "bl-magazine-3": ["all", "magazine"],
  "bl-news-2": ["all", "news"],
  "bl-minimal-1": ["all", "minimal"],
};

const DETAIL_CAT: Record<string, BlogTemplateCategoryId[]> = {
  "bd-long": ["all", "tutorial"],
  "bd-news": ["all", "news"],
  "bd-minimal": ["all", "minimal"],
};

function listEntries(): BlogCanvasTemplateEntry[] {
  return BLOG_LIST_PRESETS.map((p) => ({
    id: `list-${p.id}`,
    kind: "blog-list" as const,
    name: p.name,
    description: p.description,
    categoryIds: LIST_CAT[p.id] ?? ["all", "magazine"],
    thumbnailUrl: thumbFromList(p),
  }));
}

function detailEntries(): BlogCanvasTemplateEntry[] {
  return BLOG_DETAIL_PRESETS.map((p) => ({
    id: `detail-${p.id}`,
    kind: "blog-detail" as const,
    name: p.name,
    description: p.description,
    categoryIds: DETAIL_CAT[p.id] ?? ["all", "minimal"],
    thumbnailUrl: thumbFromDetail(p),
  }));
}

export function getAllBlogCanvasTemplateEntries(): BlogCanvasTemplateEntry[] {
  return [...listEntries(), ...detailEntries()];
}

export function filterBlogTemplatesByCategory(
  entries: BlogCanvasTemplateEntry[],
  cat: BlogTemplateCategoryId,
): BlogCanvasTemplateEntry[] {
  if (cat === "all") return entries;
  return entries.filter((e) => e.categoryIds.includes(cat));
}

export function blogListPresetByEntryId(entryId: string): BlogListPreset | undefined {
  const id = entryId.replace(/^list-/, "");
  return BLOG_LIST_PRESETS.find((p) => p.id === id);
}

export function blogDetailPresetByEntryId(entryId: string): BlogDetailPreset | undefined {
  const id = entryId.replace(/^detail-/, "");
  return BLOG_DETAIL_PRESETS.find((p) => p.id === id);
}

export function toElementPresetFromBlogList(p: BlogListPreset, order: number): ElementPresetData {
  return {
    id: -1000 - order,
    name: p.name,
    tabName: null,
    defaultContent: JSON.stringify({
      columns: p.content.columns ?? 2,
      posts: p.content.posts ?? [],
    }),
    stylesJson: JSON.stringify({ ...(p.styles ?? {}), fontSize: p.styles?.fontSize ?? 14 }),
    defaultWidth: 700,
    defaultHeight: 380,
    order,
  };
}

export function toElementPresetFromBlogDetail(p: BlogDetailPreset, order: number): ElementPresetData {
  return {
    id: -2000 - order,
    name: p.name,
    tabName: null,
    defaultContent: JSON.stringify(p.content),
    stylesJson: JSON.stringify(p.styles ?? {}),
    defaultWidth: 600,
    defaultHeight: 480,
    order,
  };
}
