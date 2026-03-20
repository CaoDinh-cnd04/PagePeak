import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, ImagePlus, Clipboard, FolderOpen, Trash2, X,
  Search, Grid3X3, List, Film, FileImage,
  CloudUpload, Copy, Check, ZoomIn,
} from "lucide-react";
import { mediaApi, type MediaItem } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/svg+xml", "video/mp4", "video/webm",
];

const MAX_SIZE = 10 * 1024 * 1024;

type ViewMode = "grid" | "list";

type MediaTab = "all" | "images" | "videos" | "upload" | "stock";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

type StockCategory = "all" | "business" | "nature" | "technology" | "people" | "food" | "video";

const STOCK_IMAGES: { url: string; name: string; category: string; w: number; h: number }[] = [
  { url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop", name: "Văn phòng hiện đại", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop", name: "Họp nhóm startup", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", name: "Dashboard analytics", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop", name: "Làm việc từ xa", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&h=600&fit=crop", name: "Doanh nghiệp", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop", name: "Núi tuyết", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop", name: "Rừng xanh", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=600&fit=crop", name: "Phong cảnh thiên nhiên", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop", name: "Cánh rừng", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop", name: "Biển xanh", category: "nature", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop", name: "Mạch điện tử", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop", name: "Gaming setup", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop", name: "Laptop code", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop", name: "Nhóm làm việc", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=600&fit=crop", name: "Công nghệ tương lai", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop", name: "Chân dung nam", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop", name: "Chân dung nữ", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop", name: "Nhóm trẻ", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=600&fit=crop", name: "Nữ doanh nhân", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=600&fit=crop", name: "Nam doanh nhân", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop", name: "Salad tươi", category: "food", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop", name: "Pizza", category: "food", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop", name: "Pancake", category: "food", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop", name: "Món ăn đẹp", category: "food", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop", name: "Burger", category: "food", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=600&fit=crop", name: "Shopping online", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop", name: "App mobile", category: "technology", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop", name: "Phòng họp", category: "business", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop", name: "Teamwork", category: "people", w: 800, h: 600 },
  { url: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=600&fit=crop", name: "Brainstorm", category: "business", w: 800, h: 600 },
];

const STOCK_VIDEOS: { url: string; embedUrl: string; name: string; thumbnail: string }[] = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", name: "Sample Video 1", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", embedUrl: "https://www.youtube.com/embed/jNQXAC9IVRw", name: "First YouTube Video", thumbnail: "https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=9bZkp7q19f0", embedUrl: "https://www.youtube.com/embed/9bZkp7q19f0", name: "Gangnam Style", thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", embedUrl: "https://www.youtube.com/embed/kJQP7kiw5Fk", name: "Despacito", thumbnail: "https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=RgKAFK5djSk", embedUrl: "https://www.youtube.com/embed/RgKAFK5djSk", name: "See You Again", thumbnail: "https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=JGwWNGJdvx8", embedUrl: "https://www.youtube.com/embed/JGwWNGJdvx8", name: "Shape of You", thumbnail: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ", embedUrl: "https://www.youtube.com/embed/fJ9rUzIMcZQ", name: "Bohemian Rhapsody", thumbnail: "https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=OPf0YbXqDm0", embedUrl: "https://www.youtube.com/embed/OPf0YbXqDm0", name: "Uptown Funk", thumbnail: "https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=60ItHLz5WEA", embedUrl: "https://www.youtube.com/embed/60ItHLz5WEA", name: "Alan Walker - Faded", thumbnail: "https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg" },
  { url: "https://www.youtube.com/watch?v=CevxZvSJLk8", embedUrl: "https://www.youtube.com/embed/CevxZvSJLk8", name: "Roar - Katy Perry", thumbnail: "https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg" },
];

const STOCK_CATEGORIES: { key: StockCategory; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "business", label: "Kinh doanh" },
  { key: "nature", label: "Thiên nhiên" },
  { key: "technology", label: "Công nghệ" },
  { key: "people", label: "Con người" },
  { key: "food", label: "Ẩm thực" },
  { key: "video", label: "Video" },
];

