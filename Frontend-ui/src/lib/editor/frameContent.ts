/**
 * Khung nội dung (Frame) — mẫu layout giống LadiPage + frame trống.
 * Toàn bộ lưu trong `EditorElement.content` (JSON).
 */

export type FrameVariant = "quote" | "split-feature" | "profile-cta" | "numbered" | "blank";

export type FrameContent = {
  variant: FrameVariant;
  padding: number;
  /** nền: #hex hoặc linear-gradient(...) */
  background: string;
  /** Font chữ chung cho toàn khung */
  fontFamily?: string;

  variantSnapshots?: Partial<Record<FrameVariant, Partial<FrameContent>>>;

  /** --- Quote --- */
  quoteMarkColor?: string;
  /** Cỡ dấu ngoặc kép (px, design base ~680px) */
  quoteMarkFontSize?: number;
  quoteText?: string;
  quoteTextFontSize?: number;
  quoteFooter?: string;
  quoteFooterColor?: string;
  quoteFooterFontSize?: number;
  quoteTextColor?: string;

  /** --- Split ảnh + chữ --- */
  splitImage?: string;
  splitImagePosition?: "left" | "right";
  splitTitle?: string;
  splitTitleFontSize?: number;
  splitBody?: string;
  splitBodyFontSize?: number;
  splitTitleColor?: string;
  splitBodyColor?: string;
  splitImageRadius?: number;

  /** --- Profile + CTA --- */
  profileLayout?: "horizontal" | "vertical";
  profileImage?: string;
  profileImageRound?: boolean;
  profileImageSize?: number;
  profileName?: string;
  profileNameColor?: string;
  profileNameFontSize?: number;
  profileRole?: string;
  profileRoleColor?: string;
  profileRoleFontSize?: number;
  profileTitle?: string;
  profileTitleColor?: string;
  profileTitleFontSize?: number;
  profileBody?: string;
  profileBodyColor?: string;
  profileBodyFontSize?: number;
  profileBtnText?: string;
  profileBtnUrl?: string;
  profileBtnBg?: string;
  profileBtnColor?: string;
  profileBtnRadius?: number;
  /** Cỡ chữ nút CTA */
  profileBtnFontSize?: number;

  /** --- Numbered --- */
  numName?: string;
  numRole?: string;
  numNameColor?: string;
  numRoleColor?: string;
  numNameFontSize?: number;
  numRoleFontSize?: number;
  numValue?: string;
  numValueColor?: string;
  numValueFontSize?: number;
  numBody?: string;
  numBodyColor?: string;
  numBodyFontSize?: number;

  /** --- Frame trống --- */
  blankHint?: string;
  blankHintFontSize?: number;
  blankHintColor?: string;
};

export const FRAME_VARIANT_LABELS: Record<FrameVariant, string> = {
  quote: "Trích dẫn (Quote)",
  "split-feature": "Ảnh & nội dung (2 cột)",
  "profile-cta": "Giới thiệu & nút kêu gọi",
  numbered: "Số thứ tự + nội dung",
  blank: "Frame trống",
};

const ALL_VARIANTS: FrameVariant[] = ["quote", "split-feature", "profile-cta", "numbered", "blank"];

export function coerceFrameVariant(v: unknown): FrameVariant {
  return ALL_VARIANTS.includes(v as FrameVariant) ? (v as FrameVariant) : "quote";
}

/** Tỷ lệ chữ / khoảng cách trên canvas — tránh chữ chồng khi khung nhỏ. */
export function getFrameCanvasScale(el: { width?: number | null; height?: number | null }): number {
  const w = Math.max(200, Number(el.width) || 680);
  const h = Math.max(120, Number(el.height) || 260);
  const s = Math.min(w / 680, h / 260);
  return Math.min(1.06, Math.max(0.72, s));
}

