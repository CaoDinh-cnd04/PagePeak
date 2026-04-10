import { useEffect, useState, useCallback } from "react";
import { formsApi, workspacesApi } from "@/lib/shared/api";
import { ClipboardCheck, Plus, Pencil, Trash2, Webhook, Link2 } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { FormConfigEmptyState } from "@/components/dashboard/forms/FormConfigEmptyState";
import { FormBuilderModal } from "@/components/dashboard/forms/FormBuilderModal";
import { GoogleFormModal } from "@/components/dashboard/forms/GoogleFormModal";
import { FormCreateChoiceModal } from "@/components/dashboard/forms/FormCreateChoiceModal";
import type {
  FormFieldDefinition,
  WorkspaceFormConfig,
  GoogleFormLinkConfig,
} from "@/lib/dashboard/forms/formConfigSchema";
import {
  stringifyFields,
  stringifyFieldsWithMeta,
  parseGoogleFormLink,
} from "@/lib/dashboard/forms/formConfigSchema";

/** Icon Google Forms nhỏ cho badge */
function GoogleFormsBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[#6741D9]/8 text-[#6741D9] dark:bg-[#6741D9]/15 dark:text-[#c4b5fd] border border-[#6741D9]/15">
      <svg width="12" height="12" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect width="48" height="48" rx="7" fill="#6741D9" />
        <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
        <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
        <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
        <rect x="17" y="27" width="11" height="2.2" rx="1.1" fill="#6741D9" />
      </svg>
      Google Forms
    </span>
  );
}

