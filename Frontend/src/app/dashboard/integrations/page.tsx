"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pagepeak_integrations";

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
};

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: "google-analytics", name: "Google Analytics", description: "Theo dõi lượt truy cập và hành vi người dùng trên landing page.", icon: "📊", enabled: false },
  { id: "facebook-pixel", name: "Facebook Pixel", description: "Theo dõi chuyển đổi từ quảng cáo Facebook và retargeting.", icon: "📘", enabled: false },
  { id: "google-tag-manager", name: "Google Tag Manager", description: "Quản lý tất cả thẻ tracking từ một nơi.", icon: "🏷️", enabled: false },
  { id: "webhook", name: "Webhook", description: "Gửi dữ liệu lead đến URL tùy chỉnh khi có form submit.", icon: "🔗", enabled: false },
  { id: "zapier", name: "Zapier", description: "Kết nối với hàng ngàn ứng dụng qua Zapier automation.", icon: "⚡", enabled: false },
  { id: "mailchimp", name: "Mailchimp", description: "Tự động thêm subscriber vào danh sách email marketing.", icon: "📧", enabled: false },
  { id: "telegram-bot", name: "Telegram Bot", description: "Nhận thông báo lead mới qua Telegram Bot.", icon: "✈️", enabled: false },
  { id: "slack", name: "Slack", description: "Gửi thông báo lead và đơn hàng vào kênh Slack.", icon: "💬", enabled: false },
];

function loadIntegrations(): Integration[] {
  if (typeof window === "undefined") return DEFAULT_INTEGRATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INTEGRATIONS;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return DEFAULT_INTEGRATIONS.map((i) => ({
      ...i,
      enabled: saved[i.id] ?? i.enabled,
    }));
  } catch {
    return DEFAULT_INTEGRATIONS;
  }
}

function saveIntegrations(integrations: Integration[]) {
  const state: Record<string, boolean> = {};
  for (const i of integrations) state[i.id] = i.enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);

  useEffect(() => {
    setIntegrations(loadIntegrations());
  }, []);

  const toggle = (id: string) => {
    setIntegrations((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i));
      saveIntegrations(next);
      return next;
    });
  };

  const enabledCount = integrations.filter((i) => i.enabled).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tích hợp</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {enabledCount} tích hợp đang bật · {integrations.length} tổng số
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={`bg-white dark:bg-slate-900 rounded-xl border p-5 transition ${
              integration.enabled
                ? "border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-100 dark:ring-indigo-500/10"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{integration.icon}</span>
              <button
                type="button"
                onClick={() => toggle(integration.id)}
                className={`relative w-10 h-6 rounded-full transition ${
                  integration.enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    integration.enabled ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{integration.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{integration.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
