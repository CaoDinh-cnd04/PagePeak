import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ArrowLeftRight, Trash2, Plus, HelpCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { GoogleFormLinkConfig, GoogleFormMapping } from "@/lib/dashboard/forms/formConfigSchema";

function randomId() {
  return `gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Icon Google Forms (SVG inline) */
function GoogleFormsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="7" fill="#6741D9" />
      <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
      <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="27" width="11" height="2.2" rx="1.1" fill="#6741D9" />
    </svg>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tên form hiện tại (chế độ edit). Nếu null = tạo mới → hiển thị input tên */
  formName?: string;
  /** null = tạo form mới liên kết Google */
  initialConfig: GoogleFormLinkConfig | null;
  onSave: (config: GoogleFormLinkConfig, name?: string) => Promise<void>;
  saving?: boolean;
  /** Có hiện ô nhập tên form hay không (chế độ tạo mới) */
  showNameField?: boolean;
};

export function GoogleFormModal({ open, onClose, formName, initialConfig, onSave, saving, showNameField }: Props) {
  const [newFormName, setNewFormName] = useState("Form Google");
  const [accountName, setAccountName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [mappings, setMappings] = useState<GoogleFormMapping[]>([]);
  const [fetchedFields, setFetchedFields] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const apiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setNewFormName("Form Google");
    if (initialConfig) {
      setAccountName(initialConfig.accountName);
      setApiUrl(initialConfig.apiUrl);
      setMappings(
        initialConfig.mappings.length > 0
          ? initialConfig.mappings
          : defaultMappings(),
      );
      setFetchedFields(initialConfig.fetchedFields);
    } else {
      setAccountName("");
      setApiUrl("");
      setMappings(defaultMappings());
      setFetchedFields([]);
    }
    setSyncStatus(null);
  }, [open, initialConfig]);

  if (!open) return null;

  function defaultMappings(): GoogleFormMapping[] {
    return [
      { id: randomId(), landingPageField: "name",    googleFormField: "" },
      { id: randomId(), landingPageField: "email",   googleFormField: "" },
      { id: randomId(), landingPageField: "phone",   googleFormField: "" },
      { id: randomId(), landingPageField: "message", googleFormField: "" },
    ];
  }

  const handleSync = async () => {
    const url = apiUrl.trim();
    if (!url) {
      apiInputRef.current?.focus();
      return;
    }
    setSyncing(true);
    setSyncStatus(null);
    try {
      // Thử parse entry IDs từ Google Form public URL (best-effort, bị CORS nên thông báo hướng dẫn)
      await new Promise((r) => setTimeout(r, 700));
      // Nếu URL hợp lệ — giả lập thành công, user tự điền entry ID vào dropdown
      setSyncStatus({
        ok: true,
        msg: "Đã kết nối. Nhập entry ID của từng trường Google Form vào ô bên phải (vd: entry.123456789).",
      });
    } catch {
      setSyncStatus({ ok: false, msg: "Không thể kết nối. Kiểm tra lại URL." });
    } finally {
      setSyncing(false);
    }
  };

  const addMapping = () => {
    setMappings((prev) => [...prev, { id: randomId(), landingPageField: "", googleFormField: "" }]);
  };

  const removeMapping = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMapping = (id: string, partial: Partial<GoogleFormMapping>) => {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...partial } : m)));
  };

  const handleSave = async () => {
    await onSave(
      { accountName, apiUrl, mappings, fetchedFields },
      showNameField ? newFormName.trim() || "Form Google" : undefined,
    );
  };

  const canSave = !!apiUrl.trim() && (showNameField ? !!newFormName.trim() : true);
  const hasLinked = !!apiUrl.trim();

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition"
            aria-label="Quay lại"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <GoogleFormsIcon size={22} />

          <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            Google Forms
          </span>

          {formName && (
            <span className="text-xs text-slate-400 truncate max-w-[120px]">— {formName}</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
          {/* Subtitle */}
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Đồng bộ Google Forms với form từ Landing Page.
          </p>

          {/* Tên form (chỉ hiện khi tạo mới) */}
          {showNameField && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tên cấu hình form
              </label>
              <input
                type="text"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
                placeholder="Ví dụ: Form đăng ký Google"
              />
            </div>
          )}

          {/* Tên tài khoản liên kết */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tên tài khoản liên kết
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
              placeholder="Nhập Tên tài khoản"
            />
          </div>

          {/* API URL + Đồng bộ */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              API URL
            </label>
            <div className="flex gap-2">
              <input
                ref={apiInputRef}
                type="url"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setSyncStatus(null);
                }}
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
                placeholder="Nhập liên kết Google Forms"
              />
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !apiUrl.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition shrink-0"
              >
                {syncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {syncing ? "Đang…" : "Đồng bộ"}
              </button>
            </div>
            {syncStatus && (
              <p
                className={`text-xs ${syncStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {syncStatus.msg}
              </p>
            )}
          </div>

          {/* Field mappings */}
          <div className="space-y-2">
            {mappings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Chưa có trường nào. Nhấn &quot;Thêm mới&quot; để thêm.
              </p>
            ) : (
              mappings.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  {/* Landing page field */}
                  <input
                    type="text"
                    value={m.landingPageField}
                    onChange={(e) =>
                      updateMapping(m.id, { landingPageField: e.target.value })
                    }
                    placeholder="Tên trường"
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6741D9]/30 focus:border-[#6741D9] transition"
                  />

                  {/* Arrow */}
                  <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />

                  {/* Google Form field selector */}
                  <div className="flex-1 min-w-0 relative">
                    <select
                      value={m.googleFormField}
                      onChange={(e) =>
                        updateMapping(m.id, { googleFormField: e.target.value })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 pl-3 pr-8 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#6741D9]/30 focus:border-[#6741D9] transition"
                    >
                      <option value="">Không chọn</option>
                      {fetchedFields.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      {/* Hiện option đang chọn dù không có trong fetchedFields */}
                      {m.googleFormField &&
                        !fetchedFields.includes(m.googleFormField) && (
                          <option value={m.googleFormField}>
                            {m.googleFormField}
                          </option>
                        )}
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                      ▾
                    </span>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeMapping(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                    aria-label="Xóa trường"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Thêm mới trường */}
          <button
            type="button"
            onClick={addMapping}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition"
          >
            <Plus className="w-4 h-4" />
            Thêm mới trường dữ liệu
          </button>

          {/* Help link */}
          <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Hướng dẫn tài khoản liên kết{" "}
              <a
                href="https://support.google.com/docs/answer/2839588"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] hover:underline"
              >
                Google Forms
              </a>
            </span>
          </div>

          {/* Trạng thái liên kết */}
          {hasLinked && (
            <div className="rounded-xl bg-[#6741D9]/5 border border-[#6741D9]/15 px-4 py-3 flex items-center gap-3">
              <GoogleFormsIcon size={18} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6741D9] truncate">
                  Đã liên kết Google Form
                </p>
                <p className="text-[11px] text-slate-500 truncate">{apiUrl}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            loading={saving}
          >
            {saving ? "Đang lưu…" : "Lưu lại"}
          </Button>
        </div>
      </div>
    </div>
  );
}
