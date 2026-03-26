import { CATEGORY_ICONS, Filter } from "./templateLibraryConstants";

type Props = {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
};

export function TemplateCategoryChips({ categories, selectedCategory, onSelectCategory }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectCategory("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            !selectedCategory
              ? "bg-primary-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-600"
          }`}
        >
          {CATEGORY_ICONS["Tất cả"]}
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => onSelectCategory(cat === selectedCategory ? "" : cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-600"
            }`}
          >
            {CATEGORY_ICONS[cat] ?? <Filter className="w-4 h-4" />}
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
