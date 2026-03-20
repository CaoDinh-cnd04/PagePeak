import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  orders: "Đơn hàng",
  products: "Sản phẩm",
  customers: "Khách hàng",
  reports: "Báo cáo",
  forms: "Form",
  tags: "Tags",
  domains: "Domains",
  "data-leads": "Data Leads",
  integrations: "Tích hợp",
};

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const key = pathname.split("/").pop()?.split("?")[0] ?? "page";
  const title = TITLES[key] ?? "Trang";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          Trang <strong>{title}</strong> đang được phát triển. Vui lòng quay lại sau.
        </p>
      </div>
    </div>
  );
}
