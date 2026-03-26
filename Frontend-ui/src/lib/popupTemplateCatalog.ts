/**
 * Mẫu popup (Phase 1 — dữ liệu tĩnh). Sau này có thể thay bằng API.
 */
import type { ToolItemData } from "@/types/editor";

export const POPUP_CATEGORIES: { id: string; label: string }[] = [
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

export type PopupTemplateEntry = {
  id: string;
  name: string;
  category: string;
  /** Ảnh minh hoạ (placeholder nếu trống) */
  thumbnailUrl?: string;
  content: string;
  width: number;
  height: number;
  styles: Record<string, string | number>;
};

const baseStyle = { backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 12px 40px rgba(15,23,42,0.12)" };

function pop(title: string, body: string, extra?: Partial<{ templateId: string; category: string }>) {
  return JSON.stringify({
    title,
    body,
    templateId: extra?.templateId,
    category: extra?.category,
  });
}

export const POPUP_TEMPLATE_LIST: PopupTemplateEntry[] = [
  {
    id: "promo-bar-dark",
    name: "Thanh đăng ký — tối",
    category: "subscribe",
    content: pop(
      "Nhận thông tin mới nhất",
      "Chúng tôi luôn hướng về khách hàng. NHẬN THÔNG TIN VỀ BỘ SƯU TẬP MỚI NHẤT",
      { templateId: "promo-bar-dark", category: "subscribe" },
    ),
    width: 520,
    height: 200,
    styles: {
      ...baseStyle,
      backgroundColor: "#0f172a",
      color: "#ffffff",
      popupFlat: 1,
      headerTextColor: "#f8fafc",
      bodyTextColor: "#cbd5e1",
    },
  },
  {
    id: "promo-bar-light",
    name: "Thanh khuyến mãi — sáng",
    category: "promotion",
    content: pop("Ưu đãi giới hạn", "Giảm 30% cho đơn hàng đầu tiên. Nhập mã WELCOME.", {
      templateId: "promo-bar-light",
      category: "promotion",
    }),
    width: 480,
    height: 180,
    styles: { ...baseStyle, backgroundColor: "#fef3c7", color: "#92400e", bodyTextColor: "#78350f", popupFlat: 1, headerTextColor: "#b45309" },
  },
  {
    id: "contact-card",
    name: "Liên hệ nhanh",
    category: "contact",
    content: pop("Liên hệ", "Để lại email, chúng tôi sẽ phản hồi trong 24h.", {
      templateId: "contact-card",
      category: "contact",
    }),
    width: 440,
    height: 320,
    styles: baseStyle,
  },
  {
    id: "thankyou-simple",
    name: "Cảm ơn",
    category: "thankyou",
    content: pop("Cảm ơn bạn!", "Đơn hàng đã được ghi nhận. Chúng tôi sẽ gửi email xác nhận.", {
      templateId: "thankyou-simple",
      category: "thankyou",
    }),
    width: 420,
    height: 260,
    styles: { ...baseStyle, backgroundColor: "#ecfdf5", color: "#065f46", bodyTextColor: "#047857", popupFlat: 1, headerTextColor: "#065f46" },
  },
  {
    id: "sticky-minimal",
    name: "Sticky — gọn",
    category: "sticky",
    content: pop("Thông báo", "Miễn phí vận chuyển cho đơn từ 500k.", {
      templateId: "sticky-minimal",
      category: "sticky",
    }),
    width: 600,
    height: 120,
    styles: {
      ...baseStyle,
      backgroundColor: "#1e2d7d",
      color: "#ffffff",
      borderRadius: 0,
      popupFlat: 1,
      headerTextColor: "#ffffff",
      bodyTextColor: "#e2e8f0",
    },
  },
  {
    id: "floating-cta",
    name: "Floating CTA",
    category: "floating",
    content: pop("Bạn cần tư vấn?", "Chat với chúng tôi — nhấn để mở khung chat.", {
      templateId: "floating-cta",
      category: "floating",
    }),
    width: 360,
    height: 200,
    styles: { ...baseStyle, backgroundColor: "#fafafa", bodyTextColor: "#475569" },
  },
  {
    id: "lucky-spin",
    name: "Vòng quay may mắn",
    category: "lucky",
    content: pop(
      "Quay ngay — nhận quà!",
      "Mỗi ngày một lượt quay miễn phí. Giải thưởng: voucher, giảm giá 50%, quà tặng bất ngờ.",
      { templateId: "lucky-spin", category: "lucky" },
    ),
    width: 400,
    height: 380,
    styles: {
      ...baseStyle,
      backgroundColor: "#4c1d95",
      color: "#fef08a",
      popupFlat: 1,
      headerTextColor: "#fef9c3",
      bodyTextColor: "#e9d5ff",
    },
  },
  {
    id: "giveaway-email",
    name: "Giveaway — Email",
    category: "giveaway",
    content: pop(
      "Tham gia giveaway",
      "Điền email để nhận mã dự thưởng. 10 giải mỗi tuần. Kết quả công bố trên fanpage.",
      { templateId: "giveaway-email", category: "giveaway" },
    ),
    width: 460,
    height: 240,
    styles: { ...baseStyle, backgroundColor: "#fff7ed", color: "#9a3412", bodyTextColor: "#c2410c", headerTextColor: "#ea580c", popupFlat: 1 },
  },
  {
    id: "upsell-bundle",
    name: "Upsell — Mua kèm",
    category: "upsell",
    content: pop(
      "Mua kèm tiết kiệm 15%",
      "Khách mua sản phẩm A thường thêm B. Thêm vào giỏ hàng với giá combo.",
      { templateId: "upsell-bundle", category: "upsell" },
    ),
    width: 520,
    height: 220,
    styles: { ...baseStyle, backgroundColor: "#f0fdf4", color: "#166534", headerBackgroundColor: "#15803d", headerTextColor: "#ffffff", bodyTextColor: "#14532d" },
  },
  {
    id: "content-article",
    name: "Nội dung — bài viết",
    category: "content",
    content: pop(
      "Bài viết nổi bật",
      "Tóm tắt ngắn: hướng dẫn sử dụng sản phẩm, mẹo hay và cập nhật mới nhất từ đội ngũ.",
      { templateId: "content-article", category: "content" },
    ),
    width: 520,
    height: 300,
    styles: { ...baseStyle, backgroundColor: "#ffffff", borderRadius: 8 },
  },
  {
    id: "subscribe-minimal",
    name: "Đăng ký — tối giản",
    category: "subscribe",
    content: pop("Ưu đãi qua email", "Chỉ 1 email/tuần. Không spam. Hủy bất cứ lúc nào.", {
      templateId: "subscribe-minimal",
      category: "subscribe",
    }),
    width: 440,
    height: 160,
    styles: { ...baseStyle, backgroundColor: "#0ea5e9", color: "#ffffff", popupFlat: 1, headerTextColor: "#ffffff", bodyTextColor: "#e0f2fe" },
  },
  {
    id: "promo-countdown",
    name: "Flash sale — đếm ngược",
    category: "promotion",
    content: pop(
      "Flash sale chỉ hôm nay",
      "Giảm sâu đến 50%. Kết thúc sau 03:00:00 — thêm vào giỏ hàng ngay.",
      { templateId: "promo-countdown", category: "promotion" },
    ),
    width: 480,
    height: 200,
    styles: { ...baseStyle, backgroundColor: "#fef2f2", color: "#b91c1c", bodyTextColor: "#991b1b", headerTextColor: "#dc2626", popupFlat: 1 },
  },
  {
    id: "contact-zalo",
    name: "Liên hệ — Zalo",
    category: "contact",
    content: pop("Chat Zalo ngay", "Nhấn để mở Zalo OA — hỗ trợ 8h–22h mỗi ngày.", {
      templateId: "contact-zalo",
      category: "contact",
    }),
    width: 380,
    height: 200,
    styles: { ...baseStyle, backgroundColor: "#0068ff", color: "#ffffff", popupFlat: 1, headerTextColor: "#ffffff", bodyTextColor: "#dbeafe" },
  },
  {
    id: "floating-bar-bottom",
    name: "Thanh dưới — cookie",
    category: "floating",
    content: pop(
      "Chúng tôi dùng cookie",
      "Trang web sử dụng cookie để cải thiện trải nghiệm. Tiếp tục đồng nghĩa chấp nhận điều khoản.",
      { templateId: "floating-bar-bottom", category: "floating" },
    ),
    width: 640,
    height: 100,
    styles: { ...baseStyle, backgroundColor: "#1e293b", color: "#f1f5f9", borderRadius: 0, popupFlat: 1, headerTextColor: "#f8fafc", bodyTextColor: "#cbd5e1" },
  },
  {
    id: "thankyou-survey",
    name: "Cảm ơn — khảo sát",
    category: "thankyou",
    content: pop(
      "Bạn hài lòng chứ?",
      "Một câu hỏi ngắn giúp chúng tôi phục vụ tốt hơn. 5 giây là đủ.",
      { templateId: "thankyou-survey", category: "thankyou" },
    ),
    width: 420,
    height: 220,
    styles: { ...baseStyle, backgroundColor: "#f8fafc", borderRadius: 16 },
  },
  {
    id: "sticky-social",
    name: "Sticky — MXH",
    category: "sticky",
    content: pop("Theo dõi chúng tôi", "Cập nhật ưu đãi trên Facebook, Instagram và TikTok.", {
      templateId: "sticky-social",
      category: "sticky",
    }),
    width: 560,
    height: 110,
    styles: { ...baseStyle, backgroundColor: "#fdf4ff", color: "#86198f", bodyTextColor: "#701a75", popupFlat: 1, headerTextColor: "#a21caf" },
  },
  {
    id: "giveaway-ig",
    name: "Giveaway — Instagram",
    category: "giveaway",
    content: pop(
      "Follow & nhận quà",
      "Follow @brand và comment tag 3 bạn để tham gia. Trúng 100 voucher.",
      { templateId: "giveaway-ig", category: "giveaway" },
    ),
    width: 480,
    height: 260,
    styles: {
      ...baseStyle,
      backgroundColor: "#faf5ff",
      color: "#6b21a8",
      bodyTextColor: "#7c3aed",
      popupFlat: 1,
      headerTextColor: "#5b21b6",
    },
  },
];

export function filterPopupTemplates(categoryId: string): PopupTemplateEntry[] {
  if (categoryId === "all") return POPUP_TEMPLATE_LIST;
  return POPUP_TEMPLATE_LIST.filter((t) => t.category === categoryId);
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
}

export function deleteMyPopup(id: string): void {
  const list = loadMyPopups().filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
