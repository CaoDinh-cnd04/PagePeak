/**
 * Catalog Tiện ích (hub 2 cột) — tương tự LadiPage: hiệu ứng + widget + tích hợp.
 */
import type { EditorElementType, UtilityEffectsSettings } from "@/types/editor";

export type UtilityHubCategoryKind = "effects" | "widgets" | "integrations";

export type UtilityHubCategory = {
  id: string;
  kind: UtilityHubCategoryKind;
  name: string;
  description: string;
  /** Icon Lucide (key trong iconMap) */
  navIcon: string;
};

export type UtilityEffectEntry = {
  id: keyof UtilityEffectsSettings;
  name: string;
  description: string;
  icon: string;
};

export type UtilityWidgetEntry = {
  id: string;
  name: string;
  description: string;
  elementType: EditorElementType;
  icon: string;
};

export type UtilityIntegrationEntry = {
  id: string;
  name: string;
  description: string;
  icon: string;
  lucideIcon: string;
  /** Nút CTA — placeholder, sau này mở URL / wizard */
  primaryAction?: { label: string; hint: string };
  secondaryAction?: { label: string; hint: string };
};

export const UTILITY_HUB_CATEGORIES: UtilityHubCategory[] = [
  {
    id: "effects",
    kind: "effects",
    name: "Hiệu ứng trang",
    description: "Tuyết, hoa anh đào, pháo hoa — áp dụng khi xem trước & xuất HTML.",
    navIcon: "sparkles",
  },
  {
    id: "widgets",
    kind: "widgets",
    name: "Phần tử canvas",
    description: "Thêm widget vào section đang chọn — kéo từ sidebar hoặc nhấn Sử dụng.",
    navIcon: "puzzle",
  },
  {
    id: "integrations",
    kind: "integrations",
    name: "Ứng dụng & API",
    description: "Bảo mật form, gợi ý địa chỉ, METU — bật tại đây, cấu hình chi tiết sau.",
    navIcon: "plug",
  },
];

export const UTILITY_EFFECT_ENTRIES: UtilityEffectEntry[] = [
  {
    id: "snow",
    name: "Tuyết rơi",
    description: "Hạt tuyết rơi nhẹ, không chặn click (lớp canvas overlay).",
    icon: "snowflake",
  },
  {
    id: "cherryBlossom",
    name: "Hoa anh đào",
    description: "Cánh hoa rơi — phù hợp landing khuyến mãi, sự kiện.",
    icon: "flower-2",
  },
  {
    id: "fireworks",
    name: "Pháo hoa",
    description: "Tia sáng ngẫu nhiên — dùng vừa phải để không rối mắt.",
    icon: "party-popper",
  },
];

export const UTILITY_WIDGET_ENTRIES: UtilityWidgetEntry[] = [
  { id: "countdown", name: "Đếm ngược", description: "Đồng hồ đếm ngược sự kiện, flash sale.", elementType: "countdown", icon: "timer" },
  { id: "html-code", name: "HTML tùy chỉnh", description: "Chèn mã HTML/CSS/JS tùy chỉnh.", elementType: "html-code", icon: "code" },
  { id: "map", name: "Google Maps", description: "Nhúng bản đồ (tọa độ) trên canvas.", elementType: "map", icon: "map-pin" },
  { id: "social-share", name: "Chia sẻ MXH", description: "Nút chia sẻ mạng xã hội.", elementType: "social-share", icon: "share-2" },
  { id: "rating", name: "Đánh giá sao", description: "Hiển thị đánh giá sao.", elementType: "rating", icon: "star" },
  { id: "progress", name: "Thanh tiến độ", description: "Progress bar phần trăm.", elementType: "progress", icon: "bar-chart-2" },
];

export const UTILITY_INTEGRATION_ENTRIES: UtilityIntegrationEntry[] = [
  {
    id: "recaptcha-enterprise",
    name: "reCAPTCHA Enterprise",
    description: "Giảm spam form và bot. Cần khóa API Google Cloud.",
    icon: "🔐",
    lucideIcon: "clipboard-list",
    primaryAction: { label: "Hướng dẫn cấu hình", hint: "Mở Google Cloud Console để tạo site key." },
  },
  {
    id: "place-autocomplete",
    name: "Place Autocomplete",
    description: "Gợi ý địa chỉ khi nhập (Google Places API).",
    icon: "📍",
    lucideIcon: "map-pin",
    primaryAction: { label: "Bật Places API", hint: "Kích hoạt API trong Google Cloud và gắn key workspace." },
  },
  {
    id: "metu",
    name: "METU",
    description: "Tùy biến nút và tăng tương tác — theo tài khoản METU.",
    icon: "Ⓜ",
    lucideIcon: "rocket",
    primaryAction: { label: "Tạo cấu hình METU", hint: "Đăng ký app METU và nhập mã cấu hình." },
    secondaryAction: { label: "Đăng nhập METU", hint: "OAuth / SSO theo METU." },
  },
];
