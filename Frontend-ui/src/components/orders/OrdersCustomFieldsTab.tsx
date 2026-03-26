import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { loadOrderCustomFields, saveOrderCustomFields, type OrderCustomFieldDraft } from "@/lib/orderModuleStorage";

function newId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type Props = { workspaceId: number | null };

export function OrdersCustomFieldsTab({ workspaceId }: Props) {
  const t = useT();
  const [fields, setFields] = useState<OrderCustomFieldDraft[]>([]);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<OrderCustomFieldDraft["type"]>("text");

  const persist = useCallback(
    (next: OrderCustomFieldDraft[]) => {
      setFields(next);
      if (workspaceId != null) saveOrderCustomFields(workspaceId, next);
    },
    [workspaceId],
  );

  useEffect(() => {
    if (workspaceId == null) {
      setFields([]);
      return;
    }
    setFields(loadOrderCustomFields(workspaceId));
  }, [workspaceId]);

  const add = () => {
    const l = label.trim();
    if (!l || workspaceId == null) return;
    persist([...fields, { id: newId(), label: l, type }]);
    setLabel("");
  };

  const remove = (id: string) => {
    persist(fields.filter((x) => x.id !== id));
  };

  if (workspaceId == null) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("orders.workspaceError")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("orders.customFieldsTitle")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{t("orders.customFieldsDesc")}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col sm:flex-row sm:flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t("orders.customFieldsLabel")}</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t("orders.customFieldsType")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as OrderCustomFieldDraft["type"])}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="text">{t("orders.customFieldsTypeText")}</option>
            <option value="number">{t("orders.customFieldsTypeNumber")}</option>
            <option value="select">{t("orders.customFieldsTypeSelect")}</option>
          </select>
        </div>
        <Button type="button" size="sm" onClick={add} className="inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          {t("orders.customFieldsAdd")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">{t("orders.customFieldsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{f.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.type}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                aria-label={t("orders.tagsDelete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
