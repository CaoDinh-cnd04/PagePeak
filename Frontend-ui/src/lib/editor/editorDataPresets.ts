/**
 * Mẫu dữ liệu Blog — dùng cho blog template catalog (BlogSidebarPanel).
 * Các preset khác (collection-list, product-detail, carousel, cart) đã chuyển lên SQL Server DB.
 */

import type { BlogDetailData, BlogListData } from "@/lib/editor/blogContent";

// ─── Kept for blogTemplateCatalog.ts / BlogSidebarPanel.tsx ──────────────────

export type CLItem = {
  image: string;
  title: string;
  price: string;
  originalPrice?: string;
  badge?: string;
  rating?: number;
};

export type CLContent = {
  columns: number;
  gap?: number;
  cardRadius?: number;
  showBadge?: boolean;
  showRating?: boolean;
  showOriginalPrice?: boolean;
  accentColor?: string;
  items: CLItem[];
};

export type CollectionListPreset = {
  id: string;
  name: string;
  description: string;
  content: CLContent;
  styles?: { backgroundColor?: string; borderRadius?: number };
};

/** @deprecated Data đã chuyển lên SQL Server DB. */
export const COLLECTION_LIST_PRESETS: CollectionListPreset[] = [];
const _CL_UNUSED = [
  {
    id: "fashion-3",
    name: "Thời trang 3 cột",
    description: "Áo, quần, phụ kiện — badge sale",
    content: {
      columns: 3, gap: 10, cardRadius: 8, showBadge: true, showRating: true, showOriginalPrice: true,
      accentColor: "#e11d48",
      items: [
        { image: "https://picsum.photos/seed/fa1/400/400", title: "Áo Polo Basic Cotton", price: "299.000đ", originalPrice: "450.000đ", badge: "-34%", rating: 4.5 },
        { image: "https://picsum.photos/seed/fa2/400/400", title: "Quần Jeans Slim Fit", price: "499.000đ", originalPrice: "699.000đ", badge: "HOT", rating: 4.3 },
        { image: "https://picsum.photos/seed/fa3/400/400", title: "Giày Sneaker Trắng", price: "890.000đ", originalPrice: "1.200.000đ", badge: "-26%", rating: 4.7 },
      ],
    },
    styles: { backgroundColor: "#fff7f0", borderRadius: 12 },
  },
  {
    id: "tech-3",
    name: "Điện tử 3 cột",
    description: "Tai nghe, sạc, phụ kiện công nghệ",
    content: {
      columns: 3, gap: 10, cardRadius: 8, showBadge: true, showRating: true, showOriginalPrice: true,
      accentColor: "#2563eb",
      items: [
        { image: "https://picsum.photos/seed/te1/400/400", title: "Tai nghe Bluetooth ANC", price: "1.990.000đ", originalPrice: "2.990.000đ", badge: "-33%", rating: 4.8 },
        { image: "https://picsum.photos/seed/te2/400/400", title: "Sạc nhanh 65W GaN", price: "450.000đ", originalPrice: "650.000đ", badge: "Mới", rating: 4.6 },
        { image: "https://picsum.photos/seed/te3/400/400", title: "Chuột không dây Ergo", price: "320.000đ", originalPrice: "480.000đ", badge: "-33%", rating: 4.4 },
      ],
    },
    styles: { backgroundColor: "#eff6ff", borderRadius: 12 },
  },
  {
    id: "food-3",
    name: "Thực phẩm 3 cột",
    description: "Đồ ăn, đồ uống, đặc sản",
    content: {
      columns: 3, gap: 10, cardRadius: 10, showBadge: true, showRating: true, showOriginalPrice: false,
      accentColor: "#ea580c",
      items: [
        { image: "https://picsum.photos/seed/fd1/400/400", title: "Hạt điều rang muối 500g", price: "129.000đ", badge: "Best Seller", rating: 4.9 },
        { image: "https://picsum.photos/seed/fd2/400/400", title: "Cà phê Arabica nguyên hạt 500g", price: "185.000đ", badge: "Đặc sản", rating: 4.7 },
        { image: "https://picsum.photos/seed/fd3/400/400", title: "Mật ong rừng nguyên chất 350ml", price: "220.000đ", badge: "Organic", rating: 4.8 },
      ],
    },
    styles: { backgroundColor: "#fff7ed", borderRadius: 12 },
  },
  {
    id: "beauty-3",
    name: "Mỹ phẩm 3 cột",
    description: "Serum, kem dưỡng, chăm sóc da",
    content: {
      columns: 3, gap: 10, cardRadius: 12, showBadge: true, showRating: true, showOriginalPrice: true,
      accentColor: "#db2777",
      items: [
        { image: "https://picsum.photos/seed/bea1/400/400", title: "Serum Vitamin C 20% Brightening", price: "590.000đ", originalPrice: "890.000đ", badge: "-34%", rating: 4.7 },
        { image: "https://picsum.photos/seed/bea2/400/400", title: "Kem dưỡng ẩm Hyaluronic", price: "420.000đ", originalPrice: "620.000đ", badge: "Mới", rating: 4.5 },
        { image: "https://picsum.photos/seed/bea3/400/400", title: "Tẩy trang dạng dầu 200ml", price: "280.000đ", originalPrice: "380.000đ", badge: "-26%", rating: 4.6 },
      ],
    },
    styles: { backgroundColor: "#fdf2f8", borderRadius: 14 },
  },
  {
    id: "grid-2-furniture",
    name: "Nội thất 2 cột",
    description: "4 món đồ nội thất nổi bật",
    content: {
      columns: 2, gap: 12, cardRadius: 10, showBadge: true, showRating: false, showOriginalPrice: true,
      accentColor: "#0ea5e9",
      items: [
        { image: "https://picsum.photos/seed/fu1/500/500", title: "Bàn làm việc gỗ tự nhiên 120cm", price: "3.200.000đ", originalPrice: "4.500.000đ", badge: "Sale" },
        { image: "https://picsum.photos/seed/fu2/500/500", title: "Ghế văn phòng Ergonomic lưới", price: "2.990.000đ", originalPrice: "4.200.000đ", badge: "-29%" },
        { image: "https://picsum.photos/seed/fu3/500/500", title: "Kệ sách treo tường 5 tầng", price: "890.000đ", originalPrice: "1.200.000đ", badge: "Mới" },
        { image: "https://picsum.photos/seed/fu4/500/500", title: "Đèn bàn LED cảm ứng dimmer", price: "450.000đ", originalPrice: "680.000đ", badge: "-34%" },
      ],
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "flash-sale",
    name: "Flash Sale",
    description: "Giá gốc + giá khuyến mãi",
    content: {
      columns: 3, gap: 8, cardRadius: 8, showBadge: true, showRating: true, showOriginalPrice: true,
      accentColor: "#dc2626",
      items: [
        { image: "https://picsum.photos/seed/fs1/400/400", title: "Tai nghe TWS chống ồn", price: "399.000đ", originalPrice: "799.000đ", badge: "-50%", rating: 4.4 },
        { image: "https://picsum.photos/seed/fs2/400/400", title: "Loa Bluetooth Portable", price: "299.000đ", originalPrice: "599.000đ", badge: "-50%", rating: 4.2 },
        { image: "https://picsum.photos/seed/fs3/400/400", title: "Đồng hồ thông minh Sport", price: "990.000đ", originalPrice: "1.990.000đ", badge: "-50%", rating: 4.5 },
      ],
    },
    styles: { backgroundColor: "#fef2f2", borderRadius: 12 },
  },
  {
    id: "premium-dark",
    name: "Cao cấp (nền tối)",
    description: "Trang sức, đồng hồ sang trọng",
    content: {
      columns: 3, gap: 10, cardRadius: 10, showBadge: false, showRating: true, showOriginalPrice: false,
      accentColor: "#f59e0b",
      items: [
        { image: "https://picsum.photos/seed/pr1/400/400", title: "Vòng tay bạc 925 đính đá", price: "1.450.000đ", rating: 4.9 },
        { image: "https://picsum.photos/seed/pr2/400/400", title: "Đồng hồ cơ sapphire", price: "8.900.000đ", rating: 4.8 },
        { image: "https://picsum.photos/seed/pr3/400/400", title: "Nhẫn vàng 14K tự nhiên", price: "3.200.000đ", rating: 4.7 },
      ],
    },
    styles: { backgroundColor: "#0f172a", borderRadius: 14 },
  },
  {
    id: "grid-4-mini",
    name: "Lưới 4 cột nhỏ",
    description: "8 sản phẩm — nhiều SKU",
    content: {
      columns: 4, gap: 8, cardRadius: 6, showBadge: true, showRating: false, showOriginalPrice: true,
      accentColor: "#7c3aed",
      items: [
        { image: "https://picsum.photos/seed/m1/300/300", title: "Bút máy cao cấp", price: "199.000đ", originalPrice: "290.000đ", badge: "-31%" },
        { image: "https://picsum.photos/seed/m2/300/300", title: "Sổ da A5 ép nổi", price: "159.000đ", originalPrice: "230.000đ", badge: "Mới" },
        { image: "https://picsum.photos/seed/m3/300/300", title: "Bộ highlight 6 màu", price: "89.000đ", originalPrice: "130.000đ", badge: "-31%" },
        { image: "https://picsum.photos/seed/m4/300/300", title: "Hộp đựng bút nhôm", price: "129.000đ", originalPrice: "190.000đ", badge: "Sale" },
        { image: "https://picsum.photos/seed/m5/300/300", title: "Bộ tem dán sáng tạo", price: "45.000đ", originalPrice: "70.000đ", badge: "-36%" },
        { image: "https://picsum.photos/seed/m6/300/300", title: "Clip giữ sổ kim loại", price: "35.000đ", badge: "Mới" },
        { image: "https://picsum.photos/seed/m7/300/300", title: "Bộ viết vẽ watercolor", price: "249.000đ", originalPrice: "350.000đ", badge: "-29%" },
        { image: "https://picsum.photos/seed/m8/300/300", title: "Notebook dotted 160tr", price: "185.000đ", badge: "Hot" },
      ],
    },
    styles: { backgroundColor: "#faf5ff", borderRadius: 10 },
  },
]; void _CL_UNUSED;

export type ProductDetailPreset = {
  id: string;
  name: string;
  description: string;
  content: {
    images: string[];
    title: string;
    price: string;
    salePrice: string;
    description: string;
    badge: string;
  };
  styles?: { backgroundColor?: string; borderRadius?: number };
};

/** @deprecated Data đã chuyển lên SQL Server DB. */
export const PRODUCT_DETAIL_PRESETS: ProductDetailPreset[] = [];
const _PD_UNUSED = [
  {
    id: "fashion-pd",
    name: "Thời trang",
    description: "Giá gốc + KM + badge",
    content: {
      images: ["https://picsum.photos/seed/pdf1/600/600"],
      title: "Áo khoác gió Unisex",
      price: "1.290.000đ",
      salePrice: "990.000đ",
      description: "Chất liệu chống nước, nhẹ, phù hợp đi làm và du lịch. Có 3 màu: đen, be, navy.",
      badge: "Giảm 23%",
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "digital-pd",
    name: "Khoá học / gói",
    description: "Sản phẩm số, không cần ship",
    content: {
      images: ["https://picsum.photos/seed/pdd1/600/400"],
      title: "Gói Pro — 12 tháng",
      price: "2.400.000đ",
      salePrice: "1.900.000đ",
      description: "Truy cập toàn bộ khóa học, chứng chỉ online, hỗ trợ ưu tiên qua email.",
      badge: "Bán chạy",
    },
    styles: { backgroundColor: "#fafafa", borderRadius: 16 },
  },
  {
    id: "minimal-pd",
    name: "Tối giản",
    description: "Một ảnh, một giá",
    content: {
      images: ["https://picsum.photos/seed/pdm1/500/500"],
      title: "Sản phẩm của bạn",
      price: "0đ",
      salePrice: "",
      description: "Thay mô tả ngắn tại đây.",
      badge: "",
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 8 },
  },
  {
    id: "cosmetic-pd",
    name: "Mỹ phẩm",
    description: "Mô tả dưỡng da / thành phần",
    content: {
      images: ["https://picsum.photos/seed/pdc1/500/500"],
      title: "Serum Vitamin C 30ml",
      price: "650.000đ",
      salePrice: "520.000đ",
      description: "Sáng da, giảm thâm. Dùng sáng và tối sau bước toner.",
      badge: "Mới",
    },
    styles: { backgroundColor: "#fffbeb", borderRadius: 12 },
  },
  {
    id: "food-pd",
    name: "Đồ ăn / đặc sản",
    description: "Khối lượng, hạn sử dụng",
    content: {
      images: ["https://picsum.photos/seed/pdff/600/600"],
      title: "Set quà đặc sản 6 món",
      price: "450.000đ",
      salePrice: "380.000đ",
      description: "Gồm mứt, trà, bánh — đóng gói hộp quà. HSD: 6 tháng. Giao toàn quốc.",
      badge: "Freeship",
    },
    styles: { backgroundColor: "#fff7ed", borderRadius: 12 },
  },
  {
    id: "furniture-pd",
    name: "Nội thất",
    description: "Kích thước, vật liệu",
    content: {
      images: ["https://picsum.photos/seed/pdfur/700/500"],
      title: "Kệ sách 5 tầng gỗ MDF",
      price: "2.800.000đ",
      salePrice: "2.390.000đ",
      description: "Kích thước 80×30×180cm. Màu walnut. Lắp ráp tại nhà miễn phí nội thành.",
      badge: "-15%",
    },
    styles: { backgroundColor: "#fafaf9", borderRadius: 14 },
  },
  {
    id: "ebook-pd",
    name: "Ebook / template",
    description: "Tải PDF, không ship",
    content: {
      images: ["https://picsum.photos/seed/pdeb/600/800"],
      title: "Bộ template Notion — Quản lý dự án",
      price: "299.000đ",
      salePrice: "199.000đ",
      description: "File PDF + link duplicate. Cập nhật miễn phí 12 tháng. Hỗ trợ qua email trong 48h.",
      badge: "Digital",
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "saas-pd",
    name: "Phần mềm / SaaS",
    description: "Gói theo tháng — nêu rõ tính năng",
    content: {
      images: ["https://picsum.photos/seed/pdsaas/640/400"],
      title: "Business — 10 người dùng",
      price: "990.000đ/tháng",
      salePrice: "",
      description: "Không giới hạn dự án, tích hợp Slack, báo cáo nâng cao. Hủy bất kỳ lúc nào.",
      badge: "Dùng thử 14 ngày",
    },
    styles: { backgroundColor: "#eff6ff", borderRadius: 16 },
  },
  {
    id: "single-price-pd",
    name: "Một giá (không KM)",
    description: "Chỉ một mức giá, không badge",
    content: {
      images: ["https://picsum.photos/seed/pds1/500/500"],
      title: "Gói tư vấn 1:1 — 60 phút",
      price: "500.000đ",
      salePrice: "",
      description: "Video call Zoom, ghi chú và checklist gửi sau buổi. Đặt lịch trong 24h.",
      badge: "",
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "b2b-pd",
    name: "B2B / số lượng lớn",
    description: "Liên hệ báo giá",
    content: {
      images: ["https://picsum.photos/seed/pdb2b/600/450"],
      title: "Hộp carton 5 lớp — theo đơn",
      price: "Liên hệ",
      salePrice: "",
      description: "In logo, MOQ 500 cái. Giao trong 7–10 ngày làm việc. VAT có hóa đơn đỏ.",
      badge: "B2B",
    },
    styles: { backgroundColor: "#f1f5f9", borderRadius: 10 },
  },
]; void _PD_UNUSED;

export type CartPreset = {
  id: string;
  name: string;
  description: string;
  /** Chuỗi JSON đầy đủ cho content của element cart */
  contentJson: string;
  styles?: { backgroundColor?: string; borderRadius?: number };
};

/** @deprecated Data đã chuyển lên SQL Server DB. */
export const CART_PRESETS: CartPreset[] = [];
const _CART_UNUSED = [
  {
    id: "demo-2",
    name: "Giỏ demo",
    description: "2 món + nút thanh toán",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Giỏ hàng trống",
      checkoutButtonText: "Thanh toán",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Sản phẩm A", price: "299.000đ", qty: 1, image: "https://picsum.photos/seed/ca1/80/80" },
        { title: "Sản phẩm B", price: "150.000đ", qty: 2, image: "https://picsum.photos/seed/ca2/80/80" },
      ],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "mini",
    name: "Mini giỏ",
    description: "1 dòng gọn",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Chưa có món",
      checkoutButtonText: "Xem giỏ",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [{ title: "Túi tote canvas", price: "189.000đ", qty: 1, image: "https://picsum.photos/seed/ca3/80/80" }],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 10 },
  },
  {
    id: "empty-cart",
    name: "Chỉ thông báo trống",
    description: "Nhấn mạnh CTA khi chưa có hàng",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Bạn chưa thêm sản phẩm nào.",
      checkoutButtonText: "Tiếp tục mua sắm",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "cart-3-items",
    name: "Giỏ 3 món",
    description: "Giỏ đầy — kiểm tra tổng",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Giỏ hàng trống",
      checkoutButtonText: "Đặt hàng",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Áo thun cotton", price: "199.000đ", qty: 1, image: "https://picsum.photos/seed/cart31/80/80" },
        { title: "Quần short thể thao", price: "259.000đ", qty: 1, image: "https://picsum.photos/seed/cart32/80/80" },
        { title: "Vớ cổ ngắn (lố 3 đôi)", price: "89.000đ", qty: 2, image: "https://picsum.photos/seed/cart33/80/80" },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "cart-high-qty",
    name: "Số lượng lớn",
    description: "1 SP — qty cao (đặt sỉ)",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Giỏ hàng trống",
      checkoutButtonText: "Thanh toán",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [{ title: "Chai nước suối 500ml (thùng 24)", price: "120.000đ", qty: 10, image: "https://picsum.photos/seed/cartq/80/80" }],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "cart-usd",
    name: "Giá USD",
    description: "Khoá học / dịch vụ quốc tế",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Your cart is empty",
      checkoutButtonText: "Checkout",
      currency: "USD",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Course: Landing page 101", price: "$49", qty: 1, image: "https://picsum.photos/seed/cartu1/80/80" },
        { title: "Template pack (10 files)", price: "$19", qty: 1, image: "https://picsum.photos/seed/cartu2/80/80" },
      ],
    }),
    styles: { backgroundColor: "#fafafa", borderRadius: 14 },
  },
  {
    id: "cart-no-image",
    name: "Không ảnh thumb",
    description: "Chỉ tên + giá + SL",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Chưa có sản phẩm",
      checkoutButtonText: "Hoàn tất",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Phí vận chuyển nội thành", price: "30.000đ", qty: 1, image: "" },
        { title: "Gói bảo hành mở rộng 12 tháng", price: "150.000đ", qty: 1, image: "" },
      ],
    }),
    styles: { backgroundColor: "#f1f5f9", borderRadius: 10 },
  },
  {
    id: "cart-subscription",
    name: "Gói định kỳ",
    description: "2 dòng — gợi ý subscription",
    contentJson: JSON.stringify({
      dataSource: "static",
      emptyMessage: "Chưa đăng ký gói nào",
      checkoutButtonText: "Kích hoạt gói",
      currency: "VND",
      showThumbnail: true,
      showQty: true,
      items: [
        { title: "Gói Basic — thanh toán tháng", price: "199.000đ/tháng", qty: 1, image: "https://picsum.photos/seed/carts1/80/80" },
        { title: "Phí kích hoạt một lần", price: "0đ", qty: 1, image: "https://picsum.photos/seed/carts2/80/80" },
      ],
    }),
    styles: { backgroundColor: "#eef2ff", borderRadius: 12 },
  },
]; void _CART_UNUSED;

