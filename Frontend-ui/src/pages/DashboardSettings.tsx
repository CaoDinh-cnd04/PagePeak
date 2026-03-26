import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useT } from "@/lib/i18n";
import { useLangStore } from "@/stores/langStore";
import { settingsApi } from "@/lib/api";
import {
  User,
  Shield,
  CreditCard,
  Monitor,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  Trash2,
  Crown,
  Copy,
  ExternalLink,
  Smartphone,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  FileText,
  HardDrive,
  Zap,
  ShoppingBag,
  FlaskConical,
  Sparkles,
} from "lucide-react";

type TabKey = "account" | "security" | "members" | "billing" | "sessions";

const TABS: { key: TabKey; i18nKey: string; icon: React.ReactNode }[] = [
  { key: "account", i18nKey: "settings.tab.account", icon: <User className="w-4 h-4" /> },
  { key: "security", i18nKey: "settings.tab.security", icon: <Shield className="w-4 h-4" /> },
  { key: "members", i18nKey: "settings.tab.members", icon: <Users className="w-4 h-4" /> },
  { key: "billing", i18nKey: "settings.tab.billing", icon: <CreditCard className="w-4 h-4" /> },
  { key: "sessions", i18nKey: "settings.tab.sessions", icon: <Monitor className="w-4 h-4" /> },
];

type SessionItem = {
  id: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
};

