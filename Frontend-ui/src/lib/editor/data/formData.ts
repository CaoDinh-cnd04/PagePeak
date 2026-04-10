/** Form preset data for FormPickerPanel - contact, registration, login, OTP, checkout */

export type FormType = "contact" | "registration" | "login" | "otp" | "checkout";

export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "number" | "date";

export type FormField = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[]; // for select/radio
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
  // Visual styling
  buttonColor?: string;
  buttonTextColor?: string;
  backgroundColor?: string;
  formBorderRadius?: number;
  titleColor?: string;
  inputRadius?: number;
  accentColor?: string;
};

// ─── Field templates ────────────────────────────────────────────────────────

const contactFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone" },
  { id: "message", name: "message", label: "Để lại lời nhắn", placeholder: "Để lại lời nhắn cho chúng tôi", type: "textarea" },
];

const contactShortFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
];

const registrationFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email", required: true },
];

const registrationCourseFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email" },
  { id: "city", name: "city", label: "Thành phố", placeholder: "Hà Nội, TP.HCM...", type: "text" },
];

const loginFields: FormField[] = [
  { id: "accessCode", name: "accessCode", label: "Mã truy cập", placeholder: "Mã truy cập", type: "text", required: true },
];

const loginFullFields: FormField[] = [
  { id: "email", name: "email", label: "Email / Tên đăng nhập", placeholder: "Email hoặc tên đăng nhập", type: "email", required: true },
  { id: "password", name: "password", label: "Mật khẩu", placeholder: "Mật khẩu", type: "text", required: true },
];

const otpFields: FormField[] = [
  { id: "otp", name: "otp", label: "Mã OTP", placeholder: "Nhập mã OTP", type: "text", required: true },
];

const checkoutFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email" },
];

const checkoutFullFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email" },
  { id: "address", name: "address", label: "Địa chỉ giao hàng", placeholder: "Số nhà, đường, phường/xã", type: "textarea" },
];

// ─── Presets ────────────────────────────────────────────────────────────────

