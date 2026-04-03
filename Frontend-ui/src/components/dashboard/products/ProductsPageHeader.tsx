import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { useT } from "@/lib/shared/i18n";

type Props = {
  onAdd: () => void;
  onImportExport?: () => void;
};

export function ProductsPageHeader({ onAdd, onImportExport }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("menu.products")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">{t("products.ladiSubtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onImportExport}
          className="inline-flex items-center gap-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Upload className="w-4 h-4" />
          {t("products.importExport")}
        </Button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#5e35b1] hover:bg-[#512da8] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#5e35b1] focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {t("products.createNew")}
        </button>
      </div>
    </div>
  );
}
