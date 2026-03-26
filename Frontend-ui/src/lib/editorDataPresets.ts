/**
 * Mẫu dữ liệu có sẵn — người dùng chọn trong panel thuộc tính (không thay thế chỉnh tay sau đó).
 */

import type { BlogDetailData, BlogListData } from "@/lib/blogContent";

export type CollectionListPreset = {
  id: string;
  name: string;
  description: string;
  content: { columns: number; items: { image: string; title: string; price: string }[] };
  styles?: { backgroundColor?: string; borderRadius?: number };
};

/** Lưới sản phẩm — ảnh mẫu picsum (ổn định theo seed). */
export const COLLECTION_LIST_PRESETS: CollectionListPreset[] = [
  {
    id: "shop-3",
    name: "Cửa hàng 3 cột",
    description: "3 sản phẩm — layout phổ biến",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/cl1/400/400", title: "Áo Polo Basic", price: "299.000đ" },
        { image: "https://picsum.photos/seed/cl2/400/400", title: "Quần Jeans Slim", price: "499.000đ" },
        { image: "https://picsum.photos/seed/cl3/400/400", title: "Giày Sneaker", price: "890.000đ" },
      ],
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "grid-2",
    name: "Lưới 2 cột",
    description: "4 ô lớn — nổi bật từng món",
    content: {
      columns: 2,
      items: [
        { image: "https://picsum.photos/seed/g21/500/500", title: "Bộ sofa góc", price: "12.900.000đ" },
        { image: "https://picsum.photos/seed/g22/500/500", title: "Bàn trà kính", price: "3.200.000đ" },
        { image: "https://picsum.photos/seed/g23/500/500", title: "Đèn đứng", price: "1.150.000đ" },
        { image: "https://picsum.photos/seed/g24/500/500", title: "Thảm len", price: "2.490.000đ" },
      ],
    },
    styles: { backgroundColor: "#fafafa", borderRadius: 16 },
  },
  {
    id: "grid-4",
    name: "Lưới 4 cột",
    description: "8 ô nhỏ — nhiều SKU",
    content: {
      columns: 4,
      items: [
        { image: "https://picsum.photos/seed/41/300/300", title: "SP A", price: "99k" },
        { image: "https://picsum.photos/seed/42/300/300", title: "SP B", price: "129k" },
        { image: "https://picsum.photos/seed/43/300/300", title: "SP C", price: "159k" },
        { image: "https://picsum.photos/seed/44/300/300", title: "SP D", price: "189k" },
        { image: "https://picsum.photos/seed/45/300/300", title: "SP E", price: "199k" },
        { image: "https://picsum.photos/seed/46/300/300", title: "SP F", price: "219k" },
        { image: "https://picsum.photos/seed/47/300/300", title: "SP G", price: "249k" },
        { image: "https://picsum.photos/seed/48/300/300", title: "SP H", price: "279k" },
      ],
    },
    styles: { backgroundColor: "#ffffff", borderRadius: 8 },
  },
  {
    id: "fashion",
    name: "Thời trang",
    description: "Tên & giá gợi ý ngành may mặc",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/fa1/400/500", title: "Đầm maxi hoa", price: "659.000đ" },
        { image: "https://picsum.photos/seed/fa2/400/500", title: "Blazer xám", price: "899.000đ" },
        { image: "https://picsum.photos/seed/fa3/400/500", title: "Túi da mini", price: "429.000đ" },
      ],
    },
    styles: { backgroundColor: "#fff7ed", borderRadius: 14 },
  },
  {
    id: "tech",
    name: "Điện tử",
    description: "Phụ kiện & thiết bị",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/te1/400/400", title: "Tai nghe không dây", price: "1.990.000đ" },
        { image: "https://picsum.photos/seed/te2/400/400", title: "Sạc nhanh 65W", price: "450.000đ" },
        { image: "https://picsum.photos/seed/te3/400/400", title: "Chuột không dây", price: "320.000đ" },
      ],
    },
    styles: { backgroundColor: "#f0f9ff", borderRadius: 12 },
  },
  {
    id: "skeleton",
    name: "Một ô trống",
    description: "Chỉ 1 dòng — tự điền ảnh & giá",
    content: {
      columns: 3,
      items: [{ image: "", title: "Tên sản phẩm", price: "0đ" }],
    },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "empty",
    name: "Trống",
    description: "Không có ô — tự thêm sau",
    content: { columns: 3, items: [] },
    styles: { backgroundColor: "#f8fafc", borderRadius: 12 },
  },
  {
    id: "col-1-spotlight",
    name: "1 cột — nổi bật",
    description: "Một sản phẩm hero / landing",
    content: {
      columns: 1,
      items: [
        {
          image: "https://picsum.photos/seed/spot1/800/500",
          title: "Combo khai trương — giới hạn 50 suất",
          price: "Chỉ từ 1.990.000đ",
        },
      ],
    },
    styles: { backgroundColor: "#fef3c7", borderRadius: 16 },
  },
  {
    id: "beverage",
    name: "Đồ uống / cafe",
    description: "Trà, cà phê, chai nước",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/bev1/400/400", title: "Cold brew 500ml", price: "45.000đ" },
        { image: "https://picsum.photos/seed/bev2/400/400", title: "Trà đào cam sả", price: "39.000đ" },
        { image: "https://picsum.photos/seed/bev3/400/400", title: "Latte đá vừa", price: "55.000đ" },
      ],
    },
    styles: { backgroundColor: "#fffbeb", borderRadius: 14 },
  },
  {
    id: "food-snack",
    name: "Đồ ăn / snack",
    description: "Bánh, đồ khô, gói quà",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/fd1/400/400", title: "Hạt mix dinh dưỡng 250g", price: "129.000đ" },
        { image: "https://picsum.photos/seed/fd2/400/400", title: "Bánh quy bơ hộp", price: "89.000đ" },
        { image: "https://picsum.photos/seed/fd3/400/400", title: "Set quà Tết mini", price: "350.000đ" },
      ],
    },
    styles: { backgroundColor: "#fff7ed", borderRadius: 12 },
  },
  {
    id: "books",
    name: "Sách / khoá học",
    description: "Bìa sách, gói học online",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/bk1/400/520", title: "Marketing từ con số 0", price: "199.000đ" },
        { image: "https://picsum.photos/seed/bk2/400/520", title: "Thiết kế UI cho người mới", price: "259.000đ" },
        { image: "https://picsum.photos/seed/bk3/400/520", title: "Khoá Excel nâng cao", price: "449.000đ" },
      ],
    },
    styles: { backgroundColor: "#f0fdf4", borderRadius: 12 },
  },
  {
    id: "mom-baby",
    name: "Mẹ và bé",
    description: "Đồ dùng trẻ em",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/mb1/400/400", title: "Bỉm quần size M", price: "265.000đ" },
        { image: "https://picsum.photos/seed/mb2/400/400", title: "Sữa bột 800g", price: "520.000đ" },
        { image: "https://picsum.photos/seed/mb3/400/400", title: "Xe đẩy gấp gọn", price: "2.190.000đ" },
      ],
    },
    styles: { backgroundColor: "#fdf2f8", borderRadius: 14 },
  },
  {
    id: "sports",
    name: "Thể thao / gym",
    description: "Dụng cụ tập, phụ kiện",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/sp1/400/400", title: "Tạ tay 5kg (cặp)", price: "320.000đ" },
        { image: "https://picsum.photos/seed/sp2/400/400", title: "Thảm yoga TPE", price: "189.000đ" },
        { image: "https://picsum.photos/seed/sp3/400/400", title: "Bình nước thể thao 750ml", price: "95.000đ" },
      ],
    },
    styles: { backgroundColor: "#ecfdf5", borderRadius: 12 },
  },
  {
    id: "flash-sale",
    name: "Flash sale",
    description: "Giá gốc gạch + giá KM",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/fs1/400/400", title: "Tai nghe (SL có hạn)", price: "~~799k~~ 399k" },
        { image: "https://picsum.photos/seed/fs2/400/400", title: "Loa bluetooth mini", price: "~~599k~~ 299k" },
        { image: "https://picsum.photos/seed/fs3/400/400", title: "Đồng hồ thông minh", price: "~~1,99tr~~ 990k" },
      ],
    },
    styles: { backgroundColor: "#fef2f2", borderRadius: 12 },
  },
  {
    id: "premium-dark",
    name: "Cao cấp (nền tối)",
    description: "Trang sức, đồng hồ, quà tặng",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/pr1/400/400", title: "Vòng tay bạc 925", price: "1.450.000đ" },
        { image: "https://picsum.photos/seed/pr2/400/400", title: "Đồng hồ quartz", price: "3.200.000đ" },
        { image: "https://picsum.photos/seed/pr3/400/400", title: "Hộp quà cao cấp", price: "890.000đ" },
      ],
    },
    styles: { backgroundColor: "#1e293b", borderRadius: 16 },
  },
  {
    id: "green-eco",
    name: "Xanh / eco",
    description: "Sản phẩm thân thiện môi trường",
    content: {
      columns: 3,
      items: [
        { image: "https://picsum.photos/seed/ec1/400/400", title: "Túi vải canvas", price: "75.000đ" },
        { image: "https://picsum.photos/seed/ec2/400/400", title: "Ống hút inox + cọ", price: "45.000đ" },
        { image: "https://picsum.photos/seed/ec3/400/400", title: "Bộ đồ dùng tre", price: "210.000đ" },
      ],
    },
    styles: { backgroundColor: "#ecfccb", borderRadius: 12 },
  },
];

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

export const PRODUCT_DETAIL_PRESETS: ProductDetailPreset[] = [
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
];

export type CartPreset = {
  id: string;
  name: string;
  description: string;
  /** Chuỗi JSON đầy đủ cho content của element cart */
  contentJson: string;
  styles?: { backgroundColor?: string; borderRadius?: number };
};

export const CART_PRESETS: CartPreset[] = [
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
];

/** --- Blog (code-first, đồng bộ BlogListData / BlogDetailData) --- */

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
