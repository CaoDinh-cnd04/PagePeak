"use client";

import { Card, CardHeader } from "@/components/ui/Card";

export default function MediaLibraryPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Media Library" subtitle="Quản lý ảnh/video/file dùng trong Landing Page." />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Màn hình này sẽ được hoàn thiện ở bước tiếp theo.
        </p>
      </Card>
    </div>
  );
}

