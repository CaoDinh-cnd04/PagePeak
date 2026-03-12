"use client";

import { BarChart3 } from "lucide-react";

export type PageStatsModalProps = {
  open: boolean;
  onClose: () => void;
  pageName: string;
  stats: {
    viewCount: number;
    conversionCount: number;
    lastViewedAt: string | null;
  } | null;
  loading?: boolean;
};

export function PageStatsModal({ open, onClose, pageName, stats, loading }: PageStatsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold">Thống kê</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate" title={pageName}>
          {pageName}
        </p>
        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Lượt xem</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.viewCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Chuyển đổi</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.conversionCount}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 dark:text-slate-400">Xem lần cuối</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {stats.lastViewedAt ? new Date(stats.lastViewedAt).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
