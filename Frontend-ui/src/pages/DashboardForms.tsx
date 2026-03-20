import { useEffect, useState } from "react";
import { formsApi, workspacesApi } from "@/lib/api";
import { ClipboardCheck, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type FormItem = {
  id: number;
  name: string;
  fieldsJson: string;
  webhookUrl: string | null;
  emailNotify: boolean;
  createdAt: string;
};

export function DashboardFormsPage() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormItem | null>(null);
  const [formName, setFormName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ws = await workspacesApi.list();
        const def = ws.find((w) => w.isDefault) ?? ws[0];
        if (def) setActiveWorkspaceId(def.id);
      } catch {
        setError("Không tải được workspaces.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    formsApi
      .list(activeWorkspaceId)
      .then(setForms)
      .catch(() => setError("Không tải được forms."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const openCreate = () => {
    setEditingForm(null);
    setFormName("");
    setWebhookUrl("");
    setEmailNotify(false);
    setModalOpen(true);
  };

  const openEdit = (form: FormItem) => {
    setEditingForm(form);
    setFormName(form.name);
    setWebhookUrl(form.webhookUrl ?? "");
    setEmailNotify(form.emailNotify);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      if (editingForm) {
        await formsApi.update(editingForm.id, {
          name: formName.trim(),
          webhookUrl: webhookUrl.trim() || undefined,
          emailNotify,
        });
      } else {
        await formsApi.create(activeWorkspaceId, formName.trim(), undefined, webhookUrl.trim() || undefined, emailNotify);
      }
      setForms(await formsApi.list(activeWorkspaceId));
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa form này?")) return;
    if (!activeWorkspaceId) return;
    try {
      await formsApi.delete(id);
      setForms(await formsApi.list(activeWorkspaceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const lastCreated = forms.length > 0 ? forms.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quản lý Forms</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {forms.length} form{lastCreated ? ` · Tạo gần nhất: ${new Date(lastCreated).toLocaleDateString("vi-VN")}` : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm form
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có form nào.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {forms.map((form, idx) => (
            <div
              key={form.id}
              className={`flex items-center justify-between px-5 py-4 ${
                idx !== forms.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{form.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  {form.webhookUrl && (
                    <span className="text-xs text-slate-400 truncate max-w-[200px]">{form.webhookUrl}</span>
                  )}
                  {form.emailNotify && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      Email notify
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{new Date(form.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(form)}
                  className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(form.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingForm ? "Sửa form" : "Thêm form"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên form</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Form liên hệ"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.example.com/..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-10 h-6 rounded-full transition ${emailNotify ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() => setEmailNotify(!emailNotify)}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      emailNotify ? "translate-x-4" : ""
                    }`}
                  />
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Gửi email thông báo</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()} loading={saving}>{saving ? "Đang lưu…" : "Lưu"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
