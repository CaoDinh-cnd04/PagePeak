/**
 * Schema trường form (cấu hình workspace) — tương thích JSON trong editor phần tử form.
 */

/** Bản ghi form từ API `/api/forms` */
export type WorkspaceFormConfig = {
  id: number;
  name: string;
  fieldsJson: string;
  webhookUrl: string | null;
  emailNotify: boolean;
  createdAt: string;
};

export type FormFieldType =
  | "text"        // Trả lời ngắn
  | "textarea"    // Đoạn (paragraph)
  | "email"       // Email
  | "phone"       // Số điện thoại
  | "number"      // Số
  | "radio"       // Trắc nghiệm (chọn một)
  | "checkboxes"  // Hộp kiểm (chọn nhiều)
  | "select"      // Menu thả xuống (dropdown)
  | "checkbox"    // Checkbox đơn (đồng ý/không đồng ý)
  | "date"        // Ngày
  | "time"        // Giờ
  | "file"        // Tải tệp lên
  | "scale"       // Phạm vi tuyến tính (linear scale)
  | "rating"      // Xếp hạng (sao)
  | "section";    // Tiêu đề phần (không thu thập dữ liệu)

export type FormFieldDefinition = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required?: boolean;
  /** Dùng cho: select, radio, checkboxes */
  options?: string[];
  /** Dùng cho: scale — giá trị tối thiểu (mặc định 1) */
  min?: number;
  /** Dùng cho: scale — giá trị tối đa (mặc định 5) */
  max?: number;
  /** Dùng cho: scale — nhãn đầu thang */
  minLabel?: string;
  /** Dùng cho: scale — nhãn cuối thang */
  maxLabel?: string;
  /** Dùng cho: rating — số sao tối đa (mặc định 5) */
  maxRating?: number;
  /** Dùng cho: section — mô tả phần */
  description?: string;
  /** Dùng cho: file — loại file chấp nhận (vd: ".pdf,.doc") */
  accept?: string;
  /** Dùng cho: file — dung lượng tối đa (MB) */
  maxSizeMb?: number;
};

/** Một dòng mapping: trường landing page ↔ trường Google Form */
export type GoogleFormMapping = {
  id: string;
  landingPageField: string;  // tên trường landing page (vd: "name", "email")
  googleFormField: string;   // entry ID hoặc nhãn Google Form (vd: "entry.123456" hoặc "")
};

/** Toàn bộ cấu hình liên kết Google Form */
export type GoogleFormLinkConfig = {
  accountName: string;
  apiUrl: string;
  mappings: GoogleFormMapping[];
  fetchedFields: string[]; // danh sách field lấy được từ Google Form sau đồng bộ
};

const DEFAULT_TYPES: FormFieldType[] = [
  "text", "textarea", "email", "phone", "number",
  "radio", "checkboxes", "select", "checkbox",
  "date", "time", "file", "scale", "rating", "section",
];

function randomId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyField(type: FormFieldType = "text"): FormFieldDefinition {
  const base: FormFieldDefinition = {
    id: randomId(),
    name: `field_${Date.now()}`,
    label: "Trường mới",
    placeholder: "",
    type,
    required: false,
  };
  if (type === "select" || type === "radio" || type === "checkboxes") {
    base.options = ["Tùy chọn 1", "Tùy chọn 2", "Tùy chọn 3"];
  }
  if (type === "scale") {
    base.min = 1;
    base.max = 5;
    base.minLabel = "Không hài lòng";
    base.maxLabel = "Rất hài lòng";
  }
  if (type === "rating") {
    base.maxRating = 5;
  }
  if (type === "file") {
    base.accept = ".pdf,.doc,.docx,.jpg,.png";
    base.maxSizeMb = 10;
  }
  if (type === "section") {
    base.label = "Tiêu đề phần";
    base.description = "";
    base.required = undefined;
  }
  return base;
}

export function normalizeFieldType(t: string | undefined): FormFieldType {
  const x = String(t || "text").toLowerCase();
  return (DEFAULT_TYPES.includes(x as FormFieldType) ? x : "text") as FormFieldType;
}

