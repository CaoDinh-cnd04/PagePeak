/**
 * JSON mẫu cho preview sidebar / kéo thả — khớp nội dung mặc định khi thêm phần tử (editorStore ELEMENT_DEFAULTS).
 * Giữ đồng bộ khi đổi mẫu trong store.
 */
export const SIDEBAR_SAMPLE_PRODUCT_DETAIL = JSON.stringify({
  images: [
    "https://picsum.photos/seed/sweater-main/600/700",
    "https://picsum.photos/seed/sweater-2/600/700",
    "https://picsum.photos/seed/sweater-3/600/700",
    "https://picsum.photos/seed/sweater-4/600/700",
  ],
  title: "Áo sweater Local Brand Raglan Embossed City Cycle ní bông",
  price: "500.000đ",
  salePrice: "349.000đ",
  description: "Kiểu dáng áo Freesize cho 65kg trở xuống. Phù hợp cho cả nam cả nữ, chất liệu dày dặn.",
  badge: "-31%",
  rating: 4.9,
  reviewCount: 6523,
  totalSold: 30214,
  sku: "SW-RG-001",
  stockStatus: "limited",
  stockText: "Lượng tồn kho thấp",
  category: "Thời trang",
  tags: ["áo sweater", "local brand", "raglan"],
  features: [
    "Chất liệu ní bông cao cấp, dày dặn",
    "Freesize cho 65kg trở xuống",
    "Local Brand chính hãng",
  ],
  variants: [
    { label: "Kích cỡ", type: "size", options: ["S", "M", "L", "XL"] },
    { label: "Màu sắc", type: "color", options: ["Trắng kem", "Hồng đậu", "Xanh lá"] },
  ],
  quantity: 1,
  showQuantity: true,
  buyButtonText: "Mua ngay",
  addCartText: "Thêm vào giỏ hàng",
  layout: "horizontal",
  showRating: true,
  showFeatures: false,
  showVariants: true,
  showActions: true,
  showBadge: true,
  showDescription: true,
  accentColor: "#ee4d2d",
  buyButtonBgColor: "#ee4d2d",
  cartButtonBgColor: "#fff3f0",
  cardRadius: 4,
  imageRadius: 4,
});

export const SIDEBAR_SAMPLE_COLLECTION_LIST = JSON.stringify({
  columns: 3,
  gap: 10,
  cardRadius: 8,
  showBadge: true,
  showRating: true,
  showOriginalPrice: true,
  accentColor: "#ee4d2d",
  items: [
    { image: "https://picsum.photos/seed/fa1/400/400", title: "Áo Polo Basic Cotton Premium", price: "299.000đ", originalPrice: "450.000đ", badge: "-34%", rating: 4.5 },
    { image: "https://picsum.photos/seed/fa2/400/400", title: "Quần Jeans Slim Fit Cao Cấp", price: "499.000đ", originalPrice: "699.000đ", badge: "HOT", rating: 4.3 },
    { image: "https://picsum.photos/seed/fa3/400/400", title: "Giày Sneaker Trắng Classic", price: "890.000đ", originalPrice: "1.200.000đ", badge: "-26%", rating: 4.7 },
  ],
});
