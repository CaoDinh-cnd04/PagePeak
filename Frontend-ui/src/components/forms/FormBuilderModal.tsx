import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormFieldBuilder } from "./FormFieldBuilder";
import type { FormFieldDefinition, WorkspaceFormConfig } from "@/lib/formConfigSchema";
import { parseFieldsJson, createEmptyField } from "@/lib/formConfigSchema";

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
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n || !workspaceId) return;
    await onSave({
      name: n,
      fields,
      webhookUrl: webhookUrl.trim(),
      emailNotify,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editing ? "Sửa cấu hình form" : "Tạo cấu hình form"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Đặt tên, thêm trường, webhook và email thông báo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tên cấu hình
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-900"
                placeholder="Form đăng ký tư vấn"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Webhook URL (tùy chọn)
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-900"
                placeholder="https://..."
              />
              <span className="block text-[11px] text-slate-500 font-normal mt-1">
                Dùng nút &quot;Gửi thử webhook&quot; trên danh sách form để kiểm tra.
              </span>
            </label>
          </div>
          <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={(e) => setEmailNotify(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>
              Gửi email thông báo khi có lead mới
              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                Gửi tới email chủ workspace — cần cấu hình SMTP trên server (Email:Smtp*).
              </span>
            </span>
          </label>

          <FormFieldBuilder fields={fields} onChange={setFields} />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !name.trim() || !workspaceId} loading={saving}>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </div>
      </div>
    </div>
  );
}
