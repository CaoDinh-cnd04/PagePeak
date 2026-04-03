import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { useT } from "@/lib/shared/i18n";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (p: number) => void;
};

export function OrdersPagination({ page, pageSize, totalCount, onPageChange }: Props) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
      <span>
        {t("orders.page")} {safePage} {t("orders.of")} {totalPages} · {totalCount} {t("orders.total")}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("orders.prev")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1"
        >
          {t("orders.next")}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
