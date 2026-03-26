import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (domainName: string) => Promise<void>;
  saving: boolean;
};

export function CreateDomainModal({ open, onClose, onSubmit, saving }: Props) {
  const t = useT();
  const [domainName, setDomainName] = useState("");

  useEffect(() => {
    if (open) setDomainName("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;
    await onSubmit(domainName.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="domain-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("domains.createDomain")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
            aria-label={t("domains.cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("domains.platform")}</label>
            <select
              disabled
              title={t("domains.platformComingSoon")}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 text-sm cursor-not-allowed"
              value=""
            >
              <option value="">{t("domains.platformPlaceholder")}</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">{t("domains.platformComingSoon")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("domains.domainName")}</label>
            <input
              type="text"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder={t("domains.domainPlaceholder")}
              autoFocus
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("domains.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !domainName.trim()} loading={saving}>
              {saving ? t("domains.saving") : t("domains.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