/** --- Blog (còn dùng bởi blogTemplateCatalog.ts / BlogSidebarPanel.tsx) --- */

export type BlogListPreset = {
  id: string;
  name: string;
  description: string;
  content: BlogListData;
  styles?: { backgroundColor?: string; borderRadius?: number; fontSize?: number };
};

/** Tối thiểu 3 mẫu danh sách bài — người dùng chọn trong panel. */
export const BLOG_LIST_PRESETS: BlogListPreset[] = [
  {
    id: "bl-magazine-3",
    name: "Magazine 3 cột",
    description: "3 bài nổi bật — ảnh + tiêu đề + mô tả",
    content: {
      columns: 3,
      posts: [
        {
          image: "https://picsum.photos/seed/blm1/500/320",
          title: "10 xu hướng landing page 2025",
          excerpt: "Tối ưu chuyển đổi với layout rõ ràng và CTA đơn giản.",
          date: "12/03/2025",
        },
        {
          image: "https://picsum.photos/seed/blm2/500/320",
          title: "Cách viết headline không bị “sáo”",
          excerpt: "Gợi ý công thức AIDA áp dụng cho từng ngành.",
          date: "08/03/2025",
        },
        {
          image: "https://picsum.photos/seed/blm3/500/320",
          title: "Checklist SEO trước khi publish",
          excerpt: "Meta, schema, tốc độ tải — làm từng bước.",
          date: "01/03/2025",
        },
      ],
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 14, fontSize: 14 },
  },
  {
    id: "bl-news-2",
    name: "Tin tức 2 cột",
    description: "4 bài dạng lưới — phù hợp blog công ty",
    content: {
      columns: 2,
      posts: [
        {
          image: "https://picsum.photos/seed/bln1/480/280",
          title: "Cập nhật sản phẩm tháng 3",
          excerpt: "Tính năng mới và lộ trình phát hành.",
          date: "18/03/2025",
        },
        {
          image: "https://picsum.photos/seed/bln2/480/280",
          title: "Mở đăng ký webinar miễn phí",
          excerpt: "Chủ đề: tăng lead với form đa bước.",
          date: "15/03/2025",
        },
        {
          image: "https://picsum.photos/seed/bln3/480/280",
          title: "Chính sách bảo mật — có gì mới?",
          excerpt: "Tóm tắt thay đổi cho người dùng.",
          date: "10/03/2025",
        },
        {
          image: "https://picsum.photos/seed/bln4/480/280",
          title: "Đối tác & khách hàng tiêu biểu",
          excerpt: "Case study ngắn từ 3 doanh nghiệp.",
          date: "05/03/2025",
        },
      ],
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 12, fontSize: 14 },
  },
  {
    id: "bl-minimal-1",
    name: "Tối giản 1 cột",
    description: "2 bài lớn — phù hợp newsletter / blog cá nhân",
    content: {
      columns: 1,
      posts: [
        {
          image: "https://picsum.photos/seed/bls1/800/360",
          title: "Góc nhìn: vì sao ít chữ lại bán được hơn?",
          excerpt: "Khi người đọc chỉ lướt 8 giây, bạn cần một thông điệp trụ cột.",
          date: "20/03/2025",
        },
        {
          image: "https://picsum.photos/seed/bls2/800/360",
          title: "Template email mở rate 40%+",
          excerpt: "Chia sẻ subject line và khung nội dung đã test.",
          date: "14/03/2025",
        },
      ],
    },
    styles: { backgroundColor: "#fafafa", borderRadius: 16, fontSize: 15 },
  },
];

