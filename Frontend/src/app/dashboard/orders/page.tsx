"use client";

import { ShoppingBag } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đơn hàng</h1>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa có đơn hàng nào</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Đơn hàng sẽ xuất hiện ở đây khi khách hàng mua sản phẩm qua Landing Page của bạn.</p>
      </div>
    </div>
  );
}
