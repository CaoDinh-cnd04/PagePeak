import { X } from "lucide-react";
import type { PlanItem } from "@/lib/shared/api";

type PlanCheckoutModalProps = {
  plan: PlanItem | null;
  open: boolean;
  onePayEnabled: boolean;
  loading: boolean;
  onClose: () => void;
  onPayOnePay: () => void;
};

export function PlanCheckoutModal({
  plan,
  open,
  onePayEnabled,
  loading,
  onClose,
  onPayOnePay,
}: PlanCheckoutModalProps) {
  if (!open || !plan) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Thanh toán gói</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {plan.name} —{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {plan.price.toLocaleString("vi-VN")}₫
              </span>
              /{plan.billingCycle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Bạn sẽ được chuyển tới cổng thanh toán OnePay (thẻ nội địa / quốc tế theo cấu hình cổng).
        </p>

        <div className="space-y-3">
          {onePayEnabled ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => onPayOnePay()}
              className="w-full px-4 py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Thanh toán OnePay"}
            </button>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400 text-center py-3 leading-relaxed">
              Thanh toán OnePay chưa được cấu hình trên hệ thống (OnePay:Enabled, MerchantId, AccessCode, SecureSecretHex).
              Vui lòng liên hệ quản trị hoặc cấu hình trong appsettings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
