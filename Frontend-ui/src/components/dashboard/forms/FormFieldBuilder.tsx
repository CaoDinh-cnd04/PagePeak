import { useMemo, useState } from "react";
import { Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { FormFieldDefinition, FormFieldType } from "@/lib/dashboard/forms/formConfigSchema";
import { createEmptyField, normalizeFieldType } from "@/lib/dashboard/forms/formConfigSchema";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Một dòng" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Điện thoại" },
  { value: "textarea", label: "Nhiều dòng" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

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
    <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
      <div className="lg:col-span-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Trường dữ liệu</p>
          <div className="flex items-center gap-1">
            <select
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value as FormFieldType;
                e.target.value = "";
                if (v) addField(normalizeFieldType(v));
              }}
            >
              <option value="">+ Thêm trường</option>
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-h-[min(52vh,420px)] overflow-y-auto">
          {fields.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">Chưa có trường. Chọn &quot;Thêm trường&quot; bên trên.</li>
          ) : (
            fields.map((f, index) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                    selectedId === f.id
                      ? "bg-[#5e35b1]/10 text-[#5e35b1] dark:text-[#c4b5fd]"
                      : "hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate flex-1 font-medium">{f.label || f.name}</span>
                  <span className="text-[10px] uppercase text-slate-400 shrink-0">{f.type}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {fields.length > 0 && selected && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => {
              const i = fields.findIndex((x) => x.id === selected.id);
              move(i, -1);
            }}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => {
              const i = fields.findIndex((x) => x.id === selected.id);
              move(i, 1);
            }}>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => removeField(selected.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 space-y-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chi tiết trường</p>
        {!selected ? (
          <p className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            Chọn một trường để chỉnh sửa.
          </p>
        ) : (
          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Nhãn hiển thị
                <input
                  type="text"
                  value={selected.label}
                  onChange={(e) => updateField(selected.id, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Tên field (name)
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) => updateField(selected.id, { name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Placeholder
              <input
                type="text"
                value={selected.placeholder ?? ""}
                onChange={(e) => updateField(selected.id, { placeholder: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
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
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {selected.type === "select" && (
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Các lựa chọn (mỗi dòng một giá trị)
                <textarea
                  value={(selected.options ?? []).join("\n")}
                  onChange={(e) =>
                    updateField(selected.id, {
                      options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                />
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={!!selected.required}
                onChange={(e) => updateField(selected.id, { required: e.target.checked })}
                className="rounded border-slate-300"
              />
              Bắt buộc nhập
            </label>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Xem trước</p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/80 dark:bg-slate-900/40 space-y-3">
            {fields.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Thêm trường để xem trước.</p>
            ) : (
              fields.map((f) => <FieldPreview key={f.id} field={f} />)
            )}
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
        <div className="h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-2 py-1.5">
          {field.placeholder || "…"}
        </div>
      ) : field.type === "select" ? (
        <div className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-500 px-2 flex items-center">
          {(field.options ?? [])[0] ?? "—"}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" />
          {field.label}
        </div>
      ) : (
        <div className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-2 flex items-center">
          {field.placeholder || field.type}
        </div>
      )}
    </div>
  );
}
