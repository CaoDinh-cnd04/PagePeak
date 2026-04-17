import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutTemplate, Trash2, X } from "lucide-react";
import { parsePopupContent } from "@/lib/editor/blogContent";
import {
  fetchPopupTemplates,
  fetchPopupCategories,
  POPUP_CATEGORIES_FALLBACK,
  loadMyPopups,
  deleteMyPopup,
  type PopupTemplateEntry,
  type MySavedPopup,
} from "@/lib/editor/popupTemplateCatalog";

type TabId = "mine" | "templates";

type PopupManageModalProps = {
  open: boolean;
  onClose: () => void;
  onPickBlank: () => void;
  onPickEntry: (entry: PopupTemplateEntry | MySavedPopup) => void;
};

export function PopupManageModal({ open, onClose, onPickBlank, onPickEntry }: PopupManageModalProps) {
  const [tab, setTab] = useState<TabId>("templates");
  const [categoryId, setCategoryId] = useState("all");
  const [myPopups, setMyPopups] = useState<MySavedPopup[]>(() => loadMyPopups());
  const [categories, setCategories] = useState(POPUP_CATEGORIES_FALLBACK);
  const [allTemplates, setAllTemplates] = useState<PopupTemplateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load từ API khi modal mở
  useEffect(() => {
    if (!open) return;
    setMyPopups(loadMyPopups());

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [templates, cats] = await Promise.all([
          fetchPopupTemplates(),
          fetchPopupCategories(),
        ]);
        if (!cancelled) {
          setAllTemplates(templates);
          setCategories(cats);
        }
      } catch {
        if (!cancelled) setError("Không thể tải mẫu popup.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const fn = () => setMyPopups(loadMyPopups());
    window.addEventListener("ladipage-my-popups-changed", fn);
    return () => window.removeEventListener("ladipage-my-popups-changed", fn);
  }, []);

  const templates = useMemo(
    () => categoryId === "all" ? allTemplates : allTemplates.filter((t) => t.category === categoryId),
    [allTemplates, categoryId],
  );

  if (!open) return null;

  const refreshMine = () => setMyPopups(loadMyPopups());

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[#e0e0e0]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Quản lý Popup</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-[#e0e0e0] px-6 shrink-0">
          <button
            type="button"
            onClick={() => { setTab("mine"); refreshMine(); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "mine" ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Popup của tôi
          </button>
          <button
            type="button"
            onClick={() => setTab("templates")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === "templates" ? "border-[#1e2d7d] text-[#1e2d7d]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Popup mẫu
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {tab === "templates" && (
            <aside className="w-52 border-r border-[#e0e0e0] overflow-y-auto shrink-0 py-2 bg-slate-50/80">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`w-full text-left px-4 py-2.5 text-[13px] border-l-[3px] transition ${
                    categoryId === c.id
                      ? "border-[#1e2d7d] bg-white text-[#1e2d7d] font-medium"
                      : "border-transparent text-slate-600 hover:bg-white/80"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </aside>
          )}

          <div className="flex-1 min-w-0 overflow-y-auto p-4 bg-white">
            {tab === "mine" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => { onPickBlank(); onClose(); }}
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#1e2d7d]/40 hover:bg-slate-100/80 flex flex-col items-center justify-center gap-3 py-12 px-4 text-center transition min-h-[200px]"
                >
                  <LayoutTemplate className="w-10 h-10 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Popup trắng</span>
                  <span className="text-[11px] text-slate-500">Thêm popup trống và chỉnh trên canvas</span>
                </button>
                {myPopups.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-16 text-sm text-slate-500">
                    Chưa có mẫu đã lưu. Chọn phần tử Popup trên canvas → panel phải → <span className="font-medium text-slate-700">Lưu làm mẫu của tôi</span>.
                  </div>
                ) : (
                  myPopups.map((p) => {
                    const prev = parsePopupContent(p.content);
                    return (
                      <TemplateCard
                        key={p.id}
                        title={p.name}
                        subtitle={new Date(p.savedAt).toLocaleString()}
                        preview={<PopupMockPreview title={prev.title ?? "Popup"} body={prev.body ?? ""} styles={p.styles} pop={prev} />}
                        onPick={() => { onPickEntry(p); onClose(); }}
                        onDelete={() => { deleteMyPopup(p.id); setMyPopups(loadMyPopups()); }}
                      />
                    );
                  })
                )}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-48 text-sm text-slate-400">
                Đang tải mẫu popup...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-sm text-red-500">{error}</span>
                <button
                  type="button"
                  onClick={() => { setLoading(true); void fetchPopupTemplates().then(setAllTemplates).finally(() => setLoading(false)); }}
                  className="text-[12px] text-[#1e2d7d] underline"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => { onPickBlank(); onClose(); }}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:ring-2 hover:ring-[#1e2d7d]/20 flex flex-col items-center justify-center gap-2 py-10 px-3 text-center transition min-h-[200px]"
                >
                  <LayoutTemplate className="w-10 h-10 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800">Popup trắng</span>
                  <span className="text-[11px] text-slate-500">Bắt đầu từ trống</span>
                </button>
                {templates.map((t) => {
                  const pop = parsePopupContent(t.content);
                  return (
                    <TemplateCard
                      key={t.id}
                      title={t.name}
                      subtitle={categories.find((c) => c.id === t.category)?.label ?? t.category}
                      preview={
                        t.thumbnailUrl ? (
                          <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PopupMockPreview title={pop.title ?? "Popup"} body={pop.body ?? ""} styles={t.styles} pop={pop} />
                        )
                      }
                      onPick={() => { onPickEntry(t); onClose(); }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#e0e0e0] flex justify-end bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function PopupMockPreview({ title, body, styles, pop }: { title: string; body: string; styles: Record<string, string | number>; pop?: import("@/lib/editor/blogContent").PopupData }) {
  const bg = String(styles.backgroundColor ?? "#fff");
  const radius = Number(styles.borderRadius ?? 12);
  const bodyColor = String(styles.bodyTextColor ?? styles.color ?? "#334155");
  const headerBg = String(styles.headerBackgroundColor ?? "#1e293b");
  const headerColor = String(styles.headerTextColor ?? "#ffffff");
  const titleColor = String(styles.headerTextColor ?? "#0f172a");
  const btnColor = String(styles.btnColor ?? "#1e2d7d");
  const btnTextColor = String(styles.btnTextColor ?? "#ffffff");
  const btnRadius = Number(styles.btnRadius ?? 8);
  const layout = pop?.layout ?? "flat";
  const isHeader = layout === "header";
  const showBtn = pop?.showBtn === true;
  const btnText = pop?.btnText || "Tìm hiểu thêm";
  const emoji = pop?.imageEmoji ?? "";

  return (
    <div className="w-full h-full flex items-center justify-center p-2 bg-slate-100 overflow-hidden">
      <div className="w-full max-w-[96%] flex flex-col overflow-hidden shadow-md" style={{ background: bg, borderRadius: radius, border: "1px solid rgba(0,0,0,0.08)" }}>
        {isHeader && (
          <div style={{ background: headerBg, padding: "6px 10px" }}>
            <p className="text-[10px] font-bold truncate" style={{ color: headerColor }}>
              {emoji && <span className="mr-1">{emoji}</span>}{title}
            </p>
          </div>
        )}
        <div className="p-2.5 space-y-1">
          {emoji && !isHeader && <div className="text-lg leading-none">{emoji}</div>}
          {!isHeader && <p className="text-[10px] font-bold truncate" style={{ color: titleColor }}>{title}</p>}
          <p className="text-[9px] leading-snug line-clamp-3" style={{ color: bodyColor }}>{body}</p>
          {showBtn && (
            <div className="pt-1">
              <span className="text-[9px] font-semibold px-2 py-1 inline-block" style={{ background: btnColor, color: btnTextColor, borderRadius: btnRadius }}>
                {btnText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  subtitle,
  preview,
  onPick,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  preview?: ReactNode;
  onPick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white hover:ring-2 hover:ring-[#1e2d7d]/25 min-h-[200px] transition shadow-sm flex flex-col overflow-hidden">
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/95 shadow border border-slate-200 text-red-600 hover:bg-red-50"
          title="Xóa mẫu"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <button type="button" onClick={onPick} className="flex flex-col flex-1 text-left min-h-0">
        <div className="h-36 bg-slate-100 border-b border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
          {preview ?? <div className="text-slate-400 text-xs">Xem trước</div>}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <span className="text-sm font-semibold text-slate-800 line-clamp-2">{title}</span>
          {subtitle && <span className="text-[11px] text-slate-500 mt-1">{subtitle}</span>}
        </div>
      </button>
    </div>
  );
}
