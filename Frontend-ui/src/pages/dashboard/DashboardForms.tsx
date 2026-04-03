import { useEffect, useState, useCallback } from "react";
import { formsApi, workspacesApi } from "@/lib/shared/api";
import { ClipboardCheck, Plus, Pencil, Trash2, Settings2, Webhook } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { FormConfigEmptyState } from "@/components/dashboard/forms/FormConfigEmptyState";
import { FormBuilderModal } from "@/components/dashboard/forms/FormBuilderModal";
import type { FormFieldDefinition, WorkspaceFormConfig } from "@/lib/dashboard/forms/formConfigSchema";
import { stringifyFields } from "@/lib/dashboard/forms/formConfigSchema";

export function DashboardFormsPage() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [forms, setForms] = useState<WorkspaceFormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<WorkspaceFormConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const reload = useCallback(async (wsId: number | null) => {
    if (!wsId) {
      setForms([]);
      return;
    }
    const list = await formsApi.list(wsId);
    setForms(list as WorkspaceFormConfig[]);
  }, []);

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
    setError("");
    setSuccessMsg("");
    reload(activeWorkspaceId)
      .catch(() => setError("Không tải được forms."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId, reload]);

  const openCreate = () => {
    setEditingForm(null);
    setBuilderOpen(true);
  };

  const openEdit = (form: WorkspaceFormConfig) => {
    setEditingForm(form);
    setBuilderOpen(true);
  };

  const handleSave = async (payload: {
    name: string;
    fields: FormFieldDefinition[];
    webhookUrl: string;
    emailNotify: boolean;
  }) => {
    if (!activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      const fieldsJson = stringifyFields(payload.fields);
      if (editingForm) {
        await formsApi.update(editingForm.id, {
          name: payload.name,
          fieldsJson,
          webhookUrl: payload.webhookUrl || undefined,
          emailNotify: payload.emailNotify,
        });
      } else {
        await formsApi.create(
          activeWorkspaceId,
          payload.name,
          fieldsJson,
          payload.webhookUrl || undefined,
          payload.emailNotify,
        );
      }
      await reload(activeWorkspaceId);
      setBuilderOpen(false);
      setEditingForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (formId: number) => {
    setError("");
    setSuccessMsg("");
    setTestingWebhookId(formId);
    try {
      const r = await formsApi.testWebhook(formId);
      if (r.ok) {
        setSuccessMsg(`Đã gửi thử webhook — HTTP ${r.statusCode ?? "?"}.`);
      } else {
        setError(r.error ?? "Webhook không phản hồi thành công.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi thử webhook thất bại.");
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Xóa cấu hình form này? Các phần tử Form trên editor đang tham chiếu có thể cần chọn lại.")) return;
    if (!activeWorkspaceId) return;
    try {
      await formsApi.delete(id);
      await reload(activeWorkspaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const lastCreated = forms.length > 0 ? forms.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {!activeWorkspaceId && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Chưa có workspace. Tạo workspace trong Cài đặt hoặc liên hệ quản trị để dùng cấu hình form.
        </div>
      )}
      {forms.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Cấu hình Form</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {forms.length} cấu hình
              {lastCreated ? ` · Cập nhật gần nhất: ${new Date(lastCreated).toLocaleString("vi-VN")}` : ""}
            </p>
          </div>
          <Button
            type="button"
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white inline-flex items-center gap-2 shrink-0"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" />
            Tạo cấu hình mới
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-2">{error}</p>}
      {successMsg && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2">{successMsg}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#5e35b1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <FormConfigEmptyState onCreate={openCreate} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5e35b1]/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-[#5e35b1]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{form.name}</p>
                    <p className="text-xs text-slate-500 mt-1">ID: {form.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(form)}
                    className="p-2 rounded-lg text-slate-500 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Chỉnh sửa"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(form.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Settings2 className="w-3 h-3" />
                  Trường: JSON
                </span>
                {form.webhookUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 truncate max-w-full">
                    <Webhook className="w-3 h-3 shrink-0" />
                    Webhook
                  </span>
                )}
                {form.emailNotify && (
                  <span className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400">
                    Email notify
                  </span>
                )}
              </div>
              {form.webhookUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-[13px] inline-flex items-center justify-center gap-2 border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                  disabled={testingWebhookId === form.id}
                  onClick={() => handleTestWebhook(form.id)}
                >
                  <Webhook className="w-4 h-4 shrink-0" />
                  {testingWebhookId === form.id ? "Đang gửi thử…" : "Gửi thử webhook"}
                </Button>
              )}
              <Button type="button" variant="outline" className="w-full mt-1" onClick={() => openEdit(form)}>
                Chỉnh sửa cấu hình
              </Button>
            </div>
          ))}
        </div>
      )}

      <FormBuilderModal
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingForm(null);
        }}
        editing={editingForm}
        workspaceId={activeWorkspaceId}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
