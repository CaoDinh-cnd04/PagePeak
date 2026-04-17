import { useMemo, useState } from "react";
import { Trash2, ChevronUp, ChevronDown, GripVertical, Plus, X, Star } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { FormFieldDefinition, FormFieldType } from "@/lib/dashboard/forms/formConfigSchema";
import { createEmptyField, normalizeFieldType } from "@/lib/dashboard/forms/formConfigSchema";

// ── Field type groups (Google Forms style) ─────────────────────────────────

type FieldGroup = {
  label: string;
  types: { value: FormFieldType; label: string; icon: string }[];
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Câu hỏi",
    types: [
      { value: "text",       icon: "—",  label: "Trả lời ngắn" },
      { value: "textarea",   icon: "≡",  label: "Đoạn" },
      { value: "number",     icon: "12", label: "Số" },
      { value: "radio",      icon: "◉",  label: "Trắc nghiệm" },
      { value: "checkboxes", icon: "☑",  label: "Hộp kiểm" },
      { value: "select",     icon: "▼",  label: "Menu thả xuống" },
    ],
  },
  {
    label: "Đặc biệt",
    types: [
      { value: "email",   icon: "@",  label: "Email" },
      { value: "phone",   icon: "☎",  label: "Điện thoại" },
      { value: "date",    icon: "📅", label: "Ngày" },
      { value: "time",    icon: "⏰", label: "Giờ" },
      { value: "file",    icon: "📎", label: "Tải tệp lên" },
    ],
  },
  {
    label: "Thang điểm",
    types: [
      { value: "scale",   icon: "↔",  label: "Phạm vi tuyến tính" },
      { value: "rating",  icon: "★",  label: "Xếp hạng" },
      { value: "checkbox", icon: "□", label: "Checkbox đơn" },
    ],
  },
  {
    label: "Trình bày",
    types: [
      { value: "section", icon: "§",  label: "Tiêu đề phần" },
    ],
  },
];

const TYPE_BADGE: Record<FormFieldType, { label: string; cls: string }> = {
  text:       { label: "TEXT",       cls: "text-blue-600 bg-blue-50" },
  textarea:   { label: "PARA",       cls: "text-orange-600 bg-orange-50" },
  email:      { label: "EMAIL",      cls: "text-violet-600 bg-violet-50" },
  phone:      { label: "PHONE",      cls: "text-emerald-600 bg-emerald-50" },
  number:     { label: "NUM",        cls: "text-cyan-600 bg-cyan-50" },
  radio:      { label: "RADIO",      cls: "text-pink-600 bg-pink-50" },
  checkboxes: { label: "CHECK✕",     cls: "text-teal-600 bg-teal-50" },
  select:     { label: "SELECT",     cls: "text-amber-600 bg-amber-50" },
  checkbox:   { label: "CHECKBOX",   cls: "text-teal-600 bg-teal-50" },
  date:       { label: "DATE",       cls: "text-sky-600 bg-sky-50" },
  time:       { label: "TIME",       cls: "text-indigo-600 bg-indigo-50" },
  file:       { label: "FILE",       cls: "text-rose-600 bg-rose-50" },
  scale:      { label: "SCALE",      cls: "text-purple-600 bg-purple-50" },
  rating:     { label: "RATING",     cls: "text-yellow-600 bg-yellow-50" },
  section:    { label: "SECTION",    cls: "text-slate-500 bg-slate-100" },
};

const TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Trả lời ngắn",
  textarea: "Đoạn",
  email: "Email",
  phone: "Điện thoại",
  number: "Số",
  radio: "Trắc nghiệm",
  checkboxes: "Hộp kiểm",
  select: "Menu thả xuống",
  checkbox: "Checkbox đơn",
  date: "Ngày",
  time: "Giờ",
  file: "Tải tệp lên",
  scale: "Phạm vi tuyến tính",
  rating: "Xếp hạng",
  section: "Tiêu đề phần",
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
      {/* Add field buttons — grouped */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thêm trường dữ liệu</p>
        <div className="space-y-2">
          {FIELD_GROUPS.map((g) => (
            <div key={g.label} className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => addField(t.value)}
                    title={`Thêm: ${t.label}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#5e35b1]/50 hover:bg-[#5e35b1]/5 text-slate-700 dark:text-slate-300 transition"
                  >
                    <span className="text-[13px] leading-none w-4 text-center">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left: field list */}
        <div className="lg:col-span-5 space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Danh sách trường ({fields.length})</p>
          <ul className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-h-[min(46vh,380px)] overflow-y-auto">
            {fields.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
                Chưa có trường. Nhấn nút bên trên để thêm.
              </li>
            ) : (
              fields.map((f, index) => {
                const badge = TYPE_BADGE[f.type] ?? { label: f.type, cls: "text-slate-500 bg-slate-100" };
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
                      <span className="truncate flex-1 font-medium text-sm">
                        {f.type === "section" ? (
                          <span className="text-slate-400 italic">{f.label || "Tiêu đề phần"}</span>
                        ) : (
                          f.label || f.name
                        )}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls} shrink-0`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-slate-300 shrink-0 ml-0.5">{index + 1}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {fields.length > 0 && selected && (
            <div className="flex gap-2">
              <Button
                type="button" variant="outline" size="sm" className="flex-1"
                onClick={() => move(fields.findIndex((x) => x.id === selected.id), -1)}
                title="Lên"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                type="button" variant="outline" size="sm" className="flex-1"
                onClick={() => move(fields.findIndex((x) => x.id === selected.id), 1)}
                title="Xuống"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                type="button" variant="outline" size="sm"
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
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Chi tiết trường</p>
            {!selected ? (
              <div className="py-10 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Chọn một trường bên trái để chỉnh sửa
              </div>
            ) : (
              <FieldEditor field={selected} onUpdate={(patch) => updateField(selected.id, patch)} />
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

// ── Field Editor ────────────────────────────────────────────────────────────

function FieldEditor({ field, onUpdate }: { field: FormFieldDefinition; onUpdate: (p: Partial<FormFieldDefinition>) => void }) {
  const needsOptions = field.type === "select" || field.type === "radio" || field.type === "checkboxes";
  const isSection = field.type === "section";

  const addOption = () => {
    const opts = [...(field.options ?? [])];
    opts.push(`Tùy chọn ${opts.length + 1}`);
    onUpdate({ options: opts });
  };

  const removeOption = (i: number) => {
    const opts = [...(field.options ?? [])];
    opts.splice(i, 1);
    onUpdate({ options: opts });
  };

  const updateOption = (i: number, val: string) => {
    const opts = [...(field.options ?? [])];
    opts[i] = val;
    onUpdate({ options: opts });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
      {/* Type selector */}
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        Kiểu trường
        <select
          value={field.type}
          onChange={(e) => {
            const type = normalizeFieldType(e.target.value);
            const empty = createEmptyField(type);
            onUpdate({
              type,
              options: empty.options,
              min: empty.min,
              max: empty.max,
              minLabel: empty.minLabel,
              maxLabel: empty.maxLabel,
              maxRating: empty.maxRating,
              description: empty.description,
              accept: empty.accept,
              maxSizeMb: empty.maxSizeMb,
            });
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
        >
          {(Object.keys(TYPE_LABELS) as FormFieldType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {isSection ? "Tiêu đề phần" : "Nhãn hiển thị"}
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
          />
        </label>
        {!isSection && (
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Tên field (name)
            <input
              type="text"
              value={field.name}
              onChange={(e) => onUpdate({ name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
            />
          </label>
        )}
      </div>

      {/* Placeholder — chỉ cho text types */}
      {!isSection && !needsOptions && field.type !== "scale" && field.type !== "rating" && field.type !== "checkbox" && field.type !== "date" && field.type !== "time" && field.type !== "file" && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Placeholder
          <input
            type="text"
            value={field.placeholder ?? ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
          />
        </label>
      )}

      {/* Section description */}
      {isSection && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Mô tả phần (tùy chọn)
          <textarea
            value={field.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30 resize-none"
          />
        </label>
      )}

      {/* Options for select/radio/checkboxes */}
      {needsOptions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Các lựa chọn</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-300 text-sm w-4 text-center shrink-0">
                  {field.type === "radio" ? "◉" : field.type === "checkboxes" ? "☑" : `${i + 1}.`}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
                />
                <button type="button" onClick={() => removeOption(i)} className="p-1 rounded text-slate-400 hover:text-red-500 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5e35b1] hover:text-[#4527a0] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm lựa chọn
          </button>
        </div>
      )}

      {/* Scale settings */}
      {field.type === "scale" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Cấu hình thang điểm</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">
              Từ (min)
              <input
                type="number" min={0} max={1}
                value={field.min ?? 1}
                onChange={(e) => onUpdate({ min: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Đến (max)
              <select
                value={field.max ?? 5}
                onChange={(e) => onUpdate({ max: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
              >
                {[2,3,4,5,6,7,8,9,10].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">
              Nhãn đầu thang
              <input
                type="text"
                value={field.minLabel ?? ""}
                onChange={(e) => onUpdate({ minLabel: e.target.value })}
                placeholder="Ví dụ: Không hài lòng"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Nhãn cuối thang
              <input
                type="text"
                value={field.maxLabel ?? ""}
                onChange={(e) => onUpdate({ maxLabel: e.target.value })}
                placeholder="Ví dụ: Rất hài lòng"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
              />
            </label>
          </div>
        </div>
      )}

      {/* Rating settings */}
      {field.type === "rating" && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Số sao tối đa
          <select
            value={field.maxRating ?? 5}
            onChange={(e) => onUpdate({ maxRating: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((v) => <option key={v} value={v}>{v} sao</option>)}
          </select>
        </label>
      )}

      {/* File settings */}
      {field.type === "file" && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Loại file chấp nhận
            <input
              type="text"
              value={field.accept ?? ""}
              onChange={(e) => onUpdate({ accept: e.target.value })}
              placeholder=".pdf,.doc,.jpg,.png"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Dung lượng tối đa (MB)
            <input
              type="number" min={1} max={100}
              value={field.maxSizeMb ?? 10}
              onChange={(e) => onUpdate({ maxSizeMb: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5e35b1]/30"
            />
          </label>
        </div>
      )}

      {/* Required */}
      {!isSection && (
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Bắt buộc nhập</span>
        </label>
      )}
    </div>
  );
}

// ── Field Preview ────────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: FormFieldDefinition }) {
  const inputCls = "h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-3 flex items-center w-full";

  if (field.type === "section") {
    return (
      <div className="pt-2 pb-1 border-b border-slate-200 dark:border-slate-700">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{field.label || "Tiêu đề phần"}</p>
        {field.description && <p className="text-xs text-slate-500 mt-0.5">{field.description}</p>}
      </div>
    );
  }

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
        <div className={`${inputCls} justify-between`}>
          <span>{(field.options ?? [])[0] ?? "—"}</span>
          <span className="text-slate-300">▾</span>
        </div>
      ) : field.type === "radio" ? (
        <div className="space-y-1">
          {(field.options ?? []).slice(0, 3).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
              {opt}
            </div>
          ))}
          {(field.options?.length ?? 0) > 3 && <p className="text-[10px] text-slate-400">+{(field.options?.length ?? 0) - 3} lựa chọn nữa</p>}
        </div>
      ) : field.type === "checkboxes" ? (
        <div className="space-y-1">
          {(field.options ?? []).slice(0, 3).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0" />
              {opt}
            </div>
          ))}
          {(field.options?.length ?? 0) > 3 && <p className="text-[10px] text-slate-400">+{(field.options?.length ?? 0) - 3} lựa chọn nữa</p>}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0" />
          {field.label}
        </div>
      ) : field.type === "scale" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: (field.max ?? 5) - (field.min ?? 1) + 1 }, (_, i) => (field.min ?? 1) + i).map((v) => (
              <div key={v} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-500">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{field.minLabel || ""}</span>
            <span>{field.maxLabel || ""}</span>
          </div>
        </div>
      ) : field.type === "rating" ? (
        <div className="flex items-center gap-1">
          {Array.from({ length: field.maxRating ?? 5 }).map((_, i) => (
            <Star key={i} className="w-5 h-5 text-slate-300 dark:text-slate-600" />
          ))}
        </div>
      ) : field.type === "date" ? (
        <div className={`${inputCls} gap-2`}>
          <span>dd/mm/yyyy</span>
          <span className="ml-auto">📅</span>
        </div>
      ) : field.type === "time" ? (
        <div className={`${inputCls} gap-2`}>
          <span>--:--</span>
          <span className="ml-auto">⏰</span>
        </div>
      ) : field.type === "file" ? (
        <div className="h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400 px-3 flex items-center justify-center gap-2">
          <span>📎</span>
          <span>Tải lên tệp {field.accept ? `(${field.accept})` : ""}</span>
        </div>
      ) : (
        <div className={inputCls}>
          {field.placeholder || TYPE_LABELS[field.type] || field.type}
        </div>
      )}
    </div>
  );
}
