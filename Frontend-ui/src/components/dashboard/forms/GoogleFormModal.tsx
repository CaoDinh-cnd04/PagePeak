import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ArrowLeftRight, Trash2, Plus, HelpCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { GoogleFormLinkConfig, GoogleFormMapping } from "@/lib/dashboard/forms/formConfigSchema";
import { extractGoogleFormSubmitUrl } from "@/lib/dashboard/forms/formConfigSchema";

function randomId() {
  return `gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

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
  formName?: string;
  initialConfig: GoogleFormLinkConfig | null;
  onSave: (config: GoogleFormLinkConfig, name?: string) => Promise<void>;
  saving?: boolean;
  showNameField?: boolean;
};

export function GoogleFormModal({ open, onClose, formName, initialConfig, onSave, saving, showNameField }: Props) {
  const [newFormName, setNewFormName] = useState("Form Google");
  const [accountName, setAccountName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [mappings, setMappings] = useState<GoogleFormMapping[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const apiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setNewFormName("Form Google");
    if (initialConfig) {
      setAccountName(initialConfig.accountName);
      setApiUrl(initialConfig.apiUrl);
      setMappings(initialConfig.mappings.length > 0 ? initialConfig.mappings : defaultMappings());
    } else {
      setAccountName("");
      setApiUrl("");
      setMappings(defaultMappings());
    }
    setSyncStatus(null);
    setShowHowTo(false);
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
    if (!url) { apiInputRef.current?.focus(); return; }
    setSyncing(true);
    setSyncStatus(null);
    await new Promise((r) => setTimeout(r, 400));
    const submitUrl = extractGoogleFormSubmitUrl(url);
    if (submitUrl) {
      setSyncStatus({
        ok: true,
        msg: "URL hợp lệ. Điền entry ID cho từng trường bên dưới (ví dụ: entry.123456789). Xem hướng dẫn để biết cách lấy entry ID.",
      });
    } else {
      setSyncStatus({
        ok: false,
        msg: "URL không hợp lệ. Cần dạng: https://docs.google.com/forms/d/e/FORM_ID/viewform hoặc https://forms.gle/XXXX",
      });
    }
    setSyncing(false);
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
      { accountName, apiUrl, mappings, fetchedFields: [] },
      showNameField ? newFormName.trim() || "Form Google" : undefined,
    );
  };

  const canSave = !!apiUrl.trim() && (showNameField ? !!newFormName.trim() : true);
  const hasLinked = !!apiUrl.trim();
  const submitUrl = extractGoogleFormSubmitUrl(apiUrl);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition"
            aria-label="Quay lại">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <GoogleFormsIcon size={22} />
          <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Google Forms</span>
          {formName && <span className="text-xs text-slate-400 truncate max-w-[120px]">— {formName}</span>}
          <button type="button" onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Kết nối Google Forms để tự động gửi dữ liệu từ Landing Page vào Google Sheets khi khách điền form.
          </p>

          {/* Tên form (chỉ hiện khi tạo mới) */}
          {showNameField && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên cấu hình form</label>
              <input type="text" value={newFormName} onChange={(e) => setNewFormName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
                placeholder="Ví dụ: Form đăng ký Google" />
            </div>
          )}

          {/* Tên tài khoản liên kết */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tên tài khoản liên kết</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
              placeholder="Ví dụ: myaccount@gmail.com" />
          </div>

          {/* URL Google Form + nút Đồng bộ */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              URL Google Form
            </label>
            <p className="text-xs text-slate-400">
              Dán link Google Form dạng <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://docs.google.com/forms/d/e/…/viewform</code>
            </p>
            <div className="flex gap-2">
              <input
                ref={apiInputRef}
                type="url"
                value={apiUrl}
                onChange={(e) => { setApiUrl(e.target.value); setSyncStatus(null); }}
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6741D9]/25 focus:border-[#6741D9] transition"
                placeholder="https://docs.google.com/forms/d/e/FORM_ID/viewform"
              />
              <button type="button" onClick={handleSync} disabled={syncing || !apiUrl.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition shrink-0">
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {syncing ? "Đang…" : "Kiểm tra"}
              </button>
            </div>
            {syncStatus && (
              <p className={`text-xs leading-relaxed ${syncStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {syncStatus.ok ? "✓ " : "✗ "}{syncStatus.msg}
              </p>
            )}
            {submitUrl && (
              <p className="text-[11px] text-slate-400">
                Submit URL: <span className="font-mono text-slate-600 dark:text-slate-300 break-all">{submitUrl}</span>
              </p>
            )}
          </div>

          {/* Hướng dẫn lấy entry ID — collapsible */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHowTo((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition"
            >
              <span>Cách lấy entry ID từ Google Form</span>
              {showHowTo ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            {showHowTo && (
              <div className="px-4 pb-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Mở Google Form của bạn trong trình duyệt</li>
                  <li>Nhấn chuột phải vào trang → chọn <strong>Xem nguồn trang</strong> (View Page Source)</li>
                  <li>Nhấn <strong>Ctrl+F</strong> và tìm kiếm <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">entry.</code></li>
                  <li>Mỗi trường sẽ có một mã dạng <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">entry.123456789</code></li>
                  <li>Sao chép mã đó vào cột <strong>Entry ID</strong> bên dưới, khớp với tên trường tương ứng</li>
                </ol>
                <p className="pt-1 text-amber-700 dark:text-amber-400">
                  Ví dụ: trường "Họ tên" → <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">entry.123456789</code>
                </p>
              </div>
            )}
          </div>

          {/* Field mappings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Ánh xạ trường dữ liệu</p>
              <div className="flex gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                <span className="w-[120px]">Trường Landing Page</span>
                <span className="w-4" />
                <span>Entry ID (Google Form)</span>
              </div>
            </div>

            {mappings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                Chưa có trường nào. Nhấn "Thêm mới" để thêm.
              </p>
            ) : (
              <div className="space-y-2">
                {mappings.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    {/* Landing page field name */}
                    <input
                      type="text"
                      value={m.landingPageField}
                      onChange={(e) => updateMapping(m.id, { landingPageField: e.target.value })}
                      placeholder="Tên trường (vd: name)"
                      className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6741D9]/30 focus:border-[#6741D9] transition"
                    />

                    <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />

                    {/* Google Form entry ID — free-text input */}
                    <input
                      type="text"
                      value={m.googleFormField}
                      onChange={(e) => updateMapping(m.id, { googleFormField: e.target.value })}
                      placeholder="entry.123456789"
                      className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-1 focus:ring-[#6741D9]/30 focus:border-[#6741D9] transition"
                    />

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
                ))}
              </div>
            )}

            {/* Thêm trường */}
            <button type="button" onClick={addMapping}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition">
              <Plus className="w-4 h-4" />
              Thêm mới trường dữ liệu
            </button>
          </div>

          {/* Help */}
          <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Xem hướng dẫn chính thức về{" "}
              <a href="https://support.google.com/docs/answer/2839588" target="_blank" rel="noopener noreferrer"
                className="text-[#2563eb] hover:underline">Google Forms</a>
            </span>
          </div>

          {/* Trạng thái liên kết */}
          {hasLinked && (
            <div className="rounded-xl bg-[#6741D9]/5 border border-[#6741D9]/15 px-4 py-3 flex items-center gap-3">
              <GoogleFormsIcon size={18} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6741D9] truncate">Đã liên kết Google Form</p>
                <p className="text-[11px] text-slate-500 truncate">{apiUrl}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy bỏ</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !canSave} loading={saving}>
            {saving ? "Đang lưu…" : "Lưu lại"}
          </Button>
        </div>
      </div>
    </div>
  );
}
