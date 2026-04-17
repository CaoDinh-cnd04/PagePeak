/**
 * Icon data — Types, cache và API loader.
 * Dữ liệu KHÔNG còn hardcode ở đây; tất cả lưu trong SQL Server
 * và truy xuất qua GET /api/editor-icons
 *
 * getIconById() vẫn là sync nhờ dùng module-level cache (populated khi app khởi động).
 */

import { editorIconsApi, type EditorIconApi, type IconCategoryApi } from "@/lib/shared/api";

export type IconCategory = "socials" | "icons" | "arrows" | "pattern";

export type IconItem = {
  id: string;
  name: string;
  category: IconCategory;
  char: string;
  color?: string;
};

export type { IconCategoryApi as IconCategoryEntry };

// ─── Module-level cache (cho sync access) ────────────────────────────────

let _iconsCache: IconItem[] = [];
let _categoriesCache: { id: string; label: string }[] = [
  { id: "socials", label: "SOCIALS" },
  { id: "icons", label: "ICONS" },
  { id: "arrows", label: "ARROWS" },
  { id: "pattern", label: "PATTERN" },
];

/** Populate cache — gọi khi app khởi động hoặc IconPickerPanel mount */
export async function loadIconData(): Promise<void> {
  try {
    const [icons, cats] = await Promise.all([
      editorIconsApi.list(),
      editorIconsApi.categories(),
    ]);
    _iconsCache = icons as IconItem[];
    if (cats.length > 0) _categoriesCache = cats;
  } catch (err) {
    console.warn("[IconData] Không thể tải từ API:", err);
  }
}

/** Lấy category list (có thể sync từ cache) */
export function getIconCategories(): { id: string; label: string }[] {
  return _categoriesCache;
}

/** Lấy tất cả icons từ cache (sync) */
export function getAllIcons(): IconItem[] {
  return _iconsCache;
}

// ─── Sync helpers (dùng cache) ────────────────────────────────────────────

export function getIconById(id: string): IconItem | undefined {
  return _iconsCache.find((i) => i.id === id);
}

export function getIconsByCategory(category: string): IconItem[] {
  return _iconsCache.filter((i) => i.category === category);
}

export function searchIcons(query: string): IconItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return _iconsCache;
  return _iconsCache.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.char.toLowerCase().includes(q),
  );
}

// ─── Backward compat exports (cho các file cũ) ───────────────────────────

/** @deprecated Dùng getIconCategories() thay thế */
export const ICON_CATEGORIES = _categoriesCache;

/** @deprecated Dùng getAllIcons() thay thế */
export const ICON_DATA = _iconsCache;
