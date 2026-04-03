import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useT } from "@/lib/shared/i18n";

export function DomainStatusBadge({ status }: { status: string }) {
  const t = useT();
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
        <CheckCircle className="w-3 h-3 hidden sm:inline" />
        {t("domains.statusActive")}
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <AlertCircle className="w-3 h-3" />
        {t("domains.statusError")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
      <Clock className="w-3 h-3 hidden sm:inline" />
      {t("domains.statusPending")}
    </span>
  );
}
