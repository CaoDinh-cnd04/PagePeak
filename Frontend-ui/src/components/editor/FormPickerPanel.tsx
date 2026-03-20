import { useState } from "react";
import { FORM_PRESETS, FORM_TABS, type FormPreset } from "@/data/formData";

function FormPresetPreview({ preset }: { preset: FormPreset }) {
  const style = preset.inputStyle ?? "outlined";
  const inputCls = style === "filled"
    ? "bg-slate-100 border-0"
    : style === "underlined"
      ? "bg-transparent border-0 border-b-2 border-slate-800 rounded-none"
      : "bg-white border border-slate-300";
  return (
    <div className="p-3 rounded border border-slate-200 bg-white space-y-2 min-h-[80px]">
      {preset.title && (
        <div className="text-[10px] font-semibold text-slate-700 truncate">{preset.title}</div>
      )}
      {preset.formType === "login" ? (
        <div className="flex gap-1">
          <div className={`flex-1 h-6 rounded ${inputCls}`} />
          <div className="w-16 h-6 rounded bg-black shrink-0" />
        </div>
      ) : (
        <>
          {preset.fields.slice(0, preset.formType === "otp" ? 1 : 2).map((f) => (
            <div key={f.id} className={`h-5 rounded ${inputCls}`} />
          ))}
          <div className={`h-6 rounded ${preset.formType === "otp" ? "bg-black" : "bg-slate-800"}`} />
        </>
      )}
    </div>
  );
}

export default function FormPickerPanel({
  onSelect,
  onClose,
  onBack,
}: {
  onSelect: (preset: FormPreset) => void;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState(FORM_TABS[0]);
  const presets = FORM_PRESETS.filter((p) => p.tabName === activeTab);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
        {FORM_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2 text-[11px] font-medium transition border-b-2 ${
              activeTab === tab ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className="text-left rounded border border-transparent hover:border-[#1e2d7d] hover:bg-slate-50 transition"
            >
              <FormPresetPreview preset={preset} />
              <div className="px-2 pb-1 text-[10px] text-slate-500 truncate">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>

      {(onBack || onClose) && (
        <div className="p-2 border-t border-slate-100 shrink-0 flex gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="text-[11px] text-slate-500 hover:text-slate-700">
              ← Quay lại
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="text-[11px] text-slate-500 hover:text-slate-700 ml-auto">
              Đóng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
