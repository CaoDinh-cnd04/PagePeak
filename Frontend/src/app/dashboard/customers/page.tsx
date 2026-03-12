"use client";

import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Khách hàng</h1>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs">
          <Plus className="w-4 h-4 mr-1" />
          Import khách hàng
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa có khách hàng nào</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Khách hàng sẽ xuất hiện khi có leads từ Landing Page hoặc bạn import danh sách.</p>
      </div>
    </div>
  );
}
