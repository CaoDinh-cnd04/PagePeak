/**
 * Login Feature Slides — API loader.
 * Dữ liệu KHÔNG còn hardcode ở đây; tất cả lưu trong SQL Server
 * và truy xuất qua GET /api/login-features
 */

import { loginFeaturesApi, type LoginFeatureSlideApi } from "@/lib/shared/api";

export type LoginFeatureSlide = LoginFeatureSlideApi;

/** Load danh sách slides từ API */
export async function fetchLoginFeatureSlides(): Promise<LoginFeatureSlide[]> {
  try {
    return await loginFeaturesApi.list();
  } catch (err) {
    console.warn("[LoginFeatureSlides] Không thể tải từ API:", err);
    return [];
  }
}
