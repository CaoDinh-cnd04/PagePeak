import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type DesignType = "responsive" | "mobile" | "adaptive";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; tags: string[]; designType: DesignType }) => void | Promise<void>;
};

const DESIGN_TYPES: Array<{ key: DesignType; label: string; hint: string }> = [
  { key: "responsive", label: "Responsive", hint: "Web + Mobile tối ưu tự động" },
  { key: "mobile", label: "Mobile Only", hint: "Chỉ thiết kế cho Mobile" },
  { key: "adaptive", label: "Adaptive", hint: "Web/Mobile tách layout" },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateLandingPageDetailsModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [designType, setDesignType] = useState<DesignType>("responsive");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tags = useMemo(() => {
    const raw = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [tagsText]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setName("");
    setTagsText("");
    setDesignType("responsive");
  }, [open]);

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async () => {
    setError("");
    const n = name.trim();
    if (!n) {
      setError("Bạn bắt buộc phải nhập tên Landing Page.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({ name: n, tags, designType });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo Landing Page thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={handleOverlay}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Tạo Landing Page
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Hãy nhập đầy đủ thông tin bên dưới để tạo trang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            <Input
              label="Tên Landing Page"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên Landing Page"
              required
            />

            <div>
              <Input
                label="Tag"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Nhập Tag (cách nhau bằng dấu phẩy)"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Ví dụ: sale, lead, webinar. Slug gợi ý: <span className="font-semibold">/{slugify(name || "landing-page")}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-2">
              Kiểu thiết kế
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {DESIGN_TYPES.map((t) => {
                const active = designType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setDesignType(t.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#7C3AED] bg-purple-50 dark:bg-purple-500/10"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          active ? "border-[#7C3AED]" : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {active && <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />}
                      </span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {t.label}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {t.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            💡 Khuyến mãi giờ vàng: Tạo và xuất bản trang trong hôm nay để nhận ưu đãi!
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" loading={submitting} onClick={() => void handleSubmit()}>
              Tạo Landing Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
