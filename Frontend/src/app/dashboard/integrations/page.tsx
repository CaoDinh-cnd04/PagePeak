"use client";

import { Card, CardHeader } from "@/components/ui/Card";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Integrations" subtitle="Kết nối CRM, Email marketing, Pixel, Webhook..." />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Màn hình này sẽ được hoàn thiện ở bước tiếp theo.
        </p>
      </Card>
    </div>
  );
}

