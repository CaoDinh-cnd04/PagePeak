import { useEffect, useState } from "react";
import { domainsApi, workspacesApi } from "@/lib/api";
import { Globe, Plus, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DomainItem = {
  id: number;
  domainName: string;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <AlertCircle className="w-3 h-3" /> Error
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export function DashboardDomainsPage() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [domainName, setDomainName] = useState("");
  const [adding, setAdding] = useState(false);

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
    domainsApi
      .list(activeWorkspaceId)
      .then(setDomains)
      .catch(() => setError("Không tải được domains."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim() || !activeWorkspaceId) return;
    setAdding(true);
    setError("");
    try {
      await domainsApi.create(activeWorkspaceId, domainName.trim());
      setDomainName("");
      setDomains(await domainsApi.list(activeWorkspaceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm domain thất bại.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa domain này?")) return;
    if (!activeWorkspaceId) return;
    try {
      await domainsApi.delete(id);
      setDomains(await domainsApi.list(activeWorkspaceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quản lý Domains</h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={domainName}
          onChange={(e) => setDomainName(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
        <Button type="submit" disabled={adding || !domainName.trim()} loading={adding} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {adding ? "Đang thêm…" : "Thêm domain"}
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có domain nào.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {domains.map((d, idx) => (
            <div
              key={d.id}
              className={`flex items-center justify-between px-5 py-4 ${
                idx !== domains.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{d.domainName}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString("vi-VN")}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