export type BlogDetailPreset = {
  id: string;
  name: string;
  description: string;
  content: BlogDetailData;
  styles?: { backgroundColor?: string; borderRadius?: number; fontSize?: number };
};

/** 3 mẫu chi tiết bài — cùng schema BlogDetailData. */
export const BLOG_DETAIL_PRESETS: BlogDetailPreset[] = [
  {
    id: "bd-long",
    name: "Bài dài / có HTML",
    description: "Tiêu đề + meta + nhiều đoạn",
    content: {
      title: "Hướng dẫn tối ưu trang đích cho chiến dịch quảng cáo",
      author: "Team Marketing",
      date: "19/03/2025",
      body:
        "<p>Đoạn mở đầu thu hút: nêu vấn đề và lợi ích trong 2–3 câu.</p>" +
        "<p><strong>Mục 1.</strong> Phân tích đối tượng và thông điệp chính.</p>" +
        "<p><strong>Mục 2.</strong> Cấu trúc section: hero → bằng chứng → CTA.</p>" +
        "<p>Kết luận: kêu gọi hành động rõ ràng (đăng ký / tải / mua).</p>",
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 12, fontSize: 15 },
  },
  {
    id: "bd-news",
    name: "Tin ngắn",
    description: "Bài báo gọn — 1 intro + bullet",
    content: {
      title: "Ra mắt tính năng xuất PDF từ editor",
      author: "Sản phẩm",
      date: "17/03/2025",
      body:
        "Chúng tôi vừa bổ sung xuất PDF một click cho bản preview trang.\n\n" +
        "• Giữ nguyên font và khoảng cách\n" +
        "• Hỗ trợ khổ A4 và letter\n" +
        "• Tối ưu dung lượng file",
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12, fontSize: 14 },
  },
  {
    id: "bd-minimal",
    name: "Tối giản",
    description: "Chỉ tiêu đề + đoạn mẫu — thay nội dung dễ dàng",
    content: {
      title: "Tiêu đề bài viết của bạn",
      author: "Tác giả",
      date: "—",
      body: "Thay đoạn dẫn và nội dung chi tiết tại đây. Có thể dùng văn bản thuần hoặc HTML tùy nhu cầu.",
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 8, fontSize: 15 },
  },
];

