import { useState, useEffect } from "react";
import { fetchFormPresets, fetchFormTabs, FORM_TABS, type FormPreset } from "@/lib/editor/data/formData";

function FormPresetPreview({ preset }: { preset: FormPreset }) {
  const style = preset.inputStyle ?? "outlined";
  const btnBg = preset.buttonColor ?? "#1e293b";
  const btnText = preset.buttonTextColor ?? "#ffffff";
  const formBg = preset.backgroundColor ?? "#ffffff";
  const titleColor = preset.titleColor ?? "#1e293b";
  const borderRadius = preset.formBorderRadius ?? 8;
  const inputRadius = preset.inputRadius ?? 4;
  const accentColor = preset.accentColor ?? btnBg;

  const inputStyle: React.CSSProperties =
    style === "filled"
      ? { background: accentColor + "15", border: "none", borderRadius: inputRadius }
      : style === "underlined"
        ? {
            background: "transparent",
            border: "none",
            borderBottom: `1.5px solid ${accentColor}55`,
            borderRadius: 0,
          }
        : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: inputRadius };

  const isOtp = preset.formType === "otp";
  const isLogin = preset.formType === "login";
  const fieldCount = isOtp ? 1 : isLogin ? Math.min(preset.fields.length, 2) : Math.min(preset.fields.length, 2);

  return (
    <div
      style={{
        padding: "10px",
        borderRadius,
        background: formBg,
        border: `1px solid ${accentColor}22`,
        minHeight: 90,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {preset.title && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: titleColor,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {preset.title}
        </div>
      )}

      {isLogin && preset.fields.length > 1 ? (
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ flex: 1, height: 20, ...inputStyle }} />
          <div
            style={{
              width: 52,
              height: 20,
              borderRadius: inputRadius,
              background: btnBg,
              flexShrink: 0,
            }}
          />
        </div>
      ) : (
        <>
          {Array.from({ length: fieldCount }).map((_, i) => (
            <div key={i} style={{ height: 18, ...inputStyle }} />
          ))}

          {isOtp && (
            <div style={{ fontSize: 8, color: accentColor, textAlign: "center", opacity: 0.7 }}>
              Gửi lại mã OTP
            </div>
          )}

          <div
            style={{
              height: 22,
              borderRadius: inputRadius,
              background: btnBg,
              color: btnText,
              fontSize: 8,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            {preset.buttonText.length > 16 ? preset.buttonText.slice(0, 14) + "…" : preset.buttonText}
          </div>
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
  const [tabs, setTabs] = useState<string[]>(FORM_TABS);
  const [activeTab, setActiveTab] = useState(FORM_TABS[0]);
  const [allPresets, setAllPresets] = useState<FormPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [presets, loadedTabs] = await Promise.all([fetchFormPresets(), fetchFormTabs()]);
        if (!cancelled) {
          setAllPresets(presets);
          if (loadedTabs.length > 0) {
            setTabs(loadedTabs);
            setActiveTab(loadedTabs[0]);
          }
        }
      } catch (err) {
        if (!cancelled) setError("Không thể tải mẫu form. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const presets = allPresets.filter((p) => p.tabName === activeTab);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2.5 text-[11px] font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? "border-[#1e2d7d] text-[#1e2d7d]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-[11px] text-slate-400">
            Đang tải mẫu form...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <span className="text-[11px] text-red-500">{error}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); void fetchFormPresets().then(setAllPresets).finally(() => setLoading(false)); }}
              className="text-[10px] text-[#1e2d7d] underline"
            >
              Thử lại
            </button>
          </div>
        ) : presets.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[11px] text-slate-400">
            Không có mẫu form nào.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset)}
                className="text-left rounded-lg border border-transparent hover:border-[#1e2d7d]/40 hover:shadow-sm transition group"
              >
                <FormPresetPreview preset={preset} />
                <div className="px-1 py-1.5 text-[10px] text-slate-500 group-hover:text-[#1e2d7d] truncate font-medium transition">
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {(onBack || onClose) && (
        <div className="p-2 border-t border-slate-100 shrink-0 flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[11px] text-slate-500 hover:text-slate-700"
            >
              ← Quay lại
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-500 hover:text-slate-700 ml-auto"
            >
              Đóng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
