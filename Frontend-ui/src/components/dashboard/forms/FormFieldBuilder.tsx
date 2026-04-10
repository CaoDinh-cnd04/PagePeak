import { useMemo, useState } from "react";
import { Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { FormFieldDefinition, FormFieldType } from "@/lib/dashboard/forms/formConfigSchema";
import { createEmptyField, normalizeFieldType } from "@/lib/dashboard/forms/formConfigSchema";

const FIELD_TYPES: { value: FormFieldType; label: string; color: string; bg: string }[] = [
  { value: "text",     label: "Một dòng",   color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
  { value: "email",    label: "Email",      color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 border-violet-200 dark:border-violet-800" },
  { value: "phone",    label: "Điện thoại", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
  { value: "textarea", label: "Nhiều dòng", color: "text-orange-700 dark:text-orange-300",  bg: "bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 border-orange-200 dark:border-orange-800" },
  { value: "select",   label: "Dropdown",   color: "text-amber-700 dark:text-amber-300",    bg: "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border-amber-200 dark:border-amber-800" },
  { value: "checkbox", label: "Checkbox",   color: "text-teal-700 dark:text-teal-300",     bg: "bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/50 border-teal-200 dark:border-teal-800" },
];

const TYPE_BADGE: Record<FormFieldType, { label: string; cls: string }> = {
  text:     { label: "TEXT",     cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300" },
  email:    { label: "EMAIL",    cls: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300" },
  phone:    { label: "PHONE",    cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" },
  textarea: { label: "TEXTAREA", cls: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300" },
  select:   { label: "SELECT",   cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300" },
  checkbox: { label: "CHECKBOX", cls: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300" },
};

type Props = {
  fields: FormFieldDefinition[];
  onChange: (fields: FormFieldDefinition[]) => void;
};

export function FormFieldBuilder({ fields, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() => fields[0]?.id ?? null);

  const selected = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? null,
    [fields, selectedId],
  );

  const updateField = (id: string, partial: Partial<FormFieldDefinition>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  };

  const removeField = (id: string) => {
    const next = fields.filter((f) => f.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const addField = (type: FormFieldType) => {
    const f = createEmptyField(type);
    onChange([...fields, f]);
    setSelectedId(f.id);
  };

  return (
    <div className="space-y-4">
      {/* Add field pill buttons */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trường dữ liệu</p>
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => addField(t.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${t.bg} ${t.color}`}
            >
              <span className="text-base leading-none">+</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left: field list */}
        <div className="lg:col-span-5 space-y-2">
          <ul className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-h-[min(46vh,380px)] overflow-y-auto">
            {fields.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
                Chưa có trường. Nhấn nút bên trên để thêm.
              </li>
            ) : (
              fields.map((f, index) => {
                const badge = TYPE_BADGE[f.type];
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                        selectedId === f.id
                          ? "bg-[#5e35b1]/8 text-[#5e35b1] dark:text-[#c4b5fd] border-l-2 border-[#5e35b1]"
                          : "hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      <span className="truncate flex-1 font-medium text-sm">{f.label || f.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls} shrink-0`}>
                        {badge.label}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {fields.length > 0 && selected && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => move(fields.findIndex((x) => x.id === selected.id), -1)}
                title="Lên"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => move(fields.findIndex((x) => x.id === selected.id), 1)}
                title="Xuống"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                onClick={() => removeField(selected.id)}
                title="Xóa trường"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: field editor + preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Field editor */}
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Chi tiết trường
            </p>
            {!selected ? (
              <div className="py-10 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Chọn một trường bên trái để chỉnh sửa
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Nhãn hiển thị
                    <input
                      type="text"
                      value={selected.label}
                      onChange={(e) => updateField(selected.id, { label: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tên field (name)
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) =>
                        updateField(selected.id, {
                          name: e.target.value.replace(/\s/g, "_").toLowerCase(),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Placeholder
                    <input
                      type="text"
                      value={selected.placeholder ?? ""}
                      onChange={(e) => updateField(selected.id, { placeholder: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Kiểu
                    <select
                      value={selected.type}
                      onChange={(e) => {
                        const type = normalizeFieldType(e.target.value);
                        const patch: Partial<FormFieldDefinition> = { type };
                        if (type === "select" && !selected.options?.length) {
                          patch.options = ["Tùy chọn 1", "Tùy chọn 2"];
                        }
                        updateField(selected.id, patch);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selected.type === "select" && (
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Các lựa chọn (mỗi dòng một giá trị)
                    <textarea
                      value={(selected.options ?? []).join("\n")}
                      onChange={(e) =>
                        updateField(selected.id, {
                          options: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                    />
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selected.required}
                    onChange={(e) => updateField(selected.id, { required: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Bắt buộc nhập</span>
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Xem trước</p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/40 space-y-3 max-h-64 overflow-y-auto">
              {fields.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Thêm trường để xem trước.</p>
              ) : (
                fields.map((f) => <FieldPreview key={f.id} field={f} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldPreview({ field }: { field: FormFieldDefinition }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.type === "textarea" ? (
        <div className="h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-3 py-2">
          {field.placeholder || "…"}
        </div>
      ) : field.type === "select" ? (
        <div className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-500 px-3 flex items-center justify-between">
          <span>{(field.options ?? [])[0] ?? "—"}</span>
          <span className="text-slate-300">▾</span>
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0" />
          {field.label}
        </div>
      ) : (
        <div className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-3 flex items-center">
          {field.placeholder || field.type}
        </div>
      )}
    </div>
  );
}