// ─── CAROUSEL PRESETS ────────────────────────────────────────────────────────

export type CarouselPreset = {
  id: string;
  name: string;
  description: string;
  /** JSON string cho content của element carousel */
  contentJson: string;
  styles?: { backgroundColor?: string; borderRadius?: number };
};

/** @deprecated Data đã chuyển lên SQL Server DB. */
export const CAROUSEL_PRESETS: CarouselPreset[] = [];
const _CAR_UNUSED = [
  {
    id: "testimonial-3",
    name: "Nhận xét khách hàng",
    description: "3 testimonial — avatar + quote + tên",
    contentJson: JSON.stringify({
      layoutType: "testimonial",
      carouselStyle: { autoplayMs: 4000, quoteAlign: "center", nameAlign: "center" },
      items: [
        {
          avatar: "https://picsum.photos/seed/av1/120/120",
          quote: "Sản phẩm chất lượng tuyệt vời, tôi đã mua nhiều lần và không bao giờ thất vọng. Giao hàng nhanh, đóng gói cẩn thận!",
          name: "Nguyễn Thị Lan",
          role: "Khách hàng thân thiết",
        },
        {
          avatar: "https://picsum.photos/seed/av2/120/120",
          quote: "Dịch vụ hỗ trợ rất nhiệt tình, team phản hồi nhanh và giải quyết vấn đề triệt để. Rất hài lòng!",
          name: "Trần Văn Minh",
          role: "CEO — StartUp ABC",
        },
        {
          avatar: "https://picsum.photos/seed/av3/120/120",
          quote: "Tôi đặc biệt ấn tượng với UX/UI của sản phẩm, rất dễ dùng ngay cả với người không rành công nghệ.",
          name: "Phạm Hoàng Yến",
          role: "Designer tự do",
        },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 16 },
  },
  {
    id: "media-products",
    name: "Banner sản phẩm",
    description: "3 slide ảnh + tên + mô tả ngắn",
    contentJson: JSON.stringify({
      layoutType: "media",
      carouselStyle: { autoplayMs: 3500, titleAlign: "center", descAlign: "center" },
      items: [
        {
          image: "https://picsum.photos/seed/cp1/800/400",
          title: "Bộ sưu tập Xuân Hè 2025",
          desc: "Nhẹ nhàng, tươi sáng — ra mắt 01/05",
        },
        {
          image: "https://picsum.photos/seed/cp2/800/400",
          title: "Flash Sale cuối tuần",
          desc: "Giảm đến 50% — chỉ từ thứ Sáu đến Chủ Nhật",
        },
        {
          image: "https://picsum.photos/seed/cp3/800/400",
          title: "Freeship toàn quốc",
          desc: "Đơn hàng từ 300.000đ — không cần mã",
        },
      ],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 12 },
  },
  {
    id: "team-members",
    name: "Đội ngũ",
    description: "Giới thiệu thành viên — ảnh + chức vụ",
    contentJson: JSON.stringify({
      layoutType: "testimonial",
      carouselStyle: { autoplayMs: 5000, nameAlign: "center", roleAlign: "center", quoteAlign: "center" },
      items: [
        {
          avatar: "https://picsum.photos/seed/tm1/200/200",
          name: "Lê Quang Hùng",
          role: "Giám đốc điều hành (CEO)",
          quote: "10+ năm kinh nghiệm trong lĩnh vực công nghệ và phát triển sản phẩm số.",
        },
        {
          avatar: "https://picsum.photos/seed/tm2/200/200",
          name: "Hoàng Minh Châu",
          role: "Giám đốc Marketing (CMO)",
          quote: "Chuyên gia growth hacking — đã giúp 30+ thương hiệu tăng trưởng 3X.",
        },
        {
          avatar: "https://picsum.photos/seed/tm3/200/200",
          name: "Vũ Thanh Tùng",
          role: "Trưởng phòng Kỹ thuật (CTO)",
          quote: "Full-stack developer với đam mê xây dựng hệ thống mạnh mẽ và bền vững.",
        },
        {
          avatar: "https://picsum.photos/seed/tm4/200/200",
          name: "Ngô Phương Linh",
          role: "UI/UX Designer",
          quote: "Tin rằng trải nghiệm người dùng tốt là nền tảng của mọi sản phẩm thành công.",
        },
      ],
    }),
    styles: { backgroundColor: "#f0f9ff", borderRadius: 14 },
  },
  {
    id: "services",
    name: "Dịch vụ nổi bật",
    description: "Liệt kê dịch vụ dạng media — icon + mô tả",
    contentJson: JSON.stringify({
      layoutType: "media",
      carouselStyle: { autoplayMs: 4500, titleAlign: "center", descAlign: "center" },
      items: [
        {
          image: "https://picsum.photos/seed/sv1/600/300",
          title: "Thiết kế Landing Page",
          desc: "Giao diện chuyên nghiệp, tối ưu chuyển đổi — bàn giao trong 48h.",
        },
        {
          image: "https://picsum.photos/seed/sv2/600/300",
          title: "Chạy quảng cáo Google/Meta",
          desc: "ROAS tối thiểu 3x — cam kết báo cáo hàng tuần minh bạch.",
        },
        {
          image: "https://picsum.photos/seed/sv3/600/300",
          title: "Tư vấn chiến lược số",
          desc: "Lộ trình 90 ngày cho doanh nghiệp muốn bứt phá doanh thu online.",
        },
      ],
    }),
    styles: { backgroundColor: "#fafafa", borderRadius: 12 },
  },
  {
    id: "partners-logos",
    name: "Đối tác / Logo",
    description: "Hiển thị logo đối tác theo dạng media",
    contentJson: JSON.stringify({
      layoutType: "media",
      carouselStyle: { autoplayMs: 2500 },
      items: [
        { image: "https://picsum.photos/seed/lo1/400/200", title: "Đối tác A", desc: "" },
        { image: "https://picsum.photos/seed/lo2/400/200", title: "Đối tác B", desc: "" },
        { image: "https://picsum.photos/seed/lo3/400/200", title: "Đối tác C", desc: "" },
        { image: "https://picsum.photos/seed/lo4/400/200", title: "Đối tác D", desc: "" },
      ],
    }),
    styles: { backgroundColor: "#ffffff", borderRadius: 8 },
  },
  {
    id: "blog-highlights",
    name: "Bài viết nổi bật",
    description: "Carousel bài blog — ảnh + tiêu đề",
    contentJson: JSON.stringify({
      layoutType: "media",
      carouselStyle: { autoplayMs: 5000, titleAlign: "center", descAlign: "center" },
      items: [
        {
          image: "https://picsum.photos/seed/bl1/700/350",
          title: "10 xu hướng landing page 2025",
          desc: "Tối ưu chuyển đổi với layout rõ ràng và CTA đơn giản.",
        },
        {
          image: "https://picsum.photos/seed/bl2/700/350",
          title: "Cách viết headline không bị 'sáo'",
          desc: "Gợi ý công thức AIDA áp dụng cho từng ngành.",
        },
        {
          image: "https://picsum.photos/seed/bl3/700/350",
          title: "Checklist SEO trước khi publish",
          desc: "Meta, schema, tốc độ tải — làm từng bước.",
        },
      ],
    }),
    styles: { backgroundColor: "#f8fafc", borderRadius: 14 },
  },
  {
    id: "testimonial-minimal",
    name: "Nhận xét tối giản",
    description: "Không ảnh — chỉ quote + tên + vai trò",
    contentJson: JSON.stringify({
      layoutType: "testimonial",
      carouselStyle: { autoplayMs: 6000, quoteColor: "#1e293b", nameColor: "#6366f1", quoteAlign: "center" },
      items: [
        { quote: "Đây là lần đầu tôi tìm được dịch vụ đúng kỳ vọng ngay lần đầu tiên!", name: "Khách hàng A", role: "" },
        { quote: "Tôi đã tiết kiệm được rất nhiều thời gian nhờ giải pháp này.", name: "Khách hàng B", role: "Manager" },
        { quote: "Recommend 100% cho ai đang cần giải pháp nhanh và hiệu quả.", name: "Khách hàng C", role: "Freelancer" },
      ],
    }),
    styles: { backgroundColor: "#eff6ff", borderRadius: 16 },
  },
  {
    id: "one-slide-hero",
    name: "1 slide (Hero banner)",
    description: "Chỉ một ảnh nền lớn — thay ảnh dễ dàng",
    contentJson: JSON.stringify({
      layoutType: "media",
      carouselStyle: { autoplayMs: 999999 },
      items: [
        {
          image: "https://picsum.photos/seed/hero1/900/400",
          title: "Tiêu đề chính của bạn",
          desc: "Mô tả ngắn thu hút — kêu gọi hành động rõ ràng.",
        },
      ],
    }),
    styles: { backgroundColor: "#1e293b", borderRadius: 12 },
  },
]; void _CAR_UNUSED;
