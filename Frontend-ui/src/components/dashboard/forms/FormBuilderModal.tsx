import { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { FormFieldBuilder } from "./FormFieldBuilder";
import type { FormFieldDefinition, WorkspaceFormConfig } from "@/lib/dashboard/forms/formConfigSchema";
import { parseFieldsJson, createEmptyField } from "@/lib/dashboard/forms/formConfigSchema";

type Props = {
  open: boolean;
  onClose: () => void;
  /** null = tạo mới */
  editing: WorkspaceFormConfig | null;
  workspaceId: number | null;
  onSave: (payload: {
    name: string;
    fields: FormFieldDefinition[];
    webhookUrl: string;
    emailNotify: boolean;
  }) => Promise<void>;
  saving?: boolean;
};

export function FormBuilderModal({ open, onClose, editing, workspaceId, onSave, saving }: Props) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setFields(parseFieldsJson(editing.fieldsJson));
      setWebhookUrl(editing.webhookUrl ?? "");
      setEmailNotify(editing.emailNotify);
    } else {
      setName("Form liên hệ");
      setFields([createEmptyField("text"), createEmptyField("email"), createEmptyField("phone")]);
      setWebhookUrl("");
      setEmailNotify(false);
    }
    setShowAdvanced(false);
  }, [open, editing]);

  if (!open) return null;

  const canSave = !!name.trim() && !!workspaceId && fields.length > 0;

  const handleSubmit = async () => {
    if (!canSave) return;
    await onSave({ name: name.trim(), fields, webhookUrl: webhookUrl.trim(), emailNotify });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-[#5e35b1]/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5e35b1]/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#5e35b1]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editing ? "Chỉnh sửa cấu hình form" : "Tạo cấu hình form mới"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Đặt tên, thêm và tùy chỉnh các trường nhập liệu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
          {/* Tên form */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Tên cấu hình form
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e35b1]/30 focus:border-[#5e35b1] transition"
              placeholder="Ví dụ: Form đăng ký tư vấn"
            />
          </div>

          {/* Field builder */}
          <FormFieldBuilder fields={fields} onChange={setFields} />

          {/* Cài đặt nâng cao (collapsible) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition text-left"
            >
              <span className="flex items-center gap-2">
                Cài đặt nâng cao
                <span className="text-xs font-normal text-slate-400">(Webhook & Email thông báo)</span>
              </span>
              <span className="text-slate-400 text-xs">{showAdvanced ? "▲" : "▼"}</span>
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 pt-3 space-y-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Webhook URL <span className="font-normal text-slate-400">(tùy chọn)</span>
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e35b1]/20 transition"
                    placeholder="https://hooks.zapier.com/..."
                  />
                  <p className="text-xs text-slate-500">
                    Nhận dữ liệu qua webhook (Zapier, Make, n8n…). Dùng nút &quot;Gửi thử webhook&quot; để kiểm tra.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotify}
                    onChange={(e) => setEmailNotify(e.target.checked)}
                    className="rounded border-slate-300 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Gửi email thông báo khi có lead mới
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gửi tới email chủ workspace — cần cấu hình SMTP trên server (Email:Smtp*).
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
          <p className="text-xs text-slate-400">{fields.length} trường được cấu hình</p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving || !canSave} loading={saving}>
              {saving ? "Đang lưu…" : "Lưu cấu hình"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
