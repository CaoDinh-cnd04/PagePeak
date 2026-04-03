import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  X, GripVertical, Maximize2,
  Share2, Code, FileCode, Zap, Sparkles, Image as ImageIcon, ExternalLink,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor/editorStore";
import FontPicker from "./FontPicker";
import type { PageSettings } from "@/types/editor";

type GlobalSettingsTab = "seo" | "conversion" | "code" | "optimize" | "dynamic";

const TAB_ITEMS: { id: GlobalSettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "seo", label: "SEO & Social", icon: <Share2 className="w-4 h-4" /> },
  { id: "conversion", label: "Mã chuyển đổi", icon: <Code className="w-4 h-4" /> },
  { id: "code", label: "Mã JavaScript/CSS", icon: <FileCode className="w-4 h-4" /> },
  { id: "optimize", label: "Tối ưu hoá trang", icon: <Zap className="w-4 h-4" /> },
  { id: "dynamic", label: "Dynamic Content", icon: <Sparkles className="w-4 h-4" /> },
];

export function GlobalSettingsPanel({ onClose, onRequestImagePicker }: { onClose: () => void; onRequestImagePicker?: (callback: (url: string) => void) => void }) {
  const {
    metaTitle,
    metaDescription,
    pageSettings,
    updatePageMeta,
    updatePageSettings,
    desktopCanvasWidth,
    setDesktopCanvasWidth,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<GlobalSettingsTab>("seo");
  const [fontFamily, setFontFamily] = useState("Open Sans");
  const [textDirection, setTextDirection] = useState("ltr");
  const [desktopSize, setDesktopSize] = useState(String(desktopCanvasWidth));
  const mobileSize = "420";

  const ps = pageSettings ?? {};

  useEffect(() => {
    setDesktopSize(String(desktopCanvasWidth));
  }, [desktopCanvasWidth]);

  const handleDesktopSizeChange = (val: string) => {
    setDesktopSize(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) setDesktopCanvasWidth(num);
  };

  const openImagePicker = (field: "metaImageUrl" | "faviconUrl") => {
    if (onRequestImagePicker) {
      onRequestImagePicker((url) => {
        updatePageSettings({ [field]: url });
      });
    }
  };

  return (
    <Rnd
      default={{ x: window.innerWidth - 340, y: 64, width: 320, height: Math.min(560, window.innerHeight - 80) }}
      minWidth={300}
      minHeight={400}
      bounds="window"
      enableResizing={true}
      resizeHandleStyles={{ right: { cursor: "ew-resize" }, bottom: { cursor: "ns-resize" }, bottomRight: { cursor: "nwse-resize" } }}
      dragHandleClassName="global-settings-drag-handle"
      className="!fixed z-[100] rounded-lg shadow-xl border border-[#e0e0e0] overflow-hidden bg-white flex flex-col"
      style={{
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        // react-rnd merges display:inline-block — that breaks flex + flex-1 scroll; override via inline style
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div className="global-settings-drag-handle flex items-center justify-between px-3 py-2 border-b border-[#e0e0e0] shrink-0 cursor-grab active:cursor-grabbing">
        <div className="flex-1 flex justify-center">
          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Mở rộng">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Đóng">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#e0e0e0] shrink-0">
        <h3 className="font-bold text-slate-800 text-sm">Thiết lập trang</h3>
      </div>

      {/* Tab Navigation - horizontal */}
      <div className="border-b border-[#e0e0e0] overflow-x-auto shrink-0">
        <div className="flex gap-0 min-w-0">
          {TAB_ITEMS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] transition border-b-2 whitespace-nowrap ${
                activeTab === t.id
                  ? "border-[#1e2d7d] text-[#1e2d7d] font-medium"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content - min-h-0 allows flex child to shrink so overflow-y-auto works */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {activeTab === "seo" && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tiêu đề trang</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => updatePageMeta({ metaTitle: e.target.value })}
                placeholder="Nhập tiêu đề trang (Độ dài tối ưu không vượt quá 70 ký tự)"
                maxLength={100}
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">{metaTitle.length}/70</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả trang</label>
              <textarea
                value={metaDescription}
                onChange={(e) => updatePageMeta({ metaDescription: e.target.value })}
                placeholder="Nhập mô tả trang (Độ dài tối ưu không vượt quá 160 ký tự)"
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">{metaDescription.length}/160</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Từ khoá về trang</label>
              <input
                type="text"
                value={ps.metaKeywords ?? ""}
                onChange={(e) => updatePageSettings({ metaKeywords: e.target.value })}
                placeholder="Nhập từ khoá. Ví dụ: Landing Page, LadiPage"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh khi chia sẻ</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ps.metaImageUrl ?? ""}
                  onChange={(e) => updatePageSettings({ metaImageUrl: e.target.value })}
                  placeholder="Đường dẫn ảnh (1200x630px)"
                  className="flex-1 px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
                />
                <button
                  type="button"
                  onClick={() => openImagePicker("metaImageUrl")}
                  className="px-3 py-2 text-[12px] font-medium rounded border border-[#1e2d7d] text-[#1e2d7d] hover:bg-[#1e2d7d] hover:text-white transition"
                >
                  Chọn ảnh
                </button>
              </div>
              {ps.metaImageUrl && (
                <div className="mt-2 rounded border border-slate-200 overflow-hidden bg-slate-100" style={{ height: 120 }}>
                  <img src={ps.metaImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh Favicon</label>
              <div className="flex gap-2 items-center">
                {ps.faviconUrl ? (
                  <img src={ps.faviconUrl} alt="" className="w-10 h-10 rounded border border-slate-200 object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <input
                  type="text"
                  value={ps.faviconUrl ?? ""}
                  onChange={(e) => updatePageSettings({ faviconUrl: e.target.value })}
                  placeholder="Đường dẫn ảnh (256x256px)"
                  className="flex-1 px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
                />
                <button
                  type="button"
                  onClick={() => openImagePicker("faviconUrl")}
                  className="px-3 py-2 text-[12px] font-medium rounded border border-[#1e2d7d] text-[#1e2d7d] hover:bg-[#1e2d7d] hover:text-white transition shrink-0"
                >
                  Chọn ảnh
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conversion" && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Facebook Pixel ID</label>
              <input
                type="text"
                value={ps.facebookPixelId ?? ""}
                onChange={(e) => updatePageSettings({ facebookPixelId: e.target.value })}
                placeholder="Ví dụ: 1520656564722XXX"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Google Analytics ID</label>
              <input
                type="text"
                value={ps.googleAnalyticsId ?? ""}
                onChange={(e) => updatePageSettings({ googleAnalyticsId: e.target.value })}
                placeholder="Ví dụ: UA-86097XXX-1 hoặc G-XXXXXXX"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Google Ads ID</label>
              <input
                type="text"
                value={ps.googleAdsId ?? ""}
                onChange={(e) => updatePageSettings({ googleAdsId: e.target.value })}
                placeholder="Ví dụ: AW-866447XXX"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">TikTok Pixel ID</label>
              <input
                type="text"
                value={ps.tiktokPixelId ?? ""}
                onChange={(e) => updatePageSettings({ tiktokPixelId: e.target.value })}
                placeholder="Ví dụ: BLSR3MH5IEM1Q8BOFXXX"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Zalo Ads Pixel ID</label>
              <div className="space-y-2">
                {(["ladipage", "personal", "none"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="zaloAdsType"
                      checked={(ps.zaloAdsType ?? "none") === opt}
                      onChange={() => updatePageSettings({ zaloAdsType: opt })}
                      className="text-[#1e2d7d]"
                    />
                    <span className="text-[13px]">
                      {opt === "ladipage" && "Pixel liên kết LadiPage (thiết lập tự động)"}
                      {opt === "personal" && "Pixel cá nhân"}
                      {opt === "none" && "Không sử dụng"}
                    </span>
                    {(opt === "ladipage" || opt === "personal") && (
                      <a href="#" className="text-[11px] text-[#1e2d7d] hover:underline flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                        Tìm hiểu thêm <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                ))}
              </div>
              {(ps.zaloAdsType === "personal") && (
                <input
                  type="text"
                  value={ps.zaloAdsPixelId ?? ""}
                  onChange={(e) => updatePageSettings({ zaloAdsPixelId: e.target.value })}
                  placeholder="Nhập Zalo Pixel ID"
                  className="w-full mt-2 px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Google Tag Manager ID</label>
              <input
                type="text"
                value={ps.googleTagManagerId ?? ""}
                onChange={(e) => updatePageSettings({ googleTagManagerId: e.target.value })}
                placeholder="Ví dụ: GTM-XXXXXX"
                className="w-full px-3 py-2 text-[13px] rounded border border-slate-200 bg-white"
              />
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Trước thẻ &lt;/head&gt;</label>
              <textarea
                value={ps.codeBeforeHead ?? ""}
                onChange={(e) => updatePageSettings({ codeBeforeHead: e.target.value })}
                placeholder="Nhập mã muốn thêm vào đây"
                rows={6}
                className="w-full px-3 py-2 text-[12px] font-mono rounded border border-slate-200 bg-slate-50 resize-y"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Trước thẻ &lt;/body&gt;</label>
              <textarea
                value={ps.codeBeforeBody ?? ""}
                onChange={(e) => updatePageSettings({ codeBeforeBody: e.target.value })}
                placeholder="Nhập mã muốn thêm vào đây"
                rows={6}
                className="w-full px-3 py-2 text-[12px] font-mono rounded border border-slate-200 bg-slate-50 resize-y"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {activeTab === "optimize" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <label className="text-[13px] font-medium text-slate-700">Sử dụng DelayJS</label>
              <button
                type="button"
                role="switch"
                aria-checked={ps.useDelayJS ?? false}
                onClick={() => updatePageSettings({ useDelayJS: !(ps.useDelayJS ?? false) })}
                className={`relative w-11 h-6 rounded-full transition ${(ps.useDelayJS ?? false) ? "bg-[#1e2d7d]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition left-1 ${(ps.useDelayJS ?? false) ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <label className="text-[13px] font-medium text-slate-700">Sử dụng Lazyload</label>
              <button
                type="button"
                role="switch"
                aria-checked={ps.useLazyload ?? true}
                onClick={() => updatePageSettings({ useLazyload: !(ps.useLazyload ?? true) })}
                className={`relative w-11 h-6 rounded-full transition ${(ps.useLazyload ?? true) ? "bg-[#1e2d7d]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition left-1 ${(ps.useLazyload ?? true) ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        )}

        {activeTab === "dynamic" && (
          <div className="text-center py-8 text-slate-400 text-sm">Dynamic Content (đang phát triển)</div>
        )}

        {/* Thiết lập chung */}
        <div className="border-t border-[#e0e0e0] pt-4 mt-4">
          <p className="text-[11px] font-bold text-[#1e2d7d] uppercase tracking-wider mb-3">Thiết lập chung</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Font chữ</label>
              <FontPicker value={fontFamily} onChange={setFontFamily} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hướng văn bản</label>
              <select
                value={textDirection}
                onChange={(e) => setTextDirection(e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded border border-[#e0e0e0] bg-white"
              >
                <option value="ltr">Trái sang phải</option>
                <option value="rtl">Phải sang trái</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">K/thước Desktop</label>
              <select
                value={desktopSize}
                onChange={(e) => handleDesktopSizeChange(e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded border border-[#e0e0e0] bg-white"
              >
                <option value="960">960px</option>
                <option value="1200">1200px</option>
                <option value="1440">1440px</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">K/thước Mobile</label>
              <div className="px-3 py-2 text-[13px] rounded border border-[#e0e0e0] bg-slate-50 text-slate-600">
                {mobileSize}px
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#e0e0e0] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 px-4 text-[13px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Đóng
        </button>
      </div>
    </Rnd>
  );
}
