/**
 * Form preset data — Types và API loader.
 * Dữ liệu KHÔNG còn hardcode ở đây; tất cả được lưu trong SQL Server
 * và truy xuất qua GET /api/form-presets
 */

import { formPresetsApi } from "@/lib/shared/api";

export type FormType = "contact" | "registration" | "login" | "otp" | "checkout";

export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "number" | "date";

export type FormField = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
};

export type FormPreset = {
  id: string;
  name: string;
  formType: FormType;
  tabName: string;
  title: string;
  buttonText: string;
  fields: FormField[];
  inputStyle?: "filled" | "outlined" | "underlined";
  width: number;
  height: number;
  buttonColor?: string;
  buttonTextColor?: string;
  backgroundColor?: string;
  formBorderRadius?: number;
  titleColor?: string;
  inputRadius?: number;
  accentColor?: string;
};

/** Tab names cho Form Picker — fallback khi API chưa sẵn sàng */
export const FORM_TABS = ["Form", "Form checkout", "Form Đăng ký", "Form Login", "Form OTP"];

/** Load toàn bộ form presets từ API (SQL Server) */
export async function fetchFormPresets(): Promise<FormPreset[]> {
  try {
    const data = await formPresetsApi.list();
    return data as FormPreset[];
  } catch (err) {
    console.warn("[FormPresets] Không thể tải từ API, trả về mảng rỗng:", err);
    return [];
  }
}

/** Load tabs từ API (hoặc dùng fallback tĩnh) */
export async function fetchFormTabs(): Promise<string[]> {
  try {
    const tabs = await formPresetsApi.tabs();
    return tabs.map((t) => t.tabName);
  } catch {
    return FORM_TABS;
  }
}

/** Helper tìm preset theo id trong danh sách đã load */
export function getFormPresetById(presets: FormPreset[], id: string): FormPreset | undefined {
  return presets.find((p) => p.id === id);
}

/** Helper lọc preset theo tab trong danh sách đã load */
export function getFormPresetsByTab(presets: FormPreset[], tabName: string): FormPreset[] {
  return presets.filter((p) => p.tabName === tabName);
}
