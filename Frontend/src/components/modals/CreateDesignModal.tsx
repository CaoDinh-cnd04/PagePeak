"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Crown,
  Flame,
  Link as LinkIcon,
  Plus,
  Search,
  Sparkles,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type TemplateType = "mienPhi" | "caoCap";

export type TemplateItem = {
  id: string | number;
  tenMau: string;
  danhMuc: string;
  loai: TemplateType;
  anhThumbnail: string;
  moTa: string;
};

export type CategoryItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
};

export const defaultCategories: CategoryItem[] = [
  { key: "mien-phi", label: "Miễn phí", icon: <Star className="w-4 h-4" /> },
  {
    key: "cao-cap",
    label: "Cao cấp",
    icon: <Crown className="w-4 h-4 text-amber-500" />,
  },
  { key: "nha-cua", label: "Nhà cửa đời sống" },
  { key: "me-va-be", label: "Mẹ và Bé" },
  { key: "o-to", label: "Ô tô xe máy" },
  { key: "giai-tri", label: "Giải trí" },
  { key: "giao-duc", label: "Giáo dục đào tạo" },
  { key: "du-lich", label: "Du lịch nghỉ dưỡng" },
  { key: "phan-mem", label: "Phần mềm & App" },
  { key: "nha-hang", label: "Nhà hàng quán ăn" },
  { key: "doanh-nghiep", label: "Giới thiệu doanh nghiệp" },
  { key: "qua-tang", label: "Trang quà tặng" },
];

export const mockTemplates: TemplateItem[] = [
  {
    id: "tpl-001",
    tenMau: "Flash Sale Tím",
    danhMuc: "mien-phi",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-001/600/800",
    moTa: "Mẫu landing page khuyến mãi, phù hợp bán hàng nhanh.",
  },
  {
    id: "tpl-002",
    tenMau: "Giới thiệu Doanh nghiệp Pro",
    danhMuc: "doanh-nghiep",
    loai: "caoCap",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-002/600/800",
    moTa: "Trang giới thiệu công ty, bố cục hiện đại và tin cậy.",
  },
  {
    id: "tpl-003",
    tenMau: "Nhà hàng – Menu & Đặt bàn",
    danhMuc: "nha-hang",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-003/600/800",
    moTa: "Trưng bày menu, CTA đặt bàn, tích hợp gọi nhanh.",
  },
  {
    id: "tpl-004",
    tenMau: "Du lịch – Combo nghỉ dưỡng",
    danhMuc: "du-lich",
    loai: "caoCap",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-004/600/800",
    moTa: "Mẫu tour/combo, nhấn mạnh hình ảnh và ưu đãi.",
  },
  {
    id: "tpl-005",
    tenMau: "Ebook – Thu lead",
    danhMuc: "mien-phi",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-005/600/800",
    moTa: "Form thu email/SDT, phù hợp chiến dịch lead magnet.",
  },
  {
    id: "tpl-006",
    tenMau: "Mẹ & Bé – Sản phẩm chăm sóc",
    danhMuc: "me-va-be",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-006/600/800",
    moTa: "Thiết kế nhẹ nhàng, làm nổi bật độ an toàn & tin dùng.",
  },
  {
    id: "tpl-007",
    tenMau: "Giáo dục – Khóa học online",
    danhMuc: "giao-duc",
    loai: "caoCap",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-007/600/800",
    moTa: "Landing bán khóa học, testimonials & curriculum.",
  },
  {
    id: "tpl-008",
    tenMau: "Ô tô – Đăng ký lái thử",
    danhMuc: "o-to",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-008/600/800",
    moTa: "CTA rõ ràng, form đăng ký nhanh, phù hợp showroom.",
  },
  {
    id: "tpl-009",
    tenMau: "Nhà cửa – Nội thất tối giản",
    danhMuc: "nha-cua",
    loai: "caoCap",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-009/600/800",
    moTa: "Mẫu premium cho nội thất, bố cục gallery sang trọng.",
  },
  {
    id: "tpl-010",
    tenMau: "Giải trí – Sự kiện âm nhạc",
    danhMuc: "giai-tri",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-010/600/800",
    moTa: "Trang event, countdown, CTA mua vé nổi bật.",
  },
  {
    id: "tpl-011",
    tenMau: "Phần mềm – App Landing",
    danhMuc: "phan-mem",
    loai: "caoCap",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-011/600/800",
    moTa: "Mẫu app/SaaS, highlight tính năng & pricing.",
  },
  {
    id: "tpl-012",
    tenMau: "Quà tặng – Voucher & Coupon",
    danhMuc: "qua-tang",
    loai: "mienPhi",
    anhThumbnail: "https://picsum.photos/seed/pagepeak-012/600/800",
    moTa: "Phù hợp phát voucher, thu lead và upsell.",
  },
];

