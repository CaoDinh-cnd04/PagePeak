/**
 * Popup template catalog — Types và API loader.
 * Dữ liệu mẫu popup KHÔNG còn hardcode ở đây; tất cả được lưu trong SQL Server
 * và truy xuất qua GET /api/popup-templates
 *
 * "Popup của tôi" (MySavedPopup) vẫn lưu localStorage per-user (user-specific).
 */

import { popupTemplatesApi, type PopupTemplateApi, type PopupCategoryApi } from "@/lib/shared/api";
import type { ToolItemData } from "@/types/editor";

// Re-export types để các component không cần import trực tiếp từ api.ts
export type PopupTemplateEntry = PopupTemplateApi;
export type { PopupCategoryApi };

/** Fallback categories khi API chưa sẵn sàng */
export const POPUP_CATEGORIES_FALLBACK: { id: string; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "sticky", label: "Sticky Bar" },
  { id: "promotion", label: "Promotion" },
  { id: "lucky", label: "Lucky Spin" },
  { id: "upsell", label: "Upselling - Cross Selling" },
  { id: "contact", label: "Contact" },
  { id: "giveaway", label: "Giveaway" },
  { id: "thankyou", label: "Thank You" },
  { id: "floating", label: "Floating Bar" },
  { id: "content", label: "Content" },
  { id: "subscribe", label: "Subscribe" },
];

/** Load popup templates từ API (SQL Server) */
export async function fetchPopupTemplates(categoryId?: string): Promise<PopupTemplateEntry[]> {
  try {
    return await popupTemplatesApi.list(categoryId);
  } catch (err) {
    console.warn("[PopupTemplates] Không thể tải từ API:", err);
    return [];
  }
}

/** Load popup categories từ API */
export async function fetchPopupCategories(): Promise<{ id: string; label: string }[]> {
  try {
    return await popupTemplatesApi.categories();
  } catch {
    return POPUP_CATEGORIES_FALLBACK;
  }
}

/** Item sidebar: Popup trống — kéo thả / nhấn thêm */
export const POPUP_BLANK_TOOL_ITEM: ToolItemData = {
  id: 50101,
  name: "Popup trống",
  icon: "plus-square",
  elementType: "popup",
  order: 1,
  hasSubTabs: false,
  presets: [],
};

// ─── "Popup của tôi" — localStorage (user-specific, không phải dữ liệu hệ thống) ──

const STORAGE_KEY = "ladipage_editor_my_popups_v1";

export type MySavedPopup = {
  id: string;
  name: string;
  savedAt: string;
  content: string;
  width: number;
  height: number;
  styles: Record<string, string | number>;
};

export function loadMyPopups(): MySavedPopup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (x): x is MySavedPopup =>
        x &&
        typeof x === "object" &&
        typeof (x as MySavedPopup).id === "string" &&
        typeof (x as MySavedPopup).content === "string",
    );
  } catch {
    return [];
  }
}

function sanitizeStyles(s: Record<string, string | number | boolean | undefined>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) continue;
    if (typeof v === "boolean") out[k] = v ? 1 : 0;
    else if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

export function saveMyPopup(entry: Omit<MySavedPopup, "savedAt"> & { savedAt?: string }): void {
  const list = loadMyPopups();
  const savedAt = entry.savedAt ?? new Date().toISOString();
  const next = [
    ...list.filter((x) => x.id !== entry.id),
    { ...entry, styles: sanitizeStyles(entry.styles), savedAt },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("ladipage-my-popups-changed"));
}

export function deleteMyPopup(id: string): void {
  const list = loadMyPopups().filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("ladipage-my-popups-changed"));
}