/** Parse an toàn từ API / editor */
export function parseFieldsJson(json: string | undefined | null): FormFieldDefinition[] {
  if (!json || typeof json !== "string") return [];
  try {
    const raw = JSON.parse(json) as unknown;
    let arr: unknown[];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && typeof raw === "object" && Array.isArray((raw as { fields?: unknown }).fields)) {
      arr = (raw as { fields: unknown[] }).fields;
    } else return [];

    return arr
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
      .map((row, i) => {
        const id = typeof row.id === "string" ? row.id : randomId();
        const name = typeof row.name === "string" ? row.name : `field_${i}`;
        const label = typeof row.label === "string" ? row.label : name;
        const placeholder = typeof row.placeholder === "string" ? row.placeholder : "";
        const type = normalizeFieldType(typeof row.type === "string" ? row.type : "text");
        const required = Boolean(row.required);
        const options = Array.isArray(row.options)
          ? row.options.filter((o): o is string => typeof o === "string")
          : undefined;
        const needsOptions = type === "select" || type === "radio" || type === "checkboxes";
        const min = typeof row.min === "number" ? row.min : undefined;
        const max = typeof row.max === "number" ? row.max : undefined;
        const minLabel = typeof row.minLabel === "string" ? row.minLabel : undefined;
        const maxLabel = typeof row.maxLabel === "string" ? row.maxLabel : undefined;
        const maxRating = typeof row.maxRating === "number" ? row.maxRating : undefined;
        const description = typeof row.description === "string" ? row.description : undefined;
        const accept = typeof row.accept === "string" ? row.accept : undefined;
        const maxSizeMb = typeof row.maxSizeMb === "number" ? row.maxSizeMb : undefined;
        return {
          id, name, label, placeholder, type, required,
          ...(needsOptions && options?.length ? { options } : needsOptions ? { options: ["A", "B"] } : {}),
          ...(min !== undefined ? { min } : {}),
          ...(max !== undefined ? { max } : {}),
          ...(minLabel ? { minLabel } : {}),
          ...(maxLabel ? { maxLabel } : {}),
          ...(maxRating !== undefined ? { maxRating } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(accept ? { accept } : {}),
          ...(maxSizeMb !== undefined ? { maxSizeMb } : {}),
        };
      });
  } catch {
    return [];
  }
}

export function stringifyFields(fields: FormFieldDefinition[]): string {
  return JSON.stringify(fields);
}

/** Stringify fields, optionally embedding Google Form link config as metadata */
export function stringifyFieldsWithMeta(
  fields: FormFieldDefinition[],
  googleFormLink?: GoogleFormLinkConfig,
): string {
  if (googleFormLink) {
    return JSON.stringify({ _googleFormLink: googleFormLink, fields });
  }
  return JSON.stringify(fields);
}

/**
 * Convert a Google Forms "viewform" URL to a "formResponse" submit URL.
 * Handles:
 *   - https://docs.google.com/forms/d/e/FORM_ID/viewform  → .../formResponse
 *   - https://forms.gle/XXXX  → returned as-is (short links can't be converted client-side)
 * Returns null if the URL doesn't look like a valid Google Form URL.
 */
export function extractGoogleFormSubmitUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  // Full viewform URL — convert to formResponse
  const match = trimmed.match(
    /^https:\/\/docs\.google\.com\/forms\/d\/e\/([^/]+)\/viewform(\?.*)?$/i,
  );
  if (match) {
    return `https://docs.google.com/forms/d/e/${match[1]}/formResponse`;
  }
  // Short URL — keep as-is (user pasted a short link; we cannot convert without HTTP redirect)
  if (/^https:\/\/forms\.gle\//i.test(trimmed)) {
    return trimmed;
  }
  // Already a formResponse URL
  if (/\/formResponse(\?|$)/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/** Parse Google Form link config from fieldsJson metadata */
export function parseGoogleFormLink(json: string | undefined | null): GoogleFormLinkConfig | null {
  if (!json || typeof json !== "string") return null;
  try {
    const raw = JSON.parse(json) as unknown;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const meta = raw as Record<string, unknown>;
      const g = meta._googleFormLink;
      if (g && typeof g === "object" && !Array.isArray(g)) {
        const gc = g as Record<string, unknown>;
        return {
          accountName: typeof gc.accountName === "string" ? gc.accountName : "",
          apiUrl: typeof gc.apiUrl === "string" ? gc.apiUrl : "",
          mappings: Array.isArray(gc.mappings)
            ? (gc.mappings as GoogleFormMapping[]).filter(
                (m) => m && typeof m.id === "string",
              )
            : [],
          fetchedFields: Array.isArray(gc.fetchedFields)
            ? (gc.fetchedFields as string[]).filter((f) => typeof f === "string")
            : [],
        };
      }
      // backward-compat: old _googleFormUrl
      if (typeof meta._googleFormUrl === "string" && meta._googleFormUrl) {
        return {
          accountName: "",
          apiUrl: meta._googleFormUrl,
          mappings: [],
          fetchedFields: [],
        };
      }
    }
  } catch {}
  return null;
}
