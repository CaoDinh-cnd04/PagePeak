/** Form preset data for FormPickerPanel - contact, registration, login, OTP, checkout */

export type FormType = "contact" | "registration" | "login" | "otp" | "checkout";

export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "radio";

export type FormField = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type: FormFieldType;
  required?: boolean;
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
};

const contactFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone" },
  { id: "message", name: "message", label: "Để lại lời nhắn", placeholder: "Để lại lời nhắn cho chúng tôi", type: "textarea" },
];

const registrationFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email", required: true },
];

const loginFields: FormField[] = [
  { id: "accessCode", name: "accessCode", label: "Mã truy cập", placeholder: "Mã truy cập", type: "text", required: true },
];

const otpFields: FormField[] = [
  { id: "otp", name: "otp", label: "Mã OTP", placeholder: "Nhập mã OTP", type: "text", required: true },
];

const checkoutFields: FormField[] = [
  { id: "name", name: "name", label: "Họ và tên", placeholder: "Họ và tên", type: "text", required: true },
  { id: "phone", name: "phone", label: "Số điện thoại", placeholder: "Số điện thoại", type: "phone", required: true },
  { id: "email", name: "email", label: "Email", placeholder: "Email", type: "email", required: true },
];

export const FORM_PRESETS: FormPreset[] = [
  // Form (contact) tab
  { id: "contact-outlined", name: "Form viền mỏng", formType: "contact", tabName: "Form", title: "Liên hệ", buttonText: "Đặt ngay", fields: contactFields, inputStyle: "outlined" },
  { id: "contact-filled", name: "Form nền xám", formType: "contact", tabName: "Form", title: "Liên hệ", buttonText: "Đặt ngay", fields: contactFields, inputStyle: "filled" },
  { id: "contact-underlined", name: "Form gạch chân", formType: "contact", tabName: "Form", title: "Liên hệ", buttonText: "Đặt ngay", fields: contactFields, inputStyle: "underlined" },
  { id: "contact-2col", name: "Form 2 cột", formType: "contact", tabName: "Form", title: "Liên hệ với chúng tôi", buttonText: "Liên hệ ngay", fields: contactFields, inputStyle: "underlined" },
  { id: "contact-themed", name: "Form xanh lá", formType: "contact", tabName: "Form", title: "Nhận liên hệ từ chúng tôi", buttonText: "Liên hệ chúng tôi", fields: contactFields, inputStyle: "filled" },
  // Form checkout tab
  { id: "checkout-filled", name: "Checkout nền", formType: "checkout", tabName: "Form checkout", title: "Đặt hàng", buttonText: "Mua ngay", fields: checkoutFields, inputStyle: "filled" },
  { id: "checkout-outlined", name: "Checkout viền", formType: "checkout", tabName: "Form checkout", title: "Đặt hàng", buttonText: "Mua ngay", fields: checkoutFields, inputStyle: "outlined" },
  { id: "checkout-purple", name: "Đặt hàng tím", formType: "checkout", tabName: "Form checkout", title: "Đặt hàng ngay với chúng tôi", buttonText: "Mua ngay", fields: checkoutFields, inputStyle: "outlined" },
  { id: "checkout-cream", name: "Đặt hàng kem", formType: "checkout", tabName: "Form checkout", title: "Đặt hàng sản phẩm với giá tốt nhất", buttonText: "MUA NGAY", fields: checkoutFields, inputStyle: "underlined" },
  // Form Login tab
  { id: "login-outlined", name: "Login viền", formType: "login", tabName: "Form Login", title: "", buttonText: "Đăng nhập", fields: loginFields, inputStyle: "outlined" },
  { id: "login-filled", name: "Login nền", formType: "login", tabName: "Form Login", title: "", buttonText: "Đăng nhập", fields: loginFields, inputStyle: "filled" },
  // Form OTP tab
  { id: "otp-default", name: "OTP mặc định", formType: "otp", tabName: "Form OTP", title: "Vui lòng xác nhận OTP", buttonText: "Xác nhận OTP", fields: otpFields, inputStyle: "outlined" },
  { id: "otp-filled", name: "OTP nền", formType: "otp", tabName: "Form OTP", title: "Vui lòng xác nhận OTP", buttonText: "Xác nhận OTP", fields: otpFields, inputStyle: "filled" },
];

export function getFormPresetById(id: string): FormPreset | undefined {
  return FORM_PRESETS.find((p) => p.id === id);
}

export function getFormPresetsByTab(tabName: string): FormPreset[] {
  return FORM_PRESETS.filter((p) => p.tabName === tabName);
}

export const FORM_TABS = ["Form", "Form checkout", "Form Login", "Form OTP"];