export default function MediaPanel({
  onInsertImage,
  onInsertVideo,
}: {
  onInsertImage: (url: string, name: string, width?: number, height?: number) => void;
  onInsertVideo?: (url: string, name: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<MediaTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<number | null>(null);
  const [stockCategory, setStockCategory] = useState<StockCategory>("all");
  const [stockSearch, setStockSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const result = await mediaApi.list(1, 200);
      setItems(result.items);
    } catch {
      setError("Không tải được thư viện media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError("");

    let completed = 0;
    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" - định dạng không hỗ trợ`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" - vượt quá 10MB`);
        continue;
      }

      try {
        const item = await mediaApi.upload(file);
        newItems.push(item);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload thất bại");
      }

      completed++;
      setUploadProgress(Math.round((completed / fileArray.length) * 100));
    }

    if (newItems.length > 0) {
      setItems((prev) => [...newItems, ...prev]);
    }
    setUploading(false);
    setUploadProgress(0);
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;

    const files: File[] = [];
    for (const item of Array.from(clipItems)) {
      if (item.kind === "file" && ALLOWED_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      await handleUpload(files);
    }
  }, [handleUpload]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await handleUpload(files);
  }, [handleUpload]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await mediaApi.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) setSelectedId(null);
      setContextMenu(null);
    } catch {
      setError("Xóa thất bại");
    }
  }, [selectedId]);

  const handleCopyUrl = useCallback((item: MediaItem) => {
    const fullUrl = item.url.startsWith("http") ? item.url : `${API_URL}${item.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(item.id);
    setTimeout(() => setCopiedUrl(null), 2000);
  }, []);

  const filteredItems = items.filter((item) => {
    if (search && !item.originalName.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === "images" && !item.contentType.startsWith("image/")) return false;
    if (tab === "videos" && !item.contentType.startsWith("video/")) return false;
    return true;
  });

  const selectedItem = items.find((i) => i.id === selectedId);
  const isVideo = (ct: string) => ct.startsWith("video/");
  const getFullUrl = (url: string) => url.startsWith("http") ? url : `${API_URL}${url}`;

  return (
    <div
      ref={pasteAreaRef}
      className="flex flex-col h-full relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary-500/10 border-2 border-dashed border-primary-500 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <CloudUpload className="w-12 h-12 text-primary-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-primary-600">Thả file vào đây</p>
            <p className="text-xs text-slate-500">Hỗ trợ: JPG, PNG, GIF, WEBP, SVG, MP4, WEBM</p>
          </div>
        </div>
      )}

      {/* Top actions bar */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
        {tab !== "stock" && (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                Tải lên
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ALLOWED_TYPES.join(",");
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleUpload(files);
                  };
                  input.click();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition"
                title="Dán ảnh (Ctrl+V)"
              >
                <Clipboard className="w-4 h-4" />
                Dán ảnh
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ""; }}
            />

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-700 dark:text-slate-200"
              />
            </div>
          </>
        )}

        {/* Tabs + view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {([
              { key: "all", label: "Tất cả", icon: FolderOpen },
              { key: "images", label: "Ảnh", icon: FileImage },
              { key: "videos", label: "Video", icon: Film },
              { key: "stock", label: "Kho ảnh", icon: ImagePlus },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition ${
                  tab === t.key
                    ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition ${viewMode === "grid" ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <CloudUpload className="w-4 h-4 text-primary-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Đang tải lên... {uploadProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-between">
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          <button type="button" onClick={() => setError("")}><X className="w-3 h-3 text-red-400" /></button>
        </div>
      )}

      {/* Stock gallery */}
      {tab === "stock" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-3 pt-2 pb-1.5 border-b border-slate-200 space-y-2 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm ảnh/video mẫu..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {STOCK_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setStockCategory(c.key)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-full transition ${
                    stockCategory === c.key
                      ? "bg-primary-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3">
            {stockCategory !== "video" && (
              <>
                {stockCategory === "all" && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hình ảnh miễn phí</p>}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {STOCK_IMAGES
                    .filter((img) => {
                      const cat: string = stockCategory;
                      if (cat !== "all" && cat !== "video" && img.category !== cat) return false;
                      if (stockSearch && !img.name.toLowerCase().includes(stockSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onInsertImage(img.url, img.name, img.w, img.h)}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-primary-400 transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="aspect-[4/3] bg-slate-100 relative">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="px-3 py-1.5 bg-primary-600 text-white text-[10px] font-bold rounded-full shadow-lg">+ Chèn ảnh</span>
                      </div>
                      <div className="px-1.5 py-1 bg-white">
                        <p className="text-[10px] text-slate-600 truncate font-medium">{img.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {(stockCategory === "all" || stockCategory === "video") && (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Video YouTube</p>
                <div className="space-y-2">
                  {STOCK_VIDEOS
                    .filter((v) => !stockSearch || v.name.toLowerCase().includes(stockSearch.toLowerCase()))
                    .map((vid, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onInsertVideo?.(vid.embedUrl, vid.name)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition group text-left"
                    >
                      <div className="w-20 h-12 rounded overflow-hidden bg-slate-900 shrink-0 relative">
                        <img src={vid.thumbnail} alt={vid.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow">
                            <span className="text-white text-[8px] ml-0.5">▶</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-700 truncate">{vid.name}</p>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">YouTube · Nhấn để chèn</p>
                      </div>
                      <span className="text-[9px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 shrink-0">+ Chèn</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Media grid/list */}
      {tab !== "stock" && <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <ImagePlus className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {search ? "Không tìm thấy media" : "Chưa có media nào"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Tải ảnh lên hoặc dán (Ctrl+V) để thêm vào thư viện
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Tải ảnh lên
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  selectedId === item.id
                    ? "border-primary-500 ring-2 ring-primary-500/30"
                    : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                onDoubleClick={() => {
                  if (isVideo(item.contentType)) {
                    onInsertVideo?.(getFullUrl(item.url), item.originalName);
                  } else {
                    onInsertImage(getFullUrl(item.url), item.originalName, item.width ?? undefined, item.height ?? undefined);
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: item.id, x: e.clientX, y: e.clientY }); }}
              >
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                  {isVideo(item.contentType) ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                      <Film className="w-8 h-8 text-slate-500" />
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-medium">
                        VIDEO
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <img src={getFullUrl(item.url)} alt={item.altText ?? item.originalName} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end opacity-0 group-hover:opacity-100">
                  <div className="w-full px-1.5 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[10px] text-white font-medium truncate">{item.originalName}</p>
                    <p className="text-[9px] text-white/60">{formatBytes(item.fileSize)}</p>
                  </div>
                </div>

                {/* Quick action buttons on hover */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(item); }}
                    className="w-6 h-6 rounded bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
                    title="Copy URL"
                  >
                    {copiedUrl === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                    className="w-6 h-6 rounded bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
                    title="Xem chi tiết"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="w-6 h-6 rounded bg-red-500/70 hover:bg-red-600 text-white flex items-center justify-center transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition group ${
                  selectedId === item.id
                    ? "bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                }`}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                onDoubleClick={() => {
                  if (isVideo(item.contentType)) {
                    onInsertVideo?.(getFullUrl(item.url), item.originalName);
                  } else {
                    onInsertImage(getFullUrl(item.url), item.originalName, item.width ?? undefined, item.height ?? undefined);
                  }
                }}
              >
                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                  {isVideo(item.contentType) ? (
                    <Film className="w-5 h-5 text-slate-500" />
                  ) : (
                    <div className="absolute inset-0">
                      <img src={getFullUrl(item.url)} alt={item.originalName} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{item.originalName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(item.fileSize)} · {timeAgo(item.createdAt)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(item); }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Copy URL"
                  >
                    {copiedUrl === item.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/10 transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Selected item action bar */}
      {selectedItem && (
        <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded overflow-hidden relative shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              {isVideo(selectedItem.contentType) ? (
                <Film className="w-4 h-4 text-slate-500" />
              ) : (
                <div className="absolute inset-0">
                  <img src={getFullUrl(selectedItem.url)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{selectedItem.originalName}</p>
              <p className="text-[10px] text-slate-400">{formatBytes(selectedItem.fileSize)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isVideo(selectedItem.contentType)) {
                  onInsertVideo?.(getFullUrl(selectedItem.url), selectedItem.originalName);
                } else {
                  onInsertImage(getFullUrl(selectedItem.url), selectedItem.originalName, selectedItem.width ?? undefined, selectedItem.height ?? undefined);
                }
              }}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold rounded-md transition whitespace-nowrap"
            >
              Chèn vào trang
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{previewItem.originalName}</h3>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: "400px" }}>
                {isVideo(previewItem.contentType) ? (
                  <video src={getFullUrl(previewItem.url)} controls className="max-w-full max-h-[400px]" />
                ) : (
                  <img
                    src={getFullUrl(previewItem.url)}
                    alt={previewItem.originalName}
                    className="max-w-full max-h-[400px] object-contain"
                  />
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="text-slate-400">Tên file</div>
                <div className="text-slate-700 dark:text-slate-200 truncate">{previewItem.originalName}</div>
                <div className="text-slate-400">Định dạng</div>
                <div className="text-slate-700 dark:text-slate-200">{previewItem.contentType}</div>
                <div className="text-slate-400">Dung lượng</div>
                <div className="text-slate-700 dark:text-slate-200">{formatBytes(previewItem.fileSize)}</div>
                {previewItem.width && previewItem.height && (
                  <>
                    <div className="text-slate-400">Kích thước</div>
                    <div className="text-slate-700 dark:text-slate-200">{previewItem.width} × {previewItem.height}px</div>
                  </>
                )}
                <div className="text-slate-400">URL</div>
                <div className="text-primary-600 truncate cursor-pointer hover:underline" onClick={() => handleCopyUrl(previewItem)}>
                  {copiedUrl === previewItem.id ? "Đã copy!" : getFullUrl(previewItem.url)}
                </div>
                <div className="text-slate-400">Thời gian</div>
                <div className="text-slate-700 dark:text-slate-200">{timeAgo(previewItem.createdAt)}</div>
              </div>
            </div>
            <div className="flex justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDelete(previewItem.id).then(() => setPreviewItem(null))}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />Xóa
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isVideo(previewItem.contentType)) {
                    onInsertVideo?.(getFullUrl(previewItem.url), previewItem.originalName);
                  } else {
                    onInsertImage(getFullUrl(previewItem.url), previewItem.originalName, previewItem.width ?? undefined, previewItem.height ?? undefined);
                  }
                  setPreviewItem(null);
                }}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Chèn vào trang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Count bar */}
      {!loading && filteredItems.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            {filteredItems.length} file · {formatBytes(filteredItems.reduce((s, i) => s + i.fileSize, 0))} tổng dung lượng
          </p>
        </div>
      )}
    </div>
  );
}
