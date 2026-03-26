import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { DomainsIllustration } from "./DomainsIllustration";

export function DomainsUpgradeGate() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 overflow-hidden shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 p-8 lg:p-10">
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Pro</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("domains.upgradeTitle")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{t("domains.upgradeDesc")}</p>
          <Button onClick={() => navigate("/dashboard/settings?tab=billing")} className="mt-6 inline-flex items-center gap-2">
            {t("domains.upgradeCta")}
          </Button>
        </div>
        <div className="flex justify-center lg:justify-end shrink-0 opacity-90">
          <DomainsIllustration className="w-full max-w-[400px] h-auto text-slate-100 dark:text-slate-800/80" />
        </div>
      </div>
    </div>
  );
}