export const FORM_PRESETS: FormPreset[] = [
  // ── Form (contact) ──────────────────────────────────────────────────────
  {
    id: "contact-outlined",
    name: "Form viền mỏng",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ",
    buttonText: "Đặt ngay",
    fields: contactFields,
    inputStyle: "outlined",
    buttonColor: "#1e293b",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "contact-filled",
    name: "Form nền xám",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ",
    buttonText: "Đặt ngay",
    fields: contactFields,
    inputStyle: "filled",
    buttonColor: "#334155",
    buttonTextColor: "#ffffff",
    backgroundColor: "#f8fafc",
    formBorderRadius: 12,
    inputRadius: 6,
  },
  {
    id: "contact-underlined",
    name: "Form gạch chân",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ",
    buttonText: "Đặt ngay",
    fields: contactFields,
    inputStyle: "underlined",
    buttonColor: "#0f172a",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 0,
    inputRadius: 0,
  },
  {
    id: "contact-2col",
    name: "Form 2 cột",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ với chúng tôi",
    buttonText: "Liên hệ ngay",
    fields: contactFields,
    inputStyle: "underlined",
    buttonColor: "#0f172a",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 0,
  },
  {
    id: "contact-themed",
    name: "Form xanh lá",
    formType: "contact",
    tabName: "Form",
    title: "Nhận liên hệ từ chúng tôi",
    buttonText: "Liên hệ chúng tôi",
    fields: contactFields,
    inputStyle: "filled",
    buttonColor: "#16a34a",
    buttonTextColor: "#ffffff",
    backgroundColor: "#f0fdf4",
    formBorderRadius: 12,
    inputRadius: 6,
    accentColor: "#16a34a",
  },
  {
    id: "contact-purple",
    name: "Form tím gradient",
    formType: "contact",
    tabName: "Form",
    title: "Đăng ký tư vấn",
    buttonText: "Đăng ký ngay",
    fields: contactShortFields,
    inputStyle: "outlined",
    buttonColor: "#7c3aed",
    buttonTextColor: "#ffffff",
    backgroundColor: "#faf5ff",
    formBorderRadius: 16,
    inputRadius: 8,
    accentColor: "#7c3aed",
  },
  {
    id: "contact-blue",
    name: "Form xanh dương",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ với chúng tôi",
    buttonText: "Gửi tin nhắn",
    fields: contactFields,
    inputStyle: "filled",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    backgroundColor: "#eff6ff",
    formBorderRadius: 12,
    inputRadius: 6,
    accentColor: "#2563eb",
  },
  {
    id: "contact-orange",
    name: "Form cam nổi bật",
    formType: "contact",
    tabName: "Form",
    title: "Nhận ưu đãi ngay",
    buttonText: "NHẬN NGAY",
    fields: contactShortFields,
    inputStyle: "outlined",
    buttonColor: "#ea580c",
    buttonTextColor: "#ffffff",
    backgroundColor: "#fff7ed",
    formBorderRadius: 8,
    inputRadius: 4,
    accentColor: "#ea580c",
  },
  {
    id: "contact-dark",
    name: "Form tối",
    formType: "contact",
    tabName: "Form",
    title: "Liên hệ",
    buttonText: "Gửi ngay",
    fields: contactShortFields,
    inputStyle: "filled",
    buttonColor: "#6366f1",
    buttonTextColor: "#ffffff",
    backgroundColor: "#0f172a",
    formBorderRadius: 12,
    inputRadius: 6,
    titleColor: "#f8fafc",
    accentColor: "#6366f1",
  },
  {
    id: "contact-minimal",
    name: "Form tối giản",
    formType: "contact",
    tabName: "Form",
    title: "",
    buttonText: "Liên hệ ngay",
    fields: contactShortFields,
    inputStyle: "underlined",
    buttonColor: "#dc2626",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 0,
    inputRadius: 0,
    accentColor: "#dc2626",
  },

  // ── Form checkout ────────────────────────────────────────────────────────
  {
    id: "checkout-filled",
    name: "Checkout nền",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Đặt hàng",
    buttonText: "Mua ngay",
    fields: checkoutFields,
    inputStyle: "filled",
    buttonColor: "#dc2626",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "checkout-outlined",
    name: "Checkout viền",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Đặt hàng",
    buttonText: "Mua ngay",
    fields: checkoutFields,
    inputStyle: "outlined",
    buttonColor: "#16a34a",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "checkout-purple",
    name: "Đặt hàng tím",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Đặt hàng ngay với chúng tôi",
    buttonText: "Mua ngay",
    fields: checkoutFields,
    inputStyle: "outlined",
    buttonColor: "#7c3aed",
    buttonTextColor: "#ffffff",
    backgroundColor: "#faf5ff",
    formBorderRadius: 12,
    inputRadius: 6,
    accentColor: "#7c3aed",
  },
  {
    id: "checkout-cream",
    name: "Đặt hàng kem",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Đặt hàng sản phẩm với giá tốt nhất",
    buttonText: "MUA NGAY",
    fields: checkoutFields,
    inputStyle: "underlined",
    buttonColor: "#92400e",
    buttonTextColor: "#ffffff",
    backgroundColor: "#fffbeb",
    formBorderRadius: 8,
    inputRadius: 0,
    accentColor: "#d97706",
  },
  {
    id: "checkout-full",
    name: "Checkout đầy đủ",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Thông tin đặt hàng",
    buttonText: "Đặt hàng",
    fields: checkoutFullFields,
    inputStyle: "outlined",
    buttonColor: "#0f172a",
    buttonTextColor: "#ffffff",
    backgroundColor: "#f8fafc",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "checkout-red",
    name: "Flash sale đỏ",
    formType: "checkout",
    tabName: "Form checkout",
    title: "ĐẶT HÀNG FLASH SALE",
    buttonText: "ĐẶT HÀNG NGAY",
    fields: checkoutFields,
    inputStyle: "filled",
    buttonColor: "#b91c1c",
    buttonTextColor: "#ffffff",
    backgroundColor: "#fff1f2",
    formBorderRadius: 4,
    inputRadius: 4,
    titleColor: "#b91c1c",
    accentColor: "#b91c1c",
  },
  {
    id: "checkout-dark",
    name: "Checkout tối",
    formType: "checkout",
    tabName: "Form checkout",
    title: "Thông tin đặt hàng",
    buttonText: "Xác nhận đặt hàng",
    fields: checkoutFields,
    inputStyle: "filled",
    buttonColor: "#f59e0b",
    buttonTextColor: "#000000",
    backgroundColor: "#1e293b",
    formBorderRadius: 12,
    inputRadius: 6,
    titleColor: "#f8fafc",
    accentColor: "#f59e0b",
  },

  // ── Form đăng ký ─────────────────────────────────────────────────────────
  {
    id: "reg-outlined",
    name: "Đăng ký viền",
    formType: "registration",
    tabName: "Form Đăng ký",
    title: "Đăng ký nhận tư vấn",
    buttonText: "Đăng ký ngay",
    fields: registrationFields,
    inputStyle: "outlined",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "reg-course",
    name: "Đăng ký khoá học",
    formType: "registration",
    tabName: "Form Đăng ký",
    title: "Đăng ký học thử MIỄN PHÍ",
    buttonText: "Đăng ký học thử",
    fields: registrationCourseFields,
    inputStyle: "filled",
    buttonColor: "#7c3aed",
    buttonTextColor: "#ffffff",
    backgroundColor: "#faf5ff",
    formBorderRadius: 12,
    inputRadius: 6,
    titleColor: "#5b21b6",
    accentColor: "#7c3aed",
  },
  {
    id: "reg-event",
    name: "Đăng ký sự kiện",
    formType: "registration",
    tabName: "Form Đăng ký",
    title: "Đăng ký tham dự",
    buttonText: "Xác nhận đăng ký",
    fields: registrationFields,
    inputStyle: "underlined",
    buttonColor: "#0891b2",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ecfeff",
    formBorderRadius: 8,
    inputRadius: 0,
    titleColor: "#0e7490",
    accentColor: "#0891b2",
  },
  {
    id: "reg-dark",
    name: "Đăng ký tối",
    formType: "registration",
    tabName: "Form Đăng ký",
    title: "Nhận ưu đãi đặc biệt",
    buttonText: "ĐĂNG KÝ NGAY",
    fields: registrationFields,
    inputStyle: "filled",
    buttonColor: "#f97316",
    buttonTextColor: "#ffffff",
    backgroundColor: "#0f172a",
    formBorderRadius: 12,
    inputRadius: 6,
    titleColor: "#fbbf24",
    accentColor: "#f97316",
  },

  // ── Form Login ───────────────────────────────────────────────────────────
  {
    id: "login-outlined",
    name: "Login viền",
    formType: "login",
    tabName: "Form Login",
    title: "",
    buttonText: "Đăng nhập",
    fields: loginFields,
    inputStyle: "outlined",
    buttonColor: "#1e293b",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "login-filled",
    name: "Login nền",
    formType: "login",
    tabName: "Form Login",
    title: "",
    buttonText: "Đăng nhập",
    fields: loginFields,
    inputStyle: "filled",
    buttonColor: "#334155",
    buttonTextColor: "#ffffff",
    backgroundColor: "#f1f5f9",
    formBorderRadius: 12,
    inputRadius: 6,
  },
  {
    id: "login-full",
    name: "Login đầy đủ",
    formType: "login",
    tabName: "Form Login",
    title: "Đăng nhập",
    buttonText: "Đăng nhập",
    fields: loginFullFields,
    inputStyle: "outlined",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 12,
    inputRadius: 6,
    titleColor: "#1e40af",
    accentColor: "#2563eb",
  },
  {
    id: "login-purple",
    name: "Login tím",
    formType: "login",
    tabName: "Form Login",
    title: "Chào mừng trở lại",
    buttonText: "Vào ngay",
    fields: loginFields,
    inputStyle: "outlined",
    buttonColor: "#7c3aed",
    buttonTextColor: "#ffffff",
    backgroundColor: "#faf5ff",
    formBorderRadius: 16,
    inputRadius: 8,
    titleColor: "#5b21b6",
    accentColor: "#7c3aed",
  },

  // ── Form OTP ─────────────────────────────────────────────────────────────
  {
    id: "otp-default",
    name: "OTP mặc định",
    formType: "otp",
    tabName: "Form OTP",
    title: "Vui lòng xác nhận OTP",
    buttonText: "Xác nhận OTP",
    fields: otpFields,
    inputStyle: "outlined",
    buttonColor: "#1e293b",
    buttonTextColor: "#ffffff",
    backgroundColor: "#ffffff",
    formBorderRadius: 8,
    inputRadius: 4,
  },
  {
    id: "otp-filled",
    name: "OTP nền",
    formType: "otp",
    tabName: "Form OTP",
    title: "Vui lòng xác nhận OTP",
    buttonText: "Xác nhận OTP",
    fields: otpFields,
    inputStyle: "filled",
    buttonColor: "#334155",
    buttonTextColor: "#ffffff",
    backgroundColor: "#f8fafc",
    formBorderRadius: 12,
    inputRadius: 6,
  },
  {
    id: "otp-blue",
    name: "OTP xanh",
    formType: "otp",
    tabName: "Form OTP",
    title: "Xác minh số điện thoại",
    buttonText: "Xác nhận",
    fields: otpFields,
    inputStyle: "outlined",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    backgroundColor: "#eff6ff",
    formBorderRadius: 12,
    inputRadius: 8,
    titleColor: "#1d4ed8",
    accentColor: "#2563eb",
  },
];

export function getFormPresetById(id: string): FormPreset | undefined {
  return FORM_PRESETS.find((p) => p.id === id);
}

export function getFormPresetsByTab(tabName: string): FormPreset[] {
  return FORM_PRESETS.filter((p) => p.tabName === tabName);
}

export const FORM_TABS = ["Form", "Form checkout", "Form Đăng ký", "Form Login", "Form OTP"];
