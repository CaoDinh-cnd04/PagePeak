/**
 * Line preset data — Types, cache và API loader.
 * Dữ liệu KHÔNG còn hardcode ở đây; tất cả lưu trong SQL Server
 * và truy xuất qua GET /api/line-presets
 *
 * getLinePresetById() vẫn là sync nhờ dùng module-level cache.
 */

import { linePresetsApi, type LinePresetApi } from "@/lib/shared/api";

export type LineStyle = "solid" | "dashed" | "dotted" | "double";

export type LinePreset = {
  id: string;
  name: string;
  style: LineStyle;
  color: string;
  thickness: number;
  dashArray?: number[];
  tab?: string;
};

// ─── Module-level cache ───────────────────────────────────────────────────

let _presetsCache: LinePreset[] = [];

/** Populate cache — gọi khi LinePickerPanel mount */
export async function loadLinePresets(): Promise<LinePreset[]> {
  try {
    const presets = await linePresetsApi.list();
    _presetsCache = presets.map((p) => ({
      id: p.id,
      name: p.name,
      style: p.style as LineStyle,
      color: p.color,
      thickness: p.thickness,
      dashArray: p.dashArray,
      tab: p.tab,
    }));
    return _presetsCache;
  } catch (err) {
    console.warn("[LineData] Không thể tải từ API:", err);
    return _presetsCache;
  }
}

export function getLinePresetsForTab(tab: string): LinePreset[] {
  return _presetsCache.filter((p) => !p.tab || p.tab === tab);
}

// ─── Sync helpers ─────────────────────────────────────────────────────────

export function getLinePresetById(id: string): LinePreset | undefined {
  return _presetsCache.find((p) => p.id === id);
}

export function getStrokeDashArray(style: LineStyle, dashArray?: number[]): number[] | undefined {
  if (dashArray && dashArray.length > 0) return dashArray;
  if (style === "dashed") return [8, 4];
  if (style === "dotted") return [2, 4];
  return undefined;
}

/** @deprecated Dùng loadLinePresets() thay thế */
export const LINE_PRESETS = _presetsCache;
