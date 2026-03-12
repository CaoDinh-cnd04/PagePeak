"use client";

import { Box, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sản phẩm</h1>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs">
          <Plus className="w-4 h-4 mr-1" />
          Thêm sản phẩm
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <Box className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa có sản phẩm nào</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Thêm sản phẩm để bắt đầu bán hàng qua Landing Page.</p>
      </div>
    </div>
  );
}