/** Các trường thuộc từng mẫu (dùng để snapshot / merge, không gồm padding/background/variant). */
export const FRAME_VARIANT_FIELD_KEYS: Record<FrameVariant, (keyof FrameContent)[]> = {
  quote: [
    "quoteMarkColor",
    "quoteMarkFontSize",
    "quoteText",
    "quoteTextFontSize",
    "quoteFooter",
    "quoteFooterColor",
    "quoteFooterFontSize",
    "quoteTextColor",
  ],
  "split-feature": [
    "splitImage", "splitImagePosition", "splitTitle", "splitTitleFontSize",
    "splitBody", "splitBodyFontSize", "splitTitleColor", "splitBodyColor", "splitImageRadius",
  ],
  "profile-cta": [
    "profileLayout", "profileImage", "profileImageRound", "profileImageSize",
    "profileName", "profileNameColor", "profileNameFontSize",
    "profileRole", "profileRoleColor", "profileRoleFontSize",
    "profileTitle", "profileTitleColor", "profileTitleFontSize",
    "profileBody", "profileBodyColor", "profileBodyFontSize",
    "profileBtnText",
    "profileBtnUrl",
    "profileBtnBg",
    "profileBtnColor",
    "profileBtnRadius",
    "profileBtnFontSize",
    "profileRoleFontSize",
  ],
  numbered: [
    "numName",
    "numRole",
    "numNameColor",
    "numRoleColor",
    "numNameFontSize",
    "numRoleFontSize",
    "numValue",
    "numValueColor",
    "numValueFontSize",
    "numBody",
    "numBodyColor",
    "numBodyFontSize",
  ],
  blank: ["blankHint", "blankHintFontSize", "blankHintColor"],
};

export function pickVariantFields(fc: Partial<FrameContent>, v: FrameVariant): Partial<FrameContent> {
  const keys = FRAME_VARIANT_FIELD_KEYS[v];
  const o: Partial<FrameContent> = {};
  for (const k of keys) {
    const val = fc[k];
    if (val !== undefined) (o as Record<string, unknown>)[k as string] = val;
  }
  return o;
}

/** Ghi snapshot mẫu hiện tại — gọi sau mỗi lần chỉnh field để lưu SQL đầy đủ theo từng layout. */
export function persistFrameSnapshotLayer(fc: FrameContent): FrameContent {
  const v = fc.variant;
  const slice = pickVariantFields(fc, v);
  return {
    ...fc,
    variantSnapshots: {
      ...(fc.variantSnapshots ?? {}),
      [v]: { ...(fc.variantSnapshots?.[v] ?? {}), ...slice },
    },
  };
}

/** Đổi mẫu layout: giữ snapshot các mẫu khác, khôi phục dữ liệu mẫu đích nếu đã có. */
export function applyFrameVariantSwitch(fc: FrameContent, nextV: FrameVariant): FrameContent {
  const cur = fc.variant;
  const snaps: NonNullable<FrameContent["variantSnapshots"]> = { ...(fc.variantSnapshots ?? {}) };
  snaps[cur] = { ...(snaps[cur] ?? {}), ...pickVariantFields(fc, cur) };
  const def = getDefaultContentForVariant(nextV);
  const loaded = snaps[nextV] ?? {};
  const merged: FrameContent = {
    ...def,
    ...loaded,
    variant: nextV,
    padding: fc.padding,
    background: fc.background,
    fontFamily: fc.fontFamily ?? def.fontFamily,
  };
  snaps[nextV] = { ...(snaps[nextV] ?? {}), ...pickVariantFields(merged, nextV) };
  return { ...merged, variantSnapshots: snaps };
}

function base(): Omit<FrameContent, "variant"> {
  return {
    padding: 16,
    background: "#ffffff",
  };
}

