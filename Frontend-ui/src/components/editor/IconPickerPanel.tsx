import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  ICON_CATEGORIES,
  ICON_DATA,
  searchIcons,
  type IconCategory,
  type IconItem,
} from "@/data/iconData";

export default function IconPickerPanel({
  onSelect,
  onClose,
  onBack,
}: {
  onSelect: (iconId: string, icon: IconItem) => void;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<IconCategory>("socials");
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const bySearch = searchIcons(search);
    return bySearch.filter((i) => i.category === activeTab);
  }, [search, activeTab]);

  const allFiltered = useMemo(() => searchIcons(search), [search]);

  const displayIcons = activeTab ? filteredIcons : allFiltered;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 shrink-0">
        {ICON_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={`px-2 py-1.5 text-[11px] font-medium rounded transition ${
              activeTab === cat.id
                ? "bg-[#1e2d7d] text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // Xem thêm - could open external icon library
          }}
          className="ml-auto text-[11px] text-[#1e2d7d] hover:underline"
        >
          Xem thêm
        </a>
      </div>

      <div className="p-2 border-b border-slate-100 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-2.5 pr-8 py-1.5 text-[11px] rounded border border-slate-200 bg-white"
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <div className="grid grid-cols-6 gap-1.5">
          {displayIcons.map((icon) => (
            <button
              key={icon.id}
              type="button"
              onClick={() => onSelect(icon.id, icon)}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-[#1e2d7d] hover:bg-slate-50 transition"
              title={icon.name}
            >
              <span
                className="text-lg leading-none mb-0.5"
                style={{
                  color: icon.color ?? "#64748b",
                  fontSize: icon.category === "socials" ? "14px" : "18px",
                }}
              >
                {icon.char}
              </span>
              <span className="text-[9px] text-slate-400 truncate w-full text-center">
                {icon.name.length > 6 ? icon.name.slice(0, 5) + "…" : icon.name}
              </span>
            </button>
          ))}
        </div>
        {displayIcons.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 py-8">
            Không tìm thấy biểu tượng
          </p>
        )}
      </div>
    </div>
  );
}
