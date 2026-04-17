import { useState, useEffect } from "react";
import { Play, ExternalLink, X } from "lucide-react";
import { sampleVideosApi, type SampleVideoApi } from "@/lib/shared/api";

export default function VideoPickerPanel({
  onUse,
  onClose,
  onBack,
  onOpenMedia,
}: {
  onUse: (url: string, name: string) => void;
  onClose?: () => void;
  onBack?: () => void;
  onOpenMedia?: () => void;
}) {
  const [videos, setVideos] = useState<SampleVideoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<{ embedUrl: string; name: string } | null>(null);

  useEffect(() => {
    sampleVideosApi
      .list()
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 shrink-0">
        <p className="text-[11px] font-semibold text-slate-700">Video mẫu</p>
        <div className="flex items-center gap-2">
          {onOpenMedia && (
            <button
              type="button"
              onClick={() => { onOpenMedia(); onClose?.(); }}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Xem thêm
            </button>
          )}
          {onBack && (
            <button type="button" onClick={onBack} className="p-1 rounded hover:bg-slate-100 text-slate-500">
              ←
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[360px]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center text-[11px] text-slate-400 py-8">Không có video mẫu</p>
        ) : (
          videos.map((vid, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
            >
              <div className="relative w-24 h-14 rounded overflow-hidden bg-slate-900 shrink-0">
                <img src={vid.thumbnailUrl} alt={vid.name} className="w-full h-full object-cover" loading="lazy" />
                <button
                  type="button"
                  onClick={() => setPreviewVideo({ embedUrl: vid.embedUrl, name: vid.name })}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition"
                  title="Xem trước"
                >
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-4 h-4 text-slate-800 ml-0.5" fill="currentColor" />
                  </div>
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-slate-800 truncate">{vid.name}</p>
                <p className="text-[9px] text-slate-500 capitalize">{vid.source} • Nhấn để chèn</p>
              </div>
              <button
                type="button"
                onClick={() => { onUse(vid.embedUrl, vid.name); onClose?.(); }}
                className="shrink-0 px-2.5 py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition"
              >
                Chèn
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-slate-200 shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} className="text-[11px] text-slate-500 hover:text-slate-700">
            ← Quay lại danh sách
          </button>
        )}
      </div>

      {previewVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewVideo(null)}>
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-800">{previewVideo.name}</p>
              <button type="button" onClick={() => setPreviewVideo(null)} className="p-2 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`${previewVideo.embedUrl}?autoplay=1`}
                title={previewVideo.name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setPreviewVideo(null)} className="px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded">
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const vid = videos.find((v) => v.embedUrl === previewVideo.embedUrl);
                  if (vid) { onUse(vid.embedUrl, vid.name); onClose?.(); setPreviewVideo(null); }
                }}
                className="px-3 py-1.5 text-[11px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Sử dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
