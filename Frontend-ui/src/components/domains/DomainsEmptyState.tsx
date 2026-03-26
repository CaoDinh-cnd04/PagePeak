import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { DomainsIllustration } from "./DomainsIllustration";

type Props = {
  onCreate: () => void;
};

export function DomainsEmptyState({ onCreate }: Props) {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 p-8 lg:p-10">
        <div className="flex-1 max-w-xl">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("domains.emptyTitle")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{t("domains.emptyDesc")}</p>
          <Button onClick={onCreate} className="mt-6 inline-flex items-center gap-2">
            {t("domains.createDomain")}
          </Button>
        </div>
        <div className="flex justify-center lg:justify-end shrink-0 w-full lg:w-auto max-w-[min(100%,420px)] mx-auto lg:mx-0">
          <DomainsIllustration className="w-full max-w-[400px] h-auto text-slate-100 dark:text-slate-800/80" />
        </div>
      </div>
    </div>
  );
}
