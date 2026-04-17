import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { fetchFontList, loadGoogleFont } from "@/lib/editor/fontLoader";

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fonts, setFonts] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tải danh sách font từ backend (Bunny Fonts proxy) — chỉ 1 lần
    void fetchFontList().then(setFonts);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fonts.filter((f) => f.toLowerCase().includes(q));
  }, [search, fonts]);

  useEffect(() => {
    if (!open) return;
    const visible = filtered.slice(0, 20);
    visible.forEach((f) => void loadGoogleFont(f));
  }, [open, filtered]);

  const handleSelect = (font: string) => {
    void loadGoogleFont(font);
    onChange(font);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-400 transition"
        style={{ fontFamily: value }}
      >
        <span className="truncate">{value || "Chọn font"}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800">
              <Search className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm font..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {fonts.length === 0 ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {filtered.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => handleSelect(font)}
                    onMouseEnter={() => void loadGoogleFont(font)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-500/10 transition flex items-center justify-between ${
                      value === font ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700" : "text-slate-700 dark:text-slate-200"
                    }`}
                    style={{ fontFamily: font }}
                  >
                    <span className="truncate">{font}</span>
                    {value === font && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy font</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