export function DashboardFormsPage() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [forms, setForms] = useState<WorkspaceFormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Choice modal
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Builder modal (tự tạo trường)
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<WorkspaceFormConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Google Form modal
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleTargetForm, setGoogleTargetForm] = useState<WorkspaceFormConfig | null>(null);
  const [googleCreateMode, setGoogleCreateMode] = useState(false); // true = tạo form mới
  const [savingGoogle, setSavingGoogle] = useState(false);

  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const reload = useCallback(async (wsId: number | null) => {
    if (!wsId) { setForms([]); return; }
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

  /* ── Custom form handlers ── */
  const openCreate = () => { setChoiceOpen(true); };
  const openCustomBuilder = () => { setChoiceOpen(false); setEditingForm(null); setBuilderOpen(true); };
  const openEdit = (form: WorkspaceFormConfig) => { setEditingForm(form); setBuilderOpen(true); };

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

  /* ── Google Form handlers ── */
  const openGoogleModal = (form: WorkspaceFormConfig) => {
    setGoogleTargetForm(form);
    setGoogleCreateMode(false);
    setGoogleModalOpen(true);
  };

  const openGoogleCreate = () => {
    setChoiceOpen(false);
    setGoogleTargetForm(null);
    setGoogleCreateMode(true);
    setGoogleModalOpen(true);
  };

  const handleSaveGoogleForm = async (config: GoogleFormLinkConfig, name?: string) => {
    if (!activeWorkspaceId) return;
    setSavingGoogle(true);
    setError("");
    try {
      const fieldsJson = stringifyFieldsWithMeta([], config);
      if (googleCreateMode || !googleTargetForm) {
        // Tạo form mới với Google Form config
        await formsApi.create(
          activeWorkspaceId,
          name ?? "Form Google",
          fieldsJson,
          undefined,
          false,
        );
      } else {
        await formsApi.update(googleTargetForm.id, {
          name: googleTargetForm.name,
          fieldsJson,
          webhookUrl: googleTargetForm.webhookUrl ?? undefined,
          emailNotify: googleTargetForm.emailNotify,
        });
      }
      await reload(activeWorkspaceId);
      setGoogleModalOpen(false);
      setGoogleTargetForm(null);
      setSuccessMsg("Đã lưu cấu hình Google Form.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSavingGoogle(false);
    }
  };

  /* ── Other handlers ── */
  const handleTestWebhook = async (formId: number) => {
    setError(""); setSuccessMsg(""); setTestingWebhookId(formId);
    try {
      const r = await formsApi.testWebhook(formId);
      if (r.ok) setSuccessMsg(`Đã gửi thử webhook — HTTP ${r.statusCode ?? "?"}.`);
      else setError(r.error ?? "Webhook không phản hồi thành công.");
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

  const lastCreated = forms.length > 0
    ? forms.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt
    : null;

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Cấu hình Form
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {forms.length} cấu hình
              {lastCreated
                ? ` · Cập nhật gần nhất: ${new Date(lastCreated).toLocaleString("vi-VN")}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openGoogleCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#6741D9]/30 text-[#6741D9] dark:text-[#c4b5fd] text-sm font-medium hover:bg-[#6741D9]/5 transition"
            >
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="shrink-0">
                <rect width="48" height="48" rx="7" fill="#6741D9" />
                <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
                <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
                <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
                <rect x="17" y="27" width="11" height="2.2" rx="1.1" fill="#6741D9" />
              </svg>
              Liên kết Google Form
            </button>
            <Button
              type="button"
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white inline-flex items-center gap-2"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" />
              Tạo cấu hình mới
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-2">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2">
          {successMsg}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#5e35b1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <FormConfigEmptyState onCreate={openCreate} onCreateGoogle={openGoogleCreate} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => {
            const googleLink = parseGoogleFormLink(form.fieldsJson);
            return (
              <div
                key={form.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#5e35b1]/10 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-5 h-5 text-[#5e35b1]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {form.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">ID: {form.id}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(form)}
                      className="p-2 rounded-lg text-slate-400 hover:text-[#2563eb] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Chỉnh sửa trường"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(form.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {googleLink ? (
                    <GoogleFormsBadge />
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Tự tạo trường
                    </span>
                  )}
                  {form.webhookUrl && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
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

                {/* Google Form linked summary */}
                {googleLink?.apiUrl && (
                  <div className="rounded-xl bg-[#6741D9]/5 border border-[#6741D9]/15 px-3 py-2.5 flex items-center gap-2 text-xs">
                    <svg width="14" height="14" viewBox="0 0 48 48" fill="none" className="shrink-0">
                      <rect width="48" height="48" rx="7" fill="#6741D9" />
                      <rect x="13" y="10" width="22" height="28" rx="2.5" fill="white" />
                      <rect x="17" y="17" width="14" height="2.2" rx="1.1" fill="#6741D9" />
                      <rect x="17" y="22" width="9" height="2.2" rx="1.1" fill="#6741D9" />
                    </svg>
                    <span className="text-slate-600 dark:text-slate-400 truncate flex-1 min-w-0">
                      {googleLink.accountName || "Google Form"} —{" "}
                      <span className="text-[#6741D9] font-medium">{googleLink.mappings.length} trường</span>
                    </span>
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex gap-2 mt-1">
                  {/* Liên kết Google Form */}
                  <button
                    type="button"
                    onClick={() => openGoogleModal(form)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#6741D9]/25 text-[#6741D9] dark:text-[#c4b5fd] text-xs font-medium hover:bg-[#6741D9]/5 transition"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {googleLink ? "Sửa Google Form" : "Liên kết Google Form"}
                  </button>

                  {/* Webhook test */}
                  {form.webhookUrl && (
                    <button
                      type="button"
                      disabled={testingWebhookId === form.id}
                      onClick={() => handleTestWebhook(form.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition"
                    >
                      <Webhook className="w-3.5 h-3.5" />
                      {testingWebhookId === form.id ? "Đang gửi…" : "Thử webhook"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Choice modal — chọn kiểu tạo form */}
      <FormCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        onChooseCustom={openCustomBuilder}
        onChooseGoogle={openGoogleCreate}
      />

      {/* Modal tạo/chỉnh sửa form (custom fields) */}
      <FormBuilderModal
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingForm(null); }}
        editing={editingForm}
        workspaceId={activeWorkspaceId}
        onSave={handleSave}
        saving={saving}
      />

      {/* Modal liên kết Google Form */}
      <GoogleFormModal
        open={googleModalOpen}
        onClose={() => { setGoogleModalOpen(false); setGoogleTargetForm(null); setGoogleCreateMode(false); }}
        formName={googleTargetForm?.name}
        initialConfig={
          googleTargetForm ? parseGoogleFormLink(googleTargetForm.fieldsJson) : null
        }
        onSave={handleSaveGoogleForm}
        saving={savingGoogle}
        showNameField={googleCreateMode}
      />
    </div>
  );
}
