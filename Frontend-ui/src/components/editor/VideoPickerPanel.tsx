import { useState } from "react";
import { Play, ExternalLink, X } from "lucide-react";

const SAMPLE_VIDEOS: { url: string; embedUrl: string; name: string; thumbnail: string }[] = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", name: "Sample Video 1", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", embedUrl: "https://www.youtube.com/embed/jNQXAC9IVRw", name: "First YouTube Video", thumbnail: "https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=9bZkp7q19f0", embedUrl: "https://www.youtube.com/embed/9bZkp7q19f0", name: "Gangnam Style", thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", embedUrl: "https://www.youtube.com/embed/kJQP7kiw5Fk", name: "Despacito", thumbnail: "https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=RgKAFK5djSk", embedUrl: "https://www.youtube.com/embed/RgKAFK5djSk", name: "See You Again", thumbnail: "https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=JGwWNGJdvx8", embedUrl: "https://www.youtube.com/embed/JGwWNGJdvx8", name: "Shape of You", thumbnail: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=60ItHLz5WEA", embedUrl: "https://www.youtube.com/embed/60ItHLz5WEA", name: "Alan Walker - Faded", thumbnail: "https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=CevxZvSJLk8", embedUrl: "https://www.youtube.com/embed/CevxZvSJLk8", name: "Roar - Katy Perry", thumbnail: "https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg" },
];

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
  const [previewVideo, setPreviewVideo] = useState<{ embedUrl: string; name: string } | null>(null);

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
        {SAMPLE_VIDEOS.map((vid, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
          >
            <div className="relative w-24 h-14 rounded overflow-hidden bg-slate-900 shrink-0">
              <img src={vid.thumbnail} alt={vid.name} className="w-full h-full object-cover" loading="lazy" />
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
              <p className="text-[9px] text-slate-500">YouTube • Nhấn để chèn</p>
            </div>
            <button
              type="button"
              onClick={() => { onUse(vid.embedUrl, vid.name); onClose?.(); }}
              className="shrink-0 px-2.5 py-1.5 text-[10px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition"
            >
              Chèn
            </button>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-slate-200 shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} className="text-[11px] text-slate-500 hover:text-slate-700">
            ← Quay lại danh sách
          </button>
        )}
      </div>

      {/* Preview modal */}
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
                  const vid = SAMPLE_VIDEOS.find((v) => v.embedUrl === previewVideo.embedUrl);
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
