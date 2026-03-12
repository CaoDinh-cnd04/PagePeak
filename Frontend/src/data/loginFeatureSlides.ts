/**
 * Nội dung giới thiệu tính năng hiển thị bên trái trang đăng nhập/đăng ký.
 * Sau này có thể thay bằng API từ admin (GET /api/settings/login-feature-slides hoặc tương tự).
 */
export type LoginFeatureSlide = {
  id: string;
  title: string;
  description: string;
  icon?: "drag" | "template" | "publish" | "lead" | "analytics" | "seo";
};

export const defaultLoginFeatureSlides: LoginFeatureSlide[] = [
  {
    id: "1",
    title: "Kéo thả xây dựng Landing Page",
    description: "Builder trực quan, không cần code. Kéo thả block, tùy chỉnh nội dung và giao diện trong vài phút.",
    icon: "drag",
  },
  {
    id: "2",
    title: "Hàng trăm template sẵn có",
    description: "Chọn từ thư viện template chuyên nghiệp theo ngành, sự kiện và mục tiêu campaign.",
    icon: "template",
  },
  {
    id: "3",
    title: "Publish & custom domain",
    description: "Xuất bản ngay, hosting miễn phí. Gắn domain riêng để tăng uy tín thương hiệu.",
    icon: "publish",
  },
  {
    id: "4",
    title: "Thu thập lead thông minh",
    description: "Form và popup thu thập lead tự động, đồng bộ với CRM và công cụ marketing.",
    icon: "lead",
  },
  {
    id: "5",
    title: "Analytics & conversion",
    description: "Theo dõi traffic, tỷ lệ chuyển đổi và hành vi khách truy cập trên từng trang.",
    icon: "analytics",
  },
  {
    id: "6",
    title: "SEO & hiệu năng tối ưu",
    description: "Tối ưu tốc độ tải, meta tag và cấu trúc trang để landing page thân thiện với công cụ tìm kiếm.",
    icon: "seo",
  },
];