type PlanData = {
  plan: {
    id: number;
    name: string;
    code: string;
    price: number;
    billingCycle: string;
    maxPages: number;
    maxMembers: number;
    maxPageViews?: number;
    storageGb: number;
    hasAi: boolean;
    hasEcommerce: boolean;
    hasAutomation: boolean;
    hasAbTest: boolean;
    hasCustomDomain: boolean;
  } | null;
  usage: { totalPages: number; publishedPages: number; totalMembers: number };
  planExpiresAt?: string;
  emailConfirmed: boolean;
  phoneConfirmed: boolean;
  createdAt: string;
  lastLoginAt?: string;
  referralCode?: string;
};

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = {
    success: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    error: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700",
    info: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  };
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <XCircle className="w-4 h-4 shrink-0" />,
    info: <AlertTriangle className="w-4 h-4 shrink-0" />,
  };
  return (
    <div className="fixed top-4 right-4 z-[100] animate-[toast-slide-in_0.3s_ease-out]">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg text-sm font-medium ${colors[type]}`}>
        {icons[type]}
        <span>{msg}</span>
        <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function UsageMeter({ label, used, max, icon }: { label: string; used: number; max: number; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          {icon}
          {label}
        </span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {used} <span className="text-slate-400 font-normal">/ {max}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function parseUserAgent(ua?: string): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Không rõ", os: "Không rõ", device: "desktop" };
  let browser = "Other";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  const device = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") ? "mobile" : "desktop";
  return { browser, os, device };
}

function formatDateLocale(dateStr?: string, lang?: string): string {
  if (!dateStr) return "—";
  const locale = lang === "en" ? "en-US" : lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : lang === "zh" ? "zh-CN" : lang === "th" ? "th-TH" : "vi-VN";
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgoLocale(dateStr: string | undefined, tt: (k: string) => string, lang?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return tt("settings.justNow");
  if (mins < 60) return `${mins} ${tt("settings.minutesAgo")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${tt("settings.hoursAgo")}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ${tt("settings.daysAgo")}`;
  return formatDateLocale(dateStr, lang);
}

export function DashboardSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, fetchMe } = useAuthStore();
  const t = useT();
  const lang = useLangStore((s) => s.lang);

  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "account");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // Account tab
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);

  // Security tab
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Sessions tab
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Plan tab
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const switchTab = useCallback(
    (t: TabKey) => {
      setActiveTab(t);
      setSearchParams({ tab: t });
    },
    [setSearchParams]
  );

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await settingsApi.getSessions();
      setSessions(data);
    } catch {
      setToast({ msg: t("common.error"), type: "error" });
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadPlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const data = await settingsApi.getPlanInfo();
      setPlanData(data);
    } catch {
      setToast({ msg: t("settings.cantLoadPlan"), type: "error" });
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "sessions") loadSessions();
    if (activeTab === "billing" || activeTab === "account") loadPlan();
  }, [activeTab, loadSessions, loadPlan]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await settingsApi.updateProfile({ fullName: fullName.trim(), phone: phone.trim() || undefined });
      await fetchMe();
      setToast({ msg: t("settings.saveSuccess"), type: "success" });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : t("common.error"), type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      setToast({ msg: t("settings.passwordMismatch"), type: "error" });
      return;
    }
    if (newPw.length < 6) {
      setToast({ msg: t("settings.passwordMinLength"), type: "error" });
      return;
    }
    setPwSaving(true);
    try {
      await settingsApi.changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setToast({ msg: t("settings.passwordChanged"), type: "success" });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : t("common.error"), type: "error" });
    } finally {
      setPwSaving(false);
    }
  };

  const handleRevokeSession = async (id: number) => {
    try {
      await settingsApi.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setToast({ msg: t("settings.revokeSuccess"), type: "success" });
    } catch {
      setToast({ msg: t("common.error"), type: "error" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ msg: t("settings.copied"), type: "info" });
  };

  const initials = (name?: string) => {
    if (!name) return "U";
    return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800"
            }`}
            onClick={() => switchTab(tab.key)}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(tab.i18nKey)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Profile card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary-500 via-violet-500 to-purple-500" />
            <div className="px-6 pb-6">
              <div className="flex items-end gap-4 -mt-10 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white dark:ring-slate-900 shrink-0">
                  {initials(user?.fullName)}
                </div>
                <div className="pb-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.fullName ?? "User"}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.fullName")}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.email")}</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email ?? ""}
                      disabled
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{t("settings.emailReadonly")}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.phone")}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.role")}</label>
                  <input
                    type="text"
                    value={user?.role === "quantrivien" ? t("settings.roleAdmin") : t("settings.roleUser")}
                    disabled
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {profileSaving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t("settings.save")}
                </button>
              </div>
            </div>
          </div>

          {/* Account verification status */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("settings.verifyStatus")}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                {planData?.emailConfirmed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("settings.email")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {planData?.emailConfirmed ? t("settings.verified") : t("settings.notVerified")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                {planData?.phoneConfirmed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("settings.phone")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {planData?.phoneConfirmed ? t("settings.verified") : t("settings.notVerified")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change password */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("settings.changePassword")}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.changePasswordDesc")}</p>
              </div>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.currentPassword")}</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder={t("settings.currentPasswordPlaceholder")}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCurrentPw((v) => !v)}
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.newPassword")}</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t("settings.newPasswordPlaceholder")}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowNewPw((v) => !v)}
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPw.length > 0 && newPw.length < 6 && (
                  <p className="mt-1 text-xs text-red-500">{t("settings.passwordMinLength")}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("settings.confirmPassword")}</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder={t("settings.confirmPasswordPlaceholder")}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                {confirmPw.length > 0 && confirmPw !== newPw && (
                  <p className="mt-1 text-xs text-red-500">{t("settings.passwordMismatch")}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={pwSaving || !currentPw || !newPw || newPw !== confirmPw}
                  onClick={handleChangePassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwSaving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("settings.changePassword")}
                </button>
              </div>
            </div>
          </div>

          {/* Security tips */}
          <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("settings.securityTips")}</h4>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  <li>• {t("settings.tip1")}</li>
                  <li>• {t("settings.tip2")}</li>
                  <li>• {t("settings.tip3")}</li>
                  <li>• {t("settings.tip4")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("settings.membersTitle")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.membersDesc")}</p>
                </div>
              </div>
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition">
                <Users className="w-4 h-4" />
                {t("settings.inviteMember")}
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 p-4 bg-primary-50 dark:bg-primary-500/5 border-b border-primary-100 dark:border-primary-500/10">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.fullName ?? "—"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "—"}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">
                  Owner
                </span>
              </div>
            </div>
            <div className="mt-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg p-6 text-center">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.membersComingSoon")}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          {planLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
                  <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                  <div className="h-4 w-60 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : planData ? (
            <>
              {/* Current plan */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 via-violet-500 to-purple-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-white" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{planData.plan?.name ?? "—"}</h3>
                      <p className="text-sm text-white/80">
                        {planData.plan?.price === 0
                          ? t("settings.planFree")
                          : `${planData.plan?.price.toLocaleString()} VND/${planData.plan?.billingCycle === "thang" ? t("settings.planMonth") : t("settings.planYear")}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-medium rounded-lg transition"
                  >
                    {t("settings.planUpgrade")}
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid gap-3 sm:grid-cols-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{t("settings.planExpiry")}:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {planData.planExpiresAt ? formatDateLocale(planData.planExpiresAt, lang) : t("profile.permanent")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{t("settings.planJoinDate")}:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDateLocale(planData.createdAt, lang)}</span>
                    </div>
                  </div>

                  {/* Usage meters */}
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t("settings.usage")}</h4>
                  <div className="space-y-4">
                    <UsageMeter
                      label={t("settings.usagePages")}
                      used={planData.usage.totalPages}
                      max={planData.plan?.maxPages ?? 10}
                      icon={<FileText className="w-4 h-4 text-primary-500" />}
                    />
                    <UsageMeter
                      label={t("settings.usageMembers")}
                      used={planData.usage.totalMembers}
                      max={planData.plan?.maxMembers ?? 1}
                      icon={<Users className="w-4 h-4 text-violet-500" />}
                    />
                    <UsageMeter
                      label={t("settings.usageStorage")}
                      used={0}
                      max={planData.plan?.storageGb ?? 1}
                      icon={<HardDrive className="w-4 h-4 text-emerald-500" />}
                    />
                  </div>
                </div>
              </div>

              {/* Plan features */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("settings.planFeatures")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: t("settings.featureAi"), enabled: planData.plan?.hasAi ?? false, icon: <Sparkles className="w-4 h-4" /> },
                    { label: t("settings.featureEcommerce"), enabled: planData.plan?.hasEcommerce ?? false, icon: <ShoppingBag className="w-4 h-4" /> },
                    { label: t("settings.featureAutomation"), enabled: planData.plan?.hasAutomation ?? false, icon: <Zap className="w-4 h-4" /> },
                    { label: t("settings.featureAbTest"), enabled: planData.plan?.hasAbTest ?? false, icon: <FlaskConical className="w-4 h-4" /> },
                    { label: t("settings.featureCustomDomain"), enabled: planData.plan?.hasCustomDomain ?? false, icon: <Globe className="w-4 h-4" /> },
                    { label: t("settings.featureAnalytics"), enabled: false, icon: <BarChart3 className="w-4 h-4" /> },
                  ].map((feat) => (
                    <div
                      key={feat.label}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        feat.enabled
                          ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20"
                          : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span className={feat.enabled ? "text-emerald-500" : "text-slate-400"}>{feat.icon}</span>
                      <span className={`text-sm font-medium ${feat.enabled ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400 dark:text-slate-500"}`}>
                        {feat.label}
                      </span>
                      {feat.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral code */}
              {planData.referralCode && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">{t("settings.referralCode")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t("settings.referralDesc")}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200">
                      {planData.referralCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(planData.referralCode!)}
                      className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.cantLoadPlan")}</p>
              <button type="button" onClick={loadPlan} className="mt-3 text-sm text-primary-600 hover:underline">
                {t("settings.retry")}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("settings.sessionsTitle")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("settings.sessionsDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadSessions}
                disabled={sessionsLoading}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                {t("settings.refresh")}
              </button>
            </div>

            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10">
                <Monitor className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.noSessions")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s, idx) => {
                  const info = parseUserAgent(s.userAgent);
                  const isCurrent = idx === 0 && !s.isExpired;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition ${
                        s.isExpired
                          ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                          : isCurrent
                          ? "bg-primary-50 dark:bg-primary-500/5 border-primary-200 dark:border-primary-500/20"
                          : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? "bg-primary-100 dark:bg-primary-500/20"
                            : s.isExpired
                            ? "bg-slate-100 dark:bg-slate-800"
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        {info.device === "mobile" ? (
                          <Smartphone className={`w-5 h-5 ${isCurrent ? "text-primary-600" : "text-slate-400"}`} />
                        ) : (
                          <Monitor className={`w-5 h-5 ${isCurrent ? "text-primary-600" : "text-slate-400"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {info.browser} · {info.os}
                          </p>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 text-[10px] font-bold rounded-full uppercase">
                              {t("settings.current")}
                            </span>
                          )}
                          {s.isExpired && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full uppercase">
                              {t("settings.expired")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          IP: {s.ipAddress ?? "—"} · {t("settings.loginTime")}: {timeAgoLocale(s.createdAt, t, lang)}
                        </p>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s.id)}
                          className="shrink-0 p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                          title={t("settings.revokeSession")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {t("settings.totalSessions")} {sessions.length} · {sessions.filter((s) => !s.isExpired).length} {t("settings.activeSessions")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
