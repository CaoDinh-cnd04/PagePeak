import { useState, useEffect } from "react";
import { loadLinePresets, type LinePreset } from "@/lib/editor/data/lineData";

function getPresetsForTabLocal(presets: LinePreset[], tab: string): LinePreset[] {
  return presets.filter((p) => !p.tab || p.tab === tab);
}

function LinePreview({ preset }: { preset: LinePreset }) {
  const isDouble = preset.style === "double";
  const dashArr = preset.dashArray ?? (preset.style === "dashed" ? [8, 4] : preset.style === "dotted" ? [2, 4] : undefined);
  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded border border-transparent hover:border-[#1e2d7d] hover:bg-slate-50 transition">
      <div className="flex-1 min-w-0 h-5 flex items-center">
        {isDouble ? (
          <div className="w-full flex flex-col justify-center gap-0.5">
            <div className="w-full rounded-full" style={{ height: Math.max(1, preset.thickness / 2), backgroundColor: preset.color }} />
            <div className="w-full rounded-full" style={{ height: Math.max(1, preset.thickness / 2), backgroundColor: preset.color }} />
          </div>
        ) : preset.style === "solid" ? (
          <div className="w-full rounded-full" style={{ height: preset.thickness, backgroundColor: preset.color }} />
        ) : (
          <svg width="100%" height={12} viewBox="0 0 200 12" preserveAspectRatio="none" className="block">
            <line
              x1="0"
              y1="6"
              x2="200"
              y2="6"
              stroke={preset.color}
              strokeWidth={preset.thickness}
              strokeDasharray={dashArr?.join(" ")}
            />
          </svg>
        )}
      </div>
      <span className="text-[10px] text-slate-500 shrink-0 w-5 text-right">{preset.thickness}</span>
    </div>
  );
}

export default function LinePickerPanel({
  onSelect,
  onClose,
  onBack,
}: {
  onSelect: (preset: LinePreset) => void;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"line" | "pen">("line");
  const [presets, setPresets] = useState<LinePreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinePresets()
      .then(setPresets)
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, []);

  const linePresets = getPresetsForTabLocal(presets, "line");
  const penPresets = getPresetsForTabLocal(presets, "pen");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("line")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded transition ${
            activeTab === "line" ? "bg-[#1e2d7d] text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Đường kẻ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pen")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded transition ${
            activeTab === "pen" ? "bg-[#1e2d7d] text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Pen Tool
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "line" ? (
          <div className="space-y-0.5">
            {linePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset)}
                className="w-full text-left rounded hover:bg-slate-50"
              >
                <LinePreview preset={preset} />
              </button>
            ))}
            {linePresets.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 py-8">Không có mẫu đường kẻ</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {penPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset)}
                className="w-full text-left rounded hover:bg-slate-50"
              >
                <LinePreview preset={preset} />
              </button>
            ))}
            {penPresets.length === 0 && (
              <div className="py-8 text-center text-[11px] text-slate-500">
                Pen Tool – vẽ đường tự do (sắp ra mắt)
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-100 flex items-center justify-center gap-2 shrink-0">
        <div className="flex gap-1">
          {["#000000", "#2563eb", "#16a34a", "#ea580c"].map((c) => (
            <div
              key={c}
              className="w-4 h-4 rounded border border-slate-200"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1 text-slate-400">
          <span className="w-4 h-4 flex items-center justify-center text-[10px]">—</span>
          <span className="w-4 h-4 flex items-center justify-center text-[10px]">- -</span>
          <span className="w-4 h-4 flex items-center justify-center text-[10px]">···</span>
        </div>
      </div>
    </div>
  );
}
