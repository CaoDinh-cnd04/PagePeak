import { useMemo, useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/stores/editorStore";
import { getLucideIcon } from "@/lib/iconMap";
import {
  UTILITY_HUB_CATEGORIES,
  UTILITY_EFFECT_ENTRIES,
  UTILITY_WIDGET_ENTRIES,
  UTILITY_INTEGRATION_ENTRIES,
  type UtilityHubCategory,
} from "@/lib/utilitiesCatalog";
import type { EditorElementType, UtilityEffectsSettings } from "@/types/editor";

type ToastType = "success" | "error" | "info";

type Props = {
  open: boolean;
  onClose: () => void;
  onAddElement: (elementType: EditorElementType) => void;
  /** Thông báo khi nhấn nút cấu hình tích hợp (placeholder) */
  onToast?: (message: string, type?: ToastType) => void;
};

function FxSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e2d7d] focus:ring-offset-2 ${
        checked ? "bg-[#1e2d7d]" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
        style={{ marginTop: "1px" }}
      />
    </button>
  );
}

export function UtilitiesHubModal({ open, onClose, onAddElement, onToast }: Props) {
  const pageSettings = useEditorStore((s) => s.pageSettings);
  const updatePageSettings = useEditorStore((s) => s.updatePageSettings);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const [activeCatId, setActiveCatId] = useState<string>("effects");

  const activeCategory = useMemo(
    () => UTILITY_HUB_CATEGORIES.find((c) => c.id === activeCatId) ?? UTILITY_HUB_CATEGORIES[0],
    [activeCatId],
  );

  const fx = pageSettings.utilityEffects ?? {};
  const toggles = pageSettings.utilityAppToggles ?? {};

  const setFx = (key: keyof UtilityEffectsSettings, value: boolean) => {
    pushHistory();
    updatePageSettings({
      utilityEffects: { ...fx, [key]: value },
    });
  };

  const setToggle = (appId: string, value: boolean) => {
    pushHistory();
    updatePageSettings({
      utilityAppToggles: { ...toggles, [appId]: value },
    });
  };

  const hint = (msg: string) => onToast?.(msg, "info");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative z-10 flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-[#e0e0e0] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="utilities-hub-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#e0e0e0] px-6 py-4 shrink-0 bg-gradient-to-r from-slate-50/90 to-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e2d7d] mb-1">Tiện ích</p>
            <h2 id="utilities-hub-title" className="text-lg font-bold text-slate-900">
              Thư viện tiện ích
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Chọn hiệu ứng toàn trang, thêm phần tử lên canvas, hoặc bật ứng dụng tích hợp. Thay đổi được lưu cùng trang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Cột trái — danh mục */}
          <aside className="w-56 shrink-0 border-r border-[#e0e0e0] bg-slate-50/80 overflow-y-auto">
            <div className="py-2 px-2 space-y-0.5">
              {UTILITY_HUB_CATEGORIES.map((cat: UtilityHubCategory) => {
                const active = activeCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCatId(cat.id)}
                    className={`w-full text-left rounded-lg px-3 py-3 text-[13px] border-l-[3px] transition flex items-start gap-2.5 ${
                      active
                        ? "border-[#1e2d7d] bg-white text-[#1e2d7d] font-semibold shadow-sm"
                        : "border-transparent text-slate-600 hover:bg-white/90"
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${active ? "text-[#1e2d7d]" : "text-slate-400"}`}>
                      {getLucideIcon(cat.navIcon, "w-4 h-4")}
                    </span>
                    <span className="leading-snug">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Cột phải */}
          <div className="min-w-0 flex-1 flex flex-col min-h-0 bg-white">
            <div className="border-b border-[#e0e0e0] px-6 py-3 shrink-0">
              <h3 className="font-semibold text-slate-900">{activeCategory.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{activeCategory.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              {activeCategory.kind === "effects" && (
                <div className="space-y-3 max-w-2xl">
                  {UTILITY_EFFECT_ENTRIES.map((e) => (
                    <div
                      key={e.id}
                      className="group flex items-start gap-4 rounded-xl border border-[#e0e0e0] bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm hover:border-[#1e2d7d]/25 transition-colors"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e2d7d]/8 text-[#1e2d7d]">
                        {getLucideIcon(e.icon, "w-5 h-5")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900">{e.name}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{e.description}</p>
                        {fx[e.id] && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đang hiển thị trên canvas & xem trước
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{fx[e.id] ? "Bật" : "Tắt"}</span>
                        <FxSwitch checked={!!fx[e.id]} onChange={(v) => setFx(e.id, v)} id={`fx-${e.id}`} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 leading-relaxed border-t border-dashed border-slate-200 pt-3">
                    Hiệu ứng hiển thị ngay trên vùng thiết kế và trong HTML khi xuất bản. Lớp phủ không chặn thao tác với phần tử.
                  </p>
                </div>
              )}

              {activeCategory.kind === "widgets" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {UTILITY_WIDGET_ENTRIES.map((w) => (
                    <div
                      key={w.id}
                      className="flex flex-col rounded-xl border border-[#e0e0e0] bg-white p-4 shadow-sm hover:shadow-md hover:border-[#1e2d7d]/20 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          {getLucideIcon(w.icon, "w-5 h-5")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{w.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{w.description}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full mt-auto bg-[#1e2d7d] hover:bg-[#162558] text-white text-xs"
                        onClick={() => {
                          onAddElement(w.elementType);
                          onClose();
                        }}
                      >
                        Sử dụng
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {activeCategory.kind === "integrations" && (
                <div className="space-y-3 max-w-2xl">
                  {UTILITY_INTEGRATION_ENTRIES.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl border border-[#e0e0e0] bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600">
                          {getLucideIcon(app.lucideIcon, "w-5 h-5")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg leading-none" aria-hidden>
                              {app.icon}
                            </span>
                            <p className="font-semibold text-sm text-slate-900">{app.name}</p>
                            {toggles[app.id] && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                Đã bật
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{app.description}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-slate-500">Kích hoạt</span>
                            <FxSwitch
                              checked={!!toggles[app.id]}
                              onChange={(v) => setToggle(app.id, v)}
                              id={`app-${app.id}`}
                            />
                            {app.primaryAction && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 border-slate-200"
                                title={app.primaryAction.hint}
                                onClick={() => hint(app.primaryAction!.hint)}
                              >
                                {app.primaryAction.label}
                              </Button>
                            )}
                            {app.secondaryAction && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8"
                                title={app.secondaryAction.hint}
                                onClick={() => hint(app.secondaryAction!.hint)}
                              >
                                {app.secondaryAction.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Cấu hình chi tiết API (khóa, domain) sẽ kết nối với workspace sau khi backend sẵn sàng. Trạng thái bật/tắt đã được lưu trong trang.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#e0e0e0] px-6 py-3 shrink-0 bg-slate-50/80">
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Mẹo: bật hiệu ứng rồi dùng <span className="font-medium text-slate-700">Xem trước</span> để kiểm tra toàn trang.
              </p>
              <Button type="button" className="bg-[#1e2d7d] hover:bg-[#162558] text-white text-sm ml-auto" onClick={onClose}>
                Hoàn tất
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
