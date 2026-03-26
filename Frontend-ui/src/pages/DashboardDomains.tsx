import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { domainsApi, workspacesApi } from "@/lib/api";
import { usePlanStore } from "@/stores/planStore";
import { t as translate, useT } from "@/lib/i18n";
import { useLangStore } from "@/stores/langStore";
import { DomainsPageHeader } from "@/components/domains/DomainsPageHeader";
import { DomainsEmptyState } from "@/components/domains/DomainsEmptyState";
import { DomainsTable, type DomainRow } from "@/components/domains/DomainsTable";
import { CreateDomainModal } from "@/components/domains/CreateDomainModal";
import { DomainsUpgradeGate } from "@/components/domains/DomainsUpgradeGate";

export function DashboardDomainsPage() {
  const t = useT();
  const [, setSearchParams] = useSearchParams();
  const plan = usePlanStore((s) => s.planInfo?.plan);
  const hydrate = usePlanStore((s) => s.hydrate);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const needsUpgrade = plan != null && !plan.hasCustomDomain;

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", "domain");
        return n;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ws = await workspacesApi.list();
        if (cancelled) return;
        const def = ws.find((w) => w.isDefault) ?? ws[0];
        if (def) setActiveWorkspaceId(def.id);
      } catch {
        if (!cancelled) setError(translate("domains.workspaceError", useLangStore.getState().lang));
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDomains = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const list = await domainsApi.list(activeWorkspaceId);
      setDomains(list);
    } catch {
      setError(translate("domains.loadError", useLangStore.getState().lang));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspaceReady) return;
    if (!activeWorkspaceId || needsUpgrade) {
      setLoading(false);
      return;
    }
    loadDomains();
  }, [workspaceReady, activeWorkspaceId, needsUpgrade, loadDomains]);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleCreate = async (domainName: string) => {
    if (!activeWorkspaceId) return;
    setAdding(true);
    setError("");
    try {
      await domainsApi.create(activeWorkspaceId, domainName);
      closeModal();
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("domains.addError"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("domains.deleteConfirm"))) return;
    if (!activeWorkspaceId) return;
    try {
      await domainsApi.delete(id);
      await loadDomains();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("domains.deleteError"));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-0 space-y-6 pb-12">
      <DomainsPageHeader showAddButton={!needsUpgrade && domains.length > 0} onAdd={openModal} />

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {!workspaceReady ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : needsUpgrade ? (
        <DomainsUpgradeGate />
      ) : loading && domains.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <DomainsEmptyState onCreate={openModal} />
      ) : (
        <DomainsTable rows={domains} onDelete={handleDelete} />
      )}

      <CreateDomainModal open={modalOpen} onClose={closeModal} onSubmit={handleCreate} saving={adding} />
    </div>
  );
}
