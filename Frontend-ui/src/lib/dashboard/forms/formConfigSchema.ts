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

export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";

export type FormFieldDefinition = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required?: boolean;
  /** Chỉ dùng khi type === "select" */
  options?: string[];
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

const DEFAULT_TYPES: FormFieldType[] = ["text", "email", "phone", "textarea", "select", "checkbox"];

function randomId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyField(type: FormFieldType = "text"): FormFieldDefinition {
  return {
    id: randomId(),
    name: `field_${Date.now()}`,
    label: "Trường mới",
    placeholder: "",
    type,
    required: false,
    ...(type === "select" ? { options: ["Tùy chọn 1", "Tùy chọn 2"] } : {}),
  };
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
        return { id, name, label, placeholder, type, required, ...(type === "select" && options?.length ? { options } : type === "select" ? { options: ["A", "B"] } : {}) };
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
