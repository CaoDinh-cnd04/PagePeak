"use client";

import { useState, useEffect } from "react";
import MediaPanel from "@/components/editor/MediaPanel";

export default function MediaLibraryPage() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const copyAndToast = (url: string) => {
    navigator.clipboard.writeText(url);
    setToast("Đã copy URL vào clipboard");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thư viện Media</h1>
      </div>
      {toast && (
        <div className="fixed top-20 right-4 z-[200] px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ minHeight: 600 }}>
        <MediaPanel
          onInsertImage={(url) => copyAndToast(url)}
          onInsertVideo={(url) => copyAndToast(url)}
        />
      </div>
    </div>
  );
}
