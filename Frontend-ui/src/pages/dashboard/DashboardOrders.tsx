import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersApi, workspacesApi, type OrderItem, type OrdersListOpts } from "@/lib/shared/api";
import { t as translate, useT } from "@/lib/shared/i18n";
import { useLangStore } from "@/stores/shared/langStore";
import { OrdersPageHeader } from "@/components/dashboard/orders/OrdersPageHeader";
import { OrdersStatusTabs } from "@/components/dashboard/orders/OrdersStatusTabs";
import { OrdersToolbar } from "@/components/dashboard/orders/OrdersToolbar";
import { OrdersTable } from "@/components/dashboard/orders/OrdersTable";
import { OrdersPagination } from "@/components/dashboard/orders/OrdersPagination";
import { OrderFormModal } from "@/components/dashboard/orders/OrderFormModal";
import { OrderDetailDrawer } from "@/components/dashboard/orders/OrderDetailDrawer";
import { OrdersModuleLayout } from "@/components/dashboard/orders/OrdersModuleLayout";
import { OrdersSubNav } from "@/components/dashboard/orders/OrdersSubNav";
import { OrdersHeroEmpty } from "@/components/dashboard/orders/OrdersHeroEmpty";
import { OrdersDeliveryTab } from "@/components/dashboard/orders/OrdersDeliveryTab";
import { OrdersTagsTab } from "@/components/dashboard/orders/OrdersTagsTab";
import { OrdersCustomFieldsTab } from "@/components/dashboard/orders/OrdersCustomFieldsTab";

const PAGE_SIZE = 20;

