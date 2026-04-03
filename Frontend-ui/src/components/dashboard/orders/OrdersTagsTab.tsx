import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { useT } from "@/lib/shared/i18n";
import { loadOrderTags, saveOrderTags, type OrderTagDraft } from "@/lib/dashboard/orders/orderModuleStorage";

function newId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type Props = { workspaceId: number | null };

export function OrdersTagsTab({ workspaceId }: Props) {
  const t = useT();
  const [tags, setTags] = useState<OrderTagDraft[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#5e35b1");

  const persist = useCallback(
    (next: OrderTagDraft[]) => {
      setTags(next);
      if (workspaceId != null) saveOrderTags(workspaceId, next);
    },
    [workspaceId],
  );

  useEffect(() => {
    if (workspaceId == null) {
      setTags([]);
      return;
    }
    setTags(loadOrderTags(workspaceId));
  }, [workspaceId]);

  const add = () => {
    const n = name.trim();
    if (!n || workspaceId == null) return;
    persist([...tags, { id: newId(), name: n, color }]);
    setName("");
  };

  const remove = (id: string) => {
    persist(tags.filter((x) => x.id !== id));
  };

  if (workspaceId == null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("orders.workspaceError")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("orders.tagsTitle")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{t("orders.tagsDesc")}</p>
        <p className="text-xs text-slate-400 mt-2">{t("orders.tagsSavedLocal")}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col sm:flex-row sm:flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t("orders.tagsName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            placeholder="VIP, Gấp, …"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t("orders.tagsColor")}</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" />
        </div>
        <Button type="button" size="sm" onClick={add} className="inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          {t("orders.tagsAdd")}
        </Button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">{t("orders.tagsEmpty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-slate-800 dark:text-slate-100">{tag.name}</span>
              <button
                type="button"
                onClick={() => remove(tag.id)}
                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                aria-label={t("orders.tagsDelete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
