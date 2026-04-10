import { X, FileText, Link2, ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onChooseCustom: () => void;
  onChooseGoogle: () => void;
};

function GoogleFormsIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="8" fill="#6741D9" />
      <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
      <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
      <rect x="17" y="27" width="11" height="2.2" rx="1.1" fill="#6741D9" />
    </svg>
  );
}

export function FormCreateChoiceModal({ open, onClose, onChooseCustom, onChooseGoogle }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tạo cấu hình form
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn cách bạn muốn thu thập dữ liệu từ landing page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Option 1: Tự tạo */}
          <button
            type="button"
            onClick={onChooseCustom}
            className="w-full group flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-[#5e35b1] hover:bg-[#5e35b1]/3 dark:hover:border-[#5e35b1] transition text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#5e35b1]/10 group-hover:bg-[#5e35b1]/15 flex items-center justify-center shrink-0 transition">
              <FileText className="w-6 h-6 text-[#5e35b1]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#5e35b1] transition">
                Tự tạo cấu hình
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Thêm và tùy chỉnh các trường nhập liệu (tên, email, điện thoại…).
                Dữ liệu lưu trực tiếp vào Data Leads của hệ thống.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {["Text", "Email", "Phone", "Dropdown", "Checkbox"].map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5e35b1] transition mt-1 shrink-0" />
          </button>

          {/* Option 2: Google Form */}
          <button
            type="button"
            onClick={onChooseGoogle}
            className="w-full group flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-[#6741D9] hover:bg-[#6741D9]/3 dark:hover:border-[#6741D9] transition text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#6741D9]/8 group-hover:bg-[#6741D9]/15 flex items-center justify-center shrink-0 transition">
              <GoogleFormsIcon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#6741D9] transition">
                  Liên kết Google Form
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Mới
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Nhúng Google Form sẵn có vào landing page. Dữ liệu lưu vào Google Sheets
                của bạn — không cần cấu hình thêm.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {["Đồng bộ trường", "Google Sheets", "Không cần backend"].map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#6741D9]/8 text-[#6741D9] dark:text-[#c4b5fd] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#6741D9] transition mt-1 shrink-0" />
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-4 text-center">
          <p className="text-xs text-slate-400">
            Bạn có thể thay đổi cấu hình bất kỳ lúc nào sau khi tạo
          </p>
        </div>
      </div>
    </div>
  );
}