type ConfirmState =
  | null
  | {
      template: TemplateItem;
    };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
  onCreateWithAI: (description: string) => void | Promise<void>;
  onUpload: (file: File) => void | Promise<void>;
  onUseTemplate?: (template: TemplateItem) => void | Promise<void>;
  designServiceUrl?: string;
  categories?: CategoryItem[];
  templates?: TemplateItem[];
};

export function CreateDesignModal({
  open,
  onClose,
  onCreateBlank,
  onCreateWithAI,
  onUpload,
  onUseTemplate,
  designServiceUrl = "https://example.com",
  categories = defaultCategories,
  templates = mockTemplates,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("mien-phi");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const [aiSubmitting, setAiSubmitting] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Simulate fetch loading
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(t);
  }, [open]);

  // Reset small states when closing
  useEffect(() => {
    if (open) return;
    setQuery("");
    setActiveCategory("mien-phi");
    setAiOpen(false);
    setAiDesc("");
    setAiSubmitting(false);
    setConfirm(null);
    setConfirmSubmitting(false);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates
      .filter((t) => {
        if (activeCategory === "mien-phi") return t.loai === "mienPhi";
        if (activeCategory === "cao-cap") return t.loai === "caoCap";
        return t.danhMuc === activeCategory;
      })
      .filter((t) => (q ? t.tenMau.toLowerCase().includes(q) : true));
  }, [templates, activeCategory, query]);

  const activeCategoryLabel =
    categories.find((c) => c.key === activeCategory)?.label ?? "Miễn phí";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFilePicked = async (f: File | null) => {
    if (!f) return;
    const ok = f.name.toLowerCase().endsWith(".ladipage");
    if (!ok) {
      alert("Vui lòng chọn đúng tệp .ladipage");
      return;
    }
    await onUpload(f);
  };

  const handleUseTemplate = (t: TemplateItem) => {
    setConfirm({ template: t });
  };

  const handleConfirmUse = async () => {
    if (!confirm) return;
    const t = confirm.template;
    const ok = window.confirm(`Bạn muốn dùng mẫu "${t.tenMau}"?`);
    if (!ok) return;

    setConfirmSubmitting(true);
    try {
      if (onUseTemplate) await onUseTemplate(t);
      else alert("Đã chọn mẫu. (Tích hợp tạo page từ template ở bước tiếp theo)");
      onClose();
    } finally {
      setConfirmSubmitting(false);
      setConfirm(null);
    }
  };

  const handleCreateAI = async () => {
    const desc = aiDesc.trim();
    if (!desc) {
      alert("Vui lòng nhập mô tả để AI tạo trang.");
      return;
    }
    setAiSubmitting(true);
    try {
      await onCreateWithAI(desc);
      setAiOpen(false);
      onClose();
    } finally {
      setAiSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onMouseDown={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full h-[92vh] max-w-6xl bg-white dark:bg-slate-950 rounded-[12px] shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex">
        {/* Left categories (desktop) */}
        <aside className="hidden md:flex w-[260px] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bạn muốn tạo thiết kế gì?"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
          </div>

          <div className="px-2 pb-3 overflow-auto">
            {categories.map((c) => {
              const active = c.key === activeCategory;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCategory(c.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-purple-50 text-[#6B21A8] dark:bg-purple-500/10 dark:text-purple-200"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    {c.icon ?? <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />}
                  </span>
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right */}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="relative p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  Tạo thiết kế
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Chọn mẫu phù hợp hoặc bắt đầu từ trang trống.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Mobile top controls */}
            <div className="md:hidden mt-4 grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bạn muốn tạo thiết kế gì?"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions + content scroll */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              {/* Search on right column (desktop) */}
              <div className="hidden md:block mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bạn muốn tạo thiết kế gì?"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
              </div>

              {/* 3 action buttons */}
              <div className="grid sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                  Tạo trang với AI
                </button>

                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  Tải lên tệp .ladipage
                </button>

                <a
                  href={designServiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                  Dịch vụ thiết kế
                </a>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".ladipage"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void handleFilePicked(f);
                }}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Dành cho bạn
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Danh mục: <span className="font-semibold">{activeCategoryLabel}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Blank card */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateBlank();
                  }}
                  className="group rounded-[8px] border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-[#7C3AED] transition p-4 flex flex-col items-center justify-center min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 transition">
                    <Plus className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-900 dark:text-slate-100 text-center">
                    Bắt đầu với một trang trống
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
                    Tự thiết kế từ đầu theo ý bạn.
                  </p>
                </button>

                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="rounded-[8px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-800" />
                      <div className="p-3">
                        <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
                      </div>
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="col-span-2 lg:col-span-3 xl:col-span-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                        Không tìm thấy mẫu phù hợp
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Thử từ khóa khác hoặc chuyển danh mục.
                      </p>
                    </div>
                  </div>
                ) : (
                  filtered.map((t) => (
                    <div
                      key={t.id}
                      className="group rounded-[8px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition duration-200 hover:shadow-lg hover:scale-[1.01] hover:border-[#7C3AED]"
                    >
                      <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-950">
                        <Image
                          src={t.anhThumbnail}
                          alt={t.tenMau}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />

                        {/* Badge */}
                        <div className="absolute top-3 left-3">
                          {t.loai === "mienPhi" ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-sm">
                              Miễn phí
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-900 shadow-sm">
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              Cao cấp
                            </span>
                          )}
                        </div>

                        {/* Link icon */}
                        <button
                          type="button"
                          onClick={() => alert("Mở preview template (bước tiếp theo).")}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-slate-700 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          aria-label="Xem trước"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>

                        {/* Use button */}
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition">
                          <button
                            type="button"
                            onClick={() => handleUseTemplate(t)}
                            className="w-full rounded-xl bg-[#7C3AED] hover:bg-[#6B21A8] text-white text-sm font-extrabold py-2.5 transition"
                          >
                            Dùng mẫu này
                          </button>
                        </div>
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {t.tenMau}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {t.moTa}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* AI sub-modal */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAiOpen(false);
          }}
        >
          <div className="w-full max-w-xl rounded-[12px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Tạo trang với AI
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Mô tả ngắn gọn mục tiêu, sản phẩm, tông màu, CTA…
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={aiDesc}
                onChange={(e) => setAiDesc(e.target.value)}
                placeholder="Ví dụ: Landing bán khóa học Digital Marketing, phong cách hiện đại, màu tím chủ đạo, CTA 'Đăng ký ngay'..."
                rows={6}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setAiOpen(false)}>
                  Hủy
                </Button>
                <Button
                  className="bg-[#7C3AED] hover:bg-[#6B21A8]"
                  onClick={() => void handleCreateAI()}
                  loading={aiSubmitting}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Tạo ngay
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm (optional, we also call window.confirm for copy/paste friendliness) */}
      {confirm && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirm(null);
          }}
        >
          <div className="w-full max-w-md rounded-[12px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Xác nhận
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Bạn muốn dùng mẫu{" "}
                  <span className="font-semibold">&quot;{confirm.template.tenMau}&quot;</span>?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Hủy
              </Button>
              <Button
                className="bg-[#7C3AED] hover:bg-[#6B21A8]"
                onClick={() => void handleConfirmUse()}
                loading={confirmSubmitting}
              >
                Dùng mẫu này
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

