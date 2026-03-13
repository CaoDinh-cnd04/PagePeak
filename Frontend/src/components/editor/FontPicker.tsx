"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { GOOGLE_FONTS, loadGoogleFont } from "@/lib/fontLoader";

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const visible = filtered.slice(0, 20);
    visible.forEach((f) => loadGoogleFont(f));
  }, [open, filtered]);

  const handleSelect = (font: string) => {
    loadGoogleFont(font);
    onChange(font);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 transition"
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
            {filtered.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => handleSelect(font)}
                onMouseEnter={() => loadGoogleFont(font)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition flex items-center justify-between ${
                  value === font ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700" : "text-slate-700 dark:text-slate-200"
                }`}
                style={{ fontFamily: font }}
              >
                <span className="truncate">{font}</span>
                {value === font && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy font</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
