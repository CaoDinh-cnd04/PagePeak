import { Plus } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { useT } from "@/lib/shared/i18n";

type Props = {
  onAdd: () => void;
  onExportCsv?: () => void;
};

export function OrdersPageHeader({ onAdd, onExportCsv }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("orders.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{t("orders.subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {onExportCsv ? (
          <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
            {t("orders.exportCsv")}
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={onAdd} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("orders.addOrder")}
        </Button>
      </div>
    </div>
  );
}
