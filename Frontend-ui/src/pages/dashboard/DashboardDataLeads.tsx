import { useEffect, useState } from "react";
import { leadsApi, workspacesApi, pagesApi, type LeadItem, type PageItem } from "@/lib/shared/api";
import { Database, Trash2, Eye, X, Download } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";

export function DashboardDataLeadsPage() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPageId, setFilterPageId] = useState<number | undefined>(undefined);

  const [detailLead, setDetailLead] = useState<LeadItem | null>(null);

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
    Promise.all([
      leadsApi.list(activeWorkspaceId, filterPageId),
      pagesApi.list(activeWorkspaceId),
    ])
      .then(([leadsData, pagesData]) => {
        setLeads(leadsData);
        setPages(pagesData);
      })
      .catch(() => setError("Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId, filterPageId]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa lead này?")) return;
    if (!activeWorkspaceId) return;
    try {
      await leadsApi.delete(id);
      setLeads(await leadsApi.list(activeWorkspaceId, filterPageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  const getPageName = (pageId: number | null) => {
    if (!pageId) return "—";
    return pages.find((p) => p.id === pageId)?.name ?? `#${pageId}`;
  };

  const formatDataJson = (json: string) => {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const allKeys = new Set<string>();
    const parsedRows: Record<string, string>[] = [];
    for (const lead of leads) {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(lead.dataJson); } catch { parsed = { data: lead.dataJson }; }
      Object.keys(parsed).forEach((k) => allKeys.add(k));
      parsedRows.push(parsed);
    }
    const fixedCols = ["id", "pageId", "ipAddress", "createdAt"];
    const dataCols = [...allKeys];
    const header = [...fixedCols, ...dataCols];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = leads.map((l, i) => {
      const fixed = [String(l.id), getPageName(l.pageId), l.ipAddress ?? "", new Date(l.createdAt).toLocaleDateString("vi-VN")];
      const data = dataCols.map((k) => String(parsedRows[i][k] ?? ""));
      return [...fixed, ...data].map(escape).join(",");
    });
    const csv = "\uFEFF" + header.map(escape).join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dữ liệu Leads</h1>
        {leads.length > 0 && (
          <Button onClick={handleExportCsv} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500">
            <Download className="w-4 h-4" />
            Xuất CSV
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">Lọc theo trang:</label>
        <select
          value={filterPageId ?? ""}
          onChange={(e) => setFilterPageId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="">Tất cả</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16">
          <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có lead nào.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Page</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">IP</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ngày tạo</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">#{l.id}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{getPageName(l.pageId)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{l.ipAddress ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(l.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setDetailLead(l)} className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(l.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
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

      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chi tiết Lead #{detailLead.id}</h2>
              <button type="button" onClick={() => setDetailLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Page:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{getPageName(detailLead.pageId)}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">IP:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{detailLead.ipAddress ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Ngày tạo:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{new Date(detailLead.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Dữ liệu:</span>
                <pre className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {formatDataJson(detailLead.dataJson)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="secondary" onClick={() => setDetailLead(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
