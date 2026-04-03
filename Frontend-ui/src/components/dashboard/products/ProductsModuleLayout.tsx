import type { ReactNode } from "react";

/** Cùng pattern với đơn hàng: sidebar trái + nội dung (kiểu LadiPage). */
export function ProductsModuleLayout({ subNav, children }: { subNav: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 max-w-[1400px] mx-auto px-4 sm:px-0 pb-12">
      <aside className="lg:w-56 shrink-0 lg:pt-1">{subNav}</aside>
      <div className="flex-1 min-w-0 space-y-6">{children}</div>
    </div>
  );
}
