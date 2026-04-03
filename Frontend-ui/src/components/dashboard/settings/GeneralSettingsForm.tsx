import { useCallback, useEffect, useMemo, useState } from "react";
import { settingsApi, type WorkspaceGeneralDto } from "@/lib/shared/api";
import { useT } from "@/lib/shared/i18n";
import { DEFAULT_COUNTRY, PROVINCES, findDistrict, findProvince } from "@/lib/shared/vnAddressData";

const TIMEZONES = [
  { value: "Asia/Bangkok", label: "(GMT+07:00) Bangkok, Hanoi" },
  { value: "Asia/Ho_Chi_Minh", label: "(GMT+07:00) Ho Chi Minh" },
  { value: "UTC", label: "(GMT+00:00) UTC" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo" },
  { value: "Asia/Seoul", label: "(GMT+09:00) Seoul" },
];

type Props = {
  workspaceId: number | null;
  onSaved?: () => void;
};

export function GeneralSettingsForm({ workspaceId, onSaved }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [accountName, setAccountName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [currency, setCurrency] = useState("đ");

  const provinceData = useMemo(() => findProvince(province), [province]);
  const districts = provinceData?.districts ?? [];
  const districtData = useMemo(() => findDistrict(province, district), [province, district]);
  const wards = districtData?.wards ?? [];

  const load = useCallback(async () => {
    if (workspaceId == null) return;
    setLoading(true);
    try {
      const d: WorkspaceGeneralDto = await settingsApi.getWorkspaceGeneral(workspaceId);
      setAccountName(d.accountName ?? "");
      setStoreName(d.storeName ?? "");
      setStoreAddress(d.storeAddress ?? "");
      setStorePhone(d.storePhone ?? "");
      setPostalCode(d.postalCode ?? "");
      setCountry(d.country?.trim() || DEFAULT_COUNTRY);
      setProvince(d.province ?? "");
      setDistrict(d.district ?? "");
      setWard(d.ward ?? "");
      const tz = d.timezone?.trim();
      setTimezone(tz && TIMEZONES.some((x) => x.value === tz) ? tz : "Asia/Bangkok");
      setCurrency(d.currency ?? "đ");
    } catch {
      setToast({ msg: t("common.error"), ok: false });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onProvinceChange = (v: string) => {
    setProvince(v);
    setDistrict("");
    setWard("");
  };

  const onDistrictChange = (v: string) => {
    setDistrict(v);
    setWard("");
  };

  const handleSave = async () => {
    if (workspaceId == null) return;
    setSaving(true);
    setToast(null);
    try {
      await settingsApi.updateWorkspaceGeneral(workspaceId, {
        accountName,
        storeName,
        storeAddress,
        storePhone,
        postalCode,
        country,
        province,
        district,
        ward,
        timezone,
        currency,
      });
      setToast({ msg: t("settings.general.saveSuccess"), ok: true });
      onSaved?.();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : t("common.error"), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  const section = (title: string, desc: string, children: React.ReactNode) => (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-6 py-8 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  if (workspaceId == null) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        {t("settings.general.noWorkspace")}
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2 text-sm ${
            toast.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("settings.general.title")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("settings.general.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void handleSave()}
          className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm disabled:opacity-50"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          <span className={saving ? "ml-2" : ""}>{t("settings.general.update")}</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-8">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {section(t("settings.general.accountName"), t("settings.general.accountNameDesc"), (
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className={fieldClass}
              />
            ))}

            {section(t("settings.general.storeName"), t("settings.general.storeNameDesc"), (
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className={fieldClass} />
            ))}

            {section(t("settings.general.storeAddress"), t("settings.general.storeAddressDesc"), (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.addressLine")}</label>
                  <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} className={fieldClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.phone")}</label>
                    <input type="text" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.postalCode")}</label>
                    <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={fieldClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.country")}</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} className={fieldClass}>
                      <option value={DEFAULT_COUNTRY}>{DEFAULT_COUNTRY}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.province")}</label>
                    <select value={province} onChange={(e) => onProvinceChange(e.target.value)} className={fieldClass}>
                      <option value="">{t("settings.general.selectProvince")}</option>
                      {PROVINCES.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.district")}</label>
                    <select value={district} onChange={(e) => onDistrictChange(e.target.value)} className={fieldClass} disabled={!province}>
                      <option value="">{t("settings.general.selectDistrict")}</option>
                      {districts.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.ward")}</label>
                    <select value={ward} onChange={(e) => setWard(e.target.value)} className={fieldClass} disabled={!district}>
                      <option value="">{t("settings.general.selectWard")}</option>
                      {wards.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ))}

            {section(t("settings.general.standards"), t("settings.general.standardsDesc"), (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.timezone")}</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={fieldClass}>
                    {TIMEZONES.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t("settings.general.currency")}</label>
                  <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldClass} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
