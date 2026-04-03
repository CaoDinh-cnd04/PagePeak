import { MAIN_TABS, EXTRA_TABS } from "./templateLibraryConstants";

type MainTabId = (typeof MAIN_TABS)[number]["id"];

type Props = {
  activeTab: string;
  onTabChange: (id: MainTabId) => void;
};

export function TemplateMainTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
      <div className="border-b border-slate-200 bg-white/80 rounded-t-lg px-1 -mb-px">
        <div className="flex flex-wrap gap-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          {EXTRA_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              title={tab.disabled ? "Sắp ra mắt" : undefined}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 cursor-not-allowed opacity-70"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
