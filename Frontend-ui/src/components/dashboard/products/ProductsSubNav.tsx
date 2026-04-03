import type { ReactNode } from "react";
import { Box, LayoutGrid, Tag, Package, Star, SlidersHorizontal } from "lucide-react";
import { useT } from "@/lib/shared/i18n";

const NAV: { tab: number; i18nKey: string; icon: ReactNode }[] = [
  { tab: 1, i18nKey: "products.sideNav.products", icon: <Box className="w-4 h-4 shrink-0" /> },
  { tab: 2, i18nKey: "sub.categories", icon: <LayoutGrid className="w-4 h-4 shrink-0" /> },
  { tab: 3, i18nKey: "sub.tags", icon: <Tag className="w-4 h-4 shrink-0" /> },
  { tab: 4, i18nKey: "products.sideNav.warehouse", icon: <Package className="w-4 h-4 shrink-0" /> },
  { tab: 5, i18nKey: "products.sideNav.reviews", icon: <Star className="w-4 h-4 shrink-0" /> },
  { tab: 6, i18nKey: "products.sideNav.customFields", icon: <SlidersHorizontal className="w-4 h-4 shrink-0" /> },
];

type Props = {
  activeTab: number;
  onSelect: (tab: number) => void;
};

export function ProductsSubNav({ activeTab, onSelect }: Props) {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("products.subNavTitle")}</p>
      </div>
      <nav className="p-2 flex flex-row lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
        {NAV.map(({ tab, i18nKey, icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap lg:whitespace-normal ${
                active
                  ? "bg-[#5e35b1]/12 dark:bg-[#5e35b1]/20 text-[#5e35b1] dark:text-[#c4b5fd]"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <span className={active ? "text-[#5e35b1] dark:text-[#a78bfa]" : "text-slate-400"}>{icon}</span>
              {t(i18nKey)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
