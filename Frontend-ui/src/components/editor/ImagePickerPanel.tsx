import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Search, CloudUpload } from "lucide-react";
import { mediaApi, type MediaItem } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024;

const STOCK_IMAGES: { url: string; name: string; category: string; w: number; h: number }[] = [
  { url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop", name: "Văn phòng", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop", name: "Họp nhóm", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop", name: "Núi tuyết", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop", name: "Rừng xanh", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop", name: "Công nghệ", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop", name: "Chân dung", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop", name: "Ẩm thực", category: "food", w: 800, h: 600 },
];

type ImagePickerTab = "upload" | "free" | "illustration" | "more";

export default function ImagePickerPanel({
  onUse,
  onClose,
  onBack,
}: {
  onUse: (url: string, name: string, width?: number, height?: number) => void;
  onClose?: () => void;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<ImagePickerTab>("upload");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ url: string; name: string; w?: number; h?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const result = await mediaApi.list(1, 200);
      setItems(result.items.filter((i) => i.contentType.startsWith("image/")));
    } catch {
      setError("Không tải được thư viện ảnh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "upload") fetchMedia();
  }, [tab, fetchMedia]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError("");

    let completed = 0;
    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      if (!IMAGE_TYPES.includes(file.type)) {
        setError(`"${file.name}" - Chỉ hỗ trợ JPG, PNG, GIF, WebP, SVG`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" - Ảnh tối đa 10MB`);
        continue;
      }
      try {
        const item = await mediaApi.upload(file);
        newItems.push(item);
      } catch {
        setError("Tải ảnh lên thất bại");
      }
      completed++;
      setUploadProgress(Math.round((completed / fileArray.length) * 100));
    }

    if (newItems.length > 0) {
      setItems((prev) => [...newItems, ...prev]);
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const getFullUrl = (url: string) => (url.startsWith("http") ? url : `${API_URL}${url}`);

  const handleUse = () => {
    if (selectedItem) {
      onUse(selectedItem.url, selectedItem.name, selectedItem.w, selectedItem.h);
      setSelectedItem(null);
      onClose?.();
    }
  };

  const tabs: { key: ImagePickerTab; label: string }[] = [
    { key: "upload", label: "Ảnh" },
    { key: "free", label: "Ảnh miễn phí" },
    { key: "illustration", label: "Ảnh minh họa" },
    { key: "more", label: "Xem thêm" },
  ];

  const displayItems =
    tab === "upload"
      ? items.filter((i) => !search || i.originalName.toLowerCase().includes(search.toLowerCase()))
      : [];
  const stockItems =
    tab === "free" || tab === "illustration"
      ? STOCK_IMAGES.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      : tab === "more"
        ? STOCK_IMAGES.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
        : [];

  const selectMediaItem = (item: MediaItem) => {
    const url = getFullUrl(item.url);
    setSelectedItem({ url, name: item.originalName });
  };

  const selectStockItem = (img: (typeof STOCK_IMAGES)[0]) => {
    setSelectedItem({ url: img.url, name: img.name, w: img.w, h: img.h });
  };

  const isSelected = (url: string) => selectedItem?.url === url;

  return (
    <div className="flex flex-col w-[320px] max-h-[420px]">
      {/* Tabs */}
      <div className="flex border-b border-[#e0e0e0] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2.5 text-[11px] font-medium transition border-b-2 ${
              tab === t.key ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Upload */}
      <div className="p-3 border-b border-[#e0e0e0] space-y-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1e2d7d] focus:border-transparent"
            />
          </div>
          <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2d7d] hover:bg-[#162558] text-white text-[11px] font-semibold rounded-lg transition disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" />
            + Chọn tệp
          </button>
        </div>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">Tất cả</span>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <CloudUpload className="w-4 h-4 text-[#1e2d7d] animate-pulse" />
            <span className="text-xs text-slate-600">Đang tải lên... {uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#1e2d7d] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600">{error}</div>
      )}

      {/* Image grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {tab === "upload" && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#1e2d7d] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Upload className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-xs">Chưa có ảnh. Nhấn &quot;+ Chọn tệp&quot; để tải lên</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {displayItems.map((item) => {
                  const url = getFullUrl(item.url);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectMediaItem(item)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                        isSelected(url) ? "border-[#1e2d7d] ring-2 ring-[#1e2d7d]/30" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img src={url} alt={item.originalName} className="w-full h-full object-cover" />
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                        {item.originalName}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {(tab === "free" || tab === "illustration" || tab === "more") && (
          <div className="grid grid-cols-2 gap-2">
            {stockItems.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectStockItem(img)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                  isSelected(img.url) ? "border-[#1e2d7d] ring-2 ring-[#1e2d7d]/30" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                  {img.name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Back + Sử dụng */}
      <div className="p-3 border-t border-[#e0e0e0] shrink-0 flex items-center justify-between">
        {onBack && (
          <button type="button" onClick={onBack} className="text-[11px] text-slate-500 hover:text-slate-700">
            ← Quay lại danh sách
          </button>
        )}
        <div className={onBack ? "ml-auto" : ""}>
          <button
            type="button"
            onClick={handleUse}
            disabled={!selectedItem}
            className="px-5 py-2 bg-[#1e2d7d] hover:bg-[#162558] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition"
          >
            Sử dụng
          </button>
        </div>
      </div>
    </div>
  );
}
