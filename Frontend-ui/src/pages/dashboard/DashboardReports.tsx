import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { reportsApi, workspacesApi, pagesApi, ordersApi, type ReportsOverview, type PageItem, type OrderItem } from "@/lib/shared/api";
import { BarChart3, FileText, ShoppingBag, Users, Database, Globe, TrendingUp } from "lucide-react";

type TabKey = "overview" | "pages" | "traffic" | "revenue";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Tổng quan", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "pages", label: "Theo trang", icon: <FileText className="w-4 h-4" /> },
  { key: "traffic", label: "Lưu lượng", icon: <Globe className="w-4 h-4" /> },
  { key: "revenue", label: "Doanh thu", icon: <TrendingUp className="w-4 h-4" /> },
];

type StatCard = {
  label: string;
  key: keyof ReportsOverview;
  icon: React.ReactNode;
  bg: string;
  text: string;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STAT_CARDS: StatCard[] = [
  { label: "Tổng trang", key: "totalPages", icon: <FileText className="w-6 h-6" />, bg: "bg-primary-50 dark:bg-primary-500/10", text: "text-primary-600 dark:text-primary-400" },
  { label: "Đã xuất bản", key: "publishedPages", icon: <FileText className="w-6 h-6" />, bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  { label: "Bản nháp", key: "draftPages", icon: <FileText className="w-6 h-6" />, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
  { label: "Sections", key: "totalSections", icon: <BarChart3 className="w-6 h-6" />, bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  { label: "Elements", key: "totalElements", icon: <BarChart3 className="w-6 h-6" />, bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400" },
  { label: "Sản phẩm", key: "totalProducts", icon: <ShoppingBag className="w-6 h-6" />, bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  { label: "Đơn hàng", key: "totalOrders", icon: <ShoppingBag className="w-6 h-6" />, bg: "bg-pink-50 dark:bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
  { label: "Khách hàng", key: "totalCustomers", icon: <Users className="w-6 h-6" />, bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  { label: "Leads", key: "totalLeads", icon: <Database className="w-6 h-6" />, bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
];

export function DashboardReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabKey) ?? "overview";
  const activeTab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const switchTab = (t: TabKey) => {
    if (t === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: t });
    }
  };

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
      reportsApi.overview(activeWorkspaceId),
      pagesApi.list(activeWorkspaceId),
      ordersApi.list(activeWorkspaceId, { page: 1, pageSize: 500, sort: "created_desc" }),
    ])
      .then(([overview, pagesList, ordersRes]) => {
        setData(overview);
        setPages(pagesList);
        setOrders(ordersRes.items);
      })
      .catch(() => setError("Không tải được báo cáo."))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const completedRevenue = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.amount, 0);
  const pendingRevenue = orders.filter((o) => o.status === "pending" || o.status === "shipping").reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Báo cáo</h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.key
                ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            !data ? (
              <div className="text-center py-16">
                <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Không có dữ liệu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {STAT_CARDS.map((card) => (
                  <div key={card.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.text}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data[card.key].toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "pages" && (
            pages.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có trang nào.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tên trang</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Đường dẫn</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">/{p.slug}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              p.status === "published"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {p.status === "published" ? "Đã xuất bản" : "Nháp"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {activeTab === "traffic" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                  <Globe className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.totalPages ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Tổng số trang</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                  <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.publishedPages ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Trang hoạt động</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                  <Database className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.totalLeads ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Leads thu thập</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Phân bổ trang theo trạng thái</h3>
                <div className="flex gap-4 items-end h-32">
                  {data && (
                    <>
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-emerald-500 rounded-t-lg transition-all" style={{ height: `${Math.max(8, data.publishedPages / Math.max(data.totalPages, 1) * 100)}%` }} />
                        <span className="text-xs text-slate-500">Xuất bản ({data.publishedPages})</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-400 rounded-t-lg transition-all" style={{ height: `${Math.max(8, data.draftPages / Math.max(data.totalPages, 1) * 100)}%` }} />
                        <span className="text-xs text-slate-500">Nháp ({data.draftPages})</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-6 text-center">
                <Globe className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Thống kê lưu lượng chi tiết (pageviews, visitors) sẽ được bổ sung khi tích hợp tracking.</p>
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                  <TrendingUp className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalRevenue.toLocaleString()} ₫</p>
                  <p className="text-xs text-slate-500 mt-1">Tổng doanh thu</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5 text-center">
                  <ShoppingBag className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-600">{completedRevenue.toLocaleString()} ₫</p>
                  <p className="text-xs text-slate-500 mt-1">Đã hoàn thành</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-yellow-200 dark:border-yellow-800 p-5 text-center">
                  <ShoppingBag className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{pendingRevenue.toLocaleString()} ₫</p>
                  <p className="text-xs text-slate-500 mt-1">Đang xử lý</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có đơn hàng nào.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đơn hàng gần đây</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Khách hàng</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Số tiền</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ngày</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 20).map((o) => (
                          <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{o.customerName}</td>
                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{o.amount.toLocaleString()} ₫</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                ({ pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400", shipping: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" } as Record<string, string>)[o.status] ?? "bg-slate-100 text-slate-600"
                              }`}>
                                {ORDER_STATUS_LABELS[o.status] ?? o.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString("vi-VN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
