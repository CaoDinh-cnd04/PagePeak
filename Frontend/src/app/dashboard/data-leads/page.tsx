"use client";

import { Database } from "lucide-react";

export default function DataLeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Leads</h1>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa có dữ liệu leads</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dữ liệu leads từ các form trên Landing Page sẽ hiển thị tại đây.</p>
      </div>
    </div>
  );
}
