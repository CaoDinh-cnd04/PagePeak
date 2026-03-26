import { Trash2, Globe } from "lucide-react";
import { DomainStatusBadge } from "./DomainStatusBadge";
import { useT } from "@/lib/i18n";

export type DomainRow = {
  id: number;
  domainName: string;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
};

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type Props = {
  rows: DomainRow[];
  onDelete: (id: number) => void;
};

export function DomainsTable({ rows, onDelete }: Props) {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("domains.colDomain")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t("domains.colStatus")}</th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                {t("domains.colCreated")}
              </th>
              <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                {t("domains.colVerified")}
              </th>
              <th className="p-3 text-right font-semibold text-slate-600 dark:text-slate-300 w-24">{t("domains.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{d.domainName}</span>
                  </div>
                </td>
                <td className="p-3">
                  <DomainStatusBadge status={d.status} />
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap hidden lg:table-cell">
                  {formatDt(d.createdAt)}
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap hidden xl:table-cell">
                  {d.verifiedAt ? formatDt(d.verifiedAt) : "—"}
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(d.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition inline-flex"
                    aria-label={t("domains.deleteConfirm")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((d) => (
          <li key={d.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{d.domainName}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <DomainStatusBadge status={d.status} />
                  <span className="text-xs text-slate-400">{formatDt(d.createdAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(d.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
