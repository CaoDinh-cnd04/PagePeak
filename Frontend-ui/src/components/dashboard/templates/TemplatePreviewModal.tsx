import { useState } from "react";
import { Zap, X, LayoutGrid, Crown, Monitor, Smartphone, ExternalLink } from "lucide-react";
import type { TemplateItem } from "@/lib/shared/api";
import type { StaticTemplateItem } from "@/lib/dashboard/templates/staticTemplates";

type ViewportMode = "desktop" | "mobile";

type Props = {
  template: TemplateItem & { previewUrl?: string };
  onClose: () => void;
  onUse: () => void;
};

export function TemplatePreviewModal({ template, onClose, onUse }: Props) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const previewUrl = (template as StaticTemplateItem).previewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{template.name}</h3>
              {template.isPremium ? (
                <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-bold uppercase text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                  <Crown className="w-3 h-3" />
                  Pro
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {template.category}
              {template.description ? ` • ${template.description}` : ""}
            </p>
          </div>
        </div>

        {/* Viewport toggle */}
        {previewUrl ? (
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "desktop"
                  ? "bg-white shadow text-primary-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "mobile"
                  ? "bg-white shadow text-primary-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2 flex-shrink-0">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở tab mới
            </a>
          ) : null}
          <button
            type="button"
            onClick={onUse}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Sử dụng template này
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center py-6 px-4">
        {previewUrl ? (
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300"
            style={{
              width: viewport === "mobile" ? 375 : "100%",
              maxWidth: viewport === "mobile" ? 375 : 1280,
              minHeight: 600,
            }}
          >
            {!iframeLoaded && (
              <div className="w-full flex items-center justify-center" style={{ height: 600 }}>
                <div className="text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Đang tải preview...</p>
                </div>
              </div>
            )}
            <iframe
              src={previewUrl}
              title={template.name}
              className="w-full border-none"
              style={{
                height: 800,
                display: iframeLoaded ? "block" : "none",
              }}
              onLoad={() => setIframeLoaded(true)}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : template.thumbnailUrl ? (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full">
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="w-full"
              style={{ minHeight: 600 }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full">
            <div className="w-full h-96 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4" />
                <p>Chưa có preview cho template này</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
