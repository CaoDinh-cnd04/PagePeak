import { useEffect, useState } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";

export type RenamePageModalProps = {
  open: boolean;
  onClose: () => void;
  page: { id: number; name: string; slug: string } | null;
  onSave: (id: number, name: string, slug: string) => Promise<void>;
};

export function RenamePageModal({ open, onClose, page, onSave }: RenamePageModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (page) {
      setName(page.name);
      setSlug(page.slug);
      setError("");
    }
  }, [page]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    const n = name.trim();
    const s = slug.trim();
    if (!n) {
      setError("Vui lòng nhập tên trang.");
      return;
    }
    if (!s) {
      setError("Vui lòng nhập slug.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(page.id, n, s);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi tên thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Đổi tên Landing Page</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="Tên trang"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị"
          />
          <Input
            label="Slug (đường dẫn)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug-trang"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={saving} className="bg-indigo-600 hover:bg-indigo-700">
              Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
