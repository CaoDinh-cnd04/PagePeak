/**
 * Dữ liệu địa giới hành chính Việt Nam — API loader.
 * Dữ liệu KHÔNG còn hardcode ở đây; tất cả được lưu trong SQL Server
 * và truy xuất qua GET /api/vn-address/*
 */

import { vnAddressApi, type ProvinceApi, type DistrictApi, type WardApi } from "@/lib/shared/api";

export const DEFAULT_COUNTRY = "Việt Nam";

export type DistrictNode = { name: string; wards: string[] };
export type ProvinceNode = { name: string; districts: DistrictNode[] };

// ─── API loaders ────────────────────────────────────────────────────────────

/** Load danh sách tỉnh/thành từ API */
export async function fetchProvinces(): Promise<ProvinceApi[]> {
  try {
    return await vnAddressApi.provinces();
  } catch (err) {
    console.warn("[VnAddress] Không thể tải tỉnh/thành:", err);
    return [];
  }
}

/** Load danh sách quận/huyện theo tỉnh */
export async function fetchDistricts(provinceId: number): Promise<DistrictApi[]> {
  try {
    return await vnAddressApi.districts(provinceId);
  } catch (err) {
    console.warn("[VnAddress] Không thể tải quận/huyện:", err);
    return [];
  }
}

/** Load danh sách phường/xã theo quận */
export async function fetchWards(districtId: number): Promise<WardApi[]> {
  try {
    return await vnAddressApi.wards(districtId);
  } catch (err) {
    console.warn("[VnAddress] Không thể tải phường/xã:", err);
    return [];
  }
}

// Re-export types cho backward compat
export type { ProvinceApi, DistrictApi, WardApi };
