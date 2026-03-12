"use client";

import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Báo cáo</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Lượt xem", value: "0", color: "text-blue-600" },
          { label: "Tỷ lệ chuyển đổi", value: "0%", color: "text-emerald-600" },
          { label: "Leads", value: "0", color: "text-violet-600" },
          { label: "Doanh thu", value: "0₫", color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa có dữ liệu</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dữ liệu báo cáo sẽ xuất hiện khi Landing Pages của bạn bắt đầu có lượt truy cập.</p>
      </div>
    </div>
  );
}