export function getDefaultContentForVariant(v: FrameVariant): FrameContent {
  const b = base();
  switch (v) {
    case "quote":
      return {
        ...b,
        variant: "quote",
        background: "linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)",
        quoteMarkColor: "#0044ff",
        quoteTextColor: "#334155",
        quoteText:
          "Thêm một đoạn văn tại đây. Nhấp vào box này để tuỳ chỉnh nội dung, thêm văn bản cho đoạn văn.",
        quoteFooter: "Thêm title nội dung",
        quoteFooterColor: "#0044ff",
      };
    case "split-feature":
      return {
        ...b,
        variant: "split-feature",
        background: "#ffffff",
        splitImage: "https://picsum.photos/seed/lp-frame-split/480/480",
        splitImagePosition: "left",
        splitImageRadius: 8,
        splitTitle: "Tiêu đề nội dung",
        splitTitleColor: "#0f172a",
        splitBody: "Mô tả ngắn — chỉnh ảnh, chữ và màu ở panel bên phải.",
        splitBodyColor: "#64748b",
      };
    case "profile-cta":
      return {
        ...b,
        variant: "profile-cta",
        profileLayout: "vertical",
        background: "#ffffff",
        profileImage: "https://picsum.photos/seed/lp-frame-profile/400/400",
        profileImageRound: true,
        profileImageSize: 88,
        profileName: "Trần Khánh Linh",
        profileNameColor: "#0f172a",
        profileRole: "Tổng giám đốc",
        profileRoleColor: "#64748b",
        profileTitle: "THÊM TITLE CHO ĐOẠN VĂN",
        profileTitleColor: "#0d9488",
        profileBody:
          "Chỉnh sửa mô tả đoạn văn để thêm nội dung mà bạn muốn và chia sẻ cho mọi người ngay. Dễ thôi",
        profileBodyColor: "#64748b",
        profileBtnText: "Liên hệ với chúng tôi",
        profileBtnUrl: "#",
        profileBtnBg: "#0d9488",
        profileBtnColor: "#ffffff",
        profileBtnRadius: 6,
      };
    case "numbered":
      return {
        ...b,
        variant: "numbered",
        background: "#fafafa",
        numName: "",
        numRole: "",
        numNameColor: "#0f172a",
        numRoleColor: "#64748b",
        numValue: "01",
        numValueColor: "#4c1d95",
        numBody:
          "Chỉnh sửa mô tả đoạn văn để thêm nội dung mà bạn muốn và chia sẻ cho mọi người ngay. Dễ thôi",
        numBodyColor: "#64748b",
      };
    case "blank":
      return {
        ...b,
        variant: "blank",
        padding: 24,
        background: "#fafafa",
        blankHint: "Khung trống — chỉnh nền, viền, đổ bóng ở panel bên phải. Có thể đặt phần tử khác phía trên hoặc dùng làm vùng bố cục.",
      };
    default:
      return getDefaultContentForVariant("quote");
  }
}

export function parseFrameContent(raw: string | null | undefined): FrameContent {
  try {
    const p = JSON.parse(raw || "{}") as Partial<FrameContent>;
    if (!p || typeof p !== "object") return getDefaultContentForVariant("quote");
    const v = coerceFrameVariant(p.variant);
    const def = getDefaultContentForVariant(v);
    const snaps = p.variantSnapshots && typeof p.variantSnapshots === "object" ? p.variantSnapshots : undefined;
    const fromSnap = snaps?.[v];
    const legacy = pickVariantFields(p, v);
    const hasSnap = fromSnap && typeof fromSnap === "object" && Object.keys(fromSnap).length > 0;
    const variantLayer = hasSnap ? { ...legacy, ...fromSnap } : legacy;
  const merged: FrameContent = {
    ...def,
    ...variantLayer,
    padding: p.padding ?? def.padding,
    background: p.background ?? def.background,
    fontFamily: p.fontFamily ?? def.fontFamily,
    variant: v,
    variantSnapshots: snaps ?? {},
  };
    /** Bản cũ không có profileLayout — giữ bố cục ngang. */
    if (
      v === "profile-cta" &&
      p.profileLayout === undefined &&
      (!fromSnap || fromSnap.profileLayout === undefined)
    ) {
      merged.profileLayout = "horizontal";
    }
    return merged;
  } catch {
    return getDefaultContentForVariant("quote");
  }
}
