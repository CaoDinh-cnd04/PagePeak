import { PricingSection } from "@/components/public/home/PricingSection";
import { useT } from "@/lib/shared/i18n";

/** Bảng giá / thanh toán nâng cấp trong dashboard — người dùng vẫn ở shell đã đăng nhập. */
export function DashboardPricingPage() {
  const t = useT();
  return (
    <div className="pb-8">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-2 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("settings.upgradeNow")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("dashboard.plansSubtitle")}</p>
      </div>
      <PricingSection />
    </div>
  );
}
