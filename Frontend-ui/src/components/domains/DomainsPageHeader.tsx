import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

type Props = {
  showAddButton?: boolean;
  onAdd?: () => void;
};

export function DomainsPageHeader({ showAddButton, onAdd }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("domains.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{t("domains.subtitle")}</p>
      </div>
      {showAddButton && onAdd ? (
        <Button onClick={onAdd} className="inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          {t("domains.addDomain")}
        </Button>
      ) : null}
    </div>
  );
}
