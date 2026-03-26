import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tagsApi, workspacesApi, type TagDto } from "@/lib/api";
import { Plus, Pencil, Trash2, X, Search, PackageOpen, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

type SortKey = "name" | "createdAt" | "updatedAt" | "usageCount";
type SortDir = "asc" | "desc";

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function DashboardTagsPage() {
  const [, setSearchParams] = useSearchParams();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDto | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set("tab", "tag");
      return n;
    }, { replace: true });
  }, [setSearchParams]);

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

  const loadTags = useCallback(async (opts?: { silent?: boolean }) => {
    if (!activeWorkspaceId) return;
    if (!opts?.silent) setLoading(true);
    setError("");
    try {
      const list = await tagsApi.list(activeWorkspaceId);
      setTags(list);
      setSelected(new Set());
    } catch {
      setError("Không tải được tags.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : [...tags];

    const mul = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "vi");
      else if (sortKey === "usageCount") cmp = a.usageCount - b.usageCount;
      else if (sortKey === "createdAt")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return cmp * mul;
    });
    return list;
  }, [tags, searchQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const allSelected = filteredSorted.length > 0 && filteredSorted.every((t) => selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredSorted.map((t) => t.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditingTag(null);
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setModalOpen(true);
  };

  const openEdit = (tag: TagDto) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color ?? PRESET_COLORS[0]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, formName.trim(), formColor);
      } else {
        await tagsApi.create(activeWorkspaceId, formName.trim(), formColor);
      }
      await loadTags({ silent: true });
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa tag này?")) return;
    try {
      await tagsApi.delete(id);
      await loadTags({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Xóa ${selected.size} tag đã chọn?`)) return;
    try {
      await tagsApi.bulkDelete([...selected]);
      await loadTags({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-0 space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quản lý Tags</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Hãy tạo Tag và gắn cho Landing Page của bạn để quản lý một cách dễ dàng hơn.
          </p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Tạo Tag mới
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading && tags.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tags.length > 0 && filteredSorted.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-500">
          Không có tag nào khớp &quot;{searchQuery.trim()}&quot;.
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="w-10 p-3 text-left">
                    <input type="checkbox" disabled className="rounded border-slate-300" aria-label="Chọn" />
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Tên Tag</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Số lượng</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Ngày tạo</th>
                  <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Ngày cập nhật</th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <PackageOpen className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Tạo Tag mới</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Hãy tạo Tag và gắn cho Landing Page của bạn để quản lý một cách dễ dàng hơn.
            </p>
            <Button onClick={openCreate} className="mt-6 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tạo Tag mới
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {selected.size > 0 ? (
            <div className="flex items-center justify-between px-4 py-2 bg-primary-50 dark:bg-primary-950/40 border-b border-primary-100 dark:border-primary-900/50">
              <span className="text-sm text-primary-800 dark:text-primary-200">Đã chọn {selected.size}</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Xóa đã chọn
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th className="p-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("name")}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600"
                    >
                      Tên Tag
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("usageCount")}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600"
                    >
                      Số lượng
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </th>
                  <th className="p-3 text-left hidden md:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort("createdAt")}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600"
                    >
                      Ngày tạo
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </th>
                  <th className="p-3 text-left hidden lg:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort("updatedAt")}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600"
                    >
                      Ngày cập nhật
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </th>
                  <th className="p-3 w-24 text-right font-semibold text-slate-600 dark:text-slate-300">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((tag) => (
                  <tr
                    key={tag.id}
                    className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(tag.id)}
                        onChange={() => toggleOne(tag.id)}
                        className="rounded border-slate-300"
                        aria-label={`Chọn ${tag.name}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color ?? "#6b7280" }}
                        />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{tag.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 tabular-nums">{tag.usageCount}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell whitespace-nowrap">
                      {formatDt(tag.createdAt)}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell whitespace-nowrap">
                      {formatDt(tag.updatedAt)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(tag)}
                          className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {editingTag ? "Chỉnh sửa Tag" : "Tạo Tag mới"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên Tag</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nhập tên tag"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Màu sắc</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        formColor === c ? "border-primary-600 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()} loading={saving}>
                {saving ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
