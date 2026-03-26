import { Truck } from "lucide-react";
import { useT } from "@/lib/i18n";

export function OrdersDeliveryTab() {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#5e35b1]/10 flex items-center justify-center shrink-0">
          <Truck className="w-6 h-6 text-[#5e35b1]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("orders.deliveryTitle")}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{t("orders.deliveryDesc")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc list-inside">
            <li>{t("orders.deliveryBullet1")}</li>
            <li>{t("orders.deliveryBullet2")}</li>
            <li>{t("orders.deliveryBullet3")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
