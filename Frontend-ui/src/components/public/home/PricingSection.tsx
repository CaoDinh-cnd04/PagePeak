import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { plansApi, type BillingOptions, type PlanItem } from "@/lib/shared/api";
import { useAuthStore } from "@/stores/shared/authStore";
import { PlanCheckoutModal } from "@/components/public/home/PlanCheckoutModal";

const FEATURE_LABELS: Record<string, string> = {
  hasAi: "Tạo trang bằng AI",
  hasEcommerce: "Tích hợp bán hàng",
  hasAutomation: "Automation",
  hasAbTest: "A/B Testing",
  hasCustomDomain: "Tên miền riêng",
};

const PLAN_COLORS: Record<string, { border: string; bg: string; text: string; button: string }> = {
  free: { border: "border-slate-200", bg: "bg-white dark:bg-slate-900", text: "text-slate-900", button: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800" },
  pro: { border: "border-indigo-400 ring-2 ring-indigo-200", bg: "bg-white dark:bg-slate-900", text: "text-indigo-600", button: "bg-indigo-600 text-white hover:bg-indigo-700" },
  enterprise: { border: "border-amber-300", bg: "bg-white dark:bg-slate-900", text: "text-amber-600", button: "bg-amber-600 text-white hover:bg-amber-700" },
};

function getColor(code: string) {
  return PLAN_COLORS[code] ?? PLAN_COLORS.free;
}

export function PricingSection() {
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [billing, setBilling] = useState<BillingOptions | null>(null);
  const [billingLoadFailed, setBillingLoadFailed] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<number | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanItem | null>(null);
  const [upgradeError, setUpgradeError] = useState("");

  useEffect(() => {
    plansApi.list().then(setPlans).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setBilling((b) => b ?? { onePayEnabled: false, testUpgradeEnabled: false });
      }
    }, 6000);
    plansApi
      .billingOptions()
      .then((opts) => {
        if (cancelled) return;
        setBilling(opts);
        setBillingLoadFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBilling({ onePayEnabled: false, testUpgradeEnabled: false });
        setBillingLoadFailed(true);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const openCheckout = (plan: PlanItem) => {
    setUpgradeError("");
    setCheckoutPlan(plan);
  };

  const runOnePayCheckout = async () => {
    if (!checkoutPlan) return;
    setUpgradeError("");
    setUpgradingPlanId(checkoutPlan.id);
    try {
      const { payUrl } = await plansApi.createOnePayCheckout(
        checkoutPlan.id,
        typeof window !== "undefined" ? window.location.origin : undefined
      );
      setCheckoutPlan(null);
      try {
        sessionStorage.setItem("onepayExpectedPlanId", String(checkoutPlan.id));
      } catch {
        /* ignore */
      }
      window.location.href = payUrl;
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : "Không tạo được link OnePay.");
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const fallbackPlans: PlanItem[] = plans.length > 0 ? plans : [
    { id: 1, name: "Miễn phí", code: "free", price: 0, billingCycle: "thang", maxPages: 10, maxMembers: 1, maxPageViews: null, storageGb: 1, hasAi: false, hasEcommerce: false, hasAutomation: false, hasAbTest: false, hasCustomDomain: false },
    { id: 2, name: "Pro", code: "pro", price: 299000, billingCycle: "thang", maxPages: 100, maxMembers: 5, maxPageViews: 100000, storageGb: 10, hasAi: true, hasEcommerce: true, hasAutomation: true, hasAbTest: true, hasCustomDomain: true },
    { id: 3, name: "Enterprise", code: "enterprise", price: 999000, billingCycle: "thang", maxPages: 9999, maxMembers: 50, maxPageViews: null, storageGb: 100, hasAi: true, hasEcommerce: true, hasAutomation: true, hasAbTest: true, hasCustomDomain: true },
  ];

  return (
    <section id="bang-gia" className="py-16 bg-white dark:bg-slate-950 scroll-mt-20">
      <PlanCheckoutModal
        plan={checkoutPlan}
        open={checkoutPlan !== null}
        onePayEnabled={billing?.onePayEnabled ?? false}
        loading={upgradingPlanId !== null}
        onClose={() => !upgradingPlanId && setCheckoutPlan(null)}
        onPayOnePay={() => void runOnePayCheckout()}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4">Bảng giá</h2>
        <p className="text-slate-600 dark:text-slate-300 text-center max-w-xl mx-auto mb-12">
          Chọn gói phù hợp với quy mô và nhu cầu của bạn. Bắt đầu miễn phí, nâng cấp khi cần.
        </p>
        {upgradeError && (
          <p className="text-center text-red-600 dark:text-red-400 mb-4">{upgradeError}</p>
        )}
        {billingLoadFailed && (
          <p className="text-center text-amber-700 dark:text-amber-400 text-sm mb-4">
            Không tải được cấu hình thanh toán — kiểm tra API (VITE_API_URL) và backend đang chạy.
          </p>
        )}
        {billing && !billing.onePayEnabled && !billingLoadFailed && (
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-2xl mx-auto">
            Nâng cấp gói trả phí cần cấu hình OnePay trên API (OnePay:Enabled, MerchantId, AccessCode, SecureSecretHex).
          </p>
        )}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {fallbackPlans.map((plan) => {
            const c = getColor(plan.code);
            return (
              <div key={plan.id} className={`relative rounded-2xl border ${c.border} ${c.bg} p-8 flex flex-col`}>
                {plan.code === "pro" && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Phổ biến nhất
                  </span>
                )}
                <h3 className={`text-xl font-bold ${c.text} dark:text-slate-100 mb-2`}>{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                    {plan.price === 0 ? "Miễn phí" : `${plan.price.toLocaleString("vi-VN")}₫`}
                  </span>
                  {plan.price > 0 && <span className="text-slate-500 text-sm">/{plan.billingCycle}</span>}
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Tối đa{" "}
                    {plan.maxPages < 0 || plan.maxPages >= 9999 ? "Không giới hạn" : plan.maxPages} trang
                  </li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> {plan.maxMembers >= 50 ? "Không giới hạn" : plan.maxMembers} thành viên</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> {plan.storageGb} GB lưu trữ</li>
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const has = plan[key as keyof PlanItem];
                    return (
                      <li key={key} className={`flex items-center gap-2 ${has ? "" : "opacity-40 line-through"}`}>
                        <Check className={`w-4 h-4 shrink-0 ${has ? "text-emerald-500" : "text-slate-300"}`} />
                        {label}
                      </li>
                    );
                  })}
                </ul>
                {user ? (
                  plan.price === 0 ? (
                    <Link
                      to="/dashboard/pages"
                      className={`block text-center px-6 py-3 rounded-xl font-semibold transition ${c.button}`}
                    >
                      Vào Dashboard
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCheckout(plan)}
                      disabled={!!upgradingPlanId || billing === null}
                      title={
                        billing === null
                          ? "Đang tải cấu hình thanh toán…"
                          : upgradingPlanId
                            ? "Đang xử lý thanh toán…"
                            : undefined
                      }
                      className={`w-full px-6 py-3 rounded-xl font-semibold transition ${c.button} disabled:opacity-50`}
                    >
                      {upgradingPlanId === plan.id ? "Đang chuyển tới OnePay..." : "Thanh toán OnePay"}
                    </button>
                  )
                ) : (
                  <Link
                    to={plan.price === 0 ? "/register" : "/login"}
                    className={`block text-center px-6 py-3 rounded-xl font-semibold transition ${c.button}`}
                  >
                    {plan.price === 0 ? "Bắt đầu miễn phí" : "Nâng cấp ngay"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