function escapeCsv(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportOrdersCsv(rows: OrderItem[]) {
  const headers = ["code", "customerName", "email", "phone", "productName", "amount", "status", "createdAt"];
  const lines = [
    headers.join(","),
    ...rows.map((o) =>
      [
        `DH-${o.id}`,
        escapeCsv(o.customerName),
        escapeCsv(o.email ?? ""),
        escapeCsv(o.phone ?? ""),
        escapeCsv(o.productName ?? ""),
        String(o.amount),
        o.status,
        o.createdAt,
      ].join(","),
    ),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseOrdersTab(searchParams: URLSearchParams): number {
  const raw = searchParams.get("ordersTab");
  const n = parseInt(raw ?? "1", 10);
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 5) return 5;
  return n;
}

export function DashboardOrdersPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";

  const ordersTab = useMemo(() => parseOrdersTab(searchParams), [searchParams]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState(statusParam);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<NonNullable<OrdersListOpts["sort"]>>("created_desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", "order");
        if (!n.get("ordersTab")) n.set("ordersTab", "1");
        return n;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    setActiveStatus(statusParam);
  }, [statusParam]);

  useEffect(() => {
    const tm = setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => clearTimeout(tm);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ws = await workspacesApi.list();
        if (cancelled) return;
        const def = ws.find((w) => w.isDefault) ?? ws[0];
        if (def) setActiveWorkspaceId(def.id);
      } catch {
        if (!cancelled) setError(translate("orders.workspaceError", useLangStore.getState().lang));
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadOrders = useCallback(async () => {
    if (!activeWorkspaceId) return;
    if (ordersTab !== 1 && ordersTab !== 2) return;
    setLoading(true);
    setError("");
    try {
      const res = await ordersApi.list(activeWorkspaceId, {
        incomplete: ordersTab === 2 ? true : undefined,
        status: ordersTab === 2 ? undefined : activeStatus || undefined,
        q: debouncedQ || undefined,
        page,
        pageSize: PAGE_SIZE,
        sort,
      });
      setOrders(res.items);
      setTotalCount(res.totalCount);
    } catch {
      setError(translate("orders.loadError", useLangStore.getState().lang));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, activeStatus, debouncedQ, page, sort, ordersTab]);

  useEffect(() => {
    if (!workspaceReady || !activeWorkspaceId) return;
    if (ordersTab !== 1 && ordersTab !== 2) return;
    loadOrders();
  }, [workspaceReady, activeWorkspaceId, loadOrders, ordersTab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, ordersTab]);

  const setStatusTab = (key: string) => {
    setPage(1);
    setActiveStatus(key);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set("tab", "order");
      n.set("ordersTab", "1");
      if (key) n.set("status", key);
      else n.delete("status");
      return n;
    });
  };

  const selectOrdersTab = (tab: number) => {
    setPage(1);
    setDetailOrder(null);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set("tab", "order");
      n.set("ordersTab", String(tab));
      if (tab !== 1) n.delete("status");
      return n;
    });
  };

  const openCreate = () => {
    setEditingOrder(null);
    setModalOpen(true);
  };

  const openEdit = (o: OrderItem) => {
    setEditingOrder(o);
    setModalOpen(true);
  };

  const handleSave = async (payload: {
    customerName: string;
    email?: string;
    phone?: string;
    amount?: number;
    productId?: number;
    status?: string;
  }) => {
    if (!activeWorkspaceId) return;
    setSaving(true);
    setError("");
    try {
      if (editingOrder) {
        await ordersApi.update(editingOrder.id, {
          customerName: payload.customerName,
          email: payload.email,
          phone: payload.phone,
          status: payload.status,
        });
      } else {
        await ordersApi.create({
          workspaceId: activeWorkspaceId,
          customerName: payload.customerName,
          email: payload.email,
          phone: payload.phone,
          productId: payload.productId,
          amount: payload.amount ?? 0,
        });
      }
      await loadOrders();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : translate("common.error", useLangStore.getState().lang));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("orders.deleteConfirm"))) return;
    if (!activeWorkspaceId) return;
    try {
      await ordersApi.delete(id);
      await loadOrders();
      setDetailOrder((d) => (d?.id === id ? null : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : translate("common.error", useLangStore.getState().lang));
    }
  };

  const showListChrome = ordersTab === 1 || ordersTab === 2;
  const listEmpty = showListChrome && !loading && orders.length === 0;

  useEffect(() => {
    if (ordersTab !== 1 && ordersTab !== 2) setLoading(false);
  }, [ordersTab]);

  const mainContent = (() => {
    if (!workspaceReady) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (workspaceReady && !activeWorkspaceId) {
      return <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">{t("orders.workspaceError")}</p>;
    }

    if (ordersTab === 3) return <OrdersDeliveryTab />;
    if (ordersTab === 4) return <OrdersTagsTab workspaceId={activeWorkspaceId} />;
    if (ordersTab === 5) return <OrdersCustomFieldsTab workspaceId={activeWorkspaceId} />;

    if (loading && orders.length === 0) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (listEmpty) {
      return <OrdersHeroEmpty onCreate={openCreate} />;
    }

    return (
      <>
        {ordersTab === 1 ? <OrdersStatusTabs active={activeStatus} onChange={setStatusTab} /> : null}
        {ordersTab === 2 ? <p className="text-sm text-slate-600 dark:text-slate-400">{t("orders.tab2Subtitle")}</p> : null}
        <OrdersToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          sort={sort}
          onSortChange={(v) => {
            setPage(1);
            setSort(v);
          }}
        />
        <OrdersTable rows={orders} onEdit={openEdit} onDelete={handleDelete} onRowClick={setDetailOrder} />
        <OrdersPagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
      </>
    );
  })();

  return (
    <OrdersModuleLayout subNav={<OrdersSubNav activeTab={ordersTab} onSelect={selectOrdersTab} />}>
      {showListChrome ? (
        <OrdersPageHeader
          onAdd={openCreate}
          onExportCsv={orders.length > 0 ? () => exportOrdersCsv(orders) : undefined}
        />
      ) : null}

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {mainContent}

      <OrderFormModal
        open={modalOpen}
        workspaceId={activeWorkspaceId}
        editing={editingOrder}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      <OrderDetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} />
    </OrdersModuleLayout>
  );
}
