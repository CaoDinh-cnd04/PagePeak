import { useEffect, useState } from "react";
import { pagesApi } from "@/lib/api";
import { generatePreviewHtml } from "@/lib/generatePreviewHtml";

type Props = {
  pageId: number;
  className?: string;
};

export function PagePreviewThumbnail({ pageId, className = "" }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    pagesApi
      .getContent(pageId)
      .then((content) => {
        if (cancelled) return;
        const sections = content?.sections ?? [];
        if (sections.length > 0) {
          const preview = generatePreviewHtml(sections, {
            metaTitle: content.metaTitle ?? content.name ?? "Preview",
            metaDescription: content.metaDescription ?? "",
            thumbnail: true,
            pageId: content.pageId,
            workspaceId: content.workspaceId,
            apiBaseUrl: import.meta.env.VITE_API_URL,
          });
          setHtml(preview);
        } else {
          setHtml(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pageId]);

  if (loading) {
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-slate-100 to-slate-50 dark:from-indigo-500/20 dark:via-slate-900 dark:to-slate-950 animate-pulse ${className}`}
      />
    );
  }

  if (error || !html) {
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-slate-100 to-slate-50 dark:from-indigo-500/20 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center ${className}`}
      >
        <span className="text-xs text-slate-400 dark:text-slate-500">Chưa có thiết kế</span>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      title="Preview"
      className={`absolute inset-0 w-full h-full border-0 pointer-events-none ${className}`}
      sandbox="allow-same-origin"
    />
  );
}
