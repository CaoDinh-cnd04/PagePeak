/** JSON cho phần tử `cart` — đồng bộ canvas, preview HTML, panel. */

export type CartLineItem = {
  productId?: number;
  title: string;
  price: string;
  qty?: number;
  image?: string;
};

export type CartContentData = {
  /** static: dùng `items` mẫu; catalog: hiển thị theo `productIds` (snapshot tên/giá lưu khi chỉnh hoặc fetch khi xem) */
  dataSource?: "static" | "catalog";
  productIds?: number[];
  items?: CartLineItem[];
  emptyMessage?: string;
  checkoutButtonText?: string;
  currency?: string;
  showThumbnail?: boolean;
  showQty?: boolean;
};

const DEFAULT_ITEMS: CartLineItem[] = [
  { title: "Sản phẩm A", price: "299.000đ", qty: 1, image: "" },
  { title: "Sản phẩm B", price: "150.000đ", qty: 2, image: "" },
];

export function parseCartContent(content: string | undefined): CartContentData {
  try {
    const p = JSON.parse(content || "{}");
    if (p && typeof p === "object") {
      const dataSource = p.dataSource === "catalog" ? "catalog" : "static";
      const productIds = Array.isArray(p.productIds)
        ? (p.productIds as unknown[]).map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n > 0)
        : [];
      const items = Array.isArray(p.items)
        ? (p.items as unknown[])
            .filter((x) => x && typeof x === "object")
            .map((x) => {
              const o = x as Record<string, unknown>;
              return {
                productId: typeof o.productId === "number" ? o.productId : o.ProductId != null ? Number(o.ProductId) : undefined,
                title: String(o.title ?? o.Title ?? ""),
                price: String(o.price ?? o.Price ?? ""),
                qty: typeof o.qty === "number" ? o.qty : o.Qty != null ? Number(o.Qty) : 1,
                image: typeof o.image === "string" ? o.image : typeof o.Image === "string" ? o.Image : "",
              } satisfies CartLineItem;
            })
        : [];
      return {
        dataSource,
        productIds,
        items: items.length ? items : undefined,
        emptyMessage: typeof p.emptyMessage === "string" ? p.emptyMessage : undefined,
        checkoutButtonText: typeof p.checkoutButtonText === "string" ? p.checkoutButtonText : undefined,
        currency: typeof p.currency === "string" ? p.currency : undefined,
        showThumbnail: p.showThumbnail !== false,
        showQty: p.showQty !== false,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    dataSource: "static",
    items: DEFAULT_ITEMS,
    emptyMessage: "Giỏ hàng trống",
    checkoutButtonText: "Thanh toán",
    currency: "VND",
    showThumbnail: true,
    showQty: true,
  };
}

export function getCartDisplayItems(data: CartContentData): CartLineItem[] {
  const base = data.items?.length ? data.items : DEFAULT_ITEMS;
  if (data.dataSource === "catalog" && data.productIds?.length) {
    const byId = new Map(base.filter((x) => x.productId != null).map((x) => [x.productId as number, x]));
    return data.productIds.map((id) => {
      const row = byId.get(id);
      return row ?? { productId: id, title: `Sản phẩm #${id}`, price: "—", qty: 1, image: "" };
    });
  }
  return base;
}
