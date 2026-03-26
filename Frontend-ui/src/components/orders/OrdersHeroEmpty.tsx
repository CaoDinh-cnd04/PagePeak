import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { OrdersIllustration } from "@/components/orders/OrdersIllustration";

type Props = {
  onCreate: () => void;
};

export function OrdersHeroEmpty({ onCreate }: Props) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-8 p-8 md:p-10">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50">{t("orders.heroTitle")}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 max-w-lg leading-relaxed">{t("orders.heroDesc")}</p>
          <Button type="button" size="sm" className="mt-6" onClick={onCreate}>
            {t("orders.heroCta")}
          </Button>
        </div>
        <div className="flex justify-center md:justify-end shrink-0">
          <OrdersIllustration className="w-full max-w-[280px] h-auto text-indigo-100 dark:text-indigo-900/30" />
        </div>
      </div>
    </div>
  );
}
